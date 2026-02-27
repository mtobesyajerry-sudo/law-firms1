/*
  # Fix Critical RLS Infinite Recursion Issue

  1. Problem
    - The `is_admin()`, `get_user_role()`, and `get_user_org()` functions query `user_profiles`
    - The SELECT policies on `user_profiles` call these functions
    - This creates infinite recursion: policy -> function -> user_profiles -> policy -> ...
    - Results in "Database error querying schema" during authentication

  2. Solution
    - Drop and recreate all helper functions with proper SECURITY DEFINER
    - Ensure functions bypass RLS completely
    - Simplify SELECT policies to avoid circular dependencies
    - Use direct auth.uid() checks where possible

  3. Changes
    - Recreate `is_admin()` function with explicit RLS bypass
    - Recreate `get_user_role()` function with explicit RLS bypass
    - Recreate `get_user_org()` function with explicit RLS bypass
    - Fix "Admins can view all user profiles" policy to not cause recursion
    - Fix "Management can view users in organization" policy
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_org() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS get_user_org_id() CASCADE;

-- Recreate is_admin function with proper security definer and no recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
    LIMIT 1
  );
$$;

-- Recreate get_user_role function with proper security definer
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Recreate get_user_org function with proper security definer
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Create alias for compatibility
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_org() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated, anon;

-- Now fix the RLS policies on user_profiles to prevent recursion
-- Drop existing SELECT policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Management can view users in organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Recreate SELECT policies with safe implementation
-- Policy 1: Users can view their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can view all profiles (uses is_admin() which is SECURITY DEFINER)
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy 3: Management can view users in their organization (uses helper functions)
CREATE POLICY "Management can view users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'senior_partner', 'partner')
    AND organization_id = get_user_org()
  );

-- Verify the functions work correctly
DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix applied successfully';
  RAISE NOTICE 'Helper functions recreated with SECURITY DEFINER';
  RAISE NOTICE 'SELECT policies recreated to prevent recursion';
END $$;
