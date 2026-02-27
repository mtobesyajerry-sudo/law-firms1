/*
  # Add Client Declaration Form for Legal Entities
  
  ## Overview
  The "Client Declaration Form" document exists with client_type = 'both' but is only
  assigned to individuals. This migration adds it to legal entity DD requirements.
  
  ## Changes Made
  
  ### Client Declaration Form Requirements for Legal Entities
  - **Simplified DD**: Mandatory declaration (priority 4)
  - **Standard DD**: Mandatory declaration (priority 11)
  - **Enhanced DD**: Mandatory declaration (priority 15)
  
  ## Purpose
  The Client Declaration Form is a standard AML/CFT compliance document where the client
  (individual or legal entity representative) declares that all information provided is
  true, accurate, and complete. This is a regulatory requirement for all client types.
*/

-- Get the Client Declaration Form document type ID
DO $$
DECLARE
  v_client_declaration_id uuid;
BEGIN
  SELECT id INTO v_client_declaration_id 
  FROM document_types 
  WHERE code = 'client_declaration';

  -- Add Client Declaration Form for Legal Entities
  
  -- Simplified DD
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'simplified', 'legal_entity', v_client_declaration_id, true, 4,
    'Signed declaration by authorized signatory confirming accuracy of information provided'
  ) ON CONFLICT DO NOTHING;

  -- Standard DD
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'standard', 'legal_entity', v_client_declaration_id, true, 11,
    'Signed declaration by authorized signatory confirming accuracy and completeness of all information and documentation provided'
  ) ON CONFLICT DO NOTHING;

  -- Enhanced DD
  INSERT INTO dd_level_document_requirements (
    dd_level, client_type, document_type_id, is_mandatory, priority,
    description
  ) VALUES (
    'enhanced', 'legal_entity', v_client_declaration_id, true, 15,
    'Comprehensive signed declaration by authorized signatory, notarized if high-risk, confirming accuracy of all information, beneficial ownership details, and source of funds/wealth documentation'
  ) ON CONFLICT DO NOTHING;

END $$;
