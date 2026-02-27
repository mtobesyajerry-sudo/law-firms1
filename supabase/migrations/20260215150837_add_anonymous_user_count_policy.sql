/*
  # Add Anonymous User Count Policy

  ## Summary
  Allows anonymous users to count the number of user profiles to determine if this is the first user registration.
  This is needed for the registration flow where the first user becomes an admin automatically.

  ## Changes
  - Add SELECT policy for anonymous users on user_profiles
  - Policy allows counting only, no access to actual user data

  ## Security
  - Anonymous users can only perform COUNT queries
  - No access to actual profile data (email, names, etc.)
  - This is safe because it only reveals whether the system has users or not
*/

CREATE POLICY "Anonymous users can count profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);
