/*
  # Add Client Declaration Form to Standard DD Requirements

  1. Changes
    - Add Client Declaration Form as mandatory document for Standard DD (individual clients)
    - Add Client Declaration Form as mandatory document for Standard DD (legal entity clients)
    - Set appropriate priority in the document checklist
  
  2. Rationale
    - Client Declaration is a critical compliance document for AML/CFT
    - It captures client attestations about accuracy of information, source of funds, beneficial ownership, and PEP status
    - Should be required for Standard DD, not just Simplified DD
*/

-- Add Client Declaration for Standard DD - Individual Clients
INSERT INTO dd_level_document_requirements (
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  triggers,
  description
)
SELECT 
  'standard',
  'individual',
  id,
  true,
  12, -- After source of wealth documentation
  '[]'::jsonb,
  'Client declaration confirming accuracy of information, source of funds, beneficial ownership, and PEP status'
FROM document_types
WHERE code = 'client_declaration'
ON CONFLICT DO NOTHING;

-- Add Client Declaration for Standard DD - Legal Entity Clients
INSERT INTO dd_level_document_requirements (
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  triggers,
  description
)
SELECT 
  'standard',
  'legal_entity',
  id,
  true,
  13, -- After source of wealth documentation
  '[]'::jsonb,
  'Client declaration by authorized signatory confirming accuracy of information, source of funds, beneficial ownership, and PEP status'
FROM document_types
WHERE code = 'client_declaration'
ON CONFLICT DO NOTHING;
