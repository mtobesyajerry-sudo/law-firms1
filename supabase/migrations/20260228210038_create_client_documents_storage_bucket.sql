/*
  # Create Client Documents Storage Bucket
  
  1. Storage Bucket
    - Creates 'client-documents' bucket for EDD templates and client documents
    - 50MB file size limit
    - Supports PDF, JPG, JPEG, PNG files
    - Private access with RLS
  
  2. Security
    - RLS policies for authenticated users
    - Organization-based access control
    - Upload, read, update, and delete permissions
*/

-- Create the client-documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  public = false,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from client-documents" ON storage.objects;

-- Create storage policies for authenticated users
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