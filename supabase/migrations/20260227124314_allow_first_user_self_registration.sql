/*
  # Allow First User Self-Registration

  1. Problem
    - First user needs to create their own profile during registration
    - Current policies only allow admins to insert profiles
    - The overly-permissive "Service role can insert" policy is a security risk
  
  2. Solution
    - Remove the dangerous "Service role can insert" policy
    - Add a specific policy for users to insert their OWN profile ONLY
    - This maintains security while enabling first user registration
  
  3. Security
    - Users can only insert a profile with their own auth.uid()
    - This prevents users from creating profiles for other users
    - Admin and edge function access remains intact
*/

-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert user profiles" ON user_profiles;

-- Add policy for users to insert their OWN profile only
CREATE POLICY "Users can insert own profile during registration"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add comment
COMMENT ON POLICY "Users can insert own profile during registration" ON user_profiles IS 'Allows users to create their own profile during first-time registration. User can only insert profile with their own auth.uid().';
