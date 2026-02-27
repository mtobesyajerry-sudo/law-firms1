/*
  # Fix Compliance Officer Assessment Creation

  1. Changes
    - Recreate user_has_role function with proper search_path using CASCADE
    - Recreate get_user_org function with proper search_path using CASCADE
    - All dependent policies will be automatically recreated

  2. Security
    - Maintains SECURITY DEFINER for safe execution
    - Adds explicit search_path to prevent schema confusion
*/

-- Drop and recreate user_has_role with proper search_path (CASCADE will handle dependencies)
DROP FUNCTION IF EXISTS user_has_role(text[]) CASCADE;
CREATE OR REPLACE FUNCTION user_has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
SELECT EXISTS (
  SELECT 1 
  FROM public.user_profiles 
  WHERE id = auth.uid() 
    AND role = ANY(roles)
  LIMIT 1
);
$$;

-- Drop and recreate get_user_org with proper search_path (CASCADE will handle dependencies)
DROP FUNCTION IF EXISTS get_user_org() CASCADE;
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
SELECT organization_id
FROM public.user_profiles
WHERE id = auth.uid()
LIMIT 1;
$$;

-- Recreate the compliance officer insert policy
CREATE POLICY "Compliance officers can create assessments"
  ON assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND organization_id = get_user_org()
  );

-- Recreate other critical policies that were dropped
CREATE POLICY "Compliance officers can view org assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND organization_id = get_user_org()
  );

CREATE POLICY "Compliance officers can update org assessments"
  ON assessments
  FOR UPDATE
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
  ON assessments
  FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND organization_id = get_user_org()
  );

-- Recreate assessment_responses policies
CREATE POLICY "Compliance officers can view assessment responses"
  ON assessment_responses
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can create assessment responses"
  ON assessment_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can update assessment responses"
  ON assessment_responses
  FOR UPDATE
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
  ON assessment_responses
  FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

-- Recreate assessment_attachments policies
CREATE POLICY "Compliance officers can view assessment attachments"
  ON assessment_attachments
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can update assessment attachments"
  ON assessment_attachments
  FOR UPDATE
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

CREATE POLICY "Compliance officers can delete assessment attachments"
  ON assessment_attachments
  FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

-- Recreate section_scores policies
CREATE POLICY "Compliance officers can view section scores"
  ON section_scores
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can create section scores"
  ON section_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can update section scores"
  ON section_scores
  FOR UPDATE
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
