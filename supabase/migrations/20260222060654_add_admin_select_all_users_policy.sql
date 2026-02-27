/*
  # Add Admin SELECT Policy for User Profiles

  ## Problem
  Admin dashboard can only see one user (the logged-in admin) because there's no
  policy allowing admins to view all user profiles. The only SELECT policy is
  "Users can view own profile" which restricts to auth.uid() = id.

  ## Solution
  Add a SELECT policy that allows admins to view all user profiles using the
  existing is_admin() function.

  ## Changes
  - Add "Admins can view all profiles" SELECT policy
  - Uses SECURITY DEFINER is_admin() function to avoid RLS recursion
  - Allows admins to see full user list in admin dashboard
*/

-- Drop existing admin select policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Create admin SELECT policy to view all user profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

COMMENT ON POLICY "Admins can view all profiles" ON user_profiles IS 
'Allows admin users to view all user profiles in the system for user management purposes';