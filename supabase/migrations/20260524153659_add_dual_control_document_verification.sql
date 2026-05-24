/*
  # Dual-Control Document Verification Enforcement

  ## Summary
  Adds database-level enforcement of segregation-of-duties for AML document
  verification. Prevents any user from both uploading and verifying the same
  document, and prevents direct insertion of pre-verified documents.

  ## Changes

  ### New Columns
  - `client_documents.verified_at` (timestamptz) — precise timestamp set by
    trigger when verification_status transitions to 'verified'. Replaces the
    existing `verification_date` (date) for trigger-managed writes; both columns
    are kept to avoid breaking existing queries.

  ### New Function
  - `enforce_document_verification_rules()` — BEFORE INSERT OR UPDATE trigger
    function (SECURITY DEFINER) that:
      1. On INSERT: forces verification_status to 'pending' if NULL; rejects any
         value other than 'pending' or 'draft'.
      2. On UPDATE: when transitioning to 'verified', blocks the call if
         auth.uid() == uploaded_by (self-verification) or if the caller's role
         lacks verification authority. Automatically sets verified_by and
         verified_at on success.

  ### New Trigger
  - `client_documents_enforce_verification` — BEFORE INSERT OR UPDATE on
    client_documents, FOR EACH ROW.

  ## Security Notes
  - Service role bypasses auth.uid() (returns NULL); the trigger explicitly
    allows NULL callers through on UPDATE so that admin migrations and seeding
    are not broken. This is the intended privileged escape hatch.
  - Roles with verification authority: compliance_officer, mlro, senior_partner,
    partner, management, admin.
  - Self-verification is blocked for all roles including admin when called via
    the authenticated API (auth.uid() is set).
*/

-- Step 1: Add verified_at timestamptz column
ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Step 2: Create enforcement trigger function
CREATE OR REPLACE FUNCTION enforce_document_verification_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id  UUID;
  caller_role TEXT;
BEGIN
  -- ----------------------------------------------------------------
  -- INSERT path: new documents must start as pending/draft
  -- ----------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    -- Default NULL to 'pending'
    IF NEW.verification_status IS NULL THEN
      NEW.verification_status := 'pending';
    END IF;

    -- Reject any pre-verified status on insert
    IF NEW.verification_status NOT IN ('pending', 'draft') THEN
      RAISE EXCEPTION
        'New documents must have verification_status of ''pending'' or ''draft'' (got ''%'')',
        NEW.verification_status
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  -- ----------------------------------------------------------------
  -- UPDATE path: enforce dual-control when transitioning to 'verified'
  -- ----------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    -- Only intercept the pending→verified transition
    IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
      caller_id := auth.uid();

      -- NULL caller = service role / migration context; allow through as privileged escape hatch
      IF caller_id IS NULL THEN
        RETURN NEW;
      END IF;

      -- Self-verification is never permitted
      IF caller_id = OLD.uploaded_by THEN
        RAISE EXCEPTION
          'Document verification requires a different user than the uploader (self-verification not permitted)'
          USING ERRCODE = 'check_violation';
      END IF;

      -- Caller must hold a verification-authority role
      SELECT role INTO caller_role
      FROM user_profiles
      WHERE id = caller_id;

      IF caller_role NOT IN ('compliance_officer', 'mlro', 'senior_partner', 'partner', 'management', 'admin') THEN
        RAISE EXCEPTION
          'Insufficient privileges to verify documents (role: %)', caller_role
          USING ERRCODE = 'insufficient_privilege';
      END IF;

      -- Stamp the verifier identity and precise timestamp
      NEW.verified_by := caller_id;
      NEW.verified_at := NOW();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Attach trigger (replace any prior version)
DROP TRIGGER IF EXISTS client_documents_enforce_verification ON client_documents;

CREATE TRIGGER client_documents_enforce_verification
  BEFORE INSERT OR UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_document_verification_rules();
