/*
  # Fix get_user_organization_id to Handle NULL Values

  ## Problem
  The get_user_organization_id() function returns NULL when organization_id is NULL,
  causing RLS policies to fail because NULL = NULL is false in SQL.
  
  When organization_id is NULL, the user's organization ID should be their own profile ID.

  ## Solution
  Update the function to return COALESCE(organization_id, id) so it returns the
  user's profile ID when organization_id is NULL.

  ## Changes
  1. Update get_user_organization_id() function to handle NULL values
*/

-- Update helper function to handle NULL organization_id
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
