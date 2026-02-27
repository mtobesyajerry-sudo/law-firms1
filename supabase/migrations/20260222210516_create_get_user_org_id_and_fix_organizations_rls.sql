/*
  # Create Helper Function and Fix Organizations RLS
  
  This migration creates a SECURITY DEFINER helper function to get a user's
  organization ID without triggering RLS recursion, then updates the
  organizations table RLS policy to use it.
  
  1. New Functions
    - get_user_organization_id(): Returns user's org ID, bypasses RLS
  
  2. Policy Changes
    - Drop recursive "Users can view their organization" policy
    - Create new policy using SECURITY DEFINER function
    - Allows all authenticated users to view their organization
  
  3. Security
    - Users can only see their own organization
    - Function is SECURITY DEFINER so it bypasses RLS safely
    - Admin can still see all organizations (separate policy exists)
*/

-- Create helper function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(organization_id, id) 
  FROM user_profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION get_user_organization_id() IS 
'Returns the organization_id for the current user, or their own ID if organization_id is NULL. SECURITY DEFINER bypasses RLS to prevent recursion.';

-- Drop the policy that causes recursion
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Create new policy using SECURITY DEFINER function
CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());

COMMENT ON POLICY "Users can view their organization" ON organizations IS 
  'Allows users to view their organization. Uses SECURITY DEFINER function to avoid RLS recursion.';
