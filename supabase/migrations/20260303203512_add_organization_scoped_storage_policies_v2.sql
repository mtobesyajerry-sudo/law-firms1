/*
  # Add Organization-Scoped Storage Policies

  1. Security Enhancement
    - Restrict storage object access to organization level
    - Prevent cross-organization document access
    - Add path-based organization validation
  
  2. Changes
    - Drop existing overly permissive storage policies
    - Create new organization-scoped storage policies
    - Enforce organization folder structure: {organization_id}/{file_name}
  
  3. Security
    - Users can only upload/access files in their organization folder
    - Admins retain full access across all organizations
*/

-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from client-documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to secure-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from secure-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update secure-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from secure-documents" ON storage.objects;

-- Create helper function to extract organization ID from storage path
CREATE OR REPLACE FUNCTION extract_org_from_path(storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path_parts text[];
  v_org_id uuid;
BEGIN
  -- Split path by '/' and get first part (organization_id)
  v_path_parts := string_to_array(storage_path, '/');
  
  -- Try to cast first part to uuid
  BEGIN
    v_org_id := v_path_parts[1]::uuid;
    RETURN v_org_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$;

-- Organization-scoped INSERT policy for client-documents
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' 
  AND (
    -- Admin can upload anywhere
    is_admin()
    OR
    -- Users can only upload to their organization folder
    extract_org_from_path(name) = get_user_organization_id()
  )
);

-- Organization-scoped SELECT policy for client-documents
CREATE POLICY "Users can read from their organization folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    -- Admin can read all
    is_admin()
    OR
    -- Users can read their organization's files
    extract_org_from_path(name) = get_user_organization_id()
  )
);

-- Organization-scoped UPDATE policy for client-documents
CREATE POLICY "Users can update their organization files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);

-- Organization-scoped DELETE policy for client-documents
CREATE POLICY "Users can delete their organization files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);

-- Same policies for secure-documents bucket
CREATE POLICY "Users can upload to their secure folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'secure-documents' 
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);

CREATE POLICY "Users can read from their secure folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'secure-documents'
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);

CREATE POLICY "Users can update their secure files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'secure-documents'
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);

CREATE POLICY "Users can delete their secure files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'secure-documents'
  AND (
    is_admin()
    OR extract_org_from_path(name) = get_user_organization_id()
  )
);