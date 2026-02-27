/*
  # Add metadata column to client_documents
  
  ## Changes
  - Add `metadata` jsonb column to store additional document information
  - Add index for metadata queries
  
  ## Purpose
  Store flexible document metadata like:
  - Document version information
  - Additional document properties
  - Custom fields per document type
*/

-- Add metadata column
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_client_documents_metadata ON client_documents USING gin(metadata);