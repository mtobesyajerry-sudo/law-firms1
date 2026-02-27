/*
  # Add Compliance Officer Assessment Policies

  1. Changes
    - Add SELECT policy for compliance officers to view assessments in their organization
    - Add INSERT policy for compliance officers to create assessments
    - Add UPDATE policy for compliance officers to update assessments in their organization
    - Add DELETE policy for compliance officers to delete assessments in their organization

  2. Security
    - Compliance officers can only access assessments within their organization
    - All policies verify user role and organization membership
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Compliance officers can view org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can create assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can delete org assessments" ON assessments;

-- Allow compliance officers to view assessments in their organization
CREATE POLICY "Compliance officers can view org assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
        AND user_profiles.organization_id = assessments.organization_id
    )
  );

-- Allow compliance officers to create assessments for their organization
CREATE POLICY "Compliance officers can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
        AND user_profiles.organization_id = assessments.organization_id
    )
  );

-- Allow compliance officers to update assessments in their organization
CREATE POLICY "Compliance officers can update org assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
        AND user_profiles.organization_id = assessments.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
        AND user_profiles.organization_id = assessments.organization_id
    )
  );

-- Allow compliance officers to delete assessments in their organization
CREATE POLICY "Compliance officers can delete org assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
        AND user_profiles.organization_id = assessments.organization_id
    )
  );
