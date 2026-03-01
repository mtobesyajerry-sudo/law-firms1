/*
  # Storage Buckets - Permanent Fix
  
  ## Problem
  The storage bucket "secure-documents" keeps disappearing, causing "Bucket not found" errors.
  This has occurred approximately 8 times.
  
  ## Root Cause
  Multiple migrations try to create storage buckets with different configurations:
  - 20260221131056_create_storage_bucket_and_indexes_final.sql
  - 20260228210038_create_client_documents_storage_bucket.sql
  
  These migrations use INSERT...ON CONFLICT which may not be reliable when the
  schema cache refreshes or migrations run in different orders.
  
  ## Permanent Solution
  This migration:
  1. Uses a DO block with proper existence checking
  2. Creates buckets only if they don't exist
  3. Updates configuration if they do exist
  4. Ensures idempotency - can be run multiple times safely
  5. Will NEVER fail due to bucket conflicts
  
  ## Buckets Created
  1. secure-documents - Primary document storage
  2. client-documents - Client-specific documents (alternative/backup)
  
  ## Security
  - Private buckets (public = false)
  - 50MB file size limit
  - Restricted MIME types
  - RLS policies for authenticated users only
*/

-- ============================================================================
-- STEP 1: CREATE OR UPDATE STORAGE BUCKETS
-- ============================================================================

DO $$
BEGIN
  -- Create secure-documents bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'secure-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'secure-documents',
      'secure-documents',
      false,
      52428800, -- 50MB
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
    );
    RAISE NOTICE 'Created secure-documents bucket';
  ELSE
    -- Update existing bucket configuration
    UPDATE storage.buckets
    SET 
      public = false,
      file_size_limit = 52428800,
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
      ]::text[]
    WHERE id = 'secure-documents';
    RAISE NOTICE 'Updated secure-documents bucket configuration';
  END IF;

  -- Create client-documents bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'client-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'client-documents',
      'client-documents',
      false,
      52428800, -- 50MB
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
    );
    RAISE NOTICE 'Created client-documents bucket';
  ELSE
    -- Update existing bucket configuration
    UPDATE storage.buckets
    SET 
      public = false,
      file_size_limit = 52428800,
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
      ]::text[]
    WHERE id = 'client-documents';
    RAISE NOTICE 'Updated client-documents bucket configuration';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE OR REPLACE STORAGE POLICIES
-- ============================================================================

-- Drop all existing policies first (safe because we recreate them immediately)
DO $$
BEGIN
  -- Drop secure-documents policies
  DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
  
  -- Drop client-documents policies
  DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can read from client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from client-documents" ON storage.objects;
  
  RAISE NOTICE 'Dropped existing storage policies';
END $$;

-- Create policies for secure-documents bucket
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

-- Create policies for client-documents bucket
CREATE POLICY "Authenticated users can upload to client-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can read from client-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can update client-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can delete from client-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bucket_count integer;
  policy_count integer;
BEGIN
  -- Verify buckets exist
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('secure-documents', 'client-documents');
  
  IF bucket_count != 2 THEN
    RAISE EXCEPTION 'Storage bucket verification failed - expected 2 buckets, found %', bucket_count;
  END IF;
  
  -- Verify policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%documents%';
  
  IF policy_count < 8 THEN
    RAISE WARNING 'Expected at least 8 storage policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Storage buckets verified: % buckets, % policies', bucket_count, policy_count;
END $$;

-- Display final configuration
SELECT 
  '✓ STORAGE BUCKETS CONFIGURED' as status,
  id as bucket_id,
  public,
  file_size_limit / 1024 / 1024 || ' MB' as max_file_size,
  array_length(allowed_mime_types, 1) as mime_types_count
FROM storage.buckets
WHERE id IN ('secure-documents', 'client-documents')
ORDER BY id;
