/*
  # Simplified Due Diligence Requirements - Tanzania AML
  
  ## Overview
  Seeds document requirements for Simplified DD level per Tanzania AML law.
  
  ## Simplified DD (Low Risk Clients)
  Applied ONLY where risk is demonstrably low and no suspicion exists.
  
  ### Requirements Summary
  
  **Individual Clients (2-3 documents):**
  - At least ONE primary identification document (National ID, Passport, Driving Licence, or Voter ID)
  - Basic client information form
  - MANDATORY: Risk justification documenting why simplified DD was applied
  
  **Legal Entity Clients (3-4 documents):**
  - Certificate of incorporation or registration
  - Business registration details and TIN
  - Basic directors information
  - Business profile with registered address
  - MANDATORY: Risk justification documenting why simplified DD was applied
  
  ## Critical Compliance Note
  Even under simplified CDD, the reporting person must demonstrate:
  - WHY the client was classified as low risk
  - Basic verification was performed
  - No suspicion indicators present
  
  Record retention requirements apply to ALL DD levels.
*/

-- ================================================================
-- SIMPLIFIED DD - INDIVIDUAL CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Primary identification (at least one required)
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'national_id'), 
    true, 
    1, 
    'National ID - primary identification (at least one ID document required)'
  ),
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'passport'), 
    true, 
    2, 
    'Passport - alternative primary identification (at least one ID document required)'
  ),
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'driving_licence'), 
    false, 
    3, 
    'Driving licence - acceptable alternative identification (optional)'
  ),
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'voter_card'), 
    false, 
    4, 
    'Voter ID - acceptable where applicable (optional)'
  ),
  
  -- Basic client information
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'client_declaration'), 
    true, 
    5, 
    'Basic client information form showing: full name, date of birth, nationality, address'
  ),
  
  -- CRITICAL: Risk justification (MANDATORY)
  (
    'simplified', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'risk_justification'), 
    true, 
    6, 
    'MANDATORY: Documentation showing why simplified DD was applied and why client is low risk'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();

-- ================================================================
-- SIMPLIFIED DD - LEGAL ENTITY CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Basic corporate documents
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'cert_incorporation'), 
    true, 
    1, 
    'Certificate of incorporation or registration - evidence of legal existence'
  ),
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_licence'), 
    true, 
    2, 
    'Business registration details and operating licence'
  ),
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'tin_certificate_entity'), 
    true, 
    3, 
    'Tax Identification Number (TIN) - required for all entities'
  ),
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'directors_list'), 
    true, 
    4, 
    'Basic information on directors or authorized persons'
  ),
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_profile'), 
    true, 
    5, 
    'Registered address and basic business information'
  ),
  
  -- CRITICAL: Risk justification (MANDATORY)
  (
    'simplified', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'risk_justification'), 
    true, 
    6, 
    'MANDATORY: Documentation showing why simplified DD was applied and why entity is low risk'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();
