/*
  # Add Client Delete Policy for Assessments

  1. Changes
    - Add DELETE policy for clients to delete assessments from their own organization
    
  2. Security
    - Clients can only delete assessments that belong to their assigned organization
    - Policy checks both user role and organization ownership
*/

CREATE POLICY "Clients can delete own organization assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND role = 'client'
        AND organization_id = assessments.organization_id
    )
  );
