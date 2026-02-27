/*
  # Fix RLS Infinite Recursion with Security Definer Function

  ## Problem
  Querying user_profiles within a policy on user_profiles causes infinite recursion.

  ## Solution
  Create a SECURITY DEFINER function that bypasses RLS to check admin status.
  This function runs with the privileges of the function owner (superuser),
  so it can read user_profiles without triggering RLS policies.

  ## Changes
  - Create is_admin() function that bypasses RLS
  - Update all policies to use this function instead of subqueries
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
DROP FUNCTION IF EXISTS is_admin();

-- Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles
    WHERE id = user_id
    AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- Recreate policies using the security definer function
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Update registration_requests policies to use the same function
DROP POLICY IF EXISTS "Admins can view all registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON registration_requests;

CREATE POLICY "Admins can view all registration requests"
  ON registration_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update registration requests"
  ON registration_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());