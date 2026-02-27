/*
  # Update All Admin Policies to Use is_admin() Function

  ## Overview
  Updates all admin policies across organizations and assessments tables
  to use the security definer is_admin() function to prevent potential
  infinite recursion issues.

  ## Changes
  - Update organizations admin policies
  - Update assessments admin policies
  - Ensure consistent use of is_admin() function everywhere
*/

-- Update Organizations Policies
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;

CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_admin());

-- Update Assessments Policies
DROP POLICY IF EXISTS "Admins can view all assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can manage all assessments" ON assessments;

CREATE POLICY "Admins can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage all assessments"
  ON assessments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update Assessment Attachments Policies
DROP POLICY IF EXISTS "Admins can manage all assessment attachments" ON assessment_attachments;

CREATE POLICY "Admins can manage all assessment attachments"
  ON assessment_attachments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
