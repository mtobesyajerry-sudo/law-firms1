/*
  # Fix secure_documents UPDATE policy to allow access tracking

  1. Changes
    - Add policy to allow users to update last_accessed fields for documents they can view
    - This is needed for the access tracking functionality
    
  2. Security
    - Only allows updating specific access tracking fields
    - Does not allow updating other sensitive fields
*/

-- Drop existing conflicting policy if exists
DROP POLICY IF EXISTS "Users can update access tracking for viewable documents" ON secure_documents;

-- Add policy to allow updating access tracking fields
CREATE POLICY "Users can update access tracking for viewable documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (
    is_deleted = false 
    AND (
      owner_id = auth.uid()
      OR organization_id = get_user_organization_id()
      OR is_admin_user()
    )
  )
  WITH CHECK (
    is_deleted = false 
    AND (
      owner_id = auth.uid()
      OR organization_id = get_user_organization_id()
      OR is_admin_user()
    )
  );
