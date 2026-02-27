/*
  # Add Missing SOF/SOW Templates to Standard DD

  1. Problem
    - Standard DD for individuals has SOF Declaration but missing SOW Documentation
    - Standard DD for legal entities completely missing both SOF and SOW templates
    - These are critical compliance documents per Tanzania regulations

  2. Solution
    - Add Source of Wealth Documentation to Standard DD for individuals
    - Add Source of Funds Declaration to Standard DD for legal entities
    - Add Source of Wealth Documentation to Standard DD for legal entities
    - Set proper priorities and triggers

  3. Changes
    - Insert SOW template requirement for individual clients at Standard DD
    - Insert SOF template requirement for legal entity clients at Standard DD
    - Insert SOW template requirement for legal entity clients at Standard DD
*/

-- Add Source of Wealth Documentation for individual clients at Standard DD
INSERT INTO dd_level_document_requirements (
  id,
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description,
  triggers
)
SELECT 
  gen_random_uuid(),
  'standard',
  'individual',
  dt.id,
  true,
  11, -- After bank reference (priority 10)
  'Source of Wealth documentation template. Required for Standard DD compliance.',
  '["sof_sow_templates"]'::jsonb
FROM document_types dt
WHERE dt.code = 'source_of_wealth'
ON CONFLICT DO NOTHING;

-- Add Source of Funds Declaration for legal entity clients at Standard DD
INSERT INTO dd_level_document_requirements (
  id,
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description,
  triggers
)
SELECT 
  gen_random_uuid(),
  'standard',
  'legal_entity',
  dt.id,
  true,
  11, -- After business profile (priority 10)
  'Source of Funds Declaration template. Required for Standard DD compliance.',
  '["sof_sow_templates"]'::jsonb
FROM document_types dt
WHERE dt.code = 'sof_declaration'
ON CONFLICT DO NOTHING;

-- Add Source of Wealth Documentation for legal entity clients at Standard DD
INSERT INTO dd_level_document_requirements (
  id,
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description,
  triggers
)
SELECT 
  gen_random_uuid(),
  'standard',
  'legal_entity',
  dt.id,
  true,
  12, -- After SOF declaration
  'Source of Wealth documentation template. Required for Standard DD compliance.',
  '["sof_sow_templates"]'::jsonb
FROM document_types dt
WHERE dt.code = 'source_of_wealth'
ON CONFLICT DO NOTHING;

-- Update the existing individual SOF declaration to include proper triggers
UPDATE dd_level_document_requirements
SET triggers = '["sof_sow_templates"]'::jsonb,
    description = 'Source of Funds Declaration template. Required for Standard DD compliance.'
WHERE dd_level = 'standard'
  AND client_type = 'individual'
  AND document_type_id = (SELECT id FROM document_types WHERE code = 'sof_declaration');
