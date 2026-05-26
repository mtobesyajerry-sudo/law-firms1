/*
  # Add launch_smoke_test to organizations subscription_tier constraint

  Widens the organizations.subscription_tier CHECK constraint to allow
  the internal smoke-test tier used for launch E2E payment verification.
  Remove after launch.
*/

ALTER TABLE organizations
  DROP CONSTRAINT organizations_subscription_tier_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY[
    'small_firm', 'medium_firm', 'large_firm', 'launch_smoke_test'
  ]));
