/*
  # Fix Admin Delete Assessment Policy

  1. Changes
    - Drop the existing admin delete policy that checks JWT app_metadata
    - Create a new policy that checks the user_profiles table
    
  2. Security
    - Admins can delete any assessment
    - Policy checks user_profiles table for role verification
*/

-- Drop the old policy that checks JWT metadata
DROP POLICY IF EXISTS "Admins can delete assessments" ON assessments;

-- Create new policy that checks user_profiles table
CREATE POLICY "Admins can delete assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND role = 'admin'
    )
  );
