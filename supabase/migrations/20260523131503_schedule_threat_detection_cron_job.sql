/*
  # Schedule threat_detection_evaluation pg_cron job

  Runs detect_security_threats() every 5 minutes.
  Uses the same get_cron_secret() + hardcoded project URL pattern
  as the existing sanctions refresh cron jobs.

  This migration activates automated threat detection.
*/
SELECT cron.schedule(
  'threat_detection_evaluation',
  '*/5 * * * *',
  $$SELECT detect_security_threats();$$
);
