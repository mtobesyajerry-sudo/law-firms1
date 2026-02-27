/*
  # Emergency Fix: User Profiles Infinite Recursion
  
  This migration fixes the infinite recursion error in user_profiles RLS policies.
  
  ## Changes
  1. Drop all existing user_profiles policies
  2. Create SECURITY DEFINER helper functions to check permissions
  3. Recreate policies using the helper functions (no subqueries)
  
  ## Security
  - Helper functions bypass RLS using SECURITY DEFINER
  - Policies use these functions instead of subqueries
  - This breaks the recursion cycle
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin" ON user_profiles;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;

-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Create helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role 
  FROM user_profiles 
  WHERE id = auth.uid();
$$;

-- Create helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM user_profiles 
  WHERE id = auth.uid();
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

-- Recreate policies using helper functions (no recursion)

-- SELECT: Users can see their own profile, admins see all, org members see each other
CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR is_admin_user()
    OR (organization_id IS NOT NULL AND organization_id = get_user_organization_id())
  );

-- INSERT: Users can insert their own profile, admins can insert any
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_insert_admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- UPDATE: Users can update their own profile, admins can update any
CREATE POLICY "user_profiles_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_update_admin"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- DELETE: Only admins can delete
CREATE POLICY "user_profiles_delete_admin"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin_user());
