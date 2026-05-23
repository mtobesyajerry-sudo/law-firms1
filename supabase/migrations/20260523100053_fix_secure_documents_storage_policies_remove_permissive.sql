/*
  # Remove overly-permissive secure-documents storage policies

  ## Problem
  The secure-documents storage bucket has four legacy policies that only check
  bucket_id = 'secure-documents', with no organization isolation. Because Supabase
  evaluates storage policies with OR logic, these policies were granting any
  authenticated user read/write/delete access to every file in the bucket,
  bypassing the org-scoped policies added later.

  ## Changes
  - DROP the four permissive policies:
    "Authenticated users can read documents"
    "Authenticated users can upload documents"
    "Authenticated users can update documents"
    "Authenticated users can delete documents"

  ## What remains (already present, org-scoped)
  - "Users can read from their secure folder"     — requires extract_org_from_path(name) = get_user_organization_id()
  - "Users can upload to their secure folder"     — same
  - "Users can update their secure files"         — same
  - "Users can delete their secure files"         — same
  - Admins are included via is_admin() OR clause in the remaining policies

  ## Security impact
  After this migration, cross-org reads/writes to secure-documents are blocked at
  the storage layer. A Firm B user cannot generate a signed URL for a Firm A file
  path even if they know the UUID.
*/

DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
