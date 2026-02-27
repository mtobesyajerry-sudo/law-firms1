/*
  # Fix User Profiles RLS with Security Definer Functions

  ## Problem
  The SELECT policies on user_profiles cause infinite recursion because they query
  the same table in the USING clause, triggering RLS checks again.

  ## Solution
  Create SECURITY DEFINER functions that bypass RLS for role checks, similar to is_admin().
  Then use these functions in the policies to avoid recursion.

  ## Changes
  1. Create helper functions: get_user_role(), get_user_org_id()
  2. Drop problematic SELECT policies
  3. Recreate policies using the helper functions
*/

-- Create helper function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Create helper function to get user org (already exists but ensure it's correct)
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Drop the problematic SELECT policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Management can view users in organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own trial access" ON user_profiles;

-- Recreate policies using the helper functions (no recursion)
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
  );

CREATE POLICY "Management can view users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'senior_partner', 'partner')
    AND organization_id = get_user_org()
  );

-- Add comment
COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current user. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
COMMENT ON FUNCTION get_user_org() IS 'Returns the organization_id of the current user. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
