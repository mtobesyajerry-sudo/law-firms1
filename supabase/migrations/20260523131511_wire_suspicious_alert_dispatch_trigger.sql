/*
  # Alert Dispatch Trigger

  ## What this does
  Creates a Postgres trigger on suspicious_activity_alerts AFTER INSERT that
  calls the dispatch-security-alert Edge Function via pg_net.http_post().

  ## Secret management
  Uses get_cron_secret() (already in place from sanctions cron work) for the
  Authorization Bearer token. The Edge Function is at the same project URL
  already used by the sanctions cron jobs.

  ## Non-blocking
  pg_net.http_post() is fire-and-forget — the trigger returns immediately
  and the HTTP call happens asynchronously. A failure in the Edge Function
  will not roll back the alert INSERT.

  ## Notes
  - SECURITY DEFINER needed so the trigger can call get_cron_secret()
  - get_cron_secret() reads from vault.decrypted_secrets
*/

CREATE OR REPLACE FUNCTION trigger_security_alert_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://oavefbkgwfewgzadhkvs.supabase.co/functions/v1/dispatch-security-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || get_cron_secret(),
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object('alert_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispatch_alert_on_insert ON suspicious_activity_alerts;
CREATE TRIGGER dispatch_alert_on_insert
  AFTER INSERT ON suspicious_activity_alerts
  FOR EACH ROW EXECUTE FUNCTION trigger_security_alert_dispatch();
