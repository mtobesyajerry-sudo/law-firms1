
-- Create the canonical DNFBP type config lookup table.
-- Frontend continues to read from sectorConfig.js for now.
-- This table is the future admin-configurable source of truth; not wired to UI yet.

CREATE TABLE dnfbp_type_config (
  dnfbp_type          text PRIMARY KEY,
  display_name        text NOT NULL,
  customer_label      text NOT NULL DEFAULT 'Client',
  engagement_label    text NOT NULL DEFAULT 'Engagement',
  provider_label      text NOT NULL DEFAULT 'Professional',
  professional_body   text,
  reg_number_label    text NOT NULL DEFAULT 'Registration Number',
  framework_type      text NOT NULL,
  is_active           boolean NOT NULL DEFAULT true
);

ALTER TABLE dnfbp_type_config ENABLE ROW LEVEL SECURITY;

-- Public read — same pattern as subscription_plans
CREATE POLICY "anon_read_dnfbp_type_config" ON dnfbp_type_config
  FOR SELECT TO anon, authenticated USING (true);

-- Admin-only write
CREATE POLICY "admin_manage_dnfbp_type_config" ON dnfbp_type_config
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Seed all FATF DNFBP categories
INSERT INTO dnfbp_type_config
  (dnfbp_type, display_name, customer_label, engagement_label, provider_label, professional_body, reg_number_label, framework_type)
VALUES
  ('law_firm',          'Law Firm / Legal Professional',        'Client',       'Matter',       'Advocate',          'Tanganyika Law Society (TLS)',                       'BRELA / TLS Number',  'legal_professionals'),
  ('notary',            'Notary',                               'Client',       'Matter',       'Notary',            'Tanganyika Law Society (TLS)',                       'TLS Number',          'legal_professionals'),
  ('accountant',        'Accountant / Auditor',                 'Client',       'Engagement',   'Auditor',           'National Board of Accountants and Auditors (NBAA)', 'NBAA Number',         'audit_firm'),
  ('real_estate_agent', 'Real Estate Agent / Developer',        'Buyer/Seller', 'Transaction',  'Agent',             'Ardhi University / NIREM',                          'License Number',      'general_dnfbp'),
  ('precious_metals',   'Dealer in Precious Metals / Stones',   'Customer',     'Transaction',  'Dealer',            NULL,                                                 'License Number',      'general_dnfbp'),
  ('casino',            'Casino / Gaming Operator',             'Player',       'Transaction',  'Operator',          'Gaming Board of Tanzania',                          'Gaming License',      'general_dnfbp'),
  ('trust_company',     'Trust and Company Service Provider',   'Client',       'Engagement',   'Provider',          NULL,                                                 'License Number',      'legal_professionals'),
  ('insurer',           'Insurance Company / Intermediary',     'Policyholder', 'Policy',       'Agent/Underwriter', 'Tanzania Insurance Regulatory Authority (TIRA)',     'TIRA License',        'insurer'),
  ('money_service',     'Money Service Business',               'Customer',     'Transaction',  'Agent',             'Bank of Tanzania',                                  'BoT License',         'general_dnfbp');
