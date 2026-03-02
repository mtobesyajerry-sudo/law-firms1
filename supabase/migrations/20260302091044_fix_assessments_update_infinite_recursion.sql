/*
  # Fix Assessments UPDATE Infinite Recursion

  1. Changes
    - Create helper function to check if user can update assessment
    - Replace recursive UPDATE policies with helper function
    - Use SECURITY DEFINER to bypass RLS recursion

  2. Security
    - Helper function uses SECURITY DEFINER to avoid RLS recursion
    - Maintains same access control logic
*/

-- Create helper function to check if user can update assessment
CREATE OR REPLACE FUNCTION can_update_assessment(assessment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  assessment_org_id uuid;
BEGIN
  -- Get user role and org
  SELECT role, organization_id INTO user_role, user_org_id
  FROM user_profiles
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;

  -- Admin can update anything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get assessment org
  SELECT organization_id INTO assessment_org_id
  FROM assessments
  WHERE id = assessment_id
  LIMIT 1;

  -- Staff and lawyers can update assessments in their org
  IF user_role IN ('staff', 'lawyer') AND user_org_id = assessment_org_id THEN
    RETURN true;
  END IF;

  -- Compliance officers can update assessments in their org
  IF user_role IN ('compliance_officer', 'mlro') AND user_org_id = assessment_org_id THEN
    RETURN true;
  END IF;

  -- Clients can update assessments in their org
  IF user_role = 'client' AND user_org_id = assessment_org_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Drop existing UPDATE policies that cause recursion
DROP POLICY IF EXISTS "Clients can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;

-- Create new UPDATE policy using helper function
CREATE POLICY "Users can update assessments in their org"
  ON assessments
  FOR UPDATE
  TO authenticated
  USING (can_update_assessment(id))
  WITH CHECK (can_update_assessment(id));
