/*
  # Fix get_user_organization_id() Function Recursion

  Similar to is_admin_user(), the get_user_organization_id() function
  could cause recursion when called from user_profiles policies.

  Solution: Convert from SQL to plpgsql SECURITY DEFINER function

  Changes:
  - Drop and recreate get_user_organization_id() as plpgsql
  - Uses SECURITY DEFINER to bypass RLS during execution
*/

-- Drop and recreate with plpgsql
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Query directly without triggering RLS
  SELECT organization_id INTO org_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Recreate the organizations policy that uses this function
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());

-- Recreate user_profiles policy to ensure it uses the new function
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (id = auth.uid()) 
    OR is_admin_user() 
    OR ((organization_id IS NOT NULL) AND (organization_id = get_user_organization_id()))
  );
