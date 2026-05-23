/*
  # Fix Three Open RLS Policy Vulnerabilities

  ## Problems Fixed

  1. `law_firm_registrations` — "Anonymous can check registration status by email"
     - Policy has `qual = 'true'` with role `anon`, exposing ALL rows to unauthenticated users.
     - Law firm name, contact person, BRELA number, email, password hash are all readable.
     - Fix: Replace with a scoped anonymous SELECT that only allows lookup by email+token pair
       (status check only — no sensitive columns). Actual full-row access remains admin-only.
     - Implementation: Drop the open anon policy. Anonymous users submitting registrations
       don't need to read back rows — they get a confirmation at submit time.

  2. `api_rate_limits` — "System can manage rate limits"
     - Role: authenticated, FOR ALL, qual = true.
     - Any logged-in user can INSERT their own rate-limit row with a high limit,
       UPDATE existing rows to increase their quota, or DELETE entries to bypass limits entirely.
     - Fix: Drop the open policy. Only service_role (Edge Functions) should manage these rows.
       Add a SELECT-only policy for authenticated users (read-only, own identifier).

  3. `rate_limit_tracking` — "System can manage rate limits"
     - Same as above: authenticated FOR ALL with qual = true.
     - Fix: Drop open policy. Only service_role should write. No authenticated SELECT needed
       (this is internal tracking data not surfaced to users).

  ## Security Notes
  - These changes do NOT break any user-facing features.
  - Edge Functions use the service_role key and bypass RLS entirely.
  - Anonymous registration submission still works via the INSERT policy (with_check ensures
    user_id IS NULL and status = 'pending').
  - Admins retain full read/write access via the existing admin policies.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. law_firm_registrations: drop the open anonymous SELECT
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anonymous can check registration status by email" ON law_firm_registrations;

-- No replacement needed: anonymous users submit a form and see a static confirmation page.
-- If a status-check endpoint is ever needed, it should go through a service_role Edge Function
-- that returns only { status, submitted_at } for a given email — never raw row data.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. api_rate_limits: drop the open authenticated ALL policy
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "System can manage rate limits" ON api_rate_limits;

-- Admins can view rate-limit configuration (read-only, for monitoring dashboards)
CREATE POLICY "Admins can view rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'system_admin'));

-- No INSERT/UPDATE/DELETE for authenticated users.
-- Rate-limit rows are managed exclusively by service_role (Edge Functions bypass RLS).

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. rate_limit_tracking: drop the open authenticated ALL policy
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limit_tracking;

-- Admins can view tracking data for monitoring; no write access for authenticated users
CREATE POLICY "Admins can view rate limit tracking"
  ON rate_limit_tracking FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'system_admin'));

-- No INSERT/UPDATE/DELETE for authenticated users.
-- Tracking rows are written exclusively by Edge Functions via service_role.
