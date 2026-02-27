/*
  # Fix Admin Access to User Profiles

  ## Issue
  Admin users cannot view all user profiles because RLS policies only allow users to view their own profile.

  ## Solution
  Add a policy that allows admin users to SELECT all user profiles for the admin dashboard.

  ## Changes
  - Add policy "Admins can view all user profiles"
*/

-- Drop any existing admin policies that might conflict
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Create policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Create policy for admins to delete profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );
