/*
  # Consolidate Document System - Unified Approach

  ## Overview
  This migration consolidates all document handling into a single, simplified system using only the `client_documents` table.

  ## Changes

  1. **Drop Redundant Tables**
     - Drop `secure_documents` (redundant with client_documents)
     - Drop `assessment_attachments` (not used, assessments should reference client_documents)
     - Drop `document_security_metadata` (over-engineered)
     - Drop `document_sharing` (not needed for initial implementation)
     - Drop `document_versions` (not needed for initial implementation)
     - Drop `document_access_log` (duplicate of document_access_logs)

  2. **Simplify client_documents Table**
     - Keep essential columns only
     - Remove redundant file path columns
     - Standardize on storage_path + file_url pattern

  3. **Clear All Existing Documents**
     - Delete all existing document records to start fresh
     - Staff will upload new documents with the simplified system

  4. **Keep Essential Supporting Tables**
     - `document_types` - defines document categories and templates
     - `document_requirements` - defines what's required per DD level
     - `document_access_logs` - audit trail for compliance
     - `document_verification_log` - verification history

  ## Security
  - RLS policies remain in place
  - Staff, Compliance Officers, and Admins have full access
  - Client users have limited access to their own organization's documents
*/

-- Step 1: Drop redundant tables
DROP TABLE IF EXISTS document_security_metadata CASCADE;
DROP TABLE IF EXISTS document_sharing CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_access_log CASCADE;
DROP TABLE IF EXISTS secure_documents CASCADE;
DROP TABLE IF EXISTS assessment_attachments CASCADE;

-- Step 2: Clear all existing documents from client_documents
DELETE FROM client_documents;

-- Step 3: Clean up and simplify client_documents structure
-- Remove redundant columns that cause confusion
ALTER TABLE client_documents DROP COLUMN IF EXISTS file_path CASCADE;
ALTER TABLE client_documents DROP COLUMN IF EXISTS secure_document_id CASCADE;

-- Ensure we have the essential columns in correct order
-- Primary identification
ALTER TABLE client_documents ALTER COLUMN id SET NOT NULL;
ALTER TABLE client_documents ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE client_documents ALTER COLUMN organization_id SET NOT NULL;

-- Document classification
ALTER TABLE client_documents ALTER COLUMN document_type SET NOT NULL;
ALTER TABLE client_documents ALTER COLUMN document_name SET NOT NULL;
ALTER TABLE client_documents ALTER COLUMN file_name SET NOT NULL;

-- Storage information (storage_path is the source of truth)
ALTER TABLE client_documents ALTER COLUMN storage_path SET DEFAULT NULL;
ALTER TABLE client_documents ALTER COLUMN file_url SET DEFAULT NULL;
ALTER TABLE client_documents ALTER COLUMN file_size SET DEFAULT NULL;
ALTER TABLE client_documents ALTER COLUMN mime_type SET DEFAULT NULL;

-- Verification workflow
ALTER TABLE client_documents ALTER COLUMN verification_status SET DEFAULT 'pending';
ALTER TABLE client_documents ALTER COLUMN uploaded_by SET NOT NULL;
ALTER TABLE client_documents ALTER COLUMN uploaded_at SET DEFAULT now();

-- Add helpful comment
COMMENT ON TABLE client_documents IS 'Unified document storage for all client documents. Uses storage_path for Supabase Storage bucket reference and file_url for temporary signed URLs.';

-- Step 4: Ensure document_types table is clean and properly configured
-- This table defines all possible document types
COMMENT ON TABLE document_types IS 'Defines all document types that can be uploaded. Includes templates for EDD documents.';

-- Step 5: Ensure document_requirements table is properly configured
-- This table defines which documents are required for each DD level
COMMENT ON TABLE document_requirements IS 'Maps document_types to DD levels (simplified, standard, enhanced) and client types (individual, corporate).';

-- Step 6: Clean existing logs to start fresh
DELETE FROM document_access_logs;
DELETE FROM document_verification_log;

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_organization_id ON client_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_document_type_id ON client_documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_verification_status ON client_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_client_documents_storage_path ON client_documents(storage_path) WHERE storage_path IS NOT NULL;

-- Step 8: Verify RLS policies are in place for staff access
-- Staff, Compliance Officers, and Admins should have full CRUD access
DO $$
BEGIN
  -- Drop any conflicting policies first
  DROP POLICY IF EXISTS "Staff can manage all documents" ON client_documents;
  DROP POLICY IF EXISTS "Compliance officers can manage all documents" ON client_documents;
  DROP POLICY IF EXISTS "Admins can manage all documents" ON client_documents;
  
  -- Create unified staff access policy
  CREATE POLICY "Staff full access to org documents"
    ON client_documents
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = client_documents.organization_id
        AND user_profiles.role IN ('staff', 'compliance_officer', 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = client_documents.organization_id
        AND user_profiles.role IN ('staff', 'compliance_officer', 'admin')
      )
    );
END $$;
