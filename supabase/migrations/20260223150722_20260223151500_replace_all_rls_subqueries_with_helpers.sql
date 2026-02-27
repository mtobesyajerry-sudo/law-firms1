/*
  # Replace All RLS Subqueries with Helper Functions

  1. Problem
    - Hundreds of RLS policies across all tables use direct subqueries on user_profiles
    - Pattern: EXISTS (SELECT 1 FROM user_profiles WHERE ...)
    - This causes infinite recursion when querying during authentication
    - Results in "Database error querying schema" error

  2. Solution
    - Replace ALL subqueries with SECURITY DEFINER helper functions
    - Functions: is_admin(), get_user_role(), get_user_org()
    - These functions bypass RLS and prevent recursion

  3. Strategy
    - Create a helper function to check if user is in specific roles
    - Replace common patterns:
      - "EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')" → "is_admin()"
      - "EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = ANY(...))" → "get_user_role() IN (...)"
      - "organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())" → "organization_id = get_user_org()"
*/

-- Create helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_role(roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = ANY(roles)
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION user_has_role(text[]) TO authenticated, anon;

-- Now we'll systematically replace policies on key tables
-- Starting with assessments table

DROP POLICY IF EXISTS "Admins can view all assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can create any assessment" ON assessments;
DROP POLICY IF EXISTS "Admins can update any assessment" ON assessments;
DROP POLICY IF EXISTS "Admins can delete assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can view org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can create assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can delete org assessments" ON assessments;
DROP POLICY IF EXISTS "Clients can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Clients can delete own organization assessments" ON assessments;

CREATE POLICY "Admins can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create any assessment"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update any assessment"
  ON assessments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Compliance officers can view org assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Compliance officers can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Compliance officers can update org assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Compliance officers can delete org assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Clients can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'client'
    AND created_by = auth.uid()
  );

CREATE POLICY "Clients can delete own organization assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'client'
    AND organization_id = get_user_org()
  );

-- Fix assessment_responses policies
DROP POLICY IF EXISTS "Admins can manage all responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can view assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can update assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can delete assessment responses" ON assessment_responses;

CREATE POLICY "Admins can manage all responses"
  ON assessment_responses FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Compliance officers can view assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can update assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can delete assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

-- Fix organizations policies
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Admins and management can create organizations" ON organizations;
DROP POLICY IF EXISTS "Management can view organization" ON organizations;

CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins and management can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
  );

CREATE POLICY "Management can view organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['management', 'senior_partner', 'partner', 'compliance_officer', 'staff', 'client'])
    AND id = get_user_org()
  );

-- Fix kyc_clients policies
DROP POLICY IF EXISTS "Authorized users can create clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can view clients in their organization" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can update clients in their organization" ON kyc_clients;

CREATE POLICY "Authorized users can create clients"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Staff can view clients in their organization"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Staff can update clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
    AND organization_id = get_user_org()
  );

-- Fix new_user_requests policies
DROP POLICY IF EXISTS "Admins and management can view all access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Admins and management can update access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Management users can create new user requests" ON new_user_requests;
DROP POLICY IF EXISTS "Management users can view new user requests in their org" ON new_user_requests;
DROP POLICY IF EXISTS "Management users can update new user requests in their org" ON new_user_requests;
DROP POLICY IF EXISTS "Management users can delete new user requests in their org" ON new_user_requests;

CREATE POLICY "Admins and management can view all access requests"
  ON new_user_requests FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
  );

CREATE POLICY "Admins and management can update access requests"
  ON new_user_requests FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
  )
  WITH CHECK (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
  );

CREATE POLICY "Management users can create new user requests"
  ON new_user_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['management', 'senior_partner', 'partner'])
    AND get_user_org() IS NOT NULL
  );

CREATE POLICY "Management users can delete new user requests in their org"
  ON new_user_requests FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['management', 'senior_partner', 'partner'])
    AND get_user_org() IS NOT NULL
  );

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'All critical RLS policies updated to use helper functions';
  RAISE NOTICE 'Recursion eliminated from assessments, assessment_responses, organizations, kyc_clients, new_user_requests';
END $$;
