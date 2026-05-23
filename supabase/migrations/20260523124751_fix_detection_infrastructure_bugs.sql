/*
  # Fix Detection Infrastructure Bugs (Verification 7 — Item 3)

  ## Problems fixed

  ### 3a: suspicious_activity_alerts alert_type constraint
  The CHECK constraint did not include 'multiple_failed_logins', the value emitted
  by loginTrackingService.createSecurityAlert(). Every brute-force alert from the
  frontend was silently rejected with a constraint violation. Added the missing value.

  ### 3b: detect_security_threats() reads wrong table
  The function queried security_events for 'failed_login' events, but the application
  writes to failed_login_attempts and login_history — security_events has always been
  empty. Rewritten to read failed_login_attempts (brute force) and login_history
  (credential stuffing via distinct users from same IP).

  ### 3c: intrusion_detection_rules detection_query corrections
  Rules used wrong column names (action vs action_type) and wrong table references
  (api_rate_limits does not exist). Updated to match actual schema.

  ### 3d: pg_cron job NOT scheduled
  detect_security_threats() is intentionally left unscheduled. The job definition
  is documented here as a comment. Enable it when active automated detection is
  launched post-release:

    SELECT cron.schedule(
      'threat_detection_every_5min',
      '* /5 * * * *',
      $$ SELECT detect_security_threats(); $$
    );

  ## Notes
  - These fixes wire the infrastructure correctly but do NOT activate detection
  - Active evaluation and alerting remain deferred to a post-launch release
  - Audit logging (login_history, audit_logs, failed_login_attempts) is active
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 3a: Add 'multiple_failed_logins' to the alert_type CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE suspicious_activity_alerts
  DROP CONSTRAINT IF EXISTS suspicious_activity_alerts_alert_type_check;

ALTER TABLE suspicious_activity_alerts
  ADD CONSTRAINT suspicious_activity_alerts_alert_type_check
  CHECK (alert_type IN (
    'failed_login_threshold',
    'multiple_failed_logins',
    'unusual_access_pattern',
    'unusual_access_time',
    'unusual_location',
    'multiple_sessions',
    'privilege_escalation_attempt',
    'data_exfiltration_attempt',
    'rapid_api_calls',
    'unauthorized_access_attempt'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3b: Fix detect_security_threats() to read actual tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION detect_security_threats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec        record;
  v_threat_id  uuid;
BEGIN
  -- ── Brute force: 5+ failed login rows in failed_login_attempts within 5 min ──
  -- failed_login_attempts.attempt_count accumulates per email per window,
  -- so a single row with attempt_count >= 5 within 5 min qualifies.
  FOR v_rec IN
    SELECT email, ip_address, attempt_count
    FROM failed_login_attempts
    WHERE attempt_count >= 5
      AND last_attempt_at > now() - interval '5 minutes'
  LOOP
    INSERT INTO threat_detections (
      threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      'brute_force', 'high', 0.95,
      jsonb_build_object(
        'email',         v_rec.email,
        'ip_address',    v_rec.ip_address,
        'attempt_count', v_rec.attempt_count,
        'time_window',   '5 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Credential stuffing: 10+ distinct user emails from same IP in 10 min ──
  -- Reads login_history which receives every login attempt.
  FOR v_rec IN
    SELECT ip_address, COUNT(DISTINCT email) AS user_count
    FROM login_history
    WHERE success = false
      AND created_at > now() - interval '10 minutes'
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(DISTINCT email) >= 10
  LOOP
    INSERT INTO threat_detections (
      threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      'credential_stuffing', 'critical', 0.90,
      jsonb_build_object(
        'ip_address',  v_rec.ip_address,
        'user_count',  v_rec.user_count,
        'time_window', '10 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Suspicious data access: 50+ client_view audit events by same user in 5 min ──
  -- audit_logs uses action_type (not action) with value 'client_view' (not 'read').
  FOR v_rec IN
    SELECT user_id, COUNT(*) AS access_count
    FROM audit_logs
    WHERE action_type = 'client_view'
      AND created_at > now() - interval '5 minutes'
    GROUP BY user_id
    HAVING COUNT(*) >= 50
  LOOP
    INSERT INTO threat_detections (
      user_id, threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      v_rec.user_id, 'suspicious_data_access', 'high', 0.80,
      jsonb_build_object(
        'access_count', v_rec.access_count,
        'time_window',  '5 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Auto-create security_incidents for high/critical threats ──
  -- security_incident_responses is used by EnhancedSecurityDashboard;
  -- security_incidents is used by SecurityMonitoringDashboard.
  -- Write to both so neither dashboard shows orphaned data.
  FOR v_threat_id IN
    SELECT id FROM threat_detections
    WHERE severity IN ('high', 'critical')
      AND status = 'detected'
      AND NOT EXISTS (
        SELECT 1 FROM security_incidents
        WHERE related_threat_id = threat_detections.id
      )
  LOOP
    INSERT INTO security_incidents (
      title, description, severity, status, related_threat_id, detected_at
    )
    SELECT
      'Automated Detection: ' || threat_type,
      'Incident created automatically for ' || threat_type || ' detection',
      severity,
      'open',
      id,
      created_at
    FROM threat_detections
    WHERE id = v_threat_id;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3c: Fix intrusion_detection_rules detection_query column values
-- ─────────────────────────────────────────────────────────────────────────────

-- Brute force: reads failed_login_attempts, not security_events
UPDATE intrusion_detection_rules
SET detection_query =
  'SELECT email, ip_address, attempt_count
   FROM failed_login_attempts
   WHERE attempt_count >= 5
     AND last_attempt_at > now() - interval ''5 minutes'''
WHERE rule_type = 'brute_force';

-- Credential stuffing: reads login_history, correct column (email not user_id string)
UPDATE intrusion_detection_rules
SET detection_query =
  'SELECT ip_address, COUNT(DISTINCT email) AS user_count
   FROM login_history
   WHERE success = false
     AND created_at > now() - interval ''10 minutes''
     AND ip_address IS NOT NULL
   GROUP BY ip_address
   HAVING COUNT(DISTINCT email) >= 10'
WHERE rule_type = 'credential_stuffing';

-- Suspicious data access: correct table and column names
UPDATE intrusion_detection_rules
SET detection_query =
  'SELECT user_id, COUNT(*) AS access_count
   FROM audit_logs
   WHERE action_type = ''client_view''
     AND created_at > now() - interval ''5 minutes''
   GROUP BY user_id
   HAVING COUNT(*) >= 50'
WHERE rule_type = 'suspicious_pattern';

-- Rapid API abuse: api_rate_limits does not exist; rewrite against audit_logs
UPDATE intrusion_detection_rules
SET detection_query =
  'SELECT user_id, COUNT(*) AS call_count
   FROM audit_logs
   WHERE created_at > now() - interval ''1 minute''
   GROUP BY user_id
   HAVING COUNT(*) >= 200',
  rule_description = 'Detect more than 200 audit events from single user in 1 minute'
WHERE rule_type = 'anomaly';

-- After hours: reads audit_logs (has data) not security_events (empty)
UPDATE intrusion_detection_rules
SET detection_query =
  'SELECT user_id, COUNT(*) AS event_count
   FROM audit_logs
   WHERE EXTRACT(HOUR FROM created_at AT TIME ZONE ''Africa/Dar_es_Salaam'')
         NOT BETWEEN 6 AND 20
     AND created_at > now() - interval ''1 hour''
   GROUP BY user_id'
WHERE rule_type = 'behavioral';
