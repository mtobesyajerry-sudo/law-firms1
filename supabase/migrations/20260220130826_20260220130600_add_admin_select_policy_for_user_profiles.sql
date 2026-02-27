/*
  # Add Admin SELECT Policy for user_profiles

  1. Purpose
    - Create is_admin() helper function to check if current user is admin
    - Add SELECT policy allowing admins to view all user profiles
    - Fix issue where admin dashboard cannot display users

  2. Changes
    - Create is_admin() function that checks user role
    - Add "Admins can view all profiles" SELECT policy for user_profiles

  3. Security
    - Uses SECURITY DEFINER to avoid infinite recursion in RLS
    - Only allows users with role='admin' to view all profiles
    - Regular users still restricted to viewing own profile only
*/

-- Create helper function to check if user is admin (with SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Add policy for admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Add comment
COMMENT ON FUNCTION is_admin() IS 'Check if current authenticated user has admin role (used in RLS policies)';
