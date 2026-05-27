/*
  # Add public_visible flag to subscription_plans

  ## Change
  - Adds `public_visible boolean NOT NULL DEFAULT true` to subscription_plans
  - Sets `public_visible = false` on the launch_smoke_test plan so it never
    appears on the public marketing pricing page

  ## Why
  - launch_smoke_test is an internal smoke-test tier used during launch verification.
    It must remain is_active=true so existing subscriptions keep working, but it
    should never be visible to prospective customers on the marketing page.
  - is_active controls whether the plan works; public_visible controls whether
    the marketing page shows it. These are orthogonal concerns.

  ## Effect
  - Public pricing page queries: is_active=true AND public_visible=true
  - BillingPage (logged-in users managing their subscription): is_active=true only
  - All other plans default to public_visible=true — no existing behaviour changes
*/

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true;

UPDATE subscription_plans
SET public_visible = false
WHERE tier = 'launch_smoke_test';
