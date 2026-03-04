/*
  # Fix Storage Bucket Security Configuration
  
  1. Changes
    - Remove ZIP file types from allowed MIME types
    - Reduce file size limit from 50MB to 10MB
    - Align bucket configuration with edge function validation
  
  2. Security
    - Prevents zip bomb attacks
    - Reduces storage abuse potential
    - Ensures consistent security across all layers
*/

-- Update client-documents bucket to remove dangerous file types
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB in bytes
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
    'text/plain'
  ]::text[]
WHERE name = 'client-documents';

-- Verify the update
DO $$
DECLARE
  v_bucket RECORD;
BEGIN
  SELECT * INTO v_bucket FROM storage.buckets WHERE name = 'client-documents';
  
  IF v_bucket.file_size_limit != 10485760 THEN
    RAISE EXCEPTION 'File size limit not updated correctly';
  END IF;
  
  IF 'application/zip' = ANY(v_bucket.allowed_mime_types) THEN
    RAISE EXCEPTION 'ZIP files still allowed - security risk!';
  END IF;
  
  RAISE NOTICE 'Storage bucket security configuration updated successfully';
END $$;
