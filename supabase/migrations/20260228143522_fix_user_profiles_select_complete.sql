/*
  # Fix User Profiles SELECT Policy Completely
  
  ## Problem
  The same-org check in the SELECT policy also causes recursion because it queries
  user_profiles to find the current user's organization.
  
  ## Solution
  Create a security definer function to get the current user's organization ID,
  then use it in a recursion-free SELECT policy.
  
  ## Changes
  1. Create function to get current user's organization (security definer)
  2. Replace SELECT policy with recursion-free version
*/

-- Drop the previous policy
DROP POLICY IF EXISTS "user_profiles_select_fixed" ON user_profiles;

-- Create security definer function to get current user's organization
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Create completely recursion-free SELECT policy
CREATE POLICY "user_profiles_select_no_recursion_final"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Users can always see their own profile
    OR 
    is_current_user_admin()  -- Admins can see all profiles
    OR 
    (
      organization_id IS NOT NULL 
      AND organization_id = get_current_user_org_id()
    )  -- Users can see profiles in their organization
  );
