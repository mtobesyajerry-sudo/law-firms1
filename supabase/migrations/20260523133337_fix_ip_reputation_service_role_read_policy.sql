/*
  # Fix ip_reputation RLS for Edge Function service role reads

  ## Problem
  The isBlockedIP() check in admin Edge Functions uses the service role key to
  query ip_reputation. However the only existing policy requires is_admin(),
  which needs an authenticated user context. The service role client has no
  auth.uid(), so is_admin() returns false and the query returns no rows —
  causing isBlockedIP() to silently return false even for permanently_blocked IPs.

  ## Fix
  Add a SELECT policy that allows the service_role to read ip_reputation rows.
  The service_role is trusted infrastructure — it never reaches end users.
  All write operations remain admin-only.
*/

CREATE POLICY "Service role can read ip_reputation for blocking checks"
  ON ip_reputation
  FOR SELECT
  TO service_role
  USING (true);
