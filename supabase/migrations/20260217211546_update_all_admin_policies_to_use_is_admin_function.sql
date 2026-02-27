/*
  # Update All Admin Policies to Use is_admin_direct Function

  1. Problem
    - All admin policies across multiple tables query user_profiles
    - This can cause performance issues and potential recursion
    - Need to standardize on the is_admin_direct() function

  2. Solution
    - Update all admin policies to use is_admin_direct(auth.uid())
    - This bypasses RLS and prevents recursion
    - Improves query performance

  3. Tables Updated
    - assessment_attachments
    - assessment_responses
    - assessments
    - organizations
    - remediation_actions
    - section_scores

  4. Security
    - Maintains same access control logic
    - Uses security definer function to safely check admin status
*/

-- assessment_attachments
DROP POLICY IF EXISTS "Admins can view all attachments" ON assessment_attachments;
CREATE POLICY "Admins can view all attachments"
  ON assessment_attachments
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- assessment_responses
DROP POLICY IF EXISTS "Admins can manage all responses" ON assessment_responses;
CREATE POLICY "Admins can manage all responses"
  ON assessment_responses
  FOR ALL
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

-- assessments (SELECT)
DROP POLICY IF EXISTS "Admins can view all assessments" ON assessments;
CREATE POLICY "Admins can view all assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- assessments (UPDATE)
DROP POLICY IF EXISTS "Admins can update any assessment" ON assessments;
CREATE POLICY "Admins can update any assessment"
  ON assessments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

-- assessments (DELETE)
DROP POLICY IF EXISTS "Admins can delete assessments" ON assessments;
CREATE POLICY "Admins can delete assessments"
  ON assessments
  FOR DELETE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- Fix client delete policy to also use the function
DROP POLICY IF EXISTS "Clients can delete own organization assessments" ON assessments;
CREATE POLICY "Clients can delete own organization assessments"
  ON assessments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
      AND user_profiles.organization_id = assessments.organization_id
    )
  );

-- organizations (SELECT)
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
CREATE POLICY "Admins can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- organizations (UPDATE)
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
CREATE POLICY "Admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

-- organizations (DELETE)
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;
CREATE POLICY "Admins can delete organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- remediation_actions
DROP POLICY IF EXISTS "Admins can manage all remediation actions" ON remediation_actions;
CREATE POLICY "Admins can manage all remediation actions"
  ON remediation_actions
  FOR ALL
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

-- section_scores
DROP POLICY IF EXISTS "Admins can manage all section scores" ON section_scores;
CREATE POLICY "Admins can manage all section scores"
  ON section_scores
  FOR ALL
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));
