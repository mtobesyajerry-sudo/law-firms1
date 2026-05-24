/*
================================================================================
  Iuris Peritis - Subscription Plans Redesign Migration
================================================================================

  Migration:    20260524_subscription_plans_redesign
  Author:       Iuris Peritis Development Team
  Date:         May 24, 2026
  Status:       Production-ready

  Purpose:
  --------
  Redesigns the subscription system from the legacy 4-tier model
  (trial | basic | professional | enterprise) to a 5-tier model
  built specifically for Tanzanian advocates under AMLA Cap. 423.

  New tiers:
    - trial        (14 days, free, 2 users, 5 clients)
    - solo         (TZS 150,000/mo, 3 users, 75 clients)
    - small_firm   (TZS 450,000/mo, 12 users, 300 clients)
    - medium_firm  (TZS 1,200,000/mo, 30 users, 1,000 clients)
    - large_firm   (Contact sales, unlimited)

  What this migration creates:
  ----------------------------
  1. Updates subscription_plans table with new tiers
  2. Adds contact_sales flag for hide-price tiers
  3. Updates CHECK constraint on organizations.subscription_tier
  4. Migrates existing organizations to new tier names:
       basic        -> solo
       professional -> small_firm
       enterprise   -> medium_firm
  5. Creates subscription_addons table (extra users, extra IRAs, training, etc.)
  6. Creates subscription_usage table (metering: clients, IRAs, screenings)
  7. Creates subscription_payments table (M-Pesa, Tigo, Airtel, bank, card)
  8. Creates organization_addons table (which add-ons each org has purchased)
  9. Adds helper functions:
       - check_subscription_limit()
       - record_usage()
       - get_organization_subscription_status()
       - calculate_vat_breakdown()
  10. Adds RLS policies for the new tables
  11. Adds indexes for performance

  Rollback (if needed):
  ---------------------
  This migration is destructive in the sense that it renames tier values.
  To rollback, you would need to:
    1. Drop the new CHECK constraint
    2. Restore the old CHECK constraint (basic, professional, enterprise)
    3. UPDATE organizations SET subscription_tier = old_name
    4. DROP TABLE subscription_addons, subscription_usage,
       subscription_payments, organization_addons
    5. DROP FUNCTIONs created in this migration
  A rollback script template is included at the bottom of this file
  (commented out).

  Idempotency:
  ------------
  This migration uses IF NOT EXISTS and DO $$ ... $$ blocks throughout,
  so it is safe to re-run if a previous run failed partway through.

================================================================================
*/

-- ============================================================================
-- SECTION 1: Backup existing tier values (safety net)
-- ============================================================================

-- Create a backup table of current org tier assignments before we change them.
-- If anything goes wrong, we can restore from this.
CREATE TABLE IF NOT EXISTS _backup_org_tiers_20260524 AS
SELECT id, subscription_tier, subscription_expiry_date, max_users, created_at
FROM organizations
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'organizations'
);

COMMENT ON TABLE _backup_org_tiers_20260524 IS
  'Backup of organization tier assignments before 20260524 migration. Safe to drop after migration is verified stable for 30 days.';


-- ============================================================================
-- SECTION 2: Add contact_sales flag to subscription_plans
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'contact_sales'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN contact_sales BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'max_matters'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN max_matters INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'max_iras_per_year'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN max_iras_per_year INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'max_compliance_cases_per_year'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN max_compliance_cases_per_year INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'max_screenings_per_month'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN max_screenings_per_month INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'storage_gb'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN storage_gb INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'audit_log_retention_years'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN audit_log_retention_years INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'max_branches'
  ) THEN
    -- NULL = unlimited (used by large_firm). Default 1 for tiers that don't set it.
    ALTER TABLE subscription_plans
      ADD COLUMN max_branches INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'trial_days'
  ) THEN
    ALTER TABLE subscription_plans
      ADD COLUMN trial_days INTEGER DEFAULT 0;
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: Drop old CHECK constraint on subscription_plans (if exists)
-- ============================================================================

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Find and drop the existing CHECK constraint on tier column
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'subscription_plans'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%tier%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscription_plans DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;


-- ============================================================================
-- SECTION 4: Clear old plans and insert new advocate-focused plans
-- ============================================================================

-- Wipe existing plans (organizations are migrated to new tier names below).
-- We don't keep the old rows because the tier names themselves change.
DELETE FROM subscription_plans;

-- Insert the 5 new tiers for Tanzanian advocates.
-- All prices are in TZS, VAT-INCLUSIVE (18% Tanzanian VAT).
-- Annual prices ~17% discount from monthly * 12 (≈ 2 months free).

INSERT INTO subscription_plans (
  tier,
  name,
  description,
  price_monthly_tzs,
  price_annual_tzs,
  max_users,
  max_clients,
  max_matters,
  max_iras_per_year,
  max_compliance_cases_per_year,
  max_screenings_per_month,
  storage_gb,
  max_branches,
  audit_log_retention_years,
  trial_days,
  features,
  contact_sales,
  display_order,
  is_active
)
VALUES
  -- ────────────────────────────────────────────────────────────────────────
  -- TIER 1: TRIAL (14 days, free)
  -- Preview-only; watermarked outputs; no STR tracking; no compliance cases.
  -- ────────────────────────────────────────────────────────────────────────
  (
    'trial',
    '14-Day Trial',
    'Free 14-day evaluation. Preview the full system with sample data. No credit card required.',
    0,
    0,
    2,           -- users
    5,           -- clients
    5,           -- matters
    0,           -- iras_per_year (preview only, watermarked)
    0,           -- compliance_cases
    10,          -- screenings (lifetime, not monthly)
    1,           -- 100 MB rounded to 1 (we store gb; could refactor to mb)
    1,           -- branches
    10,          -- audit log retention (system-wide; user-visible window is 14 days)
    14,          -- trial duration in days
    jsonb_build_object(
      'kyc_management', true,
      'matter_management', true,
      'ira_preview_only', true,
      'maturity_assessment_preview', true,
      'str_tracking', false,
      'compliance_cases', false,
      'reports_watermarked', true,
      'mfa_enforcement', 'optional',
      'security_monitoring', false,
      'api_access', false,
      'support_response_hours', 48
    ),
    FALSE,        -- contact_sales
    0,            -- display_order
    TRUE          -- is_active
  ),

  -- ────────────────────────────────────────────────────────────────────────
  -- TIER 2: SOLO ADVOCATE
  -- Target: Tanzania's ~324 solo practitioners (98% of the market)
  -- TZS 150,000/month, TZS 1,500,000/year (~17% annual discount)
  -- ────────────────────────────────────────────────────────────────────────
  (
    'solo',
    'Solo Advocate',
    'For solo practitioners. Full KYC/CDD, Institutional Risk Assessment, and Maturity Assessment - everything you need for AMLA Cap. 423 compliance.',
    150000,
    1500000,
    3,            -- users (advocate + 2 staff)
    75,           -- clients
    100,          -- matters
    2,            -- IRAs per year (1 annual + 1 mid-year update)
    25,           -- compliance_cases per year
    200,          -- screenings per month
    5,            -- 5 GB storage
    1,            -- 1 branch (no multi-branch)
    10,           -- audit log retention (10 years system-wide; 5 years user-visible)
    0,            -- not a trial
    jsonb_build_object(
      'kyc_management', true,
      'matter_management', true,
      'ira_finalized_per_year', 2,
      'maturity_assessment', 'annual',
      'str_tracking', true,
      'compliance_cases', true,
      'reports_branded', true,
      'mfa_enforcement', 'optional',
      'security_monitoring', 'view_only',
      'intrusion_detection', false,
      'api_access', false,
      'multi_branch', false,
      'nida_integration_ready', true,
      'brela_integration_ready', true,
      'support_response_hours', 24,
      'support_channels', jsonb_build_array('email'),
      'onboarding', '2hr_video_walkthrough',
      'roles_allowed', jsonb_build_array('admin', 'staff', 'compliance_officer', 'lawyer')
    ),
    FALSE,
    1,
    TRUE
  ),

  -- ────────────────────────────────────────────────────────────────────────
  -- TIER 3: SMALL FIRM
  -- Target: 2-10 advocate firms
  -- TZS 450,000/month, TZS 4,500,000/year
  -- Per-advocate cost for 10-advocate firm: TZS 45,000/month
  -- ────────────────────────────────────────────────────────────────────────
  (
    'small_firm',
    'Small Firm',
    'For firms with 2-10 advocates. Adds quarterly Maturity reviews, full security monitoring, MLRO/Senior Partner roles, and read-only API access.',
    450000,
    4500000,
    12,           -- users
    300,          -- clients
    500,          -- matters
    4,            -- IRAs per year (quarterly)
    100,          -- compliance_cases per year
    1000,         -- screenings per month
    25,           -- 25 GB storage
    1,            -- 1 branch
    10,           -- audit log retention (10 years system-wide; 7 years user-visible)
    0,
    jsonb_build_object(
      'kyc_management', true,
      'matter_management', true,
      'ira_finalized_per_year', 4,
      'maturity_assessment', 'quarterly',
      'str_tracking', true,
      'str_bulk_filing', false,
      'compliance_cases', true,
      'reports_branded', true,
      'reports_letterhead', true,
      'mfa_enforcement', 'recommended',
      'security_monitoring', true,
      'intrusion_detection', true,
      'api_access', 'read_only',
      'multi_branch', false,
      'integration_analytics', true,
      'workflow_automation', false,
      'nida_integration_ready', true,
      'brela_integration_ready', true,
      'support_response_hours', 12,
      'support_channels', jsonb_build_array('email', 'whatsapp'),
      'onboarding', '1_day_virtual_training',
      'roles_allowed', jsonb_build_array('admin', 'staff', 'compliance_officer', 'lawyer', 'mlro', 'senior_partner')
    ),
    FALSE,
    2,
    TRUE
  ),

  -- ────────────────────────────────────────────────────────────────────────
  -- TIER 4: MEDIUM FIRM
  -- Target: 11-30 advocate firms (top 10-20 Tanzanian firms)
  -- TZS 1,200,000/month, TZS 12,000,000/year
  -- Includes monthly Maturity with trending; multi-branch up to 3
  -- ────────────────────────────────────────────────────────────────────────
  (
    'medium_firm',
    'Medium Firm',
    'For firms with 11-30 advocates. Unlimited finalized IRAs, monthly Maturity trending, multi-branch support, full API, and workflow automation. Premium support.',
    1200000,
    12000000,
    30,           -- users
    1000,         -- clients
    2000,         -- matters
    NULL,         -- unlimited IRAs (NULL means no cap)
    500,          -- compliance_cases per year
    5000,         -- screenings per month
    100,          -- 100 GB storage
    3,            -- up to 3 branches
    10,           -- audit log retention (full 10 years user-visible)
    0,
    jsonb_build_object(
      'kyc_management', true,
      'matter_management', true,
      'ira_finalized_per_year', null,  -- unlimited
      'maturity_assessment', 'monthly_with_trending',
      'str_tracking', true,
      'str_bulk_filing', true,
      'compliance_cases', true,
      'reports_branded', true,
      'reports_letterhead', true,
      'reports_scheduled', true,
      'mfa_enforcement', 'required',
      'security_monitoring', true,
      'intrusion_detection', true,
      'intrusion_detection_alerts', true,
      'api_access', 'full',
      'multi_branch', 3,
      'integration_analytics', true,
      'workflow_automation', true,
      'nida_integration_ready', true,
      'brela_integration_ready', true,
      'support_response_hours', 4,
      'support_channels', jsonb_build_array('email', 'whatsapp', 'phone'),
      'onboarding', '2_day_onsite_or_virtual',
      'roles_allowed', jsonb_build_array('admin', 'staff', 'compliance_officer', 'lawyer', 'mlro', 'senior_partner', 'management', 'partner'),
      'regulatory_advance_notice', false
    ),
    FALSE,
    3,
    TRUE
  ),

  -- ────────────────────────────────────────────────────────────────────────
  -- TIER 5: LARGE FIRM / ENTERPRISE
  -- Target: 30+ advocate firms (IMMMA, FB Attorneys, A&K, DLA Piper Africa)
  -- Contact sales - prices negotiated per deal
  -- Likely landing zone: TZS 25M - 60M per year
  -- ────────────────────────────────────────────────────────────────────────
  (
    'large_firm',
    'Large Firm',
    'For firms with 30+ advocates. Unlimited everything, dedicated CSM, SLA-backed support, white-label reports, custom integrations, custom workflows.',
    NULL,         -- price hidden (contact sales)
    NULL,
    NULL,         -- unlimited users
    NULL,         -- unlimited clients
    NULL,         -- unlimited matters
    NULL,         -- unlimited IRAs
    NULL,         -- unlimited compliance cases
    NULL,         -- unlimited screenings
    500,          -- 500 GB baseline; expandable
    NULL,         -- unlimited branches
    10,           -- full 10 years
    0,
    jsonb_build_object(
      'kyc_management', true,
      'matter_management', true,
      'ira_finalized_per_year', null,
      'maturity_assessment', 'continuous_with_benchmarking',
      'str_tracking', true,
      'str_bulk_filing', true,
      'str_api_to_fiu', 'when_available',
      'compliance_cases', true,
      'reports_branded', true,
      'reports_white_label', true,
      'reports_scheduled', true,
      'mfa_enforcement', 'required',
      'sso_ready', true,
      'security_monitoring', true,
      'intrusion_detection', true,
      'intrusion_detection_custom_rules', true,
      'api_access', 'full_plus_webhooks',
      'multi_branch', null,  -- unlimited
      'integration_analytics', true,
      'workflow_automation', true,
      'workflow_custom', true,
      'custom_roles', true,
      'nida_integration_ready', true,
      'brela_integration_ready', true,
      'custom_integrations', true,
      'support_response_hours', 1,
      'support_channels', jsonb_build_array('email', 'whatsapp', 'phone', 'dedicated_csm'),
      'sla_uptime_percent', 99.9,
      'onboarding', 'custom_program',
      'roles_allowed', 'all_plus_custom',
      'regulatory_advance_notice', true
    ),
    TRUE,         -- contact_sales = true (hides price on pricing page)
    4,
    TRUE
  );


-- ============================================================================
-- SECTION 5: Add new CHECK constraint reflecting the 5 new tiers
-- ============================================================================

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IN ('trial', 'solo', 'small_firm', 'medium_firm', 'large_firm'));


-- ============================================================================
-- SECTION 6: Migrate existing organizations to the new tier names
-- ============================================================================

-- Map old tier names to new tier names for any existing organizations.
-- This preserves their subscription_expiry_date and other settings.

DO $$
DECLARE
  v_old_constraint_name TEXT;
BEGIN
  -- First drop the old constraint on organizations.subscription_tier
  SELECT conname INTO v_old_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'organizations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%subscription_tier%';

  IF v_old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE organizations DROP CONSTRAINT %I', v_old_constraint_name);
  END IF;
END $$;

-- Update legacy tier values to new tier values
UPDATE organizations SET subscription_tier = 'solo'        WHERE subscription_tier = 'basic';
UPDATE organizations SET subscription_tier = 'small_firm'  WHERE subscription_tier = 'professional';
UPDATE organizations SET subscription_tier = 'medium_firm' WHERE subscription_tier = 'enterprise';

-- Any org without a tier defaults to trial
UPDATE organizations
SET subscription_tier = 'trial'
WHERE subscription_tier IS NULL
   OR subscription_tier NOT IN ('trial', 'solo', 'small_firm', 'medium_firm', 'large_firm');

-- Now add the new constraint on organizations
ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('trial', 'solo', 'small_firm', 'medium_firm', 'large_firm'));


-- ============================================================================
-- SECTION 7: subscription_addons - Catalog of add-on products
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'capacity',           -- extra users, clients, storage
    'feature',            -- API access add-on, extra IRA
    'service',            -- training, health check, consulting
    'integration'         -- custom integration projects
  )),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN (
    'one_time',           -- single purchase (e.g., training, custom integration)
    'monthly_recurring',  -- monthly add-on (e.g., extra user seat)
    'annual_recurring',   -- annual add-on (e.g., standalone IRA-only)
    'per_unit'            -- per-unit (e.g., per additional IRA)
  )),
  price_tzs INTEGER NOT NULL,
  unit_label TEXT,        -- e.g., 'per user/month', 'per IRA', 'per session'
  applicable_tiers TEXT[] NOT NULL DEFAULT ARRAY['solo', 'small_firm', 'medium_firm', 'large_firm'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_addons IS
  'Catalog of optional add-on products: extra users, extra IRAs, training, consulting, integrations. Prices VAT-inclusive in TZS.';

-- Seed the addon catalog (idempotent: re-running updates rows by addon_code)
INSERT INTO subscription_addons (
  addon_code, name, description, category, pricing_model, price_tzs, unit_label, applicable_tiers, display_order
) VALUES
  -- Capacity add-ons
  (
    'extra_user_seat',
    'Additional User Seat',
    'Add one extra user above your plan limit.',
    'capacity',
    'monthly_recurring',
    50000,
    'per user / month',
    ARRAY['solo', 'small_firm', 'medium_firm'],
    1
  ),
  (
    'extra_100_clients',
    'Additional 100 KYC Records',
    'Add 100 more client KYC records above your plan limit.',
    'capacity',
    'monthly_recurring',
    100000,
    'per 100 clients / month',
    ARRAY['solo', 'small_firm', 'medium_firm'],
    2
  ),
  (
    'extra_10gb_storage',
    'Additional 10 GB Document Storage',
    'Add 10 GB of secure document storage.',
    'capacity',
    'monthly_recurring',
    50000,
    'per 10 GB / month',
    ARRAY['solo', 'small_firm', 'medium_firm'],
    3
  ),

  -- Feature add-ons
  (
    'extra_finalized_ira',
    'Additional Finalized IRA',
    'Finalize one additional Institutional Risk Assessment beyond your plan limit.',
    'feature',
    'per_unit',
    500000,
    'per finalized IRA',
    ARRAY['solo', 'small_firm'],
    10
  ),
  (
    'standalone_ira_only',
    'Standalone IRA & Maturity Subscription',
    'Annual subscription for institutional Risk Assessment and Maturity Framework only - no client KYC. Replaces consultant FWRA at a fraction of the cost.',
    'feature',
    'annual_recurring',
    1800000,
    'per year',
    ARRAY['trial', 'solo', 'small_firm', 'medium_firm', 'large_firm'],
    11
  ),

  -- Service add-ons
  (
    'amla_training_1day',
    'AMLA Cap. 423 Staff Training',
    'In-person 1-day AMLA compliance training for up to 20 attendees. Includes materials and certification of attendance.',
    'service',
    'one_time',
    2500000,
    'per session (up to 20 attendees)',
    ARRAY['solo', 'small_firm', 'medium_firm', 'large_firm'],
    20
  ),
  (
    'compliance_health_check',
    'AMLA Compliance Health Check',
    'An independent consultant uses your system data to produce a regulator-ready compliance audit report.',
    'service',
    'one_time',
    1800000,
    'per engagement',
    ARRAY['solo', 'small_firm', 'medium_firm', 'large_firm'],
    21
  ),
  (
    'consultant_retainer',
    'Dedicated Compliance Consultant Retainer',
    'Bundled monthly retainer: dedicated AML consultant + system. Includes ongoing advisory, FIU correspondence support, and quarterly reviews.',
    'service',
    'monthly_recurring',
    3500000,
    'per month',
    ARRAY['small_firm', 'medium_firm', 'large_firm'],
    22
  ),

  -- Integration add-ons
  (
    'custom_pms_integration',
    'Custom PMS Integration',
    'Integrate Iuris Peritis with your existing practice management software. Scope and quote determined per engagement.',
    'integration',
    'one_time',
    5000000,
    'starting price',
    ARRAY['medium_firm', 'large_firm'],
    30
  )
ON CONFLICT (addon_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  pricing_model = EXCLUDED.pricing_model,
  price_tzs = EXCLUDED.price_tzs,
  unit_label = EXCLUDED.unit_label,
  applicable_tiers = EXCLUDED.applicable_tiers,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();


-- ============================================================================
-- SECTION 8: organization_addons - Which add-ons each org has active
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES subscription_addons(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL for one-time purchases
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organization_addons IS
  'Tracks which add-ons each organization has active. quantity supports multiple of the same addon (e.g., 5 extra user seats). expires_at NULL means perpetual / one-time.';

CREATE INDEX IF NOT EXISTS idx_organization_addons_org
  ON organization_addons(organization_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_organization_addons_addon
  ON organization_addons(addon_id);

CREATE INDEX IF NOT EXISTS idx_organization_addons_active
  ON organization_addons(organization_id, is_active, expires_at);


-- ============================================================================
-- SECTION 9: subscription_usage - Metering / usage tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'users',
    'clients',
    'matters',
    'iras_finalized',
    'compliance_cases',
    'screenings',
    'storage_bytes',
    'api_calls'
  )),
  -- For "per period" resources (e.g., screenings per month, IRAs per year),
  -- we bucket by period. NULL period for cumulative resources (e.g., total clients).
  period_type TEXT CHECK (period_type IN ('day', 'month', 'year', 'cumulative')),
  period_start DATE,
  period_end DATE,
  used_count BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one row per org + resource + period
  CONSTRAINT subscription_usage_unique_period
    UNIQUE (organization_id, resource_type, period_type, period_start)
);

COMMENT ON TABLE subscription_usage IS
  'Tracks how much of each metered resource an organization has used. For monthly resources (screenings), one row per month. For cumulative resources (total clients), period_type = cumulative.';

CREATE INDEX IF NOT EXISTS idx_subscription_usage_org_resource
  ON subscription_usage(organization_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_period
  ON subscription_usage(organization_id, resource_type, period_start, period_end);


-- ============================================================================
-- SECTION 10: subscription_payments - Payment records
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  payment_reference TEXT NOT NULL UNIQUE,
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'subscription_initial',
    'subscription_renewal',
    'addon_purchase',
    'addon_renewal',
    'upgrade',
    'refund'
  )),
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'mpesa',
    'tigo_pesa',
    'airtel_money',
    'bank_transfer_crdb',
    'bank_transfer_nmb',
    'bank_transfer_stanbic',
    'bank_transfer_other',
    'card_visa',
    'card_mastercard',
    'manual_admin'
  )),
  -- Amount fields (VAT-inclusive amount paid, with breakdown)
  amount_gross_tzs INTEGER NOT NULL,    -- total paid by customer (VAT-inclusive)
  amount_net_tzs INTEGER NOT NULL,      -- gross - VAT (what you actually earn)
  vat_amount_tzs INTEGER NOT NULL,      -- 18% VAT component
  vat_rate NUMERIC(4,2) NOT NULL DEFAULT 18.00,
  -- What was purchased
  subscription_tier TEXT,                -- the tier they're paying for (or upgrading to)
  addon_id UUID REFERENCES subscription_addons(id),
  billing_period TEXT CHECK (billing_period IN ('monthly', 'annual', 'one_time')),
  period_start DATE,
  period_end DATE,
  -- Payment status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
  )),
  -- Provider-specific transaction details
  provider_transaction_id TEXT,
  provider_response JSONB,
  -- Bank/mobile reference codes
  external_reference TEXT,
  -- Invoice info for TRA compliance
  invoice_number TEXT UNIQUE,
  invoice_issued_at TIMESTAMPTZ,
  -- Audit fields
  initiated_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),  -- for manual admin payments
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

COMMENT ON TABLE subscription_payments IS
  'Complete payment ledger. amount_gross_tzs is what customer paid (VAT-inclusive); amount_net_tzs is what you earn (excl. VAT). Required for TRA tax filing.';

CREATE INDEX IF NOT EXISTS idx_subscription_payments_org
  ON subscription_payments(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
  ON subscription_payments(status, created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_method
  ON subscription_payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_period
  ON subscription_payments(organization_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_invoice
  ON subscription_payments(invoice_number) WHERE invoice_number IS NOT NULL;


-- ============================================================================
-- SECTION 11: Helper Functions
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION: calculate_vat_breakdown
-- Given a gross (VAT-inclusive) amount in TZS, return net + VAT components.
-- Tanzania VAT rate is 18%.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_vat_breakdown(
  p_gross_amount_tzs INTEGER,
  p_vat_rate NUMERIC DEFAULT 18.00
)
RETURNS TABLE (
  gross_tzs INTEGER,
  net_tzs INTEGER,
  vat_tzs INTEGER,
  vat_rate NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- net = gross / (1 + vat_rate/100)
  -- vat = gross - net
  RETURN QUERY SELECT
    p_gross_amount_tzs::INTEGER,
    ROUND(p_gross_amount_tzs / (1 + p_vat_rate / 100))::INTEGER AS net_tzs,
    (p_gross_amount_tzs - ROUND(p_gross_amount_tzs / (1 + p_vat_rate / 100)))::INTEGER AS vat_tzs,
    p_vat_rate;
END $$;

COMMENT ON FUNCTION calculate_vat_breakdown IS
  'Splits a VAT-inclusive TZS amount into net and VAT components. Used for invoice generation and TRA reporting.';


-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION: get_organization_subscription_status
-- Returns a complete view of an org's subscription state.
-- Used by AuthContext to check access.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_organization_subscription_status(p_org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  subscription_tier TEXT,
  plan_name TEXT,
  is_active BOOLEAN,
  subscription_expiry_date TIMESTAMPTZ,
  days_until_expiry INTEGER,
  is_expired BOOLEAN,
  is_trial BOOLEAN,
  max_users INTEGER,
  max_clients INTEGER,
  max_matters INTEGER,
  features JSONB,
  contact_sales BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.subscription_tier,
    sp.name,
    o.is_active,
    o.subscription_expiry_date,
    CASE
      WHEN o.subscription_expiry_date IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (o.subscription_expiry_date - NOW()))::INTEGER
    END AS days_until_expiry,
    (o.subscription_expiry_date IS NOT NULL AND o.subscription_expiry_date < NOW()) AS is_expired,
    (o.subscription_tier = 'trial') AS is_trial,
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
  'Single source of truth for an organization''s subscription state. Use this in AuthContext and access checks.';


-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION: check_subscription_limit
-- Checks whether an organization can add another resource without
-- exceeding its plan limits.
-- Returns TRUE if allowed, FALSE if limit reached.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_subscription_limit(
  p_org_id UUID,
  p_resource_type TEXT
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_usage BIGINT,
  plan_limit INTEGER,
  addon_extra INTEGER,
  effective_limit INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_plan_limit INTEGER;
  v_current BIGINT;
  v_addon_extra INTEGER := 0;
  v_period_start DATE;
  v_period_end DATE;
  v_subscription_active BOOLEAN;
BEGIN
  -- Get the org's tier and check subscription is active
  SELECT
    o.subscription_tier,
    (o.is_active = TRUE AND (o.subscription_expiry_date IS NULL OR o.subscription_expiry_date > NOW()))
  INTO v_tier, v_subscription_active
  FROM organizations o
  WHERE o.id = p_org_id;

  IF v_tier IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::BIGINT, 0, 0, 0, 'Organization not found';
    RETURN;
  END IF;

  IF NOT v_subscription_active THEN
    RETURN QUERY SELECT FALSE, 0::BIGINT, 0, 0, 0, 'Subscription expired or suspended';
    RETURN;
  END IF;

  -- Get the plan limit for this resource
  v_plan_limit := CASE p_resource_type
    WHEN 'users' THEN (SELECT max_users FROM subscription_plans WHERE tier = v_tier)
    WHEN 'clients' THEN (SELECT max_clients FROM subscription_plans WHERE tier = v_tier)
    WHEN 'matters' THEN (SELECT max_matters FROM subscription_plans WHERE tier = v_tier)
    WHEN 'iras_finalized' THEN (SELECT max_iras_per_year FROM subscription_plans WHERE tier = v_tier)
    WHEN 'compliance_cases' THEN (SELECT max_compliance_cases_per_year FROM subscription_plans WHERE tier = v_tier)
    WHEN 'screenings' THEN (SELECT max_screenings_per_month FROM subscription_plans WHERE tier = v_tier)
    ELSE NULL
  END;

  -- NULL limit means unlimited
  IF v_plan_limit IS NULL THEN
    RETURN QUERY SELECT TRUE, 0::BIGINT, NULL::INTEGER, 0, NULL::INTEGER, 'Unlimited under plan';
    RETURN;
  END IF;

  -- Look up addon extras for this resource type
  v_addon_extra := COALESCE((
    SELECT SUM(oa.quantity * CASE
      WHEN sa.addon_code = 'extra_user_seat' AND p_resource_type = 'users' THEN 1
      WHEN sa.addon_code = 'extra_100_clients' AND p_resource_type = 'clients' THEN 100
      ELSE 0
    END)
    FROM organization_addons oa
    JOIN subscription_addons sa ON sa.id = oa.addon_id
    WHERE oa.organization_id = p_org_id
      AND oa.is_active = TRUE
      AND (oa.expires_at IS NULL OR oa.expires_at > NOW())
  ), 0);

  -- Determine current period for time-windowed resources
  IF p_resource_type IN ('iras_finalized', 'compliance_cases') THEN
    -- Annual resources: window is current calendar year
    v_period_start := DATE_TRUNC('year', NOW())::DATE;
    v_period_end := (DATE_TRUNC('year', NOW()) + INTERVAL '1 year - 1 day')::DATE;
  ELSIF p_resource_type = 'screenings' THEN
    -- Monthly resources: window is current calendar month
    v_period_start := DATE_TRUNC('month', NOW())::DATE;
    v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    -- Cumulative resources: total count, no period
    v_period_start := NULL;
    v_period_end := NULL;
  END IF;

  -- Get current usage
  IF v_period_start IS NULL THEN
    -- Cumulative count (e.g., total active users, total clients)
    v_current := CASE p_resource_type
      WHEN 'users' THEN (
        SELECT COUNT(*) FROM user_profiles
        WHERE organization_id = p_org_id AND is_active = TRUE
      )
      WHEN 'clients' THEN (
        SELECT COUNT(*) FROM kyc_clients WHERE organization_id = p_org_id
      )
      WHEN 'matters' THEN (
        -- Adjust this if your matters table has a different name
        COALESCE((SELECT COUNT(*) FROM matters WHERE organization_id = p_org_id AND status != 'closed'), 0)
      )
      ELSE 0
    END;
  ELSE
    -- Period-windowed count from subscription_usage
    v_current := COALESCE((
      SELECT used_count FROM subscription_usage
      WHERE organization_id = p_org_id
        AND resource_type = p_resource_type
        AND period_start = v_period_start
    ), 0);
  END IF;

  -- Calculate effective limit and result
  RETURN QUERY SELECT
    (v_current < (v_plan_limit + v_addon_extra)) AS allowed,
    v_current,
    v_plan_limit,
    v_addon_extra,
    (v_plan_limit + v_addon_extra)::INTEGER AS effective_limit,
    CASE
      WHEN v_current < (v_plan_limit + v_addon_extra)
        THEN 'Within limit'
      ELSE format('Limit reached: %s/%s (plan: %s, addons: +%s). Upgrade or purchase add-on.',
                  v_current, v_plan_limit + v_addon_extra, v_plan_limit, v_addon_extra)
    END;
END $$;

COMMENT ON FUNCTION check_subscription_limit IS
  'Call this BEFORE inserting a new resource (client, matter, IRA, etc.) to verify the organization is within its plan limits. Returns allowed=true/false plus context.';


-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION: record_usage
-- Increment usage counter for a period-windowed resource.
-- Call this when a resource is consumed (e.g., when an IRA is finalized).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_usage(
  p_org_id UUID,
  p_resource_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_type TEXT;
  v_period_start DATE;
  v_period_end DATE;
  v_new_total BIGINT;
BEGIN
  -- Determine the period bucket for this resource type
  CASE p_resource_type
    WHEN 'iras_finalized' THEN
      v_period_type := 'year';
      v_period_start := DATE_TRUNC('year', NOW())::DATE;
      v_period_end := (DATE_TRUNC('year', NOW()) + INTERVAL '1 year - 1 day')::DATE;
    WHEN 'compliance_cases' THEN
      v_period_type := 'year';
      v_period_start := DATE_TRUNC('year', NOW())::DATE;
      v_period_end := (DATE_TRUNC('year', NOW()) + INTERVAL '1 year - 1 day')::DATE;
    WHEN 'screenings' THEN
      v_period_type := 'month';
      v_period_start := DATE_TRUNC('month', NOW())::DATE;
      v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE;
    WHEN 'api_calls' THEN
      v_period_type := 'day';
      v_period_start := NOW()::DATE;
      v_period_end := NOW()::DATE;
    ELSE
      v_period_type := 'cumulative';
      v_period_start := NULL;
      v_period_end := NULL;
  END CASE;

  -- Upsert the usage record
  INSERT INTO subscription_usage (
    organization_id, resource_type, period_type, period_start, period_end, used_count, recorded_at
  )
  VALUES (
    p_org_id, p_resource_type, v_period_type, v_period_start, v_period_end, p_count, NOW()
  )
  ON CONFLICT (organization_id, resource_type, period_type, period_start)
  DO UPDATE SET
    used_count = subscription_usage.used_count + p_count,
    recorded_at = NOW()
  RETURNING used_count INTO v_new_total;

  RETURN v_new_total;
END $$;

COMMENT ON FUNCTION record_usage IS
  'Increment metered resource usage. Call this when an IRA is finalized, a screening is logged, etc. Period buckets are automatic.';


-- ============================================================================
-- SECTION 12: Row-Level Security (RLS) Policies
-- ============================================================================
--
-- NOTE: These policies reference the 'authenticated' role, which is
-- automatically provisioned by Supabase. The block below ensures that role
-- exists (as NOLOGIN) before policies reference it, so this migration is
-- portable to non-Supabase environments and re-runnable safely.
--
-- In Supabase production the 'authenticated' role already exists with the
-- correct permissions; this block is a no-op there.
-- ============================================================================

-- Ensure 'authenticated' role exists (Supabase auto-creates it; this is a safety net)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- subscription_addons: catalog readable by all authenticated users; only admins write
DROP POLICY IF EXISTS "subscription_addons_select_all" ON subscription_addons;
CREATE POLICY "subscription_addons_select_all"
  ON subscription_addons
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "subscription_addons_admin_write" ON subscription_addons;
CREATE POLICY "subscription_addons_admin_write"
  ON subscription_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- organization_addons: org members see their own; admins see all
DROP POLICY IF EXISTS "organization_addons_org_select" ON organization_addons;
CREATE POLICY "organization_addons_org_select"
  ON organization_addons
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "organization_addons_admin_write" ON organization_addons;
CREATE POLICY "organization_addons_admin_write"
  ON organization_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- subscription_usage: org members read; system writes via record_usage()
DROP POLICY IF EXISTS "subscription_usage_org_read" ON subscription_usage;
CREATE POLICY "subscription_usage_org_read"
  ON subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- subscription_payments: org's management/admin read; only admins write
DROP POLICY IF EXISTS "subscription_payments_org_management_read" ON subscription_payments;
CREATE POLICY "subscription_payments_org_management_read"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    (
      organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('management', 'senior_partner', 'partner')
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "subscription_payments_admin_write" ON subscription_payments;
CREATE POLICY "subscription_payments_admin_write"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================================
-- SECTION 13: Updated_at triggers
-- ============================================================================

-- Generic updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

-- Attach to new tables
DROP TRIGGER IF EXISTS set_updated_at_subscription_addons ON subscription_addons;
CREATE TRIGGER set_updated_at_subscription_addons
  BEFORE UPDATE ON subscription_addons
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_organization_addons ON organization_addons;
CREATE TRIGGER set_updated_at_organization_addons
  BEFORE UPDATE ON organization_addons
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- SECTION 14: Verification queries (read-only; run these to confirm success)
-- ============================================================================

/*

-- Confirm the 5 new plans exist with correct prices:
SELECT
  tier,
  name,
  price_monthly_tzs,
  price_annual_tzs,
  max_users,
  max_clients,
  max_iras_per_year,
  contact_sales,
  display_order
FROM subscription_plans
ORDER BY display_order;

-- Confirm no orgs are on legacy tier names:
SELECT subscription_tier, COUNT(*) AS org_count
FROM organizations
GROUP BY subscription_tier;

-- Confirm CHECK constraints are correctly applied:
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('subscription_plans'::regclass, 'organizations'::regclass)
  AND contype = 'c';

-- Confirm new tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_addons', 'organization_addons', 'subscription_usage', 'subscription_payments')
ORDER BY table_name;

-- Confirm addon catalog has 10 entries:
SELECT addon_code, name, price_tzs, pricing_model, category
FROM subscription_addons
ORDER BY display_order;

-- Test the VAT helper:
SELECT * FROM calculate_vat_breakdown(150000);
-- Expected: gross=150000, net≈127119, vat≈22881

-- Test the subscription status function (replace UUID with a real org_id):
-- SELECT * FROM get_organization_subscription_status('00000000-0000-0000-0000-000000000000');

-- Test the limit checker (replace UUID with a real org_id):
-- SELECT * FROM check_subscription_limit('00000000-0000-0000-0000-000000000000', 'clients');

*/


-- ============================================================================
-- ROLLBACK TEMPLATE (commented out — uncomment selectively if needed)
-- ============================================================================

/*
-- TO ROLLBACK THIS MIGRATION:
-- (Note: rollback will lose any new data in the new tables.)

-- 1. Drop the new tables
DROP TABLE IF EXISTS subscription_payments CASCADE;
DROP TABLE IF EXISTS organization_addons CASCADE;
DROP TABLE IF EXISTS subscription_usage CASCADE;
DROP TABLE IF EXISTS subscription_addons CASCADE;

-- 2. Drop the helper functions
DROP FUNCTION IF EXISTS calculate_vat_breakdown(INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS get_organization_subscription_status(UUID);
DROP FUNCTION IF EXISTS check_subscription_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS record_usage(UUID, TEXT, INTEGER);

-- 3. Drop the new CHECK constraints
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_tier_check;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;

-- 4. Restore organizations to legacy tier names
UPDATE organizations SET subscription_tier = 'basic'        WHERE subscription_tier = 'solo';
UPDATE organizations SET subscription_tier = 'professional' WHERE subscription_tier = 'small_firm';
UPDATE organizations SET subscription_tier = 'enterprise'   WHERE subscription_tier = 'medium_firm';
UPDATE organizations SET subscription_tier = 'enterprise'   WHERE subscription_tier = 'large_firm';

-- 5. Restore old CHECK constraint on organizations
ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check_old
  CHECK (subscription_tier IN ('trial', 'basic', 'professional', 'enterprise'));

-- 6. Wipe new plans and re-seed old plans (you'd need to provide the old seed data)
DELETE FROM subscription_plans;
-- INSERT old plans here...

-- 7. Restore old CHECK constraint on subscription_plans
ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check_old
  CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise'));

-- 8. Drop the backup table (only after confirming everything is restored)
-- DROP TABLE _backup_org_tiers_20260524;
*/


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
