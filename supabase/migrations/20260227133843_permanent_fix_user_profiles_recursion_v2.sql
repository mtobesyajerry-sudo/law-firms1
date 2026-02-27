/*
  # Permanent Fix for User Profiles Infinite Recursion

  1. Problem
    - Policies on user_profiles call is_admin() function
    - is_admin() queries user_profiles table creating infinite loop

  2. Solution
    - Drop ALL policies using helper functions
    - Recreate using direct inline subqueries only

  3. Security
    - Admins have full access
    - Users can view own profile
    - Organization-based access enforced
*/

-- Drop ALL existing policies on user_profiles
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles based on organization" ON user_profiles;
DROP POLICY IF EXISTS "Management can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own_or_admin_or_org" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own_during_registration" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_admin" ON user_profiles;

-- SELECT: Own profile, admin sees all, or same organization
CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = user_profiles.organization_id
      AND up.organization_id IS NOT NULL
    )
  );

-- INSERT: Own profile during registration
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- INSERT: Admins can create any profile
CREATE POLICY "user_profiles_insert_admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- UPDATE: Own profile
CREATE POLICY "user_profiles_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update any profile
CREATE POLICY "user_profiles_update_admin"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- DELETE: Admins only
CREATE POLICY "user_profiles_delete_admin"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
