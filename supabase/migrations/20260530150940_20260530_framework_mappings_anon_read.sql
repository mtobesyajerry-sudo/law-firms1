/*
  # Allow anon read on dnfbp_framework_mappings

  ## Summary
  The public registration page loads category options before a user has signed in
  (anon role). The existing SELECT policy is restricted to 'authenticated', so the
  dropdown returns zero rows for unauthenticated visitors.

  dnfbp_framework_mappings contains only reference/routing data: category labels and
  framework_type values. No tenant data, no PII. Anon read with USING (true) is
  appropriate here, consistent with other public reference tables (sanctions lists,
  subscription plans).

  ## Changes
  - Add SELECT policy for anon role with USING (true).
  - Existing authenticated SELECT, and all admin INSERT/UPDATE/DELETE policies are
    left completely unchanged.
  - No anon write access is granted.
*/

CREATE POLICY "framework_mappings_anon_read"
  ON dnfbp_framework_mappings
  FOR SELECT
  TO anon
  USING (true);
