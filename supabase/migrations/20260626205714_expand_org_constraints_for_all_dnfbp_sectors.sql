-- Expand business_type constraint to cover all DNFBP sector values
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_business_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_business_type_check
  CHECK (business_type = ANY (ARRAY[
    'law_firm', 'sole_proprietor', 'partnership', 'company',
    'insurer', 'insurance_company',
    'audit_firm', 'accountant',
    'real_estate_agent', 'trust_company', 'precious_metals',
    'casino', 'money_transfer', 'exchange_bureau',
    'investment_advisor', 'legal_professional', 'dnfbp', 'other'
  ]));

-- Expand sector constraint to cover all DNFBP framework types
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_sector_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_sector_check
  CHECK (sector = ANY (ARRAY[
    'law_firm', 'insurance', 'accounting', 'general_dnfbp',
    'insurer', 'audit_firm', 'accountant',
    'real_estate_agent', 'trust_company', 'precious_metals',
    'casino', 'money_transfer', 'exchange_bureau',
    'investment_advisor', 'legal_professional', 'dnfbp', 'other'
  ]));

-- Fix existing Richer Insurance Company record
-- sector='insurance' matches the FRAMEWORK_TO_SECTOR mapping used by the registration form
UPDATE organizations
SET business_type = 'insurer',
    sector        = 'insurance'
WHERE name = 'Richer Insurance Company Limited';
