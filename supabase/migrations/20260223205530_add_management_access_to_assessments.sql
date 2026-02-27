/*
  # Add Management User Access to Assessments (READ-ONLY)

  ## Changes
  1. Add SELECT policy for Management users to view assessments in their organization

  ## Security
  - Management users can ONLY VIEW assessments within their organization
  - Management users CANNOT create, update, or delete assessments
  - All policies use get_user_role() and get_user_org() helper functions to prevent RLS recursion

  ## IMPORTANT
  - Management role is for oversight and compliance monitoring only
  - Write access (INSERT, UPDATE, DELETE) is restricted to Staff and Compliance Officer roles
*/

-- Add Management user READ-ONLY policy for assessments table
CREATE POLICY "Management can view org assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    (get_user_role() = 'management')
    AND (organization_id = get_user_organization_id())
  );
