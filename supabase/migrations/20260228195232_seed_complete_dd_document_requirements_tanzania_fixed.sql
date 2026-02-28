/*
  # Seed Complete DD Document Requirements for Tanzania AML System
  
  1. Purpose
    - Populate document_requirements table with comprehensive requirements for all DD levels
    - Based on Tanzania AML/CFT Act and FATF recommendations
    - Covers both individual and corporate client types
  
  2. DD Levels Covered
    - Simplified DD: Low-risk clients with reduced documentation
    - Standard DD: Normal-risk clients with standard KYC requirements  
    - Enhanced DD: High-risk clients requiring comprehensive documentation
  
  3. Document Categories
    - Identity documents (NIDA, Passport, Driving Licence)
    - Address proof (Utility Bills, Bank Statements, Tenancy Agreement)
    - Financial documents (SOF, SOW, Bank Statements, Tax Returns)
    - Corporate documents (Registration, Board Resolution, Ownership)
    - Enhanced DD documents (PEP checks, Senior Approval, Monitoring)
  
  4. Mandatory vs Optional
    - Each requirement marked as mandatory or optional
    - Enhanced DD has stricter mandatory requirements
    - Standard DD focuses on core KYC documentation
    - Simplified DD has minimal requirements
*/

-- ============================================
-- SIMPLIFIED DD REQUIREMENTS (Low Risk)
-- ============================================

-- Individual - Simplified DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'simplified',
  'individual',
  id,
  CASE 
    WHEN name IN ('National ID (NIDA)', 'Passport') THEN true
    WHEN name = 'Risk Classification Justification' THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'National ID (NIDA)' THEN 'Primary identification - one valid ID required'
    WHEN name = 'Passport' THEN 'Alternative primary identification'
    WHEN name = 'Driving Licence' THEN 'Secondary identification if needed'
    WHEN name = 'Utility Bill' THEN 'Address verification (optional for low risk)'
    WHEN name = 'Risk Classification Justification' THEN 'MANDATORY - explain why simplified DD is applied'
    WHEN name = 'Client Declaration Form' THEN 'Basic client information and purpose of relationship'
  END
FROM document_types
WHERE name IN (
  'National ID (NIDA)',
  'Passport',
  'Driving Licence',
  'Utility Bill',
  'Risk Classification Justification',
  'Client Declaration Form'
)
ON CONFLICT DO NOTHING;

-- Corporate - Simplified DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'simplified',
  'corporate',
  id,
  CASE 
    WHEN name IN ('Certificate of Incorporation', 'Risk Classification Justification') THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'Certificate of Incorporation' THEN 'Basic company registration proof'
    WHEN name = 'Risk Classification Justification' THEN 'MANDATORY - explain why simplified DD is applied'
    WHEN name = 'List of Directors' THEN 'Basic director information'
    WHEN name = 'Business Licence' THEN 'Operating licence if applicable'
  END
FROM document_types
WHERE name IN (
  'Certificate of Incorporation',
  'Risk Classification Justification',
  'List of Directors',
  'Business Licence'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- STANDARD DD REQUIREMENTS (Normal Risk)
-- ============================================

-- Individual - Standard DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'standard',
  'individual',
  id,
  CASE 
    WHEN name IN ('National ID (NIDA)', 'Passport') THEN true
    WHEN name IN ('Utility Bill', 'Bank Statement') THEN true
    WHEN name = 'Source of Funds Declaration' THEN true
    WHEN name = 'Client Declaration Form' THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'National ID (NIDA)' THEN 'MANDATORY - Primary identification document'
    WHEN name = 'Passport' THEN 'MANDATORY - Alternative if no NIDA, or secondary ID'
    WHEN name = 'Driving Licence' THEN 'Secondary identification if needed'
    WHEN name = 'Voter Registration Card' THEN 'Additional ID if available'
    WHEN name = 'Utility Bill' THEN 'MANDATORY - Address proof (max 3 months old)'
    WHEN name = 'Bank Statement' THEN 'MANDATORY - Address proof alternative (max 3 months old)'
    WHEN name = 'Tenancy Agreement' THEN 'Address proof for renters'
    WHEN name = 'TIN Certificate' THEN 'Tax identification'
    WHEN name = 'Source of Funds Declaration' THEN 'MANDATORY - Source of funds for transaction'
    WHEN name = 'Employment Letter' THEN 'Employment verification'
    WHEN name = 'Payslips' THEN 'Income verification (last 3 months)'
    WHEN name = 'Tax Return' THEN 'Annual income documentation'
    WHEN name = 'Bank Reference Letter' THEN 'Banking relationship confirmation'
    WHEN name = 'Client Declaration Form' THEN 'MANDATORY - Purpose and nature of relationship'
    WHEN name = 'Risk Assessment Record' THEN 'Risk classification documentation'
  END
FROM document_types
WHERE name IN (
  'National ID (NIDA)',
  'Passport',
  'Driving Licence',
  'Voter Registration Card',
  'Utility Bill',
  'Bank Statement',
  'Tenancy Agreement',
  'TIN Certificate',
  'Source of Funds Declaration',
  'Employment Letter',
  'Payslips',
  'Tax Return',
  'Bank Reference Letter',
  'Client Declaration Form',
  'Risk Assessment Record'
)
ON CONFLICT DO NOTHING;

-- Corporate - Standard DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'standard',
  'corporate',
  id,
  CASE 
    WHEN name IN (
      'Certificate of Incorporation',
      'Memorandum & Articles of Association',
      'List of Directors',
      'Beneficial Ownership Declaration',
      'Board Resolution',
      'Client Declaration Form'
    ) THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'Certificate of Incorporation' THEN 'MANDATORY - Company registration certificate'
    WHEN name = 'Memorandum & Articles of Association' THEN 'MANDATORY - Constitutional documents'
    WHEN name = 'List of Directors' THEN 'MANDATORY - All directors with ID copies'
    WHEN name = 'Beneficial Ownership Declaration' THEN 'MANDATORY - All 25%+ owners'
    WHEN name = 'Beneficial Owner IDs' THEN 'ID documents for all beneficial owners'
    WHEN name = 'Board Resolution' THEN 'MANDATORY - Authorization for relationship'
    WHEN name = 'Business Licence' THEN 'Operating licence'
    WHEN name = 'TIN Certificate' THEN 'Corporate tax identification'
    WHEN name = 'Shareholder Register' THEN 'Complete shareholder list'
    WHEN name = 'Group Structure Chart' THEN 'Organizational structure if part of group'
    WHEN name = 'Business Profile' THEN 'Company activities and business description'
    WHEN name = 'Audited Financial Statements' THEN 'Latest financial statements'
    WHEN name = 'Source of Capital Documentation' THEN 'Source of company capital'
    WHEN name = 'Client Declaration Form' THEN 'MANDATORY - Purpose of relationship'
    WHEN name = 'Risk Assessment Record' THEN 'Risk classification documentation'
  END
FROM document_types
WHERE name IN (
  'Certificate of Incorporation',
  'Memorandum & Articles of Association',
  'List of Directors',
  'Beneficial Ownership Declaration',
  'Beneficial Owner IDs',
  'Board Resolution',
  'Business Licence',
  'TIN Certificate',
  'Shareholder Register',
  'Group Structure Chart',
  'Business Profile',
  'Audited Financial Statements',
  'Source of Capital Documentation',
  'Client Declaration Form',
  'Risk Assessment Record'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ENHANCED DD REQUIREMENTS (High Risk)
-- ============================================

-- Individual - Enhanced DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'enhanced',
  'individual',
  id,
  CASE 
    WHEN name IN (
      'National ID (NIDA)',
      'Passport',
      'Utility Bill',
      'Bank Statement',
      'Source of Funds Declaration',
      'Source of Wealth Documentation',
      'Bank Statements (12 months)',
      'Client Declaration Form',
      'Enhanced Due Diligence Questionnaire',
      'Senior Management Approval Form',
      'Enhanced Monitoring Checklist',
      'PEP Risk Assessment'
    ) THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'National ID (NIDA)' THEN 'MANDATORY - Primary identification'
    WHEN name = 'Passport' THEN 'MANDATORY - Secondary identification required'
    WHEN name = 'Driving Licence' THEN 'Additional identification'
    WHEN name = 'Utility Bill' THEN 'MANDATORY - Current address proof'
    WHEN name = 'Bank Statement' THEN 'MANDATORY - Recent address confirmation'
    WHEN name = 'Tenancy Agreement' THEN 'Residential address documentation'
    WHEN name = 'TIN Certificate' THEN 'Tax compliance verification'
    WHEN name = 'Source of Funds Declaration' THEN 'MANDATORY - Detailed source of funds'
    WHEN name = 'Source of Wealth Documentation' THEN 'MANDATORY - Comprehensive wealth accumulation evidence'
    WHEN name = 'Bank Statements (12 months)' THEN 'MANDATORY - 12 months transaction history'
    WHEN name = 'Employment Letter' THEN 'Employment and income verification'
    WHEN name = 'Payslips' THEN 'Salary documentation (6+ months)'
    WHEN name = 'Tax Return' THEN 'Tax returns (last 2-3 years)'
    WHEN name = 'Audited Financial Statements' THEN 'If self-employed or business owner'
    WHEN name = 'Asset Declaration' THEN 'Complete asset declaration'
    WHEN name = 'Property Ownership Records' THEN 'Real estate holdings documentation'
    WHEN name = 'Investment Portfolio' THEN 'Investment holdings and valuations'
    WHEN name = 'Business Ownership Evidence' THEN 'Business interests documentation'
    WHEN name = 'Inheritance Documentation' THEN 'If wealth from inheritance'
    WHEN name = 'Gift Documentation' THEN 'If funds received as gift'
    WHEN name = 'Asset Sale Agreements' THEN 'Documentation of asset liquidation'
    WHEN name = 'Client Declaration Form' THEN 'MANDATORY - Comprehensive client declaration'
    WHEN name = 'Enhanced Due Diligence Questionnaire' THEN 'MANDATORY - Detailed EDD questionnaire'
    WHEN name = 'Senior Management Approval Form' THEN 'MANDATORY - Senior management sign-off'
    WHEN name = 'Enhanced Monitoring Checklist' THEN 'MANDATORY - Ongoing monitoring plan'
    WHEN name = 'PEP Declaration' THEN 'PEP status declaration'
    WHEN name = 'PEP Risk Assessment' THEN 'MANDATORY - If PEP or PEP-related'
    WHEN name = 'PEP Screening Report' THEN 'PEP and sanctions screening'
    WHEN name = 'Adverse Media Screening Report' THEN 'Negative news screening'
    WHEN name = 'Reputation and Background Check' THEN 'Background verification'
    WHEN name = 'Public Records Search' THEN 'Public information searches'
    WHEN name = 'Country Risk Assessment' THEN 'If from high-risk jurisdiction'
    WHEN name = 'Economic Rationale Documentation' THEN 'Business rationale for relationship'
    WHEN name = 'Risk Assessment Record' THEN 'Comprehensive risk assessment'
  END
FROM document_types
WHERE name IN (
  'National ID (NIDA)',
  'Passport',
  'Driving Licence',
  'Utility Bill',
  'Bank Statement',
  'Tenancy Agreement',
  'TIN Certificate',
  'Source of Funds Declaration',
  'Source of Wealth Documentation',
  'Bank Statements (12 months)',
  'Employment Letter',
  'Payslips',
  'Tax Return',
  'Audited Financial Statements',
  'Asset Declaration',
  'Property Ownership Records',
  'Investment Portfolio',
  'Business Ownership Evidence',
  'Inheritance Documentation',
  'Gift Documentation',
  'Asset Sale Agreements',
  'Client Declaration Form',
  'Enhanced Due Diligence Questionnaire',
  'Senior Management Approval Form',
  'Enhanced Monitoring Checklist',
  'PEP Declaration',
  'PEP Risk Assessment',
  'PEP Screening Report',
  'Adverse Media Screening Report',
  'Reputation and Background Check',
  'Public Records Search',
  'Country Risk Assessment',
  'Economic Rationale Documentation',
  'Risk Assessment Record'
)
ON CONFLICT DO NOTHING;

-- Corporate - Enhanced DD
INSERT INTO document_requirements (dd_level, client_type, document_type_id, is_mandatory, description)
SELECT 
  'enhanced',
  'corporate',
  id,
  CASE 
    WHEN name IN (
      'Certificate of Incorporation',
      'Memorandum & Articles of Association',
      'List of Directors',
      'Beneficial Ownership Declaration',
      'Beneficial Owner IDs',
      'Beneficial Owner Address Proof',
      'Complete Ownership Chain',
      'Board Resolution',
      'Audited Financial Statements',
      'Source of Capital Documentation',
      'Client Declaration Form',
      'Enhanced Due Diligence Questionnaire',
      'Senior Management Approval',
      'Enhanced Monitoring Checklist',
      'PEP Screening Report'
    ) THEN true
    ELSE false
  END,
  CASE 
    WHEN name = 'Certificate of Incorporation' THEN 'MANDATORY - Company registration'
    WHEN name = 'Memorandum & Articles of Association' THEN 'MANDATORY - Constitutional documents'
    WHEN name = 'List of Directors' THEN 'MANDATORY - All directors with full ID verification'
    WHEN name = 'Beneficial Ownership Declaration' THEN 'MANDATORY - All beneficial owners (25%+)'
    WHEN name = 'Beneficial Owner IDs' THEN 'MANDATORY - ID for all beneficial owners'
    WHEN name = 'Beneficial Owner Address Proof' THEN 'MANDATORY - Address proof for all beneficial owners'
    WHEN name = 'Complete Ownership Chain' THEN 'MANDATORY - Full ownership to ultimate beneficial owners'
    WHEN name = 'Board Resolution' THEN 'MANDATORY - Authorization and signatory approval'
    WHEN name = 'Business Licence' THEN 'Operating licences and permits'
    WHEN name = 'TIN Certificate' THEN 'Corporate tax identification'
    WHEN name = 'Shareholder Register' THEN 'Complete shareholder register'
    WHEN name = 'Group Structure Chart' THEN 'Full group and subsidiary structure'
    WHEN name = 'Ownership Diagram' THEN 'Visual ownership and control chart'
    WHEN name = 'Control Rights Documentation' THEN 'Voting rights and control mechanisms'
    WHEN name = 'Nominee Agreements' THEN 'If nominee arrangements exist'
    WHEN name = 'Trust Deeds' THEN 'If trust structures involved'
    WHEN name = 'Business Profile' THEN 'Comprehensive business activities description'
    WHEN name = 'Audited Financial Statements' THEN 'MANDATORY - Last 2-3 years audited financials'
    WHEN name = 'Source of Capital Documentation' THEN 'MANDATORY - Evidence of capital sources'
    WHEN name = 'Bank Reference Letter' THEN 'Banking relationships confirmation'
    WHEN name = 'Tax Compliance Certificate' THEN 'Tax clearance certificate'
    WHEN name = 'Offshore Entity Documentation' THEN 'If offshore structures involved'
    WHEN name = 'Client Declaration Form' THEN 'MANDATORY - Comprehensive entity declaration'
    WHEN name = 'Enhanced Due Diligence Questionnaire' THEN 'MANDATORY - Detailed EDD questionnaire'
    WHEN name = 'Senior Management Approval' THEN 'MANDATORY - Senior management approval documented'
    WHEN name = 'Enhanced Monitoring Checklist' THEN 'MANDATORY - Enhanced monitoring plan'
    WHEN name = 'Enhanced Monitoring Plan' THEN 'Detailed ongoing monitoring procedures'
    WHEN name = 'PEP Screening Report' THEN 'MANDATORY - PEP screening for all directors and beneficial owners'
    WHEN name = 'PEP Relationship Disclosure' THEN 'Disclosure of PEP connections'
    WHEN name = 'Adverse Media Screening Report' THEN 'Negative news screening for entity and key persons'
    WHEN name = 'Reputation and Background Check' THEN 'Entity and key persons background checks'
    WHEN name = 'Public Records Search' THEN 'Corporate records and registry searches'
    WHEN name = 'Country Risk Assessment' THEN 'MANDATORY - If high-risk jurisdiction'
    WHEN name = 'Economic Rationale Documentation' THEN 'Business rationale and economic purpose'
    WHEN name = 'Risk Assessment Record' THEN 'Comprehensive risk assessment'
  END
FROM document_types
WHERE name IN (
  'Certificate of Incorporation',
  'Memorandum & Articles of Association',
  'List of Directors',
  'Beneficial Ownership Declaration',
  'Beneficial Owner IDs',
  'Beneficial Owner Address Proof',
  'Complete Ownership Chain',
  'Board Resolution',
  'Business Licence',
  'TIN Certificate',
  'Shareholder Register',
  'Group Structure Chart',
  'Ownership Diagram',
  'Control Rights Documentation',
  'Nominee Agreements',
  'Trust Deeds',
  'Business Profile',
  'Audited Financial Statements',
  'Source of Capital Documentation',
  'Bank Reference Letter',
  'Tax Compliance Certificate',
  'Offshore Entity Documentation',
  'Client Declaration Form',
  'Enhanced Due Diligence Questionnaire',
  'Senior Management Approval',
  'Enhanced Monitoring Checklist',
  'Enhanced Monitoring Plan',
  'PEP Screening Report',
  'PEP Relationship Disclosure',
  'Adverse Media Screening Report',
  'Reputation and Background Check',
  'Public Records Search',
  'Country Risk Assessment',
  'Economic Rationale Documentation',
  'Risk Assessment Record'
)
ON CONFLICT DO NOTHING;