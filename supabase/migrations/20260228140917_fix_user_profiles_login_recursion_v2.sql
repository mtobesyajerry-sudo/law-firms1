/*
  # Fix User Profiles Login Recursion Issue
  
  1. Problem
    - During login, the SELECT policy on user_profiles calls get_user_organization_id()
    - get_user_organization_id() queries user_profiles
    - This triggers the SELECT policy again, causing infinite recursion
    - Results in "Database error querying schema" during authentication
  
  2. Solution
    - Simplify the SELECT policy to avoid function calls that query user_profiles
    - Allow users to see their own profile and admin to see all
    - For organization-based access, use a direct subquery instead of function call
  
  3. Changes
    - Drop existing SELECT policy
    - Create new policy that doesn't cause recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_no_recursion" ON user_profiles;

-- Create a simplified SELECT policy that avoids recursion
CREATE POLICY "user_profiles_select_no_recursion"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- Admins can see all profiles (direct check without function)
    EXISTS (
      SELECT 1 FROM user_profiles up_admin
      WHERE up_admin.id = auth.uid()
      AND up_admin.role = 'admin'
      LIMIT 1
    )
    OR
    -- Users can see other profiles in their organization (direct subquery)
    (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles up_same_org
        WHERE up_same_org.id = auth.uid()
        AND up_same_org.organization_id = user_profiles.organization_id
        LIMIT 1
      )
    )
  );
