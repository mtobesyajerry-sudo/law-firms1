/*
  # Add uploaded_by foreign key to client_documents

  1. Changes
    - Add foreign key constraint for client_documents.uploaded_by -> user_profiles.id
    - Add foreign key constraint for client_documents.verified_by -> user_profiles.id
    
  2. Security
    - Ensures referential integrity
    - Allows Supabase to recognize the relationship for .select() queries
*/

-- Drop existing constraint if it exists (may have wrong name)
ALTER TABLE client_documents 
DROP CONSTRAINT IF EXISTS client_documents_uploaded_by_fkey;

ALTER TABLE client_documents 
DROP CONSTRAINT IF EXISTS client_documents_verified_by_fkey;

-- Add the foreign key constraints with proper names
ALTER TABLE client_documents
ADD CONSTRAINT client_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

ALTER TABLE client_documents
ADD CONSTRAINT client_documents_verified_by_fkey
FOREIGN KEY (verified_by)
REFERENCES user_profiles(id)
ON DELETE SET NULL;
