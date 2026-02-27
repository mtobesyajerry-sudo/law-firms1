/*
  # Add Admin UPDATE Policy for user_profiles

  1. Purpose
    - Allow admins to update any user profile
    - Fix issue where organization_id assignment fails during user approval
    - Enable admins to manage user accounts (subscriptions, activation, etc.)

  2. Changes
    - Add "Admins can update any profile" UPDATE policy for user_profiles

  3. Security
    - Uses is_admin() function to verify admin privileges
    - Maintains security by restricting updates to admins only
    - Regular users can still only update their own profile
*/

-- Add policy for admins to update any user profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add comment
COMMENT ON POLICY "Admins can update any profile" ON user_profiles IS 'Allows admins to update any user profile including organization assignment and subscription management';
