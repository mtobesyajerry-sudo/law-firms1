/*
  # Fix User Deletion Foreign Key Constraints

  ## Issue
  Cannot delete users because foreign key constraints on related tables 
  use NO ACTION, which prevents deletion if related records exist.

  ## Solution
  Update foreign key constraints to use SET NULL or CASCADE depending on the table.
  This allows safe user deletion while preserving data integrity.

  ## Changes
  - client_documents: SET NULL for uploaded_by and verified_by
  - document_verification_log: SET NULL for performed_by
  - registration_requests: SET NULL for approved_by
*/

-- Update client_documents constraints
ALTER TABLE client_documents
  DROP CONSTRAINT IF EXISTS client_documents_uploaded_by_fkey,
  DROP CONSTRAINT IF EXISTS client_documents_verified_by_fkey;

ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) 
    REFERENCES user_profiles(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT client_documents_verified_by_fkey 
    FOREIGN KEY (verified_by) 
    REFERENCES user_profiles(id) 
    ON DELETE SET NULL;

-- Update document_verification_log constraint
ALTER TABLE document_verification_log
  DROP CONSTRAINT IF EXISTS document_verification_log_performed_by_fkey;

ALTER TABLE document_verification_log
  ADD CONSTRAINT document_verification_log_performed_by_fkey 
    FOREIGN KEY (performed_by) 
    REFERENCES user_profiles(id) 
    ON DELETE SET NULL;

-- Update registration_requests constraint
ALTER TABLE registration_requests
  DROP CONSTRAINT IF EXISTS registration_requests_approved_by_fkey;

ALTER TABLE registration_requests
  ADD CONSTRAINT registration_requests_approved_by_fkey 
    FOREIGN KEY (approved_by) 
    REFERENCES user_profiles(id) 
    ON DELETE SET NULL;
