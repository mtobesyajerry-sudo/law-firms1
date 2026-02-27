/*
  # Fix client_documents RLS Policies with Proper Joins

  ## Problem
  client_documents policies join user_profiles directly causing recursion.
  client_documents doesn't have organization_id, so we need to join through kyc_clients.

  ## Solution
  Use SECURITY DEFINER helper function to get org_id, then join through kyc_clients.

  ## Changes
  - Update all policies to avoid direct user_profiles RLS checks
*/

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all client documents" ON client_documents;
DROP POLICY IF EXISTS "Admins can view all client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can view their organization's client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can upload documents for their organization's clients" ON client_documents;
DROP POLICY IF EXISTS "Users can update their organization's client documents" ON client_documents;

-- SELECT policies
CREATE POLICY "Admins can view all client documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view own org client documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM kyc_clients 
      WHERE organization_id = get_user_organization_id()
    )
  );

-- INSERT policies
CREATE POLICY "Admins can insert all client documents"
  ON client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Users can insert own org client documents"
  ON client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM kyc_clients 
      WHERE organization_id = get_user_organization_id()
    )
    AND uploaded_by = auth.uid()
  );

-- UPDATE policies
CREATE POLICY "Admins can update all client documents"
  ON client_documents
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can update own org client documents"
  ON client_documents
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM kyc_clients 
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM kyc_clients 
      WHERE organization_id = get_user_organization_id()
    )
  );

-- DELETE policies
CREATE POLICY "Admins can delete all client documents"
  ON client_documents
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can delete own org client documents"
  ON client_documents
  FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM kyc_clients 
      WHERE organization_id = get_user_organization_id()
    )
  );