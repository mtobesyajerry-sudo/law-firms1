/*
  # Fix Infinite Recursion in User Profiles RLS

  ## Issue
  The admin policies for user_profiles cause infinite recursion because they query
  the same table they're protecting, leading to an endless loop.

  ## Solution
  Create a security definer function that bypasses RLS to check if a user is an admin,
  then use this function in the policies.

  ## Changes
  - Create is_admin() function with SECURITY DEFINER
  - Update all admin policies to use the new function
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Create a security definer function to check if current user is admin
-- This function bypasses RLS to prevent infinite recursion
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Create policies using the security definer function
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin());
