/*
  # Schedule payment-poller via pg_cron

  Registers a cron job that POSTs to the payment-poller Edge Function every 5 minutes.
  This provides an automated fallback for ClickPesa payments whose webhook was never
  delivered (e.g. Test B scenario).

  The job uses pg_net's net.http_post() to call the Edge Function with the service-role
  key so no JWT auth is needed from the cron context.

  Notes:
  - pg_cron and pg_net extensions must already be enabled (done in prior migrations).
  - The job is named 'payment-poller' for easy identification / disabling.
  - Unschedule with: SELECT cron.unschedule('payment-poller');
*/

SELECT cron.unschedule('payment-poller')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'payment-poller'
);

SELECT cron.schedule(
  'payment-poller',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM system_settings WHERE key = 'supabase_functions_url') || '/payment-poller',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'supabase_service_role_key')
    ),
    body    := '{}'::jsonb
  )
  $$
);
