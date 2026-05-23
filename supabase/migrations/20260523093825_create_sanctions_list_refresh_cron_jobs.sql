/*
  # Daily sanctions list refresh via pg_cron + pg_net

  ## What this does
  Creates three pg_cron jobs that call the `ingestion-processor` edge function
  once per day, staggered 15 minutes apart in the 02:00–03:00 UTC window:

    - 02:00 UTC  →  OFAC_SDN
    - 02:15 UTC  →  UN_CONSOLIDATED
    - 02:30 UTC  →  UK_HMT_OFSI

  ## Authentication
  Each HTTP request carries the CRON_SECRET as a Bearer token. The secret is
  stored in Supabase Vault (vault.secrets) so it never appears in plain text in
  cron job definitions. A helper function `get_cron_secret()` reads it at
  call-time with SECURITY DEFINER so cron jobs (running as the postgres role)
  can retrieve it.

  ## Notes
  - pg_net performs async HTTP calls; the cron job returns immediately and
    pg_net delivers the request in the background.
  - net.http_post() is in the `public` schema (confirmed by installation).
  - Existing jobs with the same names are removed before re-creation to make
    this migration idempotent.
  - Job names follow the pattern: sanctions_refresh_<LIST_SOURCE>
*/

-- ---------------------------------------------------------------------------
-- 1. Store the CRON_SECRET in Vault
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Insert only if not already present
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'cron_secret'
  ) THEN
    PERFORM vault.create_secret(
      'c7d0a40c7317efa936b5fd8287e6bd25e4e2a56544fbef398dffb14b619fc958',
      'cron_secret',
      'Bearer token used by pg_cron to authenticate ingestion-processor calls'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Helper function: read CRON_SECRET from Vault at call-time
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_cron_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;
$$;

-- Grant execute to postgres so cron jobs can call it
GRANT EXECUTE ON FUNCTION get_cron_secret() TO postgres;

-- ---------------------------------------------------------------------------
-- 3. Remove existing cron jobs (idempotent re-run safety)
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('sanctions_refresh_ofac_sdn')       WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sanctions_refresh_ofac_sdn');
SELECT cron.unschedule('sanctions_refresh_un_consolidated') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sanctions_refresh_un_consolidated');
SELECT cron.unschedule('sanctions_refresh_uk_hmt_ofsi')    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sanctions_refresh_uk_hmt_ofsi');

-- ---------------------------------------------------------------------------
-- 4. Schedule the three daily jobs
-- ---------------------------------------------------------------------------

-- 02:00 UTC — OFAC SDN
SELECT cron.schedule(
  'sanctions_refresh_ofac_sdn',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oavefbkgwfewgzadhkvs.supabase.co/functions/v1/ingestion-processor',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || get_cron_secret()
               ),
    body    := '{"list_source":"OFAC_SDN"}'::jsonb
  );
  $$
);

-- 02:15 UTC — UN Consolidated
SELECT cron.schedule(
  'sanctions_refresh_un_consolidated',
  '15 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oavefbkgwfewgzadhkvs.supabase.co/functions/v1/ingestion-processor',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || get_cron_secret()
               ),
    body    := '{"list_source":"UN_CONSOLIDATED"}'::jsonb
  );
  $$
);

-- 02:30 UTC — UK HMT OFSI
SELECT cron.schedule(
  'sanctions_refresh_uk_hmt_ofsi',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oavefbkgwfewgzadhkvs.supabase.co/functions/v1/ingestion-processor',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || get_cron_secret()
               ),
    body    := '{"list_source":"UK_HMT_OFSI"}'::jsonb
  );
  $$
);
