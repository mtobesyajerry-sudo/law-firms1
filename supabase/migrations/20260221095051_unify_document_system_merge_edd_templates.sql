/*
  # Unify Document System - Merge EDD Templates

  1. Changes
    - Update document_types to include template_content field for printable templates
    - Migrate EDD template content from edd_document_types to document_types
    - Add display_order to document_types for consistent ordering
    - Update descriptions to indicate which templates are printable
    
  2. Rationale
    - Consolidate all document requirements into one unified system
    - Eliminate duplicate tracking tables
    - Simplify document management workflow
*/

-- Add template_content and display_order fields to document_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_types' AND column_name = 'template_content'
  ) THEN
    ALTER TABLE document_types ADD COLUMN template_content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_types' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE document_types ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Update existing EDD document types in document_types with template content from edd_document_types
UPDATE document_types dt
SET 
  template_content = edt.template_content,
  display_order = edt.display_order,
  description = dt.description || ' 📄 Printable template available in EDD Templates tab.'
FROM edd_document_types edt
WHERE dt.code = edt.code
AND edt.template_content IS NOT NULL
AND dt.template_content IS NULL;

-- Add indicator that SOF/SOW have templates too
UPDATE document_types
SET description = description || ' 📄 Printable template available in SOF/SOW Templates tab.'
WHERE code IN ('sof_declaration', 'source_of_wealth')
AND description NOT LIKE '%📄%';

-- Update client declaration description
UPDATE document_types
SET description = 'Comprehensive client declaration form for legal entities. 📄 Printable template available in Client Declaration tab.'
WHERE code = 'client_declaration'
AND description NOT LIKE '%📄%';

-- Create index on display_order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_document_types_display_order ON document_types(display_order);

-- Update display_order for better categorization (0 = no specific order)
UPDATE document_types SET display_order = 0 WHERE display_order IS NULL;
