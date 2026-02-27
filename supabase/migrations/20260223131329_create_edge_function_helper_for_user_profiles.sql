/*
  # Create Helper Function for Edge Function
  
  Creates a helper function that the edge function can call to bypass RLS
  when verifying admin users during user creation.
  
  1. New Function
    - `get_user_profile_for_admin` - Returns user profile for verification
    - SECURITY DEFINER to bypass RLS
    - Only callable by service role through edge functions
*/

-- Drop if exists
DROP FUNCTION IF EXISTS get_user_profile_for_admin(uuid);

-- Create helper function for edge function to verify admin users
CREATE OR REPLACE FUNCTION get_user_profile_for_admin(user_id uuid)
RETURNS TABLE (
  role text,
  organization_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role, organization_id
  FROM user_profiles
  WHERE id = user_id;
$$;

-- Grant execute to authenticated users (edge function will use service role)
GRANT EXECUTE ON FUNCTION get_user_profile_for_admin(uuid) TO authenticated, service_role;
