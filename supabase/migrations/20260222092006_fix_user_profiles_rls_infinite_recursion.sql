/*
  # Fix Infinite Recursion in user_profiles RLS Policies

  ## Problem
  The admin policies for user_profiles table create infinite recursion because they
  query user_profiles to check if a user is an admin, which triggers the same policy
  again, creating an infinite loop.

  ## Solution
  1. Create an is_admin() function with SECURITY DEFINER that bypasses RLS
  2. Drop all existing admin policies that cause recursion
  3. Recreate admin policies using the is_admin() function

  ## Changes
  1. Create is_admin() function with SECURITY DEFINER
  2. Drop problematic admin policies
  3. Recreate admin policies using the new function
  4. Keep user's own profile policies (no recursion issue)

  ## Security
  - is_admin() function uses SECURITY DEFINER to bypass RLS when checking role
  - Function only returns boolean, no sensitive data exposed
  - Policies still enforce authentication requirement
*/

-- Create is_admin function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Recreate admin policies using the is_admin() function
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add comment for documentation
COMMENT ON FUNCTION is_admin() IS 'Returns true if the current user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';
