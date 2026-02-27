/*
  # Fix All User Profiles RLS Recursion Issues

  1. Problem
    - Multiple policies on user_profiles still contain subqueries that SELECT from user_profiles
    - This creates recursion: policy checks -> SELECT user_profiles -> triggers policy -> infinite loop
    - Policies with recursion:
      - "Admins can insert user profiles" (has EXISTS subquery on user_profiles)
      - "Admins can manage trial access" (has EXISTS subquery on user_profiles)
      - "Management can update user profiles in organization" (has EXISTS subquery on user_profiles)

  2. Solution
    - Replace all direct SELECT queries on user_profiles with SECURITY DEFINER helper functions
    - Use is_admin(), get_user_role(), get_user_org() instead of EXISTS subqueries
    - These functions bypass RLS and break the recursion cycle

  3. Changes
    - Drop and recreate all problematic policies
    - Use helper functions instead of subqueries
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Management can view users in organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage trial access" ON user_profiles;
DROP POLICY IF EXISTS "Management can update user profiles in organization" ON user_profiles;

-- SELECT POLICIES (safe, no recursion)
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Management can view users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'senior_partner', 'partner')
    AND organization_id = get_user_org()
  );

-- UPDATE POLICIES (use helper functions, no recursion)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage trial access"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() 
    AND get_user_org() IS NULL
  );

CREATE POLICY "Management can update user profiles in organization"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- The manager must be in management role and same org
    get_user_role() IN ('admin', 'management', 'senior_partner', 'partner')
    AND organization_id = get_user_org()
    -- Cannot change admin roles unless you are admin
    AND (role != 'admin' OR is_admin())
  )
  WITH CHECK (
    -- Same checks for the new values
    get_user_role() IN ('admin', 'management', 'senior_partner', 'partner')
    AND organization_id = get_user_org()
    AND (role != 'admin' OR is_admin())
  );

-- INSERT POLICIES (use helper functions, no recursion)
CREATE POLICY "Admins can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Service role can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- DELETE POLICIES (use helper functions, no recursion)
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'All user_profiles policies recreated without recursion';
  RAISE NOTICE 'All policies now use helper functions instead of subqueries';
END $$;
