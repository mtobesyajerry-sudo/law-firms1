/*
  # Add sector columns, normalize dnfbp_framework_mappings, add get_framework_for_category

  ## Changes

  1. Add nullable `sector` column to `organizations`
     CHECK: law_firm | insurance | accounting | general_dnfbp

  2. Add nullable `sector` column to `assessments`
     Same CHECK as organizations.sector

  3. Extend `dnfbp_framework_mappings` (table already exists from prior migration)
     a. Add missing columns: category_label (text), description (text), display_order (int)
     b. NORMALIZE existing framework_type values to canonical set before adding CHECK:
          accountants         -> audit_firm
          legal_professionals -> law_firm
          general_dnfbp       -> dnfbp
     c. Drop any prior framework_type CHECK, then add canonical 4-value CHECK:
          IN ('dnfbp','audit_firm','insurer','law_firm')
     d. Upsert all 11 seed rows

  4. Create STABLE function get_framework_for_category(p_category text)
     Returns framework_type for the given category_value, defaults to 'dnfbp'

  5. Partial index on dnfbp_framework_mappings(category_value) WHERE is_active

  ## Notes
  - organizations.dnfbp_category is untouched
  - assessments.valid_framework_type constraint on the separate `framework_type` column
    (used for the institutional risk assessment module) is untouched
*/

-- ── 1. organizations.sector ─────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sector text
    CHECK (sector IN ('law_firm','insurance','accounting','general_dnfbp'));

-- ── 2. assessments.sector ───────────────────────────────────────────────────

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS sector text
    CHECK (sector IN ('law_firm','insurance','accounting','general_dnfbp'));

-- ── 3. Extend dnfbp_framework_mappings ──────────────────────────────────────

-- 3a. Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dnfbp_framework_mappings' AND column_name = 'category_label'
  ) THEN
    ALTER TABLE dnfbp_framework_mappings ADD COLUMN category_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dnfbp_framework_mappings' AND column_name = 'description'
  ) THEN
    ALTER TABLE dnfbp_framework_mappings ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dnfbp_framework_mappings' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE dnfbp_framework_mappings ADD COLUMN display_order integer DEFAULT 100;
  END IF;
END $$;

-- 3b. Normalize legacy framework_type values to canonical strings
UPDATE dnfbp_framework_mappings SET framework_type = 'audit_firm'
  WHERE framework_type = 'accountants';

UPDATE dnfbp_framework_mappings SET framework_type = 'law_firm'
  WHERE framework_type = 'legal_professionals';

UPDATE dnfbp_framework_mappings SET framework_type = 'dnfbp'
  WHERE framework_type = 'general_dnfbp';

-- 3c. Replace framework_type CHECK with canonical 4-value constraint
ALTER TABLE dnfbp_framework_mappings
  DROP CONSTRAINT IF EXISTS dnfbp_framework_mappings_framework_type_check;

ALTER TABLE dnfbp_framework_mappings
  ADD CONSTRAINT dnfbp_framework_mappings_framework_type_check
  CHECK (framework_type IN ('dnfbp','audit_firm','insurer','law_firm'));

-- 3d. Upsert all 11 seed rows
INSERT INTO dnfbp_framework_mappings
  (category_value, category_label, framework_type, assessment_route, kyc_route,
   description, display_order, is_active)
VALUES
  ('real_estate_agent',  'Real Estate Agent',                  'dnfbp',     '/assessment/:id', '/kyc-form',             'Real estate agents involved in buying/selling property',       10,  true),
  ('accountant',         'Accountant / Auditor',               'audit_firm', '/assessment/:id', '/accountant-kyc-form', 'Registered accountants and auditors (NBAA members)',           20,  true),
  ('trust_company',      'Trust / Company Service Provider',   'dnfbp',     '/assessment/:id', '/kyc-form',             'Trust companies and corporate service providers',              30,  true),
  ('precious_metals',    'Dealer in Precious Metals / Stones', 'dnfbp',     '/assessment/:id', '/kyc-form',             'Dealers in precious metals, gems, and stones',                40,  true),
  ('casino',             'Casino / Gaming Operator',           'dnfbp',     '/assessment/:id', '/kyc-form',             'Casinos, betting houses, and gaming operators',               50,  true),
  ('money_transfer',     'Money Transfer Operator',            'dnfbp',     '/assessment/:id', '/kyc-form',             'Money transfer and remittance businesses',                    60,  true),
  ('exchange_bureau',    'Foreign Exchange Bureau',            'dnfbp',     '/assessment/:id', '/kyc-form',             'Licensed foreign exchange bureaux',                           70,  true),
  ('investment_advisor', 'Investment Advisor',                 'dnfbp',     '/assessment/:id', '/kyc-form',             'Independent investment and financial advisors',               80,  true),
  ('insurance_company',  'Insurance Company',                  'insurer',   '/assessment/:id', '/kyc-form',             'Insurance companies regulated by TIRA',                       90,  true),
  ('law_firm',           'Law Firm / Legal Professional',      'law_firm',  '/assessment/:id', '/kyc-client/:clientId','Law firms and individual legal practitioners',                100, true),
  ('other',              'Other DNFBP',                        'dnfbp',     '/assessment/:id', '/kyc-form',             'Other designated non-financial businesses or professions',    110, true)
ON CONFLICT (category_value) DO UPDATE SET
  category_label   = EXCLUDED.category_label,
  framework_type   = EXCLUDED.framework_type,
  assessment_route = EXCLUDED.assessment_route,
  kyc_route        = EXCLUDED.kyc_route,
  description      = EXCLUDED.description,
  display_order    = EXCLUDED.display_order,
  is_active        = EXCLUDED.is_active,
  updated_at       = now();

-- ── 4. get_framework_for_category function ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_framework_for_category(p_category text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT framework_type
     FROM dnfbp_framework_mappings
     WHERE category_value = p_category
       AND is_active = true
     LIMIT 1),
    'dnfbp'
  );
$$;

-- ── 5. Partial index ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dnfbp_framework_mappings_active_category
  ON dnfbp_framework_mappings(category_value)
  WHERE is_active = true;
