/*
  # Update client_documents table to link with secure_documents

  ## Changes
  1. Add secure_document_id column to client_documents
  2. Add storage_path column for backward compatibility
  3. Add verification_status column
  4. Add metadata column for flexible document properties
  5. Update foreign key constraints
  6. Create necessary indexes

  ## Security
  - Maintains existing RLS policies
  - Adds foreign key constraint to secure_documents
*/

-- Add new columns to client_documents if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_documents' AND column_name = 'secure_document_id'
  ) THEN
    ALTER TABLE client_documents ADD COLUMN secure_document_id uuid REFERENCES secure_documents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_documents' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE client_documents ADD COLUMN storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_documents' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE client_documents ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_documents' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE client_documents ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update file_path column to be nullable (we'll use storage_path instead)
ALTER TABLE client_documents ALTER COLUMN file_path DROP NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_secure_document_id ON client_documents(secure_document_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_verification_status ON client_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_document_type_id ON client_documents(document_type_id);
