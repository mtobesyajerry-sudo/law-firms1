/*
  # Add secure_document_id column to client_documents
  
  ## Changes
  - Add `secure_document_id` uuid column with foreign key to secure_documents table
  
  ## Purpose
  Link client documents to the secure_documents system for encrypted storage
*/

-- Add secure_document_id column
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS secure_document_id uuid REFERENCES secure_documents(id) ON DELETE SET NULL;

-- Add index for secure_document_id lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_secure_document_id 
ON client_documents(secure_document_id);