/*
  # Fix Admin Profile Loading - Critical Bug
  
  ## Problem
  The SELECT policy on user_profiles causes infinite recursion when an admin tries to load their profile.
  The policy checks if the user is an admin by querying user_profiles, which triggers the policy again.
  
  ## Solution
  Create a security definer function that bypasses RLS to check if a user is an admin,
  then update the SELECT policy to use this function.
  
  ## Changes
  1. Drop existing recursive SELECT policy
  2. Create security definer function to check admin status
  3. Create new SELECT policy using the security definer function
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "user_profiles_select_no_recursion" ON user_profiles;

-- Create a security definer function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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

-- Create new SELECT policy without recursion
CREATE POLICY "user_profiles_select_fixed"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Users can see their own profile
    OR 
    is_current_user_admin()  -- Admins can see all profiles (uses security definer)
    OR 
    (
      organization_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM user_profiles up_same_org 
        WHERE up_same_org.id = auth.uid() 
        AND up_same_org.organization_id = user_profiles.organization_id
        LIMIT 1
      )
    )  -- Users in same org can see each other
  );
