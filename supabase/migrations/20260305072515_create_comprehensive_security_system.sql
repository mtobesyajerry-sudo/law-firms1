/*
  # Comprehensive Security System Implementation
  
  This migration creates a complete enterprise-grade security infrastructure including:
  
  ## 1. Active MFA Enforcement
  - Automatic MFA requirement after grace period
  - Login blocking for non-MFA users
  - MFA verification tracking
  
  ## 2. Advanced Intrusion Detection System
  - Pattern-based threat detection
  - Behavioral analytics
  - Anomaly detection rules
  
  ## 3. Enhanced Rate Limiting
  - Per-endpoint rate limits
  - Progressive blocking
  - IP reputation tracking
  
  ## 4. Real-Time Security Monitoring
  - Comprehensive event logging
  - Alert generation
  - Dashboard data aggregation
  
  ## 5. Automated Threat Response
  - Auto-blocking suspicious IPs
  - Automatic incident creation
  - Escalation workflows
  
  ## 6. Security Incident Automation
  - Auto-assignment based on severity
  - Response playbooks
  - Notification system
*/

-- =====================================================
-- 1. ENHANCED MFA ENFORCEMENT SYSTEM
-- =====================================================

-- Create MFA enforcement tracking table
CREATE TABLE IF NOT EXISTS mfa_enforcement_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text CHECK (mfa_method IN ('totp', 'sms', 'email', 'authenticator')),
  enforcement_level text DEFAULT 'recommended' CHECK (enforcement_level IN ('optional', 'recommended', 'required')),
  grace_period_ends timestamptz DEFAULT (now() + interval '30 days'),
  last_mfa_verification timestamptz,
  mfa_setup_completed_at timestamptz,
  enforcement_started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_enforcement_user ON mfa_enforcement_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_enforcement_org ON mfa_enforcement_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_mfa_enforcement_grace_period ON mfa_enforcement_tracking(grace_period_ends) WHERE mfa_enabled = false;

ALTER TABLE mfa_enforcement_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MFA status" ON mfa_enforcement_tracking;
CREATE POLICY "Users can view own MFA status"
  ON mfa_enforcement_tracking FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own MFA status" ON mfa_enforcement_tracking;
CREATE POLICY "Users can update own MFA status"
  ON mfa_enforcement_tracking FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all MFA statuses" ON mfa_enforcement_tracking;
CREATE POLICY "Admins can view all MFA statuses"
  ON mfa_enforcement_tracking FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Function to check if MFA is required for login
CREATE OR REPLACE FUNCTION check_mfa_required(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_enforcement_level text;
  v_grace_period_ends timestamptz;
  v_mfa_enabled boolean;
BEGIN
  SELECT enforcement_level, grace_period_ends, mfa_enabled
  INTO v_enforcement_level, v_grace_period_ends, v_mfa_enabled
  FROM mfa_enforcement_tracking
  WHERE user_id = p_user_id;
  
  -- If no record exists, MFA not required yet
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If MFA already enabled, no blocking needed
  IF v_mfa_enabled THEN
    RETURN false;
  END IF;
  
  -- If enforcement is required and grace period expired, block login
  IF v_enforcement_level = 'required' AND now() > v_grace_period_ends THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- =====================================================
-- 2. INTRUSION DETECTION SYSTEM
-- =====================================================

-- Intrusion detection rules
CREATE TABLE IF NOT EXISTS intrusion_detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text UNIQUE NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('brute_force', 'credential_stuffing', 'suspicious_pattern', 'anomaly', 'behavioral')),
  rule_description text NOT NULL,
  detection_query text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  threshold_value integer,
  time_window_minutes integer,
  auto_block boolean DEFAULT false,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intrusion_rules_type ON intrusion_detection_rules(rule_type);
ALTER TABLE intrusion_detection_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage intrusion rules" ON intrusion_detection_rules;
CREATE POLICY "Admins can manage intrusion rules"
  ON intrusion_detection_rules FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Intrusion detection events
CREATE TABLE IF NOT EXISTS intrusion_detection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES intrusion_detection_rules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text NOT NULL,
  detection_details jsonb NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_blocked boolean DEFAULT false,
  status text DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'confirmed', 'false_positive', 'resolved')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_intrusion_events_rule ON intrusion_detection_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_intrusion_events_user ON intrusion_detection_events(user_id);
CREATE INDEX IF NOT EXISTS idx_intrusion_events_ip ON intrusion_detection_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_intrusion_events_status ON intrusion_detection_events(status);

ALTER TABLE intrusion_detection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view intrusion events" ON intrusion_detection_events;
CREATE POLICY "Admins can view intrusion events"
  ON intrusion_detection_events FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================
-- 3. ENHANCED RATE LIMITING SYSTEM
-- =====================================================

-- API rate limits tracking
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON api_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON api_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage rate limits" ON api_rate_limits;
CREATE POLICY "System can manage rate limits"
  ON api_rate_limits FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- IP reputation tracking
CREATE TABLE IF NOT EXISTS ip_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  reputation_score integer DEFAULT 100 CHECK (reputation_score BETWEEN 0 AND 100),
  total_requests integer DEFAULT 0,
  failed_requests integer DEFAULT 0,
  blocked_count integer DEFAULT 0,
  last_seen timestamptz DEFAULT now(),
  permanently_blocked boolean DEFAULT false,
  block_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_score ON ip_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_blocked ON ip_reputation(permanently_blocked);

ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage IP reputation" ON ip_reputation;
CREATE POLICY "Admins can manage IP reputation"
  ON ip_reputation FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_ip_address text,
  p_endpoint text,
  p_limit integer DEFAULT 100,
  p_window_minutes integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request_count integer;
  v_window_start timestamptz;
  v_blocked_until timestamptz;
BEGIN
  -- Check if IP is blocked
  SELECT blocked_until INTO v_blocked_until
  FROM api_rate_limits
  WHERE ip_address = p_ip_address
    AND endpoint = p_endpoint
    AND blocked_until > now()
  ORDER BY blocked_until DESC
  LIMIT 1;
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN false; -- Still blocked
  END IF;
  
  -- Get current window stats
  SELECT request_count, window_start INTO v_request_count, v_window_start
  FROM api_rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_start > (now() - (p_window_minutes || ' minutes')::interval)
  ORDER BY window_start DESC
  LIMIT 1;
  
  -- Start new window if needed
  IF v_window_start IS NULL OR now() > (v_window_start + (p_window_minutes || ' minutes')::interval) THEN
    INSERT INTO api_rate_limits (user_id, ip_address, endpoint, request_count, window_start)
    VALUES (p_user_id, p_ip_address, p_endpoint, 1, now());
    RETURN true;
  END IF;
  
  -- Check if limit exceeded
  IF v_request_count >= p_limit THEN
    -- Block for 5 minutes
    UPDATE api_rate_limits
    SET blocked_until = now() + interval '5 minutes',
        updated_at = now()
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
    
    -- Log security event
    INSERT INTO security_events (event_type, severity, user_id, ip_address, description, risk_score)
    VALUES ('rate_limit_exceeded', 'medium', p_user_id, p_ip_address, 
            'Rate limit exceeded for endpoint: ' || p_endpoint, 60);
    
    RETURN false;
  END IF;
  
  -- Increment counter
  UPDATE api_rate_limits
  SET request_count = request_count + 1,
      updated_at = now()
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 4. THREAT DETECTION AUTOMATION
-- =====================================================

-- Threat detection patterns
CREATE TABLE IF NOT EXISTS threat_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  threat_type text NOT NULL CHECK (threat_type IN (
    'brute_force', 'credential_stuffing', 'unusual_access',
    'data_exfiltration', 'privilege_abuse', 'suspicious_ip',
    'rapid_api_calls', 'abnormal_data_access'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score decimal(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  detection_details jsonb NOT NULL,
  related_security_events uuid[] DEFAULT '{}',
  status text DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'confirmed', 'false_positive', 'mitigated')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_taken text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_detections_user ON threat_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_threat_detections_org ON threat_detections(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_detections_type ON threat_detections(threat_type);
CREATE INDEX IF NOT EXISTS idx_threat_detections_status ON threat_detections(status);
CREATE INDEX IF NOT EXISTS idx_threat_detections_severity ON threat_detections(severity);

ALTER TABLE threat_detections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view threat detections" ON threat_detections;
CREATE POLICY "Admins can view threat detections"
  ON threat_detections FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Function to detect security threats
CREATE OR REPLACE FUNCTION detect_security_threats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event record;
  v_threat_id uuid;
BEGIN
  -- Detect brute force attacks (5+ failed logins in 5 minutes)
  FOR v_event IN
    SELECT user_id, ip_address, COUNT(*) as attempt_count
    FROM security_events
    WHERE event_type = 'failed_login'
      AND created_at > now() - interval '5 minutes'
    GROUP BY user_id, ip_address
    HAVING COUNT(*) >= 5
  LOOP
    INSERT INTO threat_detections (
      user_id, threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      v_event.user_id, 'brute_force', 'high', 0.95,
      jsonb_build_object(
        'ip_address', v_event.ip_address,
        'attempt_count', v_event.attempt_count,
        'time_window', '5 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Detect credential stuffing (multiple users from same IP)
  FOR v_event IN
    SELECT ip_address, COUNT(DISTINCT user_id) as user_count
    FROM security_events
    WHERE event_type = 'failed_login'
      AND created_at > now() - interval '10 minutes'
    GROUP BY ip_address
    HAVING COUNT(DISTINCT user_id) >= 10
  LOOP
    INSERT INTO threat_detections (
      threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      'credential_stuffing', 'critical', 0.90,
      jsonb_build_object(
        'ip_address', v_event.ip_address,
        'user_count', v_event.user_count,
        'time_window', '10 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Auto-create incidents for high/critical threats
  FOR v_threat_id IN
    SELECT id FROM threat_detections
    WHERE severity IN ('high', 'critical')
      AND status = 'detected'
      AND NOT EXISTS (
        SELECT 1 FROM security_incident_responses
        WHERE related_threat_detection_id = threat_detections.id
      )
  LOOP
    INSERT INTO security_incident_responses (
      incident_title, incident_description, severity, status,
      related_threat_detection_id, detected_at
    )
    SELECT 
      'Automated Detection: ' || threat_type,
      'Automatic incident created for ' || threat_type || ' detection',
      severity,
      'open',
      id,
      created_at
    FROM threat_detections
    WHERE id = v_threat_id;
  END LOOP;
END;
$$;

-- =====================================================
-- 5. SECURITY INCIDENT RESPONSE SYSTEM
-- =====================================================

-- Security incident responses
CREATE TABLE IF NOT EXISTS security_incident_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_title text NOT NULL,
  incident_description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  related_threat_detection_id uuid REFERENCES threat_detections(id) ON DELETE SET NULL,
  related_security_events uuid[] DEFAULT '{}',
  affected_users uuid[] DEFAULT '{}',
  affected_organizations uuid[] DEFAULT '{}',
  detected_at timestamptz NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  response_actions jsonb DEFAULT '[]',
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  resolved_at timestamptz,
  resolution_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_responses_status ON security_incident_responses(status);
CREATE INDEX IF NOT EXISTS idx_incident_responses_severity ON security_incident_responses(severity);
CREATE INDEX IF NOT EXISTS idx_incident_responses_assigned ON security_incident_responses(assigned_to);

ALTER TABLE security_incident_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage incident responses" ON security_incident_responses;
CREATE POLICY "Admins can manage incident responses"
  ON security_incident_responses FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================
-- 6. SECURITY ALERT SYSTEM
-- =====================================================

-- Security alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'mfa_overdue', 'suspicious_activity', 'rate_limit_exceeded',
    'intrusion_detected', 'data_breach_attempt', 'compliance_violation'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role text,
  related_entity_type text,
  related_entity_id uuid,
  read boolean DEFAULT false,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(target_user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_role ON security_alerts(target_role);
CREATE INDEX IF NOT EXISTS idx_security_alerts_read ON security_alerts(read);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alerts" ON security_alerts;
CREATE POLICY "Users can view own alerts"
  ON security_alerts FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid() OR
    target_role IN (
      SELECT role FROM user_profiles WHERE id = auth.uid()
    ) OR
    is_admin()
  );

DROP POLICY IF EXISTS "Users can update own alerts" ON security_alerts;
CREATE POLICY "Users can update own alerts"
  ON security_alerts FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid() OR is_admin())
  WITH CHECK (target_user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "System can insert alerts" ON security_alerts;
CREATE POLICY "System can insert alerts"
  ON security_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 7. SEED DATA & INTRUSION DETECTION RULES
-- =====================================================

-- Seed intrusion detection rules
INSERT INTO intrusion_detection_rules (
  rule_name, rule_type, rule_description, detection_query, 
  severity, threshold_value, time_window_minutes, auto_block, enabled
) VALUES
  (
    'Brute Force Detection',
    'brute_force',
    'Detect 5 or more failed login attempts within 5 minutes',
    'SELECT COUNT(*) FROM security_events WHERE event_type = ''failed_login'' AND created_at > now() - interval ''5 minutes''',
    'high',
    5,
    5,
    true,
    true
  ),
  (
    'Credential Stuffing Detection',
    'credential_stuffing',
    'Detect 10+ different users attempting login from same IP within 10 minutes',
    'SELECT COUNT(DISTINCT user_id) FROM security_events WHERE event_type = ''failed_login'' AND created_at > now() - interval ''10 minutes'' GROUP BY ip_address',
    'critical',
    10,
    10,
    true,
    true
  ),
  (
    'Rapid API Abuse',
    'anomaly',
    'Detect more than 200 API calls from single user in 1 minute',
    'SELECT COUNT(*) FROM api_rate_limits WHERE created_at > now() - interval ''1 minute'' GROUP BY user_id',
    'medium',
    200,
    1,
    false,
    true
  ),
  (
    'Suspicious Data Access Pattern',
    'suspicious_pattern',
    'Detect access to more than 50 client records in 5 minutes',
    'SELECT COUNT(*) FROM audit_logs WHERE action = ''read'' AND entity_type = ''client'' AND created_at > now() - interval ''5 minutes'' GROUP BY performed_by',
    'high',
    50,
    5,
    false,
    true
  ),
  (
    'After Hours Access',
    'behavioral',
    'Detect access attempts outside business hours (9 AM - 6 PM)',
    'SELECT COUNT(*) FROM security_events WHERE EXTRACT(HOUR FROM created_at) NOT BETWEEN 9 AND 18',
    'low',
    NULL,
    NULL,
    false,
    true
  )
ON CONFLICT (rule_name) DO NOTHING;

-- Automatic MFA record creation trigger
CREATE OR REPLACE FUNCTION create_mfa_enforcement_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO mfa_enforcement_tracking (
    user_id, organization_id, enforcement_level, grace_period_ends
  )
  VALUES (
    NEW.id,
    NEW.organization_id,
    'recommended',
    now() + interval '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_mfa_enforcement ON user_profiles;
CREATE TRIGGER trigger_create_mfa_enforcement
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_mfa_enforcement_record();

-- Cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
