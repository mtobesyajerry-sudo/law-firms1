/*
  # Fix Storage Buckets RLS - REAL Permanent Fix
  
  ## THE ACTUAL PROBLEM
  RLS is enabled on storage.buckets table but there are NO policies.
  This means authenticated users cannot even SEE that buckets exist.
  Result: "Bucket not found" error even though buckets exist in database.
  
  ## Root Cause
  Previous migrations created the buckets and object policies, but NEVER
  created policies for the storage.buckets table itself.
  
  When RLS is enabled (rowsecurity = true), ALL queries are blocked unless
  there's an explicit policy allowing them.
  
  ## Solution
  Create policies on storage.buckets to allow authenticated users to:
  1. SELECT (read) buckets - so they can see secure-documents and client-documents exist
  2. This does NOT allow them to create/modify/delete buckets (security maintained)
  
  ## Security
  - Users can only READ bucket metadata (name, size limits)
  - Users CANNOT create, modify, or delete buckets
  - Object-level access still controlled by storage.objects policies
*/

-- ============================================================================
-- STEP 1: VERIFY CURRENT STATE
-- ============================================================================

DO $$
DECLARE
  bucket_count integer;
  bucket_policy_count integer;
  object_policy_count integer;
BEGIN
  -- Check buckets exist
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('secure-documents', 'client-documents');
  
  -- Check bucket policies
  SELECT COUNT(*) INTO bucket_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'buckets';
  
  -- Check object policies
  SELECT COUNT(*) INTO object_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';
  
  RAISE NOTICE 'Current state: % buckets, % bucket policies, % object policies',
    bucket_count, bucket_policy_count, object_policy_count;
  
  IF bucket_count < 2 THEN
    RAISE EXCEPTION 'Buckets do not exist - run create_storage_buckets_permanent_fix first';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE POLICIES ON storage.buckets
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can read buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Public can read buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated to read buckets" ON storage.buckets;

-- Create policy to allow authenticated users to SELECT from storage.buckets
-- This allows them to see that buckets exist and read their metadata
CREATE POLICY "Authenticated users can read buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (true);

-- Optional: Allow public read access to bucket metadata (if needed)
-- Uncomment if you need unauthenticated users to see bucket metadata
-- CREATE POLICY "Public can read buckets"
-- ON storage.buckets
-- FOR SELECT
-- TO public
-- USING (true);

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bucket_policy_count integer;
  test_result boolean;
BEGIN
  -- Verify policy was created
  SELECT COUNT(*) INTO bucket_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' 
    AND tablename = 'buckets'
    AND policyname = 'Authenticated users can read buckets';
  
  IF bucket_policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create bucket read policy';
  END IF;
  
  -- Verify RLS is enabled (should be)
  SELECT rowsecurity INTO test_result
  FROM pg_tables
  WHERE schemaname = 'storage' AND tablename = 'buckets';
  
  IF NOT test_result THEN
    RAISE WARNING 'RLS is not enabled on storage.buckets (unexpected but OK)';
  END IF;
  
  RAISE NOTICE '✓ Storage bucket RLS policy created successfully';
END $$;

-- Display final configuration
SELECT 
  '✓ STORAGE BUCKET RLS FIXED' as status,
  (SELECT COUNT(*) FROM storage.buckets) as total_buckets,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'buckets') as bucket_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as object_policies;
