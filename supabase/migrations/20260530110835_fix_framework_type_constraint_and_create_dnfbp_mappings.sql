/*
  # Fix framework_type constraint conflict and create dnfbp_framework_mappings table

  ## Changes

  ### 1. Resolve conflicting CHECK constraints on assessments.framework_type
  - DROP the old restrictive `assessments_framework_type_check` constraint (only allowed
    `legal_professionals` and `banks_financial_institutions`)
  - The existing `valid_framework_type` constraint already allows `dnfbp` and `accountants`;
    we extend it to also include `insurer` and `audit_firm` for the multi-sector merge.

  ### 2. Create dnfbp_framework_mappings reference table
  - Maps DNFBP category values to framework types and UI routes
  - Used by `src/frameworkRouting.js` at runtime
  - RLS: authenticated users can read all rows (reference data)
  - Only admins can insert/update/delete

  ### 3. Seed initial framework mappings
  - accountant → accountant framework
  - audit_firm → audit_firm framework
  - insurer / insurance_company → insurer framework
  - legal_professional → legal_professionals framework
  - real_estate_agent / dealer_precious_metals / casino / trust_company → general dnfbp framework
*/

-- ── 1. Fix assessments.framework_type constraints ───────────────────────────

-- Drop the old restrictive constraint if it still exists
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_framework_type_check;

-- Drop the permissive constraint so we can recreate it with the full value set
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS valid_framework_type;

-- Recreate with all sectors included
ALTER TABLE assessments
  ADD CONSTRAINT valid_framework_type CHECK (
    framework_type IN (
      'legal_professionals',
      'banks_financial_institutions',
      'dnfbp',
      'accountants',
      'insurer',
      'audit_firm',
      'general_dnfbp'
    )
  );

-- ── 2. Create dnfbp_framework_mappings table ────────────────────────────────

CREATE TABLE IF NOT EXISTS dnfbp_framework_mappings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_value    text NOT NULL UNIQUE,
  framework_type    text NOT NULL,
  assessment_route  text,
  kyc_route         text,
  display_name      text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dnfbp_framework_mappings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reference data
CREATE POLICY "Authenticated users can read framework mappings"
  ON dnfbp_framework_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert framework mappings"
  ON dnfbp_framework_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update framework mappings"
  ON dnfbp_framework_mappings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete framework mappings"
  ON dnfbp_framework_mappings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 3. Seed initial mappings ────────────────────────────────────────────────

INSERT INTO dnfbp_framework_mappings
  (category_value, framework_type, assessment_route, kyc_route, display_name, is_active)
VALUES
  ('accountant',           'accountants',              '/assessment/:id', '/accountant-kyc-form',  'Accountant / Auditor',          true),
  ('audit_firm',           'audit_firm',               '/assessment/:id', '/accountant-kyc-form',  'Audit Firm',                    true),
  ('insurer',              'insurer',                  '/assessment/:id', '/kyc-form',             'Insurance Company',             true),
  ('insurance_company',    'insurer',                  '/assessment/:id', '/kyc-form',             'Insurance Company',             true),
  ('legal_professional',   'legal_professionals',      '/assessment/:id', '/kyc-client/:clientId', 'Legal Professional / Advocate', true),
  ('real_estate_agent',    'general_dnfbp',            '/assessment/:id', '/kyc-form',             'Real Estate Agent',             true),
  ('dealer_precious_metals','general_dnfbp',           '/assessment/:id', '/kyc-form',             'Dealer in Precious Metals',     true),
  ('casino',               'general_dnfbp',            '/assessment/:id', '/kyc-form',             'Casino / Gaming Operator',      true),
  ('trust_company',        'general_dnfbp',            '/assessment/:id', '/kyc-form',             'Trust / Company Service Provider', true)
ON CONFLICT (category_value) DO NOTHING;
