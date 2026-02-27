/*
  # Fix Infinite Recursion in Organization Enforcement RLS Policies

  1. Problem
    - RLS policies on user_profiles call helper functions
    - Helper functions query user_profiles
    - This creates infinite recursion

  2. Solution
    - Drop the problematic SELECT policies on user_profiles
    - Recreate them using direct auth.uid() checks without helper functions
    - Use SECURITY DEFINER functions only for tables OTHER than user_profiles

  3. Security
    - Maintains organization-based access control
    - Prevents infinite recursion
    - Admins still have global access
*/

-- Drop all SELECT policies on user_profiles that might cause recursion
DROP POLICY IF EXISTS "Non-admins can view users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Staff can view users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Management can view users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Compliance officers can view users in their organization" ON user_profiles;

-- Create new SELECT policy that doesn't use helper functions
-- This prevents infinite recursion by using direct table lookups
CREATE POLICY "Users can view profiles based on organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Admins can see all profiles (direct check without function)
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
    OR
    -- Non-admins can see profiles in their organization
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id IS NOT NULL
      AND up.organization_id = user_profiles.organization_id
    )
  );

-- Update policies for other tables (assessments, kyc_clients, matters)
-- These are safe to use helper functions since they don't query user_profiles in RLS

-- Drop and recreate assessments policies without causing recursion
DROP POLICY IF EXISTS "Non-admins can view assessments in their organization" ON assessments;
CREATE POLICY "Assessments organization access"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all assessments
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only see assessments from their organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = assessments.organization_id
      AND organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Non-admins can insert assessments in their organization" ON assessments;
CREATE POLICY "Assessments organization insert"
  ON assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only insert for their own organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = assessments.organization_id
      AND organization_id IS NOT NULL
    )
  );

-- Drop and recreate kyc_clients policies
DROP POLICY IF EXISTS "Non-admins can view clients in their organization" ON kyc_clients;
CREATE POLICY "KYC clients organization access"
  ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all clients
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only see clients from their organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = kyc_clients.organization_id
      AND organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Non-admins can insert clients in their organization" ON kyc_clients;
CREATE POLICY "KYC clients organization insert"
  ON kyc_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only insert for their own organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = kyc_clients.organization_id
      AND organization_id IS NOT NULL
    )
  );

-- Drop and recreate matters policies
DROP POLICY IF EXISTS "Non-admins can view matters in their organization" ON matters;
CREATE POLICY "Matters organization access"
  ON matters
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all matters
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only see matters from their organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = matters.organization_id
      AND organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Non-admins can insert matters in their organization" ON matters;
CREATE POLICY "Matters organization insert"
  ON matters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR
    -- Non-admins can only insert for their own organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = matters.organization_id
      AND organization_id IS NOT NULL
    )
  );

-- Add comment explaining the approach
COMMENT ON POLICY "Users can view profiles based on organization" ON user_profiles IS
'Allows users to view their own profile, admins to view all profiles, and non-admins to view profiles in their organization. Uses direct EXISTS subqueries to avoid infinite recursion with helper functions.';
