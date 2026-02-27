/*
  # Standard Due Diligence Requirements - Tanzania AML
  
  ## Overview
  Seeds document requirements for Standard DD level - the DEFAULT requirement 
  under Tanzania AML law for moderate/normal risk clients.
  
  ## Standard DD (Normal/Moderate Risk - DEFAULT)
  This is the baseline requirement for most client relationships.
  
  ### Requirements Summary
  
  **Individual Clients (7-10 documents):**
  - Certified copy of identification document(s)
  - Proof of residential address
  - Client profile and occupation details
  - Source of income/funds documentation
  - Expected transaction profile
  - PEP and sanctions screening results
  - Risk assessment record
  - Ongoing monitoring documentation
  
  **Legal Entity Clients (10-15 documents):**
  - Certificate of incorporation and constitutional documents
  - Company profile and business description
  - Directors' identification
  - Board resolution or authorization
  - MANDATORY: Beneficial ownership documentation (Tanzania AML requirement)
  - Shareholding structure
  - Tax identification
  - Financial statements
  - Address verification
  - Risk assessment and screening
  
  ## Compliance Requirements
  - ALL beneficial owners (25%+ ownership or control) must be identified
  - Verification of ownership and control structure required
  - Records of steps taken to identify UBOs must be maintained
  - Correspondence and client instructions must be retained
*/

-- ================================================================
-- STANDARD DD - INDIVIDUAL CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Certified identity documents (at least one required)
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'national_id'), 
    true, 
    1, 
    'Certified copy of National ID (at least one form of ID required)'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'passport'), 
    true, 
    2, 
    'Certified copy of Passport (alternative primary ID)'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'driving_licence'), 
    false, 
    3, 
    'Driving licence - optional additional identification'
  ),
  
  -- Proof of residential address (at least one required)
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'utility_bill'), 
    true, 
    4, 
    'Recent utility bill - max 3 months old (at least one address proof required)'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'tenancy_agreement'), 
    true, 
    5, 
    'Lease or tenancy agreement (alternative address proof)'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'bank_statement_address'), 
    true, 
    6, 
    'Bank statement showing address - max 3 months old (alternative address proof)'
  ),
  
  -- Client profile and occupation
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'client_declaration'), 
    true, 
    7, 
    'Complete client profile: purpose and nature of relationship, expected transactions'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'employment_letter'), 
    true, 
    8, 
    'Employment letter or occupation verification'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'payslip'), 
    true, 
    9, 
    'Payslips (last 3 months) or income proof'
  ),
  
  -- Source of income/funds
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'sof_declaration'), 
    true, 
    10, 
    'Source of funds declaration (printable template available)'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'tin_certificate'), 
    false, 
    11, 
    'Tax identification certificate (recommended)'
  ),
  
  -- Screening and risk assessment
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'pep_declaration'), 
    true, 
    12, 
    'PEP declaration and sanctions screening results'
  ),
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'risk_assessment_record'), 
    true, 
    13, 
    'Risk assessment and classification record'
  ),
  
  -- Ongoing monitoring
  (
    'standard', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'periodic_review_record'), 
    false, 
    14, 
    'Ongoing monitoring and periodic review documentation'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();

-- ================================================================
-- STANDARD DD - LEGAL ENTITY CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Corporate documents
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'cert_incorporation'), 
    true, 
    1, 
    'Certificate of incorporation - proof of legal existence'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'memorandum_articles'), 
    true, 
    2, 
    'Memorandum and articles of association - constitutional documents'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_profile'), 
    true, 
    3, 
    'Company profile or detailed business description'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_licence'), 
    true, 
    4, 
    'Current business licence and operating permits'
  ),
  
  -- Directors and authorization
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'directors_list'), 
    true, 
    5, 
    'Complete list of directors with identification documents'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'board_resolution'), 
    true, 
    6, 
    'Board resolution or authority to instruct and enter relationship'
  ),
  
  -- Beneficial ownership (MANDATORY under Tanzania AML)
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_declaration'), 
    true, 
    7, 
    'MANDATORY: Beneficial ownership declaration (all owners with 25%+ ownership/control)'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'shareholder_register'), 
    true, 
    8, 
    'MANDATORY: Shareholding structure showing all shareholders'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_ids'), 
    true, 
    9, 
    'MANDATORY: Identification documents of all beneficial owners'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_address_proof'), 
    false, 
    10, 
    'Address proof for beneficial owners (recommended)'
  ),
  
  -- Financial and tax
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'tin_certificate_entity'), 
    true, 
    11, 
    'Tax Identification Number certificate'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'financial_statements'), 
    true, 
    12, 
    'Latest audited financial statements (or management accounts if unavailable)'
  ),
  
  -- Address and contact
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'utility_bill'), 
    true, 
    13, 
    'Proof of registered business address'
  ),
  
  -- Risk assessment and screening
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'risk_assessment_record'), 
    true, 
    14, 
    'Risk classification and assessment record'
  ),
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'pep_screening'), 
    false, 
    15, 
    'PEP screening of directors and beneficial owners (recommended)'
  ),
  
  -- Monitoring
  (
    'standard', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'periodic_review_record'), 
    false, 
    16, 
    'Ongoing monitoring and periodic review documentation'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();
