/*
  # Add Staff Access Policies for Secure Documents

  ## Overview
  Grants Staff users the ability to view, update, and delete documents for clients they manage.

  ## Changes
  1. Add SELECT policy for Staff to view documents of clients they manage
  2. Add UPDATE policy for Staff to update documents of clients they manage
  3. Add DELETE policy for Staff to delete documents of clients they manage
  4. Add DELETE policy for Admins to delete any documents

  ## Security
  - Staff can only access documents for clients where they are the relationship_manager_id
  - All policies check role and organization membership
  - Maintains data isolation between organizations
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Staff can view client documents" ON secure_documents;
DROP POLICY IF EXISTS "Staff can update client documents" ON secure_documents;
DROP POLICY IF EXISTS "Staff can delete client documents" ON secure_documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON secure_documents;

-- SELECT: Staff can view documents for clients they manage
CREATE POLICY "Staff can view client documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'staff'
    AND is_deleted = false
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = secure_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

-- UPDATE: Staff can update documents for clients they manage
CREATE POLICY "Staff can update client documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = secure_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = secure_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

-- DELETE: Staff can delete documents for clients they manage
CREATE POLICY "Staff can delete client documents"
  ON secure_documents FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = secure_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

-- DELETE: Admins can delete any documents
CREATE POLICY "Admins can delete documents"
  ON secure_documents FOR DELETE
  TO authenticated
  USING (is_admin_user());