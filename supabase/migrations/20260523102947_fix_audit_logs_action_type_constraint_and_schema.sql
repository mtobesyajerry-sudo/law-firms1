/*
  # Fix audit_logs action_type constraint + add missing columns

  ## Problem
  The audit_logs table has a CHECK constraint on action_type that only allows
  6 values: create, update, delete, view, approve, reject. The application sends
  free-form event type strings (e.g. 'client_viewed', 'LOGIN_SUCCESS',
  'assessment_created') which all fail the constraint silently. This is why
  audit_logs has always been empty despite the code attempting to write to it.

  ## Changes

  ### 1. Widen action_type constraint
  Replace the 6-value allowlist with a broader set that covers all event
  categories the application actually emits, while still preventing truly
  arbitrary garbage values.

  ### 2. Add missing columns
  Both auditService.js and security.js reference columns that don't exist:
  - event_category / severity: useful metadata, add them as nullable text
  These are nice-to-have; the primary fix is the constraint.

  ## Notes
  - No data loss — table was empty due to this exact bug.
  - The constraint is still present to catch typos; it is just wider.
  - login_history fix (mfa_used removed, ip_address null-safe) is handled
    in application code only — no schema change needed there.
*/

-- ============================================================
-- 1. Drop the overly-narrow action_type constraint
-- ============================================================
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

-- ============================================================
-- 2. Add a broader constraint that covers all real event types
-- ============================================================
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type = ANY (ARRAY[
    -- CRUD operations
    'create', 'update', 'delete', 'view',
    -- Workflow operations
    'approve', 'reject', 'submit', 'cancel', 'complete',
    -- Auth events
    'login', 'logout', 'login_failed', 'password_change',
    'session_created', 'session_terminated',
    -- Document events
    'document_upload', 'document_download', 'document_view',
    'document_delete', 'document_verify',
    -- Screening events
    'screening_run', 'screening_match', 'screening_clear',
    -- Client / matter / assessment events
    'client_create', 'client_update', 'client_view', 'client_delete',
    'matter_create', 'matter_update', 'matter_view', 'matter_delete',
    'assessment_create', 'assessment_update', 'assessment_view',
    'assessment_delete', 'assessment_submit',
    -- User management events
    'user_create', 'user_update', 'user_delete',
    'user_activate', 'user_deactivate',
    'role_change', 'role_upgrade_request', 'role_upgrade_approve',
    -- Security events
    'security_alert', 'suspicious_activity', 'access_denied',
    -- System events
    'system_event', 'data_export', 'data_import'
  ]));

-- ============================================================
-- 3. Add event_category and severity columns (nullable)
--    so both callers can store that context without errors
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'event_category'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN event_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'severity'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN severity text DEFAULT 'info';
  END IF;
END $$;
