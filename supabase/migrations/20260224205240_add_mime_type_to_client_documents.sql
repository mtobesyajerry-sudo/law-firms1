/*
  # Add mime_type column to client_documents
  
  ## Changes
  - Add `mime_type` text column to store MIME type of documents
  
  ## Purpose
  Store the MIME type (e.g., 'application/pdf', 'image/jpeg') for proper
  document handling and display
*/

-- Add mime_type column
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS mime_type text;

-- Add index for mime_type queries
CREATE INDEX IF NOT EXISTS idx_client_documents_mime_type ON client_documents(mime_type);