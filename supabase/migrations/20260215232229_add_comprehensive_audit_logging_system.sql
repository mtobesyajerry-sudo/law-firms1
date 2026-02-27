-- Comprehensive Audit Logging System
-- 
-- Overview: Complete audit logging for KYC/AML compliance tracking
-- 
-- Tables Created:
-- 1. audit_logs - Central event tracking (logins, edits, access)
-- 2. login_history - Detailed login attempt tracking with IP and MFA status
-- 3. document_access_logs - Track all document views and downloads
-- 4. user_sessions - Active session management with timeout
-- 5. suspicious_activity_alerts - Security event tracking and alerting
-- 
-- Security: RLS enabled on all tables, admin-only read access, append-only logs

-- 1. Audit Logs - Central logging table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('authentication', 'data_access', 'data_modification', 'system', 'security')),
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  target_table text,
  target_record_id uuid,
  action_description text NOT NULL,
  ip_address text,
  user_agent text,
  request_url text,
  old_values jsonb,
  new_values jsonb,
  success boolean DEFAULT true,
  error_message text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Login History
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  success boolean NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  location text,
  failure_reason text,
  mfa_used boolean DEFAULT false,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Document Access Logs
CREATE TABLE IF NOT EXISTS document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  document_id uuid,
  document_name text NOT NULL,
  document_type text,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'print', 'delete')),
  client_id uuid,
  assessment_id uuid REFERENCES assessments(id),
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_access_user_id ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_document_id ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_created_at ON document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_client_id ON document_access_logs(client_id);

ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all document access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert document access logs"
  ON document_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_token text UNIQUE NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  terminated_at timestamptz,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can manage own sessions"
  ON user_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Suspicious Activity Alerts
CREATE TABLE IF NOT EXISTS suspicious_activity_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_user_id ON suspicious_activity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_resolved ON suspicious_activity_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_severity ON suspicious_activity_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_created_at ON suspicious_activity_alerts(created_at DESC);

ALTER TABLE suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
  ON suspicious_activity_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert alerts"
  ON suspicious_activity_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
  ON suspicious_activity_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Function to log assessment changes
CREATE OR REPLACE FUNCTION log_assessment_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      new_values,
      success
    ) VALUES (
      'assessment_created',
      'data_modification',
      NEW.user_id,
      'assessments',
      NEW.id,
      'Assessment created for ' || (SELECT organization_name FROM organizations WHERE id = NEW.organization_id),
      to_jsonb(NEW),
      true
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      old_values,
      new_values,
      success
    ) VALUES (
      'assessment_updated',
      'data_modification',
      auth.uid(),
      'assessments',
      NEW.id,
      'Assessment updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      true
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      old_values,
      success
    ) VALUES (
      'assessment_deleted',
      'data_modification',
      auth.uid(),
      'assessments',
      OLD.id,
      'Assessment deleted',
      to_jsonb(OLD),
      true
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assessment logging
DROP TRIGGER IF EXISTS trigger_log_assessment_changes ON assessments;
CREATE TRIGGER trigger_log_assessment_changes
  AFTER INSERT OR UPDATE OR DELETE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION log_assessment_changes();

-- Function to log user profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_user_id,
      target_table,
      target_record_id,
      action_description,
      old_values,
      new_values,
      success
    ) VALUES (
      'role_changed',
      'security',
      auth.uid(),
      NEW.id,
      'user_profiles',
      NEW.id,
      'User role changed from ' || OLD.role || ' to ' || NEW.role,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user profile logging
DROP TRIGGER IF EXISTS trigger_log_user_profile_changes ON user_profiles;
CREATE TRIGGER trigger_log_user_profile_changes
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_profile_changes();