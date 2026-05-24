/*
  # Add file_validation_attempt to audit_logs action_type constraint

  The validate-file-upload Edge Function uses action_type = 'file_validation_attempt'
  when logging each invocation to audit_logs. This value was not in the existing
  CHECK constraint on audit_logs.action_type, causing every insert from the Edge
  Function to fail silently (the try/catch suppressed the error but the row was
  never written).

  Changes:
  - Drop and recreate audit_logs_action_type_check to include 'file_validation_attempt'
*/

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'create', 'update', 'delete', 'view',
    'approve', 'reject', 'submit', 'cancel', 'complete',
    'login', 'logout', 'login_failed', 'password_change',
    'session_created', 'session_terminated',
    'document_upload', 'document_download', 'document_view',
    'document_delete', 'document_verify',
    'file_validation_attempt',
    'screening_run', 'screening_match', 'screening_clear',
    'client_create', 'client_update', 'client_view', 'client_delete',
    'matter_create', 'matter_update', 'matter_view', 'matter_delete',
    'assessment_create', 'assessment_update', 'assessment_view',
    'assessment_delete', 'assessment_submit',
    'user_create', 'user_update', 'user_delete',
    'user_activate', 'user_deactivate',
    'role_change', 'role_upgrade_request', 'role_upgrade_approve',
    'security_alert', 'suspicious_activity', 'access_denied',
    'system_event', 'data_export', 'data_import'
  ]));
