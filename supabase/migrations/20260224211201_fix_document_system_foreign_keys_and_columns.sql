/*
  # Fix document system foreign keys and missing columns

  1. Changes
    - Add foreign key constraint for client_documents.uploaded_by -> user_profiles.id
    - Add foreign key constraint for client_documents.verified_by -> user_profiles.id
    - Ensure document_access_logs has document_name column
    - Add missing foreign key constraints for document relationships

  2. Details
    - Fixes "Could not find a relationship between client_documents and user_profiles" error
    - Fixes "Could not find the document_name column" error in document_access_logs
    - Ensures proper cascading behavior on user deletion
*/

-- Add uploaded_by foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'client_documents_uploaded_by_fkey'
    AND table_name = 'client_documents'
  ) THEN
    ALTER TABLE client_documents
    ADD CONSTRAINT client_documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add verified_by foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'client_documents_verified_by_fkey'
    AND table_name = 'client_documents'
  ) THEN
    ALTER TABLE client_documents
    ADD CONSTRAINT client_documents_verified_by_fkey
    FOREIGN KEY (verified_by)
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add document_name column to document_access_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_access_logs'
    AND column_name = 'document_name'
  ) THEN
    ALTER TABLE document_access_logs
    ADD COLUMN document_name TEXT;
  END IF;
END $$;

-- Add document_type column to document_access_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_access_logs'
    AND column_name = 'document_type'
  ) THEN
    ALTER TABLE document_access_logs
    ADD COLUMN document_type TEXT;
  END IF;
END $$;
