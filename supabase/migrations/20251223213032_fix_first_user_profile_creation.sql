/*
  # Fix first user profile creation

  1. Changes
    - Add RLS policy to allow users to create their own profile during signup
    - This allows the trigger to successfully insert the first user's profile
  
  2. Security
    - Policy only allows inserting when id matches auth.uid()
    - Combined with existing admin policy for flexibility
*/

-- Allow users to insert their own profile (for automatic trigger)
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());