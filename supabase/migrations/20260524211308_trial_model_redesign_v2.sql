/*
  # Trial Model Redesign v2

  Replaces the standalone 'trial' subscription tier with a
  "14-day free trial of any paid plan" model.
*/

-- ============================================================================
-- STEP 1: Add new columns to organizations
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='is_trialing') THEN
    ALTER TABLE organizations ADD COLUMN is_trialing BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='trial_started_at') THEN
    ALTER TABLE organizations ADD COLUMN trial_started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='trial_ends_at') THEN
    ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='has_used_trial') THEN
    ALTER TABLE organizations ADD COLUMN has_used_trial BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='trial_downgrades_count') THEN
    ALTER TABLE organizations ADD COLUMN trial_downgrades_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='archived') THEN
    ALTER TABLE organizations ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;


-- ============================================================================
-- STEP 2: Drop and recreate get_organization_subscription_status()
-- ============================================================================

DROP FUNCTION IF EXISTS get_organization_subscription_status(UUID);

CREATE FUNCTION get_organization_subscription_status(p_org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  subscription_tier TEXT,
  plan_name TEXT,
  is_active BOOLEAN,
  subscription_expiry_date TIMESTAMPTZ,
  days_until_expiry INTEGER,
  is_expired BOOLEAN,
  is_trialing BOOLEAN,
  trial_ends_at TIMESTAMPTZ,
  days_until_trial_ends INTEGER,
  has_used_trial BOOLEAN,
  max_users INTEGER,
  max_clients INTEGER,
  max_matters INTEGER,
  features JSONB,
  contact_sales BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.subscription_tier,
    sp.name,
    o.is_active,
    o.subscription_expiry_date,
    CASE WHEN o.subscription_expiry_date IS NULL THEN NULL
         ELSE EXTRACT(DAY FROM (o.subscription_expiry_date - NOW()))::INTEGER END,
    (o.subscription_expiry_date IS NOT NULL AND o.subscription_expiry_date < NOW()),
    COALESCE(o.is_trialing, FALSE),
    o.trial_ends_at,
    CASE WHEN o.trial_ends_at IS NULL THEN NULL
         ELSE EXTRACT(DAY FROM (o.trial_ends_at - NOW()))::INTEGER END,
    COALESCE(o.has_used_trial, FALSE),
    sp.max_users,
    sp.max_clients,
    sp.max_matters,
    sp.features,
    sp.contact_sales
  FROM organizations o
  LEFT JOIN subscription_plans sp ON sp.tier = o.subscription_tier
  WHERE o.id = p_org_id;
END $$;

COMMENT ON FUNCTION get_organization_subscription_status IS
  'Single source of truth for an organization subscription state. Includes trial fields.';


-- ============================================================================
-- STEP 3a: Create start_trial()
-- ============================================================================

CREATE OR REPLACE FUNCTION start_trial(p_org_id UUID, p_chosen_tier TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, trial_ends_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
DECLARE
  v_already_used BOOLEAN;
  v_trial_ends TIMESTAMPTZ;
BEGIN
  IF p_chosen_tier NOT IN ('solo', 'small_firm', 'medium_firm') THEN
    RETURN QUERY SELECT FALSE,
      'Trial only available for Solo, Small Firm, and Medium Firm plans. Large Firm requires sales contact.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT has_used_trial INTO v_already_used FROM organizations WHERE id = p_org_id;

  IF v_already_used IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Organization not found.'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_already_used THEN
    RETURN QUERY SELECT FALSE,
      'This account has already used its free trial. Please choose a paid plan.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_trial_ends := NOW() + INTERVAL '14 days';

  UPDATE organizations
  SET subscription_tier      = p_chosen_tier,
      is_trialing            = TRUE,
      trial_started_at       = NOW(),
      trial_ends_at          = v_trial_ends,
      subscription_expiry_date = v_trial_ends,
      has_used_trial         = TRUE,
      subscription_status    = 'active',
      is_active              = TRUE
  WHERE id = p_org_id;

  RETURN QUERY SELECT TRUE, 'Trial started successfully.'::TEXT, v_trial_ends;
END $$;

COMMENT ON FUNCTION start_trial IS
  'Starts a 14-day free trial. Enforces one-trial-per-org and validates the chosen tier.';


-- ============================================================================
-- STEP 3b: Create end_expired_trials()
-- ============================================================================

CREATE OR REPLACE FUNCTION end_expired_trials()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_affected INTEGER;
BEGIN
  UPDATE organizations
  SET is_trialing = FALSE
  WHERE is_trialing = TRUE
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW();

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END $$;

COMMENT ON FUNCTION end_expired_trials IS
  'Flips is_trialing to false once trial_ends_at has passed. Run hourly via cron.';


-- ============================================================================
-- STEP 4: Migrate existing 'trial' orgs to 'solo' with is_trialing = true
-- ============================================================================

UPDATE organizations
SET
  subscription_tier        = 'solo',
  is_trialing              = TRUE,
  has_used_trial           = TRUE,
  trial_started_at         = COALESCE(trial_started_at,
                               COALESCE(subscription_expiry_date, NOW()) - INTERVAL '14 days'),
  trial_ends_at            = COALESCE(trial_ends_at, subscription_expiry_date,
                               NOW() + INTERVAL '14 days'),
  subscription_expiry_date = COALESCE(subscription_expiry_date,
                               NOW() + INTERVAL '14 days')
WHERE subscription_tier = 'trial';


-- ============================================================================
-- STEP 5: Delete the 'trial' row from subscription_plans
-- ============================================================================

DELETE FROM subscription_plans WHERE tier = 'trial';


-- ============================================================================
-- STEP 6: Update CHECK constraints to remove 'trial'
-- ============================================================================

DO $$
DECLARE v_name TEXT;
BEGIN
  SELECT conname INTO v_name FROM pg_constraint
  WHERE conrelid = 'subscription_plans'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%tier%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscription_plans DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IN ('solo', 'small_firm', 'medium_firm', 'large_firm'));

DO $$
DECLARE v_name TEXT;
BEGIN
  SELECT conname INTO v_name FROM pg_constraint
  WHERE conrelid = 'organizations'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%subscription_tier%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE organizations DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('solo', 'small_firm', 'medium_firm', 'large_firm'));


-- ============================================================================
-- STEP 7: Remove 'trial' from subscription_addons.applicable_tiers
-- ============================================================================

UPDATE subscription_addons
SET applicable_tiers = array_remove(applicable_tiers, 'trial')
WHERE 'trial' = ANY(applicable_tiers);
