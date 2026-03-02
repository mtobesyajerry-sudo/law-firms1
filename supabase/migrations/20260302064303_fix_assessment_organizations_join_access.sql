/*
  # Fix Organizations Access Through Assessment Joins

  1. Changes
    - Add RLS policy to allow users to view organization details when accessing their assessments
    - This fixes the "Error loading assessment data" issue caused by blocked organization joins

  2. Security
    - Users can only see organization details for organizations they belong to
    - Or for organizations where their assessments exist (same organization_id)
*/

-- Add policy to allow users to view organizations through assessment relationships
DROP POLICY IF EXISTS "Users can view organization through assessments" ON organizations;

CREATE POLICY "Users can view organization through assessments"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- User belongs to this organization
    id = get_user_organization_id()
    OR
    -- Admin can see all
    is_admin()
    OR
    -- User has an assessment in this organization
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.organization_id = organizations.id
      AND up.id = auth.uid()
      AND up.is_active = true
    )
  );
