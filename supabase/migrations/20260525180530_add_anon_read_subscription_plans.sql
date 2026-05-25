/*
  # Allow anonymous users to read active subscription plans

  The pricing page is public (no login required), so unauthenticated visitors
  need SELECT access to subscription_plans.

  Changes:
  - Drop the existing authenticated-only SELECT policy
  - Recreate it to allow both anon and authenticated roles
*/

DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

CREATE POLICY "Public can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
