/*
  # Add launch_smoke_test to subscription_plans tier constraint

  Temporarily widens the tier CHECK constraint to allow the internal smoke-test
  plan used for launch E2E payment verification.
*/

ALTER TABLE subscription_plans
  DROP CONSTRAINT subscription_plans_tier_check;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier = ANY (ARRAY[
    'solo', 'small_firm', 'medium_firm', 'large_firm', 'launch_smoke_test'
  ]));
