/*
  # Add Remaining Security Tables
  
  This migration adds security tables that don't already exist in the system.
  
  ## Tables Added
  1. mfa_settings - Multi-factor authentication
  2. password_security - Password security tracking
  3. failed_login_attempts - Brute force detection
  4. document_security_metadata - Document security
  5. document_access_log - Document access tracking
  6. security_events - Security monitoring
  7. rate_limit_tracking - Rate limiting
  8. data_retention_policies - Data lifecycle
  9. data_deletion_log - Deletion tracking
  10. compliance_audit_trail - Compliance tracking
  11. security_incidents - Incident response
  12. backup_logs - Backup tracking
  13. disaster_recovery_tests - DR testing
*/

-- MFA Settings
CREATE TABLE IF NOT EXISTS mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text CHECK (mfa_method IN ('totp', 'sms', 'email', 'authenticator')),
  mfa_secret text,
  backup_codes text[],
  mfa_enforced_at timestamptz,
  last_mfa_verification timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_settings_user_id ON mfa_settings(user_id);
ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MFA settings" ON mfa_settings;
CREATE POLICY "Users can view own MFA settings"
  ON mfa_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own MFA settings" ON mfa_settings;
CREATE POLICY "Users can update own MFA settings"
  ON mfa_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert MFA settings" ON mfa_settings;
CREATE POLICY "System can insert MFA settings"
  ON mfa_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Password Security
CREATE TABLE IF NOT EXISTS password_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_changed_at timestamptz DEFAULT now(),
  password_expires_at timestamptz,
  must_change_password boolean DEFAULT false,
  password_strength_score integer CHECK (password_strength_score BETWEEN 0 AND 4),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_security_user_id ON password_security(user_id);
ALTER TABLE password_security ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own password security" ON password_security;
CREATE POLICY "Users can view own password security"
  ON password_security FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert password security" ON password_security;
CREATE POLICY "System can insert password security"
  ON password_security FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all password security" ON password_security;
CREATE POLICY "Admins can view all password security"
  ON password_security FOR SELECT TO authenticated
  USING (is_admin());

-- Failed Login Attempts
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  failure_reason text,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  account_locked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert failed login attempts" ON failed_login_attempts;
CREATE POLICY "System can insert failed login attempts"
  ON failed_login_attempts FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all failed login attempts" ON failed_login_attempts;
CREATE POLICY "Admins can view all failed login attempts"
  ON failed_login_attempts FOR SELECT TO authenticated
  USING (is_admin());

-- Document Security Metadata
CREATE TABLE IF NOT EXISTS document_security_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_type text NOT NULL,
  original_filename text NOT NULL,
  sanitized_filename text NOT NULL,
  file_extension text NOT NULL,
  file_size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  malware_scan_status text DEFAULT 'pending' CHECK (malware_scan_status IN ('pending', 'clean', 'infected', 'failed')),
  malware_scan_date timestamptz,
  encryption_status text DEFAULT 'encrypted',
  storage_location text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  upload_ip_address text,
  retention_period_days integer DEFAULT 2555,
  deletion_scheduled_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_security_document_id ON document_security_metadata(document_id);
ALTER TABLE document_security_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own document security" ON document_security_metadata;
CREATE POLICY "Users can view own document security"
  ON document_security_metadata FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "System can insert document security" ON document_security_metadata;
CREATE POLICY "System can insert document security"
  ON document_security_metadata FOR INSERT TO authenticated
  WITH CHECK (true);

-- Document Access Log
CREATE TABLE IF NOT EXISTS document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_name text NOT NULL,
  accessed_by uuid NOT NULL REFERENCES auth.users(id),
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'edit', 'delete', 'share')),
  ip_address text NOT NULL,
  user_agent text,
  watermark_applied boolean DEFAULT false,
  watermark_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_document_id ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_user ON document_access_log(accessed_by);
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own document access" ON document_access_log;
CREATE POLICY "Users can view own document access"
  ON document_access_log FOR SELECT TO authenticated
  USING (accessed_by = auth.uid());

DROP POLICY IF EXISTS "System can insert document access" ON document_access_log;
CREATE POLICY "System can insert document access"
  ON document_access_log FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all document access" ON document_access_log;
CREATE POLICY "Admins can view all document access"
  ON document_access_log FOR SELECT TO authenticated
  USING (is_admin());

-- Security Events
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  description text NOT NULL,
  risk_score integer CHECK (risk_score BETWEEN 0 AND 100),
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security events" ON security_events;
CREATE POLICY "Admins can view security events"
  ON security_events FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "System can insert security events" ON security_events;
CREATE POLICY "System can insert security events"
  ON security_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Rate Limit Tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz NOT NULL,
  rate_limit_exceeded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_tracking(ip_address);
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limit_tracking;
CREATE POLICY "System can manage rate limits"
  ON rate_limit_tracking FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL,
  table_name text NOT NULL,
  retention_period_days integer NOT NULL,
  retention_basis text NOT NULL,
  auto_delete_enabled boolean DEFAULT false,
  last_purge_date timestamptz,
  next_purge_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage retention policies" ON data_retention_policies;
CREATE POLICY "Admins can manage retention policies"
  ON data_retention_policies FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Data Deletion Log
CREATE TABLE IF NOT EXISTS data_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  record_type text NOT NULL,
  deletion_reason text NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deletion_method text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_deletion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deletion log" ON data_deletion_log;
CREATE POLICY "Admins can view deletion log"
  ON data_deletion_log FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "System can insert deletion log" ON data_deletion_log;
CREATE POLICY "System can insert deletion log"
  ON data_deletion_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Compliance Audit Trail
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_by_role text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  change_reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON compliance_audit_trail(entity_type, entity_id);
ALTER TABLE compliance_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Compliance officers can view audit trail" ON compliance_audit_trail;
CREATE POLICY "Compliance officers can view audit trail"
  ON compliance_audit_trail FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'management', 'compliance_officer', 'mlro')
    )
  );

DROP POLICY IF EXISTS "System can insert compliance audit" ON compliance_audit_trail;
CREATE POLICY "System can insert compliance audit"
  ON compliance_audit_trail FOR INSERT TO authenticated
  WITH CHECK (true);

-- Security Incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text UNIQUE NOT NULL,
  incident_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'reported',
  detected_at timestamptz NOT NULL,
  detected_by uuid REFERENCES auth.users(id),
  incident_summary text NOT NULL,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_number ON security_incidents(incident_number);
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage incidents" ON security_incidents;
CREATE POLICY "Admins can manage incidents"
  ON security_incidents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Backup Logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text UNIQUE NOT NULL,
  backup_type text NOT NULL,
  backup_status text NOT NULL,
  backup_location text NOT NULL,
  backup_size_bytes bigint,
  retention_period_days integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_id ON backup_logs(backup_id);
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view backup logs" ON backup_logs;
CREATE POLICY "Admins can view backup logs"
  ON backup_logs FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "System can manage backups" ON backup_logs;
CREATE POLICY "System can manage backups"
  ON backup_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Disaster Recovery Tests
CREATE TABLE IF NOT EXISTS disaster_recovery_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text UNIQUE NOT NULL,
  test_type text NOT NULL,
  test_status text NOT NULL,
  test_results text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  next_test_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disaster_recovery_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage DR tests" ON disaster_recovery_tests;
CREATE POLICY "Admins can manage DR tests"
  ON disaster_recovery_tests FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Seed retention policies
INSERT INTO data_retention_policies (data_type, table_name, retention_period_days, retention_basis, auto_delete_enabled)
VALUES
  ('KYC Documents', 'client_documents', 2555, 'AML regulations - 7 years', false),
  ('Assessment Records', 'assessments', 2555, 'Regulatory compliance - 7 years', false),
  ('Audit Logs', 'audit_logs', 2555, 'Regulatory compliance - 7 years', false),
  ('Login History', 'login_history', 1095, 'Security monitoring - 3 years', true),
  ('Failed Login Attempts', 'failed_login_attempts', 90, 'Security monitoring - 90 days', true),
  ('Security Events', 'security_events', 1825, 'Security audit - 5 years', false)
ON CONFLICT DO NOTHING;
