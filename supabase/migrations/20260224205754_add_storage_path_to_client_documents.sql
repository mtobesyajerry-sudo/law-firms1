/*
  # Add storage_path column to client_documents
  
  ## Changes
  - Add `storage_path` text column for Supabase Storage paths
  
  ## Purpose
  Store the path to the file in Supabase Storage bucket for direct file access
*/

-- Add storage_path column
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS storage_path text;

-- Add index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_storage_path 
ON client_documents(storage_path) WHERE storage_path IS NOT NULL;