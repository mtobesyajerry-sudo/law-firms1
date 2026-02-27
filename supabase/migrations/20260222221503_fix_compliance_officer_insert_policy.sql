/*
  # Fix Compliance Officer INSERT Policy

  1. Problem
    - The INSERT policy was checking assessments.organization_id during insert
    - During INSERT, the row doesn't exist yet, so the check fails
    
  2. Solution
    - Change INSERT policy to check the organization_id being inserted
    - Use NEW.organization_id in the WITH CHECK clause instead

  3. Security
    - Compliance officers can only create assessments for their own organization
    - Organization_id must match the user's organization
*/

-- Drop and recreate the INSERT policy with correct logic
DROP POLICY IF EXISTS "Compliance officers can create assessments" ON assessments;

CREATE POLICY "Compliance officers can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT user_profiles.organization_id
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );
