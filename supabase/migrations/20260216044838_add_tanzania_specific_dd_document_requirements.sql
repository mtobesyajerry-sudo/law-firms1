/*
  # Tanzania-Specific Due Diligence Document Requirements
  
  ## Summary
  Seeds the database with Tanzania-specific document requirements aligned with:
  - Tanzania Anti-Money Laundering Act
  - Financial Intelligence Unit (FIU) guidelines
  - FATF recommendations
  - Legal professionals (advocates) AML obligations
  
  ## Document Types Created
  
  ### Identity Documents
  - National ID (NIDA)
  - Passport
  - Voter's Registration Card
  - Driver's License
  
  ### Address Verification
  - Utility Bill
  - Bank Statement
  - Tenancy Agreement
  - Tax Identification Certificate (TIN)
  
  ### Financial Documents
  - Source of Funds Declaration
  - Source of Wealth Documentation
  - Bank Reference Letter
  - Financial Statements
  - Tax Returns
  - Payslips/Employment Confirmation
  
  ### Corporate Documents
  - Certificate of Incorporation
  - Memorandum and Articles of Association
  - Business License (TRA)
  - Certificate of Compliance
  - Register of Directors
  - Register of Members/Shareholders
  - Beneficial Ownership Declaration
  - Board Resolution
  
  ### Enhanced DD Documents
  - PEP Declaration
  - Politically Exposed Person Assessment
  - Enhanced Due Diligence Questionnaire
  - Senior Management Approval Form
  - Transaction Economic Rationale Statement
  - Country Risk Assessment
  - Ongoing Monitoring Checklist
  
  ## Due Diligence Level Requirements
  
  ### Simplified DD (Low Risk)
  - Basic identity verification
  - Residential address
  - Limited information on purpose
  - Reduced monitoring
  - Must document justification
  
  ### Standard DD (Medium Risk) - Default
  - Full identity verification
  - Beneficial ownership identification
  - Purpose and nature of relationship
  - Occupation and source of income
  - Ongoing monitoring
  
  ### Enhanced DD (High Risk)
  - All Standard DD requirements
  - Source of wealth (mandatory)
  - Source of funds (mandatory)
  - Senior management approval (mandatory)
  - Enhanced monitoring
  - First payment through regulated institution
  
  ## Important Notes
  1. Document validity periods follow Tanzania legal requirements
  2. Corporate documents require beneficial ownership down to natural persons
  3. PEPs automatically trigger Enhanced DD
  4. High-risk jurisdictions trigger Enhanced DD
  5. All changes maintain full audit trail
*/

-- Clear existing seed data (for re-running migration)
TRUNCATE TABLE dd_level_document_requirements CASCADE;
TRUNCATE TABLE document_types CASCADE;

-- ============================================================================
-- IDENTITY DOCUMENTS
-- ============================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('nida', 'National ID (NIDA)', 'identity', 'Tanzania National Identification Card', 'both', 120, true),
  ('passport', 'Passport', 'identity', 'Valid passport (Tanzania or foreign)', 'both', 120, true),
  ('voters_card', 'Voter Registration Card', 'identity', 'Tanzania Voter Registration Card', 'individual', 60, true),
  ('drivers_license', 'Driver License', 'identity', 'Valid Tanzania driver license', 'individual', 60, true);

-- ============================================================================
-- ADDRESS VERIFICATION DOCUMENTS
-- ============================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('utility_bill', 'Utility Bill', 'address', 'Recent utility bill (electricity, water, gas)', 'both', 3, true),
  ('bank_statement', 'Bank Statement', 'address', 'Recent bank statement showing address', 'both', 3, true),
  ('tenancy_agreement', 'Tenancy Agreement', 'address', 'Valid tenancy or lease agreement', 'both', 12, true),
  ('tin_certificate', 'TIN Certificate', 'address', 'Tax Identification Number Certificate', 'both', 36, true);

-- ============================================================================
-- FINANCIAL DOCUMENTS
-- ============================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('source_of_funds', 'Source of Funds Declaration', 'financial', 'Declaration of source of funds for transaction', 'both', 12, true),
  ('source_of_wealth', 'Source of Wealth Documentation', 'financial', 'Evidence of wealth accumulation (salary, inheritance, business)', 'both', 24, true),
  ('bank_reference', 'Bank Reference Letter', 'financial', 'Reference letter from banking institution', 'both', 6, true),
  ('financial_statements', 'Financial Statements', 'financial', 'Audited or certified financial statements', 'legal_entity', 12, true),
  ('tax_returns', 'Tax Returns', 'financial', 'Recent tax returns or tax clearance', 'both', 12, true),
  ('payslips', 'Payslips/Employment Confirmation', 'financial', 'Recent payslips or employment confirmation letter', 'individual', 6, true),
  ('asset_valuation', 'Asset Valuation Report', 'financial', 'Valuation report for significant assets', 'both', 12, true);

-- ============================================================================
-- CORPORATE DOCUMENTS
-- ============================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('cert_incorporation', 'Certificate of Incorporation', 'corporate', 'Certificate of Incorporation from BRELA', 'legal_entity', NULL, true),
  ('mem_articles', 'Memorandum & Articles of Association', 'corporate', 'Company constitution documents', 'legal_entity', NULL, true),
  ('business_license', 'Business License', 'corporate', 'Valid business license from TRA or local authority', 'legal_entity', 12, true),
  ('cert_compliance', 'Certificate of Compliance', 'corporate', 'Certificate of compliance from BRELA', 'legal_entity', 12, true),
  ('register_directors', 'Register of Directors', 'corporate', 'Current register of directors', 'legal_entity', 12, true),
  ('register_members', 'Register of Members', 'corporate', 'Current register of shareholders/members', 'legal_entity', 12, true),
  ('bo_declaration', 'Beneficial Ownership Declaration', 'ownership', 'Declaration of beneficial owners (25%+ ownership or control)', 'legal_entity', 12, true),
  ('board_resolution', 'Board Resolution', 'corporate', 'Board resolution authorizing transaction/relationship', 'legal_entity', 12, true),
  ('org_structure', 'Organizational Structure Chart', 'corporate', 'Visual representation of ownership and control', 'legal_entity', 12, true);

-- ============================================================================
-- ENHANCED DD SPECIFIC DOCUMENTS
-- ============================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('pep_declaration', 'PEP Declaration', 'regulatory', 'Declaration of Politically Exposed Person status', 'both', 12, true),
  ('pep_assessment', 'PEP Assessment Form', 'regulatory', 'Detailed assessment for PEP relationships', 'both', 12, true),
  ('edd_questionnaire', 'Enhanced DD Questionnaire', 'regulatory', 'Comprehensive enhanced due diligence questionnaire', 'both', 12, true),
  ('senior_approval', 'Senior Management Approval', 'regulatory', 'Approval from senior management/partner', 'both', 12, true),
  ('economic_rationale', 'Transaction Economic Rationale', 'regulatory', 'Statement explaining economic purpose of transaction', 'both', 12, true),
  ('country_risk_assessment', 'Country Risk Assessment', 'regulatory', 'Assessment for high-risk jurisdiction involvement', 'both', 12, true),
  ('monitoring_checklist', 'Ongoing Monitoring Checklist', 'regulatory', 'Checklist for continuous monitoring activities', 'both', 6, true),
  ('public_records_search', 'Public Records Search Results', 'regulatory', 'Results from adverse media and sanction screening', 'both', 6, true);

-- ============================================================================
-- SIMPLIFIED DUE DILIGENCE REQUIREMENTS (LOW RISK)
-- ============================================================================

-- Individual - Simplified DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'simplified',
  'individual',
  id,
  CASE 
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement') THEN true
    ELSE false
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement') THEN 2
    ELSE 99
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 'Primary identification document required'
    WHEN code IN ('utility_bill', 'bank_statement') THEN 'One proof of address required'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both')
  AND code IN ('nida', 'passport', 'utility_bill', 'bank_statement', 'tin_certificate');

-- Legal Entity - Simplified DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'simplified',
  'legal_entity',
  id,
  CASE 
    WHEN code IN ('cert_incorporation', 'business_license') THEN true
    WHEN code IN ('register_directors', 'bo_declaration') THEN true
    ELSE false
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'business_license' THEN 2
    WHEN code IN ('register_directors', 'bo_declaration') THEN 3
    ELSE 99
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 'Certificate of incorporation required'
    WHEN code = 'business_license' THEN 'Valid business license required'
    WHEN code IN ('register_directors', 'bo_declaration') THEN 'Basic ownership information required'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both')
  AND code IN ('cert_incorporation', 'business_license', 'register_directors', 'bo_declaration', 'tin_certificate');

-- ============================================================================
-- STANDARD DUE DILIGENCE REQUIREMENTS (MEDIUM RISK) - DEFAULT
-- ============================================================================

-- Individual - Standard DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'standard',
  'individual',
  id,
  CASE 
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN true
    WHEN code IN ('tin_certificate', 'source_of_funds') THEN true
    WHEN code = 'payslips' THEN true
    ELSE false
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 2
    WHEN code = 'tin_certificate' THEN 3
    WHEN code = 'source_of_funds' THEN 4
    WHEN code = 'payslips' THEN 5
    ELSE 99
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 'Primary identification required (at least one)'
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 'Proof of residential address (at least one, max 3 months old)'
    WHEN code = 'tin_certificate' THEN 'Tax identification required'
    WHEN code = 'source_of_funds' THEN 'Declaration of source of funds for transaction'
    WHEN code = 'payslips' THEN 'Evidence of occupation and income'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both')
  AND code IN ('nida', 'passport', 'voters_card', 'utility_bill', 'bank_statement', 'tenancy_agreement', 
               'tin_certificate', 'source_of_funds', 'payslips', 'bank_reference');

-- Legal Entity - Standard DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'standard',
  'legal_entity',
  id,
  CASE 
    WHEN code IN ('cert_incorporation', 'mem_articles', 'business_license') THEN true
    WHEN code IN ('register_directors', 'register_members', 'bo_declaration') THEN true
    WHEN code IN ('cert_compliance', 'board_resolution', 'org_structure') THEN true
    WHEN code = 'source_of_funds' THEN true
    ELSE false
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'mem_articles' THEN 2
    WHEN code = 'business_license' THEN 3
    WHEN code = 'cert_compliance' THEN 4
    WHEN code = 'register_directors' THEN 5
    WHEN code = 'register_members' THEN 6
    WHEN code = 'bo_declaration' THEN 7
    WHEN code = 'org_structure' THEN 8
    WHEN code = 'board_resolution' THEN 9
    WHEN code = 'source_of_funds' THEN 10
    ELSE 99
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 'Certificate of incorporation from BRELA'
    WHEN code = 'mem_articles' THEN 'Company constitution documents'
    WHEN code = 'business_license' THEN 'Valid business license'
    WHEN code = 'cert_compliance' THEN 'Current certificate of compliance (BRELA)'
    WHEN code = 'register_directors' THEN 'Current register of directors with full details'
    WHEN code = 'register_members' THEN 'Current register of shareholders/members'
    WHEN code = 'bo_declaration' THEN 'Beneficial owners (25%+ ownership/control) identified and verified'
    WHEN code = 'org_structure' THEN 'Clear ownership and control structure'
    WHEN code = 'board_resolution' THEN 'Authorization for business relationship'
    WHEN code = 'source_of_funds' THEN 'Source of funds for transaction'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both')
  AND code IN ('cert_incorporation', 'mem_articles', 'business_license', 'cert_compliance',
               'register_directors', 'register_members', 'bo_declaration', 'board_resolution',
               'org_structure', 'source_of_funds', 'financial_statements', 'tin_certificate');

-- ============================================================================
-- ENHANCED DUE DILIGENCE REQUIREMENTS (HIGH RISK)
-- ============================================================================

-- Individual - Enhanced DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'enhanced',
  'individual',
  id,
  CASE 
    -- All Standard DD documents remain mandatory
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN true
    WHEN code IN ('tin_certificate', 'source_of_funds') THEN true
    WHEN code = 'payslips' THEN true
    -- Additional mandatory Enhanced DD documents
    WHEN code = 'source_of_wealth' THEN true
    WHEN code = 'senior_approval' THEN true
    WHEN code = 'edd_questionnaire' THEN true
    WHEN code = 'pep_declaration' THEN true
    WHEN code = 'public_records_search' THEN true
    WHEN code = 'monitoring_checklist' THEN true
    ELSE false
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 2
    WHEN code = 'tin_certificate' THEN 3
    WHEN code = 'source_of_funds' THEN 4
    WHEN code = 'source_of_wealth' THEN 5
    WHEN code = 'payslips' THEN 6
    WHEN code = 'pep_declaration' THEN 7
    WHEN code = 'edd_questionnaire' THEN 8
    WHEN code = 'public_records_search' THEN 9
    WHEN code = 'senior_approval' THEN 10
    WHEN code = 'monitoring_checklist' THEN 11
    ELSE 99
  END,
  CASE 
    WHEN code IN ('nida', 'passport') THEN 'Primary identification (both preferred for high risk)'
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 'Multiple proofs of address required'
    WHEN code = 'tin_certificate' THEN 'Tax identification mandatory'
    WHEN code = 'source_of_funds' THEN 'Detailed source of funds with supporting evidence'
    WHEN code = 'source_of_wealth' THEN 'MANDATORY: Complete source of wealth documentation with evidence'
    WHEN code = 'payslips' THEN 'Employment and income verification'
    WHEN code = 'pep_declaration' THEN 'MANDATORY: PEP declaration and assessment'
    WHEN code = 'edd_questionnaire' THEN 'MANDATORY: Complete enhanced DD questionnaire'
    WHEN code = 'public_records_search' THEN 'MANDATORY: Adverse media and sanction screening'
    WHEN code = 'senior_approval' THEN 'MANDATORY: Senior management/partner approval before onboarding'
    WHEN code = 'monitoring_checklist' THEN 'MANDATORY: Enhanced monitoring framework'
    WHEN code = 'bank_reference' THEN 'Bank reference letter recommended'
    WHEN code = 'tax_returns' THEN 'Tax returns for wealth verification'
    WHEN code = 'asset_valuation' THEN 'Asset valuation for significant holdings'
    WHEN code = 'pep_assessment' THEN 'Required if client is PEP or PEP associate'
    WHEN code = 'country_risk_assessment' THEN 'Required for high-risk jurisdiction involvement'
    WHEN code = 'economic_rationale' THEN 'Required for complex transactions'
    ELSE 'Additional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both');

-- Legal Entity - Enhanced DD
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT 
  'enhanced',
  'legal_entity',
  id,
  CASE 
    -- All Standard DD documents remain mandatory
    WHEN code IN ('cert_incorporation', 'mem_articles', 'business_license') THEN true
    WHEN code IN ('register_directors', 'register_members', 'bo_declaration') THEN true
    WHEN code IN ('cert_compliance', 'board_resolution', 'org_structure') THEN true
    WHEN code = 'source_of_funds' THEN true
    -- Additional mandatory Enhanced DD documents
    WHEN code = 'source_of_wealth' THEN true
    WHEN code = 'senior_approval' THEN true
    WHEN code = 'edd_questionnaire' THEN true
    WHEN code = 'pep_declaration' THEN true
    WHEN code = 'public_records_search' THEN true
    WHEN code = 'monitoring_checklist' THEN true
    WHEN code = 'financial_statements' THEN true
    ELSE false
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'mem_articles' THEN 2
    WHEN code = 'business_license' THEN 3
    WHEN code = 'cert_compliance' THEN 4
    WHEN code = 'register_directors' THEN 5
    WHEN code = 'register_members' THEN 6
    WHEN code = 'bo_declaration' THEN 7
    WHEN code = 'org_structure' THEN 8
    WHEN code = 'board_resolution' THEN 9
    WHEN code = 'source_of_funds' THEN 10
    WHEN code = 'source_of_wealth' THEN 11
    WHEN code = 'financial_statements' THEN 12
    WHEN code = 'pep_declaration' THEN 13
    WHEN code = 'edd_questionnaire' THEN 14
    WHEN code = 'public_records_search' THEN 15
    WHEN code = 'senior_approval' THEN 16
    WHEN code = 'monitoring_checklist' THEN 17
    ELSE 99
  END,
  CASE 
    WHEN code = 'cert_incorporation' THEN 'Certificate of incorporation'
    WHEN code = 'mem_articles' THEN 'Company constitution'
    WHEN code = 'business_license' THEN 'Current business license'
    WHEN code = 'cert_compliance' THEN 'Current BRELA compliance certificate'
    WHEN code = 'register_directors' THEN 'Complete register with director identification'
    WHEN code = 'register_members' THEN 'Complete register of all shareholders'
    WHEN code = 'bo_declaration' THEN 'MANDATORY: Beneficial owners identified down to natural persons with verification'
    WHEN code = 'org_structure' THEN 'Detailed ownership and control structure chart'
    WHEN code = 'board_resolution' THEN 'Board authorization with signatories'
    WHEN code = 'source_of_funds' THEN 'Detailed source of funds with evidence'
    WHEN code = 'source_of_wealth' THEN 'MANDATORY: Source of wealth for beneficial owners with evidence'
    WHEN code = 'financial_statements' THEN 'MANDATORY: Recent audited financial statements'
    WHEN code = 'pep_declaration' THEN 'MANDATORY: PEP declaration for all beneficial owners and directors'
    WHEN code = 'edd_questionnaire' THEN 'MANDATORY: Complete enhanced DD questionnaire'
    WHEN code = 'public_records_search' THEN 'MANDATORY: Screening for entity and beneficial owners'
    WHEN code = 'senior_approval' THEN 'MANDATORY: Senior partner approval before onboarding'
    WHEN code = 'monitoring_checklist' THEN 'MANDATORY: Enhanced monitoring framework with increased frequency'
    WHEN code = 'tin_certificate' THEN 'TIN certificate'
    WHEN code = 'tax_returns' THEN 'Corporate tax returns for verification'
    WHEN code = 'pep_assessment' THEN 'Required if any beneficial owner or director is PEP'
    WHEN code = 'country_risk_assessment' THEN 'Required for offshore structures or high-risk jurisdictions'
    WHEN code = 'economic_rationale' THEN 'Required for complex corporate structures'
    ELSE 'Additional supporting document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both');

-- ============================================================================
-- ADD HELPFUL COMMENTS AND METADATA
-- ============================================================================

COMMENT ON TABLE document_types IS 'Master list of all document types that can be requested for customer due diligence';
COMMENT ON TABLE dd_level_document_requirements IS 'Maps document requirements to due diligence levels (simplified, standard, enhanced) based on Tanzania AML law';
COMMENT ON COLUMN dd_level_document_requirements.triggers IS 'JSON array of conditions that trigger this requirement (e.g., ["pep", "high_risk_country", "offshore"])';
COMMENT ON COLUMN dd_level_document_requirements.priority IS 'Display order - lower numbers shown first';
