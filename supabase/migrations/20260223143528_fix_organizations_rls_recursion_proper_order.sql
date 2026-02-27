/*
  # Fix Organizations RLS Recursion - Proper Order

  ## Problem
  The `get_user_organization_id()` function causes infinite recursion when used in RLS policies
  because it queries `user_profiles`, which has RLS policies that may call the same function.

  ## Solution
  1. Drop policies that depend on the function first
  2. Drop the problematic function
  3. Create a new SECURITY DEFINER function that bypasses RLS
  4. Recreate policies with the new safe function

  ## Changes
  - Drop old policies on organizations table
  - Drop and recreate `get_user_organization_id()` as a safe function
  - Recreate policies using direct queries to avoid recursion
*/

-- Step 1: Drop the old policy that depends on the function
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Step 2: Drop the old problematic function
DROP FUNCTION IF EXISTS get_user_organization_id();

-- Step 3: Create a safe function that bypasses RLS completely
CREATE OR REPLACE FUNCTION get_user_organization_id()
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

-- Step 4: Recreate the policy with the safe function
CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id = get_user_organization_id()
  );

-- Add explicit policy for management (uses direct query to avoid any confusion)
CREATE POLICY "Management can view organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_profiles 
      WHERE user_profiles.id = auth.uid()
        AND role IN ('management', 'senior_partner', 'partner', 'compliance_officer', 'staff', 'client')
    )
  );

COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the organization_id for the current user. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';
