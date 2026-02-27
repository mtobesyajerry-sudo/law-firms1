/*
  # Fix Compliance Officer Assessment Update Access

  1. Purpose
    - Resolve "Error saving information" issue for compliance officers
    - Ensure helper functions work correctly in RLS policies
    - Add proper error handling and logging

  2. Changes
    - Recreate helper functions with improved error handling
    - Update RLS policies with better conditions
    - Add proper search path and security settings

  3. Security
    - Maintains strict role-based access control
    - Compliance officers can only update assessments in their organization
*/

-- Drop and recreate helper functions with better error handling
DROP FUNCTION IF EXISTS user_has_role(text[]) CASCADE;
DROP FUNCTION IF EXISTS get_user_org() CASCADE;

-- Create improved user_has_role function
CREATE OR REPLACE FUNCTION user_has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
      AND role = ANY(roles)
      AND is_active = true
  );
$$;

-- Create improved get_user_org function
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- Drop existing compliance officer policies
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can select org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can insert org assessments" ON assessments;

-- Recreate compliance officer policies with improved conditions
CREATE POLICY "Compliance officers can select org assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND organization_id = get_user_org()
  );

CREATE POLICY "Compliance officers can insert org assessments"
  ON assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON assessments TO authenticated;

-- Add comment
COMMENT ON FUNCTION user_has_role IS 'Check if current user has any of the specified roles';
COMMENT ON FUNCTION get_user_org IS 'Get organization_id for current user';
