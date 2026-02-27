/*
  # Fix Staff Document Delete Access
  
  1. Changes
    - Add policy for staff to soft-delete (UPDATE) their own uploaded documents
    - Add policy for staff to hard-delete their own uploaded documents
    - Ensures staff can delete documents they own directly (owner_id match)
    
  2. Security
    - Staff can only delete documents where they are the owner
    - Maintains audit trail through soft deletes
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "staff_delete_own_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_update_own_documents" ON secure_documents;

-- Allow staff to soft-delete (UPDATE) their own documents
CREATE POLICY "staff_update_own_documents"
  ON secure_documents
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'staff' AND owner_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'staff' AND owner_id = auth.uid()
  );

-- Allow staff to hard-delete their own documents
CREATE POLICY "staff_delete_own_documents"
  ON secure_documents
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'staff' AND owner_id = auth.uid()
  );
