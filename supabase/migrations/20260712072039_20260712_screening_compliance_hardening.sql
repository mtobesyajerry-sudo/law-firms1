-- =====================================================================
-- Screening Compliance Hardening
-- FIX 2: Role enforcement via RLS
-- FIX 3: CO=MLRO escalation distinction (pending_second_review status)
-- FIX 4: STR deadline tracking
-- FIX 5: UN list mandatory flag
-- Audit: Append-only enforcement
-- =====================================================================

-- -----------------------------------------------------------------------
-- FIX 3 & 4: Add columns to screening_results
-- -----------------------------------------------------------------------
DO $$
BEGIN
  -- FIX 3: separate escalation justification and pending_second_review status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_matches' AND column_name='escalation_justification') THEN
    ALTER TABLE screening_matches ADD COLUMN escalation_justification TEXT;
  END IF;

  -- FIX 4: STR deadline tracking on screening_results
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_results' AND column_name='str_deadline') THEN
    ALTER TABLE screening_results ADD COLUMN str_deadline TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_results' AND column_name='str_reference_number') THEN
    ALTER TABLE screening_results ADD COLUMN str_reference_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_results' AND column_name='str_filed_at') THEN
    ALTER TABLE screening_results ADD COLUMN str_filed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_results' AND column_name='str_filed_by') THEN
    ALTER TABLE screening_results ADD COLUMN str_filed_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_results' AND column_name='time_to_file_minutes') THEN
    ALTER TABLE screening_results ADD COLUMN time_to_file_minutes INTEGER;
  END IF;
END $$;

-- Extend screening_match_status enum to include pending_second_review
DO $$
BEGIN
  ALTER TYPE screening_match_status ADD VALUE IF NOT EXISTS 'pending_second_review';
EXCEPTION WHEN others THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- FIX 4: Trigger — set str_deadline when status becomes match_confirmed
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_str_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When a screening result is newly confirmed, set a 24-hour filing deadline
  IF NEW.status = 'match_confirmed' AND
     (OLD.status IS NULL OR OLD.status <> 'match_confirmed') THEN
    NEW.str_deadline := NOW() + INTERVAL '24 hours';
  END IF;

  -- When str_reference_number is first recorded, compute time-to-file
  IF NEW.str_reference_number IS NOT NULL AND OLD.str_reference_number IS NULL THEN
    NEW.str_filed_at := COALESCE(NEW.str_filed_at, NOW());
    IF NEW.str_deadline IS NOT NULL THEN
      NEW.time_to_file_minutes := EXTRACT(EPOCH FROM (NEW.str_filed_at - (NEW.str_deadline - INTERVAL '24 hours'))) / 60;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_str_deadline ON screening_results;
CREATE TRIGGER trg_str_deadline
  BEFORE UPDATE ON screening_results
  FOR EACH ROW EXECUTE FUNCTION trg_set_str_deadline();

-- -----------------------------------------------------------------------
-- FIX 5: Add is_mandatory flag to screening_lists
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='screening_lists' AND column_name='is_mandatory') THEN
    ALTER TABLE screening_lists ADD COLUMN is_mandatory BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Mark the UN Security Council Consolidated List as mandatory (cannot be disabled)
UPDATE screening_lists
  SET is_mandatory = TRUE
  WHERE list_source = 'UN_CONSOLIDATED';

-- -----------------------------------------------------------------------
-- FIX 2: Role-checking helper functions
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns TRUE if the calling user is staff only (not CO, not mlro, not management, not admin)
CREATE OR REPLACE FUNCTION is_staff_only()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role = 'staff' FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Returns TRUE if the calling user is a compliance officer (may also hold mlro)
CREATE OR REPLACE FUNCTION is_compliance_officer()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('compliance_officer', 'admin', 'system_admin')
  FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- -----------------------------------------------------------------------
-- FIX 2: Tighten RLS on screening_matches
-- Staff cannot SELECT, INSERT, or UPDATE screening_matches decisions.
-- They can only read their own organization's results via screening_results.
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "matches_org_isolation" ON screening_matches;

-- CO / admin / management can read all org matches
CREATE POLICY "matches_co_read" ON screening_matches
  FOR SELECT
  USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('compliance_officer', 'admin', 'system_admin', 'management')
  );

-- CO / admin can INSERT (created by screening engine via service role, but protect direct access)
CREATE POLICY "matches_co_insert" ON screening_matches
  FOR INSERT
  WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('compliance_officer', 'admin', 'system_admin')
  );

-- Only CO and above can UPDATE (review decisions)
CREATE POLICY "matches_co_update" ON screening_matches
  FOR UPDATE
  USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('compliance_officer', 'admin', 'system_admin')
  )
  WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('compliance_officer', 'admin', 'system_admin')
  );

-- -----------------------------------------------------------------------
-- Audit trail: Enforce append-only — no DELETE, no UPDATE allowed
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_read" ON screening_audit_log;
DROP POLICY IF EXISTS "audit_insert" ON screening_audit_log;

CREATE POLICY "audit_read" ON screening_audit_log
  FOR SELECT USING (organization_id = current_user_organization_id());

CREATE POLICY "audit_insert" ON screening_audit_log
  FOR INSERT WITH CHECK (organization_id = current_user_organization_id());

-- Explicitly deny UPDATE and DELETE at RLS level (no policy = denied)
-- Since RLS is enabled and there are no UPDATE/DELETE policies, these are already blocked.
-- Add a DB-level trigger as belt-and-suspenders:
CREATE OR REPLACE FUNCTION trg_deny_audit_log_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable and cannot be modified or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_no_update_audit ON screening_audit_log;
CREATE TRIGGER trg_no_update_audit
  BEFORE UPDATE ON screening_audit_log
  FOR EACH ROW EXECUTE FUNCTION trg_deny_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_no_delete_audit ON screening_audit_log;
CREATE TRIGGER trg_no_delete_audit
  BEFORE DELETE ON screening_audit_log
  FOR EACH ROW EXECUTE FUNCTION trg_deny_audit_log_mutation();

-- -----------------------------------------------------------------------
-- Index for STR deadline monitoring
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_screening_str_deadline
  ON screening_results(str_deadline)
  WHERE str_deadline IS NOT NULL AND str_reference_number IS NULL;
