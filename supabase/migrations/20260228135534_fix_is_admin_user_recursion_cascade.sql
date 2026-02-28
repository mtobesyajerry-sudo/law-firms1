/*
  # Fix is_admin_user() Function Recursion with CASCADE

  The is_admin_user() function was causing infinite recursion because:
  1. user_profiles SELECT policy calls is_admin_user()
  2. is_admin_user() queries user_profiles table
  3. This triggers the SELECT policy again → infinite loop

  Solution: 
  - Drop function with CASCADE to remove dependent policies
  - Recreate the function without recursion using plpgsql
  - Recreate all dependent policies

  Changes:
  - Drop is_admin_user() and dependent policies with CASCADE
  - Create non-recursive version using plpgsql
  - Recreate all policies that depended on it
*/

-- Drop the old recursive function with CASCADE
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

-- Create a new non-recursive version using plpgsql
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Query user_profiles directly without triggering RLS
  -- SECURITY DEFINER runs with elevated privileges, bypassing RLS
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- Recreate user_profiles SELECT policy
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (id = auth.uid()) 
    OR is_admin_user() 
    OR ((organization_id IS NOT NULL) AND (organization_id = get_user_organization_id()))
  );

-- Recreate user_profiles INSERT policy
DROP POLICY IF EXISTS "Users can insert profile with approval or as admin" ON user_profiles;
CREATE POLICY "Users can insert profile with approval or as admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    OR (SELECT count(*) FROM user_profiles) = 0
    OR (
      auth.uid() = id 
      AND EXISTS (
        SELECT 1 
        FROM auth.users au
        JOIN law_firm_registrations lfr ON lfr.firm_email = au.email::text
        WHERE au.id = auth.uid() 
        AND lfr.registration_status = 'active'
      )
    )
  );

-- Recreate assessments policy if it exists
DROP POLICY IF EXISTS "Users with valid profiles can access assessments" ON assessments;
CREATE POLICY "Users with valid profiles can access assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    OR EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = assessments.organization_id
    )
  );

-- Recreate law_firm_registrations policies
DROP POLICY IF EXISTS "Admins can update all registrations" ON law_firm_registrations;
CREATE POLICY "Admins can update all registrations"
  ON law_firm_registrations
  FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Admins can delete registrations" ON law_firm_registrations;
CREATE POLICY "Admins can delete registrations"
  ON law_firm_registrations
  FOR DELETE
  TO authenticated
  USING (is_admin_user());
