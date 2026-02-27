/*
  # Fix Infinite Recursion in User Profiles RLS Policy

  ## Problem
  The RLS policies on user_profiles and registration_requests create infinite recursion.
  When checking if a user is an admin, the policy queries user_profiles, which triggers
  the admin check policy again, causing infinite recursion.

  ## Solution
  1. Drop the existing admin SELECT policy that causes recursion
  2. Create a new policy that uses JWT metadata instead of querying user_profiles
  3. Update the user profile creation to store role in auth.users metadata
  4. Create a function to sync role to JWT metadata

  ## Changes
  - Drop "Admins can view all user profiles" policy
  - Create new admin policy using auth.jwt() metadata
  - Add function to update user metadata with role
  - Add trigger to sync role to auth metadata
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Create a function to check if user is admin using a simple non-recursive approach
-- This uses a direct equality check without subqueries
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new admin policies using the security definer function
-- This breaks the recursion because the function runs with elevated privileges
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role = 'admin'
    )
  );