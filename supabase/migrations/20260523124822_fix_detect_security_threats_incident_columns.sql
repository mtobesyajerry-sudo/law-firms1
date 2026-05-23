/*
  # Fix detect_security_threats: security_incidents column mismatch

  security_incidents schema:
    id, incident_number, incident_type, severity, status,
    detected_at, detected_by, incident_summary, resolution_notes,
    resolved_at, created_at

  No 'title', 'description', or 'related_threat_id' columns exist.
  The auto-incident creation block is updated to use actual column names.
  incident_number generated as a short unique string from the threat UUID.
*/
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
  -- Brute force: 5+ failed attempts in failed_login_attempts within 5 min
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

  -- Credential stuffing: 10+ distinct emails from same IP in login_history within 10 min
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

  -- Suspicious data access: 50+ client_view events by same user in 5 min
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

  -- Auto-create security_incidents for high/critical unmatched threats
  -- Uses actual security_incidents columns: incident_type, severity, status,
  -- incident_summary, detected_at, incident_number
  FOR v_threat_id IN
    SELECT td.id FROM threat_detections td
    WHERE td.severity IN ('high', 'critical')
      AND td.status = 'detected'
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
