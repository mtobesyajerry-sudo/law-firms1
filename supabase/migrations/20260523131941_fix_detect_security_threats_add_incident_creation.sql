/*
  # Final detect_security_threats() — add incident auto-creation block

  The live function body (a version predating our migrations) lacks the
  security_incidents auto-creation block. This migration replaces the function
  with the complete version that:

  1. Keeps the working detection rules already in place (brute_force, 
     credential_stuffing, abnormal_data_access) with their proven thresholds
  2. Adds the missing incident auto-creation for high/critical threats
  3. Maps threat_type → alert_type correctly for suspicious_activity_alerts:
     - brute_force / credential_stuffing → 'multiple_failed_logins'
     - abnormal_data_access → 'unusual_access_pattern'
  4. Uses actual security_incidents column names (incident_number, incident_type,
     incident_summary) confirmed from schema inspection
*/
CREATE OR REPLACE FUNCTION detect_security_threats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec       RECORD;
  v_threat_id uuid;
BEGIN

  -- ── Rule 1: Brute force ────────────────────────────────────────────────────
  -- 10+ total failed attempts from same IP in 15 minutes
  FOR v_rec IN
    SELECT ip_address, SUM(attempt_count) AS total_attempts
    FROM failed_login_attempts
    WHERE last_attempt_at >= NOW() - INTERVAL '15 minutes'
    GROUP BY ip_address
    HAVING SUM(attempt_count) >= 10
  LOOP
    INSERT INTO threat_detections (
      threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      'brute_force', 'high', 0.90,
      jsonb_build_object(
        'ip_address',    v_rec.ip_address,
        'attempt_count', v_rec.total_attempts,
        'time_window',   '15 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Rule 2: Credential stuffing ────────────────────────────────────────────
  -- 10+ distinct emails from same IP failing in 10 minutes
  FOR v_rec IN
    SELECT ip_address, COUNT(DISTINCT email) AS distinct_emails
    FROM login_history
    WHERE created_at >= NOW() - INTERVAL '10 minutes'
      AND success = false
    GROUP BY ip_address
    HAVING COUNT(DISTINCT email) >= 10
  LOOP
    INSERT INTO threat_detections (
      threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      'credential_stuffing', 'critical', 0.95,
      jsonb_build_object(
        'ip_address',      v_rec.ip_address,
        'distinct_emails', v_rec.distinct_emails,
        'time_window',     '10 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Rule 3: Abnormal data access ───────────────────────────────────────────
  -- Single user viewing 50+ client records in 5 minutes
  FOR v_rec IN
    SELECT user_id, COUNT(*) AS access_count
    FROM audit_logs
    WHERE action_type = 'client_view'
      AND created_at >= NOW() - INTERVAL '5 minutes'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) >= 50
  LOOP
    INSERT INTO threat_detections (
      user_id, threat_type, severity, confidence_score, detection_details, status
    ) VALUES (
      v_rec.user_id, 'abnormal_data_access', 'high', 0.80,
      jsonb_build_object(
        'access_count', v_rec.access_count,
        'time_window',  '5 minutes'
      ),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Auto-create suspicious_activity_alerts for all new detections ──────────
  FOR v_rec IN
    SELECT id, threat_type, severity, detection_details
    FROM threat_detections
    WHERE status = 'detected'
      AND created_at >= NOW() - INTERVAL '6 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM suspicious_activity_alerts sa
        WHERE sa.metadata->>'threat_detection_id' = threat_detections.id::text
      )
  LOOP
    INSERT INTO suspicious_activity_alerts (
      alert_type, severity, description, status, metadata
    ) VALUES (
      CASE v_rec.threat_type
        WHEN 'brute_force'         THEN 'multiple_failed_logins'
        WHEN 'credential_stuffing' THEN 'multiple_failed_logins'
        ELSE 'unusual_access_pattern'
      END,
      v_rec.severity,
      'Automated threat detected: ' || v_rec.threat_type,
      'open',
      jsonb_build_object(
        'threat_detection_id', v_rec.id,
        'detection_details',   v_rec.detection_details
      )
    );
  END LOOP;

  -- ── Auto-create security_incidents for high/critical detections ────────────
  FOR v_threat_id IN
    SELECT td.id FROM threat_detections td
    WHERE td.severity IN ('high', 'critical')
      AND td.status = 'detected'
      AND td.created_at >= NOW() - INTERVAL '6 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM security_incidents si
        WHERE si.incident_summary ILIKE '%' || td.id::text || '%'
      )
  LOOP
    INSERT INTO security_incidents (
      incident_number, incident_type, severity, status,
      incident_summary, detected_at
    )
    SELECT
      'AUTO-' || UPPER(LEFT(id::text, 8)),
      threat_type,
      severity,
      'open',
      'Automated detection: ' || threat_type || ' | threat_id=' || id::text,
      created_at
    FROM threat_detections
    WHERE id = v_threat_id;
  END LOOP;

END;
$$;
