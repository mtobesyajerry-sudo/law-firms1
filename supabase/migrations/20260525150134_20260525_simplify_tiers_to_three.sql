/*
  # Consolidated Pricing & Tier Redesign: Simplify to 3 Tiers

  ## Summary
  Migrates from 4 tiers (solo, small_firm, medium_firm, large_firm) to 3 tiers
  (small_firm, medium_firm, large_firm). Updates pricing, payment methods, and
  adds a server-side function to gate premium screening access by tier.

  ## Changes

  ### 1. Backup — saves organization tier snapshot before migration
  ### 2. Organizations — migrate solo → small_firm, trial → small_firm+is_trialing
  ### 3. subscription_plans — wipe and reseed with correct 3-tier pricing
  ### 4. subscription_payments — update payment_method constraint to 5 new methods
  ### 5. start_trial() — updated to reject solo tier
  ### 6. can_use_premium_screening() — new server-side gating function
  ### 7. subscription_addons — remove solo from applicable_tiers arrays
*/

-- ============================================================
-- Step 1: Backup existing org tiers
-- ============================================================
CREATE TABLE IF NOT EXISTS _backup_org_tiers_20260525 AS
SELECT id, name, subscription_tier, is_trialing, has_used_trial, created_at
FROM organizations;

-- ============================================================
-- Step 2: Migrate organizations from old tiers to new 3-tier set
-- ============================================================

UPDATE organizations
SET subscription_tier = 'small_firm'
WHERE subscription_tier = 'solo';

UPDATE organizations
SET subscription_tier = 'small_firm',
    is_trialing = true
WHERE subscription_tier = 'trial';

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('small_firm', 'medium_firm', 'large_firm'));

-- ============================================================
-- Step 3: Wipe and reseed subscription_plans
-- ============================================================

UPDATE subscription_payments SET subscription_tier = 'small_firm' WHERE subscription_tier = 'solo';
UPDATE subscription_payments SET subscription_tier = 'small_firm' WHERE subscription_tier = 'trial';

DELETE FROM subscription_plans;

INSERT INTO subscription_plans (
  tier, name, display_name, description,
  price_monthly_tzs, price_annual_tzs,
  max_users, max_clients, max_matters,
  max_iras_per_year, max_compliance_cases_per_year,
  max_screenings_per_month, storage_gb, max_branches,
  audit_log_retention_years, trial_days,
  contact_sales, is_active, display_order, features
) VALUES
(
  'small_firm',
  'Small Firm',
  'Small Firm',
  'For law firms with up to 10 advocates',
  250000, 2500000,
  10, 300, 500,
  4, 100,
  1000, 25, 1,
  7, 14,
  false, true, 1,
  '["Client KYC/CDD management","Matter-based AML flagging","STR documentation & filing tracking","Annual Institutional Risk Assessment (up to 4/yr)","Maturity Assessment (quarterly)","Security monitoring dashboard","NIDA & BRELA verification ready","WhatsApp & email support"]'::jsonb
),
(
  'medium_firm',
  'Medium Firm',
  'Medium Firm',
  'For law firms with 11 to 30 advocates',
  600000, 6000000,
  30, 1000, 2000,
  NULL, 500,
  5000, 100, 1,
  10, 14,
  false, true, 2,
  '["Everything in Small Firm","Unlimited Institutional Risk Assessments","Maturity Assessment (monthly + trending)","Premium sanctions screening (OpenSanctions)","Compliance case management (up to 500/yr)","Priority support (phone + WhatsApp, 4hr response)"]'::jsonb
),
(
  'large_firm',
  'Large Firm',
  'Large Firm',
  'For firms with more than 30 advocates — custom pricing',
  NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL,
  NULL, NULL, NULL,
  10, 14,
  true, true, 3,
  '["Everything in Medium Firm","Unlimited users, clients, matters","Dedicated Customer Success Manager","Custom onboarding & staff training","99.9% uptime SLA","Bespoke implementation support"]'::jsonb
);

-- ============================================================
-- Step 4: Update subscription_payments payment_method constraint
-- ============================================================

UPDATE subscription_payments SET payment_method = 'mpesa'              WHERE payment_method = 'tigo_pesa';
UPDATE subscription_payments SET payment_method = 'bank_transfer_crdb' WHERE payment_method IN ('bank_transfer_nmb', 'bank_transfer_stanbic', 'bank_transfer_other');
UPDATE subscription_payments SET payment_method = 'mpesa'              WHERE payment_method IN ('card_visa', 'card_mastercard', 'manual_admin');

ALTER TABLE subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_payment_method_check
  CHECK (payment_method IN ('mpesa', 'mixx_by_yas', 'airtel_money', 'halopesa', 'bank_transfer_crdb'));

-- ============================================================
-- Step 5: Update start_trial() — drop and recreate to change validation
-- ============================================================
DROP FUNCTION IF EXISTS start_trial(uuid, text);

CREATE FUNCTION start_trial(p_org_id uuid, p_chosen_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_chosen_tier NOT IN ('small_firm', 'medium_firm') THEN
    RAISE EXCEPTION 'Trial only available for small_firm and medium_firm tiers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_org_id AND has_used_trial = true
  ) THEN
    RAISE EXCEPTION 'Organization has already used its free trial';
  END IF;

  UPDATE organizations
  SET
    subscription_tier = p_chosen_tier,
    is_trialing = true,
    has_used_trial = true,
    trial_started_at = COALESCE(trial_started_at, now()),
    trial_ends_at = COALESCE(trial_ends_at, now() + interval '14 days')
  WHERE id = p_org_id;
END;
$$;

-- ============================================================
-- Step 6: Create can_use_premium_screening() function
-- ============================================================
CREATE OR REPLACE FUNCTION can_use_premium_screening(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM organizations
  WHERE id = p_org_id;

  IF NOT FOUND THEN RETURN false; END IF;

  RETURN v_tier IN ('medium_firm', 'large_firm');
END;
$$;

-- ============================================================
-- Step 7: Clean up subscription_addons applicable_tiers
-- ============================================================
UPDATE subscription_addons
SET applicable_tiers = array_remove(applicable_tiers, 'solo')
WHERE applicable_tiers @> ARRAY['solo']::text[];
