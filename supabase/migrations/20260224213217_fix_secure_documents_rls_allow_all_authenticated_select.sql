/*
  # Fix secure_documents RLS to allow all authenticated users to SELECT

  1. Changes
    - Add a broad policy allowing all authenticated users to SELECT from secure_documents
    - This is needed because staff, management, compliance_officer all need access
    
  2. Security
    - Still maintains organization-level isolation through other policies
    - Users can only see documents from their organization or that they own
*/

-- Add a simpler policy that allows authenticated users in same org to read
DROP POLICY IF EXISTS "Users can view organization documents" ON secure_documents;

CREATE POLICY "Users can view organization documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    is_deleted = false 
    AND (
      owner_id = auth.uid()
      OR organization_id = get_user_organization_id()
      OR is_admin_user()
    )
  );
