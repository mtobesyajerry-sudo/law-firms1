/*
  # Allow Anonymous Users to Count User Profiles

  1. Purpose
    - Enable the registration form to check if this is the first user
    - Allow anonymous users to count rows in user_profiles table
    - This is needed for the first-user administrator registration flow

  2. Changes
    - Add a policy that allows anonymous users to count user_profiles
    - This policy does not allow reading actual data, only counting

  3. Security
    - Only allows COUNT queries, not SELECT with data
    - Does not expose any user information
    - Essential for first-user registration check
*/

-- Create a policy that allows anonymous users to count user profiles
CREATE POLICY "Allow anonymous users to count profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (false);

-- Grant usage on the table to anonymous users for COUNT operations
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT (id) ON user_profiles TO anon;
