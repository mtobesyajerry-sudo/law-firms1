/*
  # Add Missing Address and Identity Document Requirements
  
  ## Overview
  This migration adds missing document requirements for both individuals and legal entities
  that were present in the document_types table but not assigned to any DD levels.
  
  ## Changes Made
  
  ### 1. Legal Entity Address Requirements
  Legal entities currently have NO address verification documents assigned.
  Adding registered office address proof requirements:
  - **Simplified DD**: Utility Bill (registered office)
  - **Standard DD**: Utility Bill or Bank Statement (registered office) 
  - **Enhanced DD**: Utility Bill + Tenancy Agreement or Bank Statement (registered office)
  
  ### 2. Additional Individual Identity Options
  Adding Driving Licence as an alternative identity document:
  - **Simplified DD**: Driving Licence as alternative to National ID
  - **Standard DD**: Driving Licence as additional option
  - **Enhanced DD**: Driving Licence as additional verification
  
  ### 3. Additional Address Proof Options for Individuals
  Expanding address verification options beyond just utility bills:
  - **Standard DD**: Bank Statement or Tenancy Agreement as alternatives
  - **Enhanced DD**: Additional address verification document required
  
  ## Document Requirements Summary After Migration
  
  ### Individuals
  - Simplified: 1 ID + 1 address
  - Standard: 2 IDs + 1-2 address docs
  - Enhanced: 2 IDs + 2 address docs
  
  ### Legal Entities  
  - Simplified: Registration + directors + office address
  - Standard: Full corporate docs + ownership + office address
  - Enhanced: Complete due diligence + registered office verification
*/

-- Get document type IDs
DO $$
DECLARE
  v_driving_licence_id uuid;
  v_bank_statement_id uuid;
  v_tenancy_agreement_id uuid;
  v_utility_bill_id uuid;
BEGIN
  -- Get document type IDs
  SELECT id INTO v_driving_licence_id FROM document_types WHERE code = 'driving_licence';
  SELECT id INTO v_bank_statement_id FROM document_types WHERE code = 'bank_statement';
  SELECT id INTO v_tenancy_agreement_id FROM document_types WHERE code = 'tenancy_agreement';
  SELECT id INTO v_utility_bill_id FROM document_types WHERE code = 'utility_bill';

  -- ===========================
  -- LEGAL ENTITY ADDRESS DOCUMENTS
  -- ===========================
  
  -- Simplified DD: Utility Bill for registered office
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'simplified', 'legal_entity', v_utility_bill_id, true, 3,
    'Proof of registered office address (utility bill in company name, not older than 3 months)'
  ) ON CONFLICT DO NOTHING;

  -- Standard DD: Utility Bill or Bank Statement
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES 
  (
    'standard', 'legal_entity', v_utility_bill_id, true, 9,
    'Primary proof of registered office address (utility bill in company name, not older than 3 months)'
  ),
  (
    'standard', 'legal_entity', v_bank_statement_id, false, 10,
    'Alternative address proof - Bank statement showing registered office address (not older than 3 months)'
  ) ON CONFLICT DO NOTHING;

  -- Enhanced DD: Multiple address proofs required
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES 
  (
    'enhanced', 'legal_entity', v_utility_bill_id, true, 12,
    'Primary proof of registered office address (utility bill in company name, not older than 3 months)'
  ),
  (
    'enhanced', 'legal_entity', v_tenancy_agreement_id, false, 13,
    'Tenancy/Lease agreement for registered office (if rented premises)'
  ),
  (
    'enhanced', 'legal_entity', v_bank_statement_id, false, 14,
    'Secondary address verification - Bank statement showing registered office (not older than 3 months)'
  ) ON CONFLICT DO NOTHING;

  -- ===========================
  -- INDIVIDUAL IDENTITY DOCUMENTS
  -- ===========================
  
  -- Simplified DD: Add Driving Licence as alternative
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'simplified', 'individual', v_driving_licence_id, false, 2,
    'Alternative government-issued photo ID (Tanzanian Driving Licence)'
  ) ON CONFLICT DO NOTHING;

  -- Standard DD: Add Driving Licence as additional option
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'standard', 'individual', v_driving_licence_id, false, 3,
    'Additional government-issued photo ID for enhanced verification'
  ) ON CONFLICT DO NOTHING;

  -- Enhanced DD: Add Driving Licence
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'enhanced', 'individual', v_driving_licence_id, false, 4,
    'Additional government-issued photo ID for comprehensive identity verification'
  ) ON CONFLICT DO NOTHING;

  -- ===========================
  -- INDIVIDUAL ADDRESS DOCUMENTS
  -- ===========================
  
  -- Standard DD: Add Bank Statement and Tenancy Agreement as alternatives
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES 
  (
    'standard', 'individual', v_bank_statement_id, false, 4,
    'Alternative address proof - Bank statement showing residential address (not older than 3 months)'
  ),
  (
    'standard', 'individual', v_tenancy_agreement_id, false, 5,
    'Tenancy/Rental agreement showing current residential address'
  ) ON CONFLICT DO NOTHING;

  -- Enhanced DD: Require secondary address verification
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES 
  (
    'enhanced', 'individual', v_bank_statement_id, false, 4,
    'Secondary address verification - Bank statement (not older than 3 months)'
  ),
  (
    'enhanced', 'individual', v_tenancy_agreement_id, false, 5,
    'Tenancy/Rental agreement if applicable'
  ) ON CONFLICT DO NOTHING;

END $$;
