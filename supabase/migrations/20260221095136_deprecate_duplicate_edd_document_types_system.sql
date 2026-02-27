/*
  # Deprecate Duplicate EDD Document Types System

  1. Changes
    - Drop edd_documents table (tracking now done through main document system)
    - Drop edd_document_types table (all templates now in document_types with template_content)
    
  2. Rationale
    - All EDD templates have been migrated to document_types table
    - Template content is now stored in template_content column
    - All document requirements tracked through unified dd_level_document_requirements
    - Eliminates duplicate tables and simplifies system architecture
    
  3. Impact
    - EDDDocumentTemplates component still works (reads from document_types)
    - All template content preserved in document_types.template_content
    - No data loss - only removing redundant structure
*/

-- Drop edd_documents table (if exists)
DROP TABLE IF EXISTS edd_documents CASCADE;

-- Drop edd_document_types table (if exists)
DROP TABLE IF EXISTS edd_document_types CASCADE;

-- Add comment to document_types table to document unified approach
COMMENT ON TABLE document_types IS 'Unified document types table. Contains all document requirements including EDD templates. Templates with printable forms have content in template_content column.';

COMMENT ON COLUMN document_types.template_content IS 'Printable template content for documents that have forms (SOF, SOW, EDD templates, Client Declaration). Used by SOFSOWTemplates and EDDDocumentTemplates components.';

COMMENT ON COLUMN document_types.display_order IS 'Display order for templates. 0 = no specific order. Used for sorting templates in template lists.';
