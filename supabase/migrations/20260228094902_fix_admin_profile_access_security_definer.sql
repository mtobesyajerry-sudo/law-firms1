/*
  # Fix Admin Profile Access with Security Definer Function

  1. Problem
    - Admin user being redirected to login page after authentication
    - is_admin_user() function has infinite recursion when called from RLS policies
    - Profile cannot be loaded due to RLS blocking
  
  2. Solution
    - Create SECURITY DEFINER function that bypasses RLS
    - Ensure admin can read their own profile using id = auth.uid()
    - Fix function to avoid recursion

  3. Changes
    - Drop and recreate is_admin_user() with SECURITY DEFINER
    - Set proper search_path to prevent SQL injection
*/

-- Drop existing function
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

-- Create new SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Ensure the SELECT policy allows admin to read their own profile
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;

CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR is_admin_user() 
    OR (organization_id IS NOT NULL AND organization_id = get_user_organization_id())
  );
