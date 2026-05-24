/*
  # Subscription Plans Redesign (Final)

  Migrates from legacy 4-tier (trial | basic | professional | enterprise)
  to 5-tier model for Tanzanian advocates under AMLA Cap. 423.

  New tiers: trial | solo | small_firm | medium_firm | large_firm

  Sections:
  1. Backup org tier assignments
  2. Drop NOT NULL on price/user columns, rename price columns, add new columns
  3. Drop old tier CHECK constraint on subscription_plans
  4. Delete old plans, insert 5 new plans
  5. Add new tier CHECK constraint on subscription_plans
  6. Migrate orgs to new tier names, update org constraint
  7. Create subscription_addons table + seed 9 addons
  8. Create organization_addons table
  9. Create subscription_usage table
  10. Create subscription_payments table
  11. Helper functions: calculate_vat_breakdown, get_organization_subscription_status,
      check_subscription_limit, record_usage
  12. RLS policies on all new tables
  13. updated_at triggers on new tables
*/

-- ============================================================================
-- SECTION 1: Backup
-- ============================================================================

CREATE TABLE IF NOT EXISTS _backup_org_tiers_20260524 AS
SELECT id, subscription_tier, subscription_expiry_date, max_users, created_at
FROM organizations;

COMMENT ON TABLE _backup_org_tiers_20260524 IS
  'Backup of org tier assignments before 20260524 redesign. Safe to drop after 30 days.';


-- ============================================================================
-- SECTION 2: Schema changes on subscription_plans
-- ============================================================================

-- Make price columns and max_users nullable (large_firm is contact_sales / unlimited)
ALTER TABLE subscription_plans ALTER COLUMN monthly_price DROP NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN max_users     DROP NOT NULL;

-- Rename legacy price columns to new TZS-explicit names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='monthly_price')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='price_monthly_tzs') THEN
    ALTER TABLE subscription_plans RENAME COLUMN monthly_price TO price_monthly_tzs;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='annual_price')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='price_annual_tzs') THEN
    ALTER TABLE subscription_plans RENAME COLUMN annual_price TO price_annual_tzs;
  END IF;

  -- Drop superseded column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_assessments_per_month') THEN
    ALTER TABLE subscription_plans DROP COLUMN max_assessments_per_month;
  END IF;

  -- New columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='contact_sales') THEN
    ALTER TABLE subscription_plans ADD COLUMN contact_sales BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_matters') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_matters INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_iras_per_year') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_iras_per_year INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_compliance_cases_per_year') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_compliance_cases_per_year INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_screenings_per_month') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_screenings_per_month INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='storage_gb') THEN
    ALTER TABLE subscription_plans ADD COLUMN storage_gb INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='audit_log_retention_years') THEN
    ALTER TABLE subscription_plans ADD COLUMN audit_log_retention_years INTEGER DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='max_branches') THEN
    ALTER TABLE subscription_plans ADD COLUMN max_branches INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='trial_days') THEN
    ALTER TABLE subscription_plans ADD COLUMN trial_days INTEGER DEFAULT 0;
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: Drop old CHECK constraint on subscription_plans.tier
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


-- ============================================================================
-- SECTION 4: Replace plans with 5 new advocate-focused tiers
-- ============================================================================

DELETE FROM subscription_plans;

INSERT INTO subscription_plans (
  tier, name, description,
  price_monthly_tzs, price_annual_tzs,
  max_users, max_clients, max_matters,
  max_iras_per_year, max_compliance_cases_per_year, max_screenings_per_month,
  storage_gb, max_branches, audit_log_retention_years, trial_days,
  features, contact_sales, display_order, is_active
) VALUES
  -- TIER 1: TRIAL
  ('trial', '14-Day Trial',
   'Free 14-day evaluation. Preview the full system with sample data. No credit card required.',
   0, 0, 2, 5, 5, 0, 0, 10, 1, 1, 10, 14,
   '{"kyc_management":true,"matter_management":true,"ira_preview_only":true,"maturity_assessment_preview":true,"str_tracking":false,"compliance_cases":false,"reports_watermarked":true,"mfa_enforcement":"optional","security_monitoring":false,"api_access":false,"support_response_hours":48}',
   FALSE, 0, TRUE),

  -- TIER 2: SOLO ADVOCATE
  ('solo', 'Solo Advocate',
   'For solo practitioners. Full KYC/CDD, Institutional Risk Assessment, and Maturity Assessment - everything you need for AMLA Cap. 423 compliance.',
   150000, 1500000, 3, 75, 100, 2, 25, 200, 5, 1, 10, 0,
   '{"kyc_management":true,"matter_management":true,"ira_finalized_per_year":2,"maturity_assessment":"annual","str_tracking":true,"compliance_cases":true,"reports_branded":true,"mfa_enforcement":"optional","security_monitoring":"view_only","intrusion_detection":false,"api_access":false,"multi_branch":false,"nida_integration_ready":true,"brela_integration_ready":true,"support_response_hours":24,"support_channels":["email"],"onboarding":"2hr_video_walkthrough","roles_allowed":["admin","staff","compliance_officer","lawyer"]}',
   FALSE, 1, TRUE),

  -- TIER 3: SMALL FIRM
  ('small_firm', 'Small Firm',
   'For firms with 2-10 advocates. Adds quarterly Maturity reviews, full security monitoring, MLRO/Senior Partner roles, and read-only API access.',
   450000, 4500000, 12, 300, 500, 4, 100, 1000, 25, 1, 10, 0,
   '{"kyc_management":true,"matter_management":true,"ira_finalized_per_year":4,"maturity_assessment":"quarterly","str_tracking":true,"str_bulk_filing":false,"compliance_cases":true,"reports_branded":true,"reports_letterhead":true,"mfa_enforcement":"recommended","security_monitoring":true,"intrusion_detection":true,"api_access":"read_only","multi_branch":false,"integration_analytics":true,"workflow_automation":false,"nida_integration_ready":true,"brela_integration_ready":true,"support_response_hours":12,"support_channels":["email","whatsapp"],"onboarding":"1_day_virtual_training","roles_allowed":["admin","staff","compliance_officer","lawyer","mlro","senior_partner"]}',
   FALSE, 2, TRUE),

  -- TIER 4: MEDIUM FIRM
  ('medium_firm', 'Medium Firm',
   'For firms with 11-30 advocates. Unlimited finalized IRAs, monthly Maturity trending, multi-branch support, full API, and workflow automation. Premium support.',
   1200000, 12000000, 30, 1000, 2000, NULL, 500, 5000, 100, 3, 10, 0,
   '{"kyc_management":true,"matter_management":true,"ira_finalized_per_year":null,"maturity_assessment":"monthly_with_trending","str_tracking":true,"str_bulk_filing":true,"compliance_cases":true,"reports_branded":true,"reports_letterhead":true,"reports_scheduled":true,"mfa_enforcement":"required","security_monitoring":true,"intrusion_detection":true,"intrusion_detection_alerts":true,"api_access":"full","multi_branch":3,"integration_analytics":true,"workflow_automation":true,"nida_integration_ready":true,"brela_integration_ready":true,"support_response_hours":4,"support_channels":["email","whatsapp","phone"],"onboarding":"2_day_onsite_or_virtual","roles_allowed":["admin","staff","compliance_officer","lawyer","mlro","senior_partner","management"],"regulatory_advance_notice":false}',
   FALSE, 3, TRUE),

  -- TIER 5: LARGE FIRM (contact sales)
  ('large_firm', 'Large Firm',
   'For firms with 30+ advocates. Unlimited everything, dedicated CSM, SLA-backed support, white-label reports, custom integrations, custom workflows.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 500, NULL, 10, 0,
   '{"kyc_management":true,"matter_management":true,"ira_finalized_per_year":null,"maturity_assessment":"continuous_with_benchmarking","str_tracking":true,"str_bulk_filing":true,"str_api_to_fiu":"when_available","compliance_cases":true,"reports_branded":true,"reports_white_label":true,"reports_scheduled":true,"mfa_enforcement":"required","sso_ready":true,"security_monitoring":true,"intrusion_detection":true,"intrusion_detection_custom_rules":true,"api_access":"full_plus_webhooks","multi_branch":null,"integration_analytics":true,"workflow_automation":true,"workflow_custom":true,"custom_roles":true,"nida_integration_ready":true,"brela_integration_ready":true,"custom_integrations":true,"support_response_hours":1,"support_channels":["email","whatsapp","phone","dedicated_csm"],"sla_uptime_percent":99.9,"onboarding":"custom_program","roles_allowed":"all_plus_custom","regulatory_advance_notice":true}',
   TRUE, 4, TRUE);


-- ============================================================================
-- SECTION 5: New CHECK constraint on subscription_plans.tier
-- ============================================================================

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IN ('trial', 'solo', 'small_firm', 'medium_firm', 'large_firm'));


-- ============================================================================
-- SECTION 6: Migrate organizations to new tier names
-- ============================================================================

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

UPDATE organizations SET subscription_tier = 'solo'        WHERE subscription_tier = 'basic';
UPDATE organizations SET subscription_tier = 'small_firm'  WHERE subscription_tier = 'professional';
UPDATE organizations SET subscription_tier = 'medium_firm' WHERE subscription_tier = 'enterprise';
UPDATE organizations SET subscription_tier = 'trial'
  WHERE subscription_tier IS NULL
     OR subscription_tier NOT IN ('trial','solo','small_firm','medium_firm','large_firm');

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('trial','solo','small_firm','medium_firm','large_firm'));


-- ============================================================================
-- SECTION 7: subscription_addons catalog
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_addons (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_code      TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  category        TEXT    NOT NULL CHECK (category IN ('capacity','feature','service','integration')),
  pricing_model   TEXT    NOT NULL CHECK (pricing_model IN ('one_time','monthly_recurring','annual_recurring','per_unit')),
  price_tzs       INTEGER NOT NULL,
  unit_label      TEXT,
  applicable_tiers TEXT[] NOT NULL DEFAULT ARRAY['solo','small_firm','medium_firm','large_firm'],
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_addons IS
  'Catalog of optional add-ons. Prices VAT-inclusive in TZS.';

INSERT INTO subscription_addons (addon_code, name, description, category, pricing_model, price_tzs, unit_label, applicable_tiers, display_order) VALUES
  ('extra_user_seat',        'Additional User Seat',                   'Add one extra user above your plan limit.',                                                                                     'capacity',    'monthly_recurring', 50000,   'per user / month',                ARRAY['solo','small_firm','medium_firm'],                         1),
  ('extra_100_clients',      'Additional 100 KYC Records',             'Add 100 more client KYC records above your plan limit.',                                                                        'capacity',    'monthly_recurring', 100000,  'per 100 clients / month',          ARRAY['solo','small_firm','medium_firm'],                         2),
  ('extra_10gb_storage',     'Additional 10 GB Document Storage',      'Add 10 GB of secure document storage.',                                                                                         'capacity',    'monthly_recurring', 50000,   'per 10 GB / month',                ARRAY['solo','small_firm','medium_firm'],                         3),
  ('extra_finalized_ira',    'Additional Finalized IRA',               'Finalize one additional IRA beyond your plan limit.',                                                                            'feature',     'per_unit',          500000,  'per finalized IRA',               ARRAY['solo','small_firm'],                                      10),
  ('standalone_ira_only',    'Standalone IRA & Maturity Subscription', 'Annual subscription for IRA and Maturity Framework only. Replaces consultant FWRA at a fraction of the cost.',                  'feature',     'annual_recurring',  1800000, 'per year',                        ARRAY['trial','solo','small_firm','medium_firm','large_firm'],   11),
  ('amla_training_1day',     'AMLA Cap. 423 Staff Training',           'In-person 1-day AMLA compliance training for up to 20 attendees. Includes materials and certification.',                        'service',     'one_time',          2500000, 'per session (up to 20 attendees)', ARRAY['solo','small_firm','medium_firm','large_firm'],           20),
  ('compliance_health_check','AMLA Compliance Health Check',           'Independent consultant produces a regulator-ready compliance audit report using your system data.',                              'service',     'one_time',          1800000, 'per engagement',                  ARRAY['solo','small_firm','medium_firm','large_firm'],           21),
  ('consultant_retainer',    'Dedicated Compliance Consultant Retainer','Monthly retainer: dedicated AML consultant + system. Includes advisory, FIU correspondence support, quarterly reviews.',       'service',     'monthly_recurring', 3500000, 'per month',                       ARRAY['small_firm','medium_firm','large_firm'],                   22),
  ('custom_pms_integration', 'Custom PMS Integration',                 'Integrate with your existing practice management software. Scope and quote per engagement.',                                     'integration', 'one_time',          5000000, 'starting price',                  ARRAY['medium_firm','large_firm'],                               30)
ON CONFLICT (addon_code) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, category=EXCLUDED.category,
  pricing_model=EXCLUDED.pricing_model, price_tzs=EXCLUDED.price_tzs,
  unit_label=EXCLUDED.unit_label, applicable_tiers=EXCLUDED.applicable_tiers,
  display_order=EXCLUDED.display_order, updated_at=NOW();


-- ============================================================================
-- SECTION 8: organization_addons
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_addons (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_id        UUID    NOT NULL REFERENCES subscription_addons(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organization_addons IS
  'Tracks active add-ons per organization. expires_at NULL = perpetual/one-time.';

CREATE INDEX IF NOT EXISTS idx_org_addons_org    ON organization_addons(organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_addons_addon  ON organization_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_org_addons_active ON organization_addons(organization_id, is_active, expires_at);


-- ============================================================================
-- SECTION 9: subscription_usage (metering)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_usage (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type   TEXT    NOT NULL CHECK (resource_type IN (
    'users','clients','matters','iras_finalized','compliance_cases','screenings','storage_bytes','api_calls'
  )),
  period_type     TEXT    CHECK (period_type IN ('day','month','year','cumulative')),
  period_start    DATE,
  period_end      DATE,
  used_count      BIGINT  NOT NULL DEFAULT 0,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_usage_unique_period
    UNIQUE (organization_id, resource_type, period_type, period_start)
);

COMMENT ON TABLE subscription_usage IS
  'Metered resource usage per organization. One row per org+resource+period.';

CREATE INDEX IF NOT EXISTS idx_sub_usage_org_res ON subscription_usage(organization_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_sub_usage_period  ON subscription_usage(organization_id, resource_type, period_start, period_end);


-- ============================================================================
-- SECTION 10: subscription_payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID    NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  payment_reference       TEXT    NOT NULL UNIQUE,
  payment_type            TEXT    NOT NULL CHECK (payment_type IN (
    'subscription_initial','subscription_renewal','addon_purchase','addon_renewal','upgrade','refund'
  )),
  payment_method          TEXT    NOT NULL CHECK (payment_method IN (
    'mpesa','tigo_pesa','airtel_money',
    'bank_transfer_crdb','bank_transfer_nmb','bank_transfer_stanbic','bank_transfer_other',
    'card_visa','card_mastercard','manual_admin'
  )),
  amount_gross_tzs        INTEGER NOT NULL,
  amount_net_tzs          INTEGER NOT NULL,
  vat_amount_tzs          INTEGER NOT NULL,
  vat_rate                NUMERIC(4,2) NOT NULL DEFAULT 18.00,
  subscription_tier       TEXT,
  addon_id                UUID REFERENCES subscription_addons(id),
  billing_period          TEXT CHECK (billing_period IN ('monthly','annual','one_time')),
  period_start            DATE,
  period_end              DATE,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','processing','completed','failed','refunded','cancelled'
  )),
  provider_transaction_id TEXT,
  provider_response       JSONB,
  external_reference      TEXT,
  invoice_number          TEXT UNIQUE,
  invoice_issued_at       TIMESTAMPTZ,
  initiated_by            UUID REFERENCES user_profiles(id),
  approved_by             UUID REFERENCES user_profiles(id),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  failed_at               TIMESTAMPTZ,
  failure_reason          TEXT
);

COMMENT ON TABLE subscription_payments IS
  'Complete payment ledger. amount_gross_tzs is VAT-inclusive. Required for TRA tax filing.';

CREATE INDEX IF NOT EXISTS idx_sub_payments_org     ON subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status  ON subscription_payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sub_payments_method  ON subscription_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_sub_payments_period  ON subscription_payments(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sub_payments_invoice ON subscription_payments(invoice_number) WHERE invoice_number IS NOT NULL;


-- ============================================================================
-- SECTION 11: Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_vat_breakdown(
  p_gross_amount_tzs INTEGER,
  p_vat_rate NUMERIC DEFAULT 18.00
)
RETURNS TABLE (gross_tzs INTEGER, net_tzs INTEGER, vat_tzs INTEGER, vat_rate NUMERIC)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN QUERY SELECT
    p_gross_amount_tzs::INTEGER,
    ROUND(p_gross_amount_tzs / (1 + p_vat_rate / 100))::INTEGER,
    (p_gross_amount_tzs - ROUND(p_gross_amount_tzs / (1 + p_vat_rate / 100)))::INTEGER,
    p_vat_rate;
END $$;

COMMENT ON FUNCTION calculate_vat_breakdown IS
  'Splits a VAT-inclusive TZS amount into net and VAT. Tanzania VAT = 18%.';

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_organization_subscription_status(p_org_id UUID)
RETURNS TABLE (
  organization_id UUID, organization_name TEXT,
  subscription_tier TEXT, plan_name TEXT,
  is_active BOOLEAN, subscription_expiry_date TIMESTAMPTZ,
  days_until_expiry INTEGER, is_expired BOOLEAN, is_trial BOOLEAN,
  max_users INTEGER, max_clients INTEGER, max_matters INTEGER,
  features JSONB, contact_sales BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id, o.name, o.subscription_tier, sp.name,
    o.is_active, o.subscription_expiry_date,
    CASE
      WHEN o.subscription_expiry_date IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (o.subscription_expiry_date - NOW()))::INTEGER
    END,
    (o.subscription_expiry_date IS NOT NULL AND o.subscription_expiry_date < NOW()),
    (o.subscription_tier = 'trial'),
    sp.max_users, sp.max_clients, sp.max_matters,
    sp.features, sp.contact_sales
  FROM organizations o
  LEFT JOIN subscription_plans sp ON sp.tier = o.subscription_tier
  WHERE o.id = p_org_id;
END $$;

COMMENT ON FUNCTION get_organization_subscription_status IS
  'Single source of truth for an organization subscription state.';

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_subscription_limit(p_org_id UUID, p_resource_type TEXT)
RETURNS TABLE (
  allowed BOOLEAN, current_usage BIGINT,
  plan_limit INTEGER, addon_extra INTEGER,
  effective_limit INTEGER, reason TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tier TEXT; v_plan_limit INTEGER; v_current BIGINT;
  v_addon_extra INTEGER := 0; v_period_start DATE; v_sub_active BOOLEAN;
BEGIN
  SELECT o.subscription_tier,
    (o.is_active = TRUE AND (o.subscription_expiry_date IS NULL OR o.subscription_expiry_date > NOW()))
  INTO v_tier, v_sub_active
  FROM organizations o WHERE o.id = p_org_id;

  IF v_tier IS NULL THEN
    RETURN QUERY SELECT FALSE,0::BIGINT,0,0,0,'Organization not found'::TEXT; RETURN;
  END IF;
  IF NOT v_sub_active THEN
    RETURN QUERY SELECT FALSE,0::BIGINT,0,0,0,'Subscription expired or suspended'::TEXT; RETURN;
  END IF;

  v_plan_limit := CASE p_resource_type
    WHEN 'users'            THEN (SELECT max_users FROM subscription_plans WHERE tier=v_tier)
    WHEN 'clients'          THEN (SELECT max_clients FROM subscription_plans WHERE tier=v_tier)
    WHEN 'matters'          THEN (SELECT max_matters FROM subscription_plans WHERE tier=v_tier)
    WHEN 'iras_finalized'   THEN (SELECT max_iras_per_year FROM subscription_plans WHERE tier=v_tier)
    WHEN 'compliance_cases' THEN (SELECT max_compliance_cases_per_year FROM subscription_plans WHERE tier=v_tier)
    WHEN 'screenings'       THEN (SELECT max_screenings_per_month FROM subscription_plans WHERE tier=v_tier)
    ELSE NULL
  END;

  IF v_plan_limit IS NULL THEN
    RETURN QUERY SELECT TRUE,0::BIGINT,NULL::INTEGER,0,NULL::INTEGER,'Unlimited under plan'::TEXT; RETURN;
  END IF;

  v_addon_extra := COALESCE((
    SELECT SUM(oa.quantity * CASE
      WHEN sa.addon_code='extra_user_seat'   AND p_resource_type='users'   THEN 1
      WHEN sa.addon_code='extra_100_clients' AND p_resource_type='clients' THEN 100
      ELSE 0 END)
    FROM organization_addons oa JOIN subscription_addons sa ON sa.id=oa.addon_id
    WHERE oa.organization_id=p_org_id AND oa.is_active=TRUE
      AND (oa.expires_at IS NULL OR oa.expires_at > NOW())
  ), 0);

  v_period_start := CASE
    WHEN p_resource_type IN ('iras_finalized','compliance_cases') THEN DATE_TRUNC('year',NOW())::DATE
    WHEN p_resource_type = 'screenings'                          THEN DATE_TRUNC('month',NOW())::DATE
    ELSE NULL
  END;

  IF v_period_start IS NULL THEN
    v_current := CASE p_resource_type
      WHEN 'users'   THEN (SELECT COUNT(*) FROM user_profiles WHERE organization_id=p_org_id AND is_active=TRUE)
      WHEN 'clients' THEN (SELECT COUNT(*) FROM kyc_clients WHERE organization_id=p_org_id)
      WHEN 'matters' THEN COALESCE((SELECT COUNT(*) FROM matters WHERE organization_id=p_org_id AND status!='closed'),0)
      ELSE 0
    END;
  ELSE
    v_current := COALESCE((
      SELECT used_count FROM subscription_usage
      WHERE organization_id=p_org_id AND resource_type=p_resource_type AND period_start=v_period_start
    ), 0);
  END IF;

  RETURN QUERY SELECT
    (v_current < (v_plan_limit + v_addon_extra)),
    v_current, v_plan_limit, v_addon_extra,
    (v_plan_limit + v_addon_extra)::INTEGER,
    CASE WHEN v_current < (v_plan_limit + v_addon_extra) THEN 'Within limit'::TEXT
         ELSE format('Limit reached: %s/%s (plan: %s, addons: +%s). Upgrade or purchase add-on.',
                     v_current, v_plan_limit+v_addon_extra, v_plan_limit, v_addon_extra)::TEXT
    END;
END $$;

COMMENT ON FUNCTION check_subscription_limit IS
  'Call before inserting a new resource to verify the org is within plan limits.';

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_usage(p_org_id UUID, p_resource_type TEXT, p_count INTEGER DEFAULT 1)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_ptype TEXT; v_pstart DATE; v_pend DATE; v_total BIGINT;
BEGIN
  CASE p_resource_type
    WHEN 'iras_finalized','compliance_cases' THEN
      v_ptype:='year'; v_pstart:=DATE_TRUNC('year',NOW())::DATE;
      v_pend:=(DATE_TRUNC('year',NOW())+INTERVAL '1 year - 1 day')::DATE;
    WHEN 'screenings' THEN
      v_ptype:='month'; v_pstart:=DATE_TRUNC('month',NOW())::DATE;
      v_pend:=(DATE_TRUNC('month',NOW())+INTERVAL '1 month - 1 day')::DATE;
    WHEN 'api_calls' THEN
      v_ptype:='day'; v_pstart:=NOW()::DATE; v_pend:=NOW()::DATE;
    ELSE
      v_ptype:='cumulative'; v_pstart:=NULL; v_pend:=NULL;
  END CASE;

  INSERT INTO subscription_usage
    (organization_id,resource_type,period_type,period_start,period_end,used_count,recorded_at)
  VALUES (p_org_id,p_resource_type,v_ptype,v_pstart,v_pend,p_count,NOW())
  ON CONFLICT (organization_id,resource_type,period_type,period_start)
  DO UPDATE SET used_count=subscription_usage.used_count+p_count, recorded_at=NOW()
  RETURNING used_count INTO v_total;

  RETURN v_total;
END $$;

COMMENT ON FUNCTION record_usage IS
  'Increment metered resource usage. Period buckets are determined automatically.';


-- ============================================================================
-- SECTION 12: RLS policies
-- ============================================================================

ALTER TABLE subscription_addons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_addons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- subscription_addons: public catalog read; admin write
DROP POLICY IF EXISTS "subscription_addons_select_all"  ON subscription_addons;
DROP POLICY IF EXISTS "subscription_addons_admin_write" ON subscription_addons;
CREATE POLICY "subscription_addons_select_all"
  ON subscription_addons FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "subscription_addons_admin_write"
  ON subscription_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin'));

-- organization_addons: own org read; admin write
DROP POLICY IF EXISTS "organization_addons_org_select"  ON organization_addons;
DROP POLICY IF EXISTS "organization_addons_admin_write" ON organization_addons;
CREATE POLICY "organization_addons_org_select"
  ON organization_addons FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id=auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin')
  );
CREATE POLICY "organization_addons_admin_write"
  ON organization_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin'));

-- subscription_usage: own org read
DROP POLICY IF EXISTS "subscription_usage_org_read" ON subscription_usage;
CREATE POLICY "subscription_usage_org_read"
  ON subscription_usage FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id=auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin')
  );

-- subscription_payments: management/senior_partner/admin read; admin write
DROP POLICY IF EXISTS "subscription_payments_mgmt_read"  ON subscription_payments;
DROP POLICY IF EXISTS "subscription_payments_admin_write" ON subscription_payments;
CREATE POLICY "subscription_payments_mgmt_read"
  ON subscription_payments FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id=auth.uid() AND role IN ('management','senior_partner')
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin')
  );
CREATE POLICY "subscription_payments_admin_write"
  ON subscription_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id=auth.uid() AND role='admin'));


-- ============================================================================
-- SECTION 13: updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_sub_addons_updated_at   ON subscription_addons;
CREATE TRIGGER trg_sub_addons_updated_at
  BEFORE UPDATE ON subscription_addons FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_org_addons_updated_at   ON organization_addons;
CREATE TRIGGER trg_org_addons_updated_at
  BEFORE UPDATE ON organization_addons FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
