/*
  # Complete Storage Infrastructure Setup - Final

  ## Overview
  Sets up secure document storage with Supabase Storage and comprehensive indexing

  ## Changes
  1. Creates secure-documents storage bucket
  2. Configures storage policies for authenticated access
  3. Creates performance indexes for all document tables

  ## Security
  - RLS enforced at storage level
  - Organization-level access control at application level
  - Audit logging enabled
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-documents',
  'secure-documents',
  false,
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  public = false,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Create storage policies for authenticated users
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'secure-documents');

CREATE POLICY "Authenticated users can read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'secure-documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'secure-documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'secure-documents');

-- Create comprehensive indexes for secure_documents
CREATE INDEX IF NOT EXISTS idx_secure_documents_organization_id ON secure_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_client_id ON secure_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_assessment_id ON secure_documents(assessment_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_owner_id ON secure_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_storage_path ON secure_documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_secure_documents_is_deleted ON secure_documents(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_secure_documents_created_at ON secure_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secure_documents_classification ON secure_documents(classification);

-- Create indexes for document_access_logs
CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_access_type ON document_access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_client_id ON document_access_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_assessment_id ON document_access_logs(assessment_id);

-- Create indexes for document_versions
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- Create indexes for document_sharing
CREATE INDEX IF NOT EXISTS idx_document_sharing_document_id ON document_sharing(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sharing_shared_with_user_id ON document_sharing(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_sharing_is_active ON document_sharing(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_document_sharing_expires_at ON document_sharing(expires_at);
