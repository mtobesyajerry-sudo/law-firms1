/*
  # Fix secure_documents RLS policies to use security definer helpers

  1. Changes
    - Replace all secure_documents RLS policies with versions that use helper functions
    - This prevents infinite recursion when querying user_profiles
    
  2. Security
    - Maintains same access control logic but uses helper functions to avoid RLS recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own documents" ON secure_documents;
DROP POLICY IF EXISTS "Users can view organization documents" ON secure_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON secure_documents;
DROP POLICY IF EXISTS "Users can create documents" ON secure_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON secure_documents;

-- Recreate with helper functions
CREATE POLICY "Users can view own documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND is_deleted = false);

CREATE POLICY "Users can view organization documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND is_deleted = false
  );

CREATE POLICY "Admins can view all documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Users can create documents"
  ON secure_documents FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can update all documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
