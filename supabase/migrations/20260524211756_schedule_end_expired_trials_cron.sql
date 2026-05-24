/*
  # Schedule end_expired_trials() hourly via pg_cron

  Registers a pg_cron job that calls end_expired_trials() once per hour.
  This transitions organizations whose trial_ends_at has passed from
  is_trialing=true to is_trialing=false, preventing indefinite free access.

  Prerequisites: pg_cron extension must be enabled (done in earlier migration).
*/

SELECT cron.schedule(
  'end-expired-trials-hourly',
  '0 * * * *',
  $$SELECT end_expired_trials()$$
);
