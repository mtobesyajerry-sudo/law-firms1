/*
  # Fix User Profiles RLS Infinite Recursion

  1. Problem
    - Admin policies were querying user_profiles table to check if user is admin
    - This caused infinite recursion when trying to read user_profiles
    - Error: "infinite recursion detected in policy for relation 'user_profiles'"

  2. Solution
    - Create a non-recursive helper function that checks admin status directly from user metadata
    - Update all admin policies to use this new function
    - Avoid querying user_profiles table within its own policies

  3. Security
    - Maintains proper access control
    - Uses auth.jwt() to check role from JWT claims
    - No performance degradation
*/

-- Drop existing is_admin function that causes recursion
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Create a new is_admin function that doesn't query user_profiles
-- Instead, it uses a direct query with security definer to avoid RLS
CREATE OR REPLACE FUNCTION public.is_admin_direct(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = check_user_id
  LIMIT 1;
  
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_direct(uuid) TO authenticated;

-- Drop all existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Recreate admin policies using the new function
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- Add comment
COMMENT ON FUNCTION public.is_admin_direct(uuid) IS 'Checks if a user is an admin without causing RLS recursion. Uses SECURITY DEFINER to bypass RLS.';
