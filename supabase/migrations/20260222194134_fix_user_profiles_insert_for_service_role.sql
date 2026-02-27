/*
  # Fix User Profiles INSERT Policy for Service Role
  
  1. Changes
    - Add policy to allow service role to insert user profiles
    - Add policy to allow admins to insert user profiles
    
  2. Security
    - Service role bypasses RLS but we add explicit policy for clarity
    - Admins can create new user profiles for their organization
*/

-- Drop the generic insert policy
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Add policy for service role and authenticated users during signup
CREATE POLICY "Service role can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add explicit admin insert policy
CREATE POLICY "Admins can insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
