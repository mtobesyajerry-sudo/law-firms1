/*
  # Fix All Transaction Alerts RLS Policies

  ## Problem
  All transaction_alerts RLS policies (INSERT, UPDATE, DELETE) query user_profiles
  directly, which can cause RLS recursion issues.

  ## Solution
  Update all remaining policies to use the SECURITY DEFINER helper functions
  (is_admin() and get_user_organization_id()) to prevent recursion.

  ## Changes
  - Update INSERT policies to use helper functions
  - Update UPDATE policies to use helper functions  
  - Update DELETE policies to use helper functions
*/

-- UPDATE policies
DROP POLICY IF EXISTS "Admins can update all transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users can update own org alerts" ON transaction_alerts;

CREATE POLICY "Admins can update all transaction alerts"
  ON transaction_alerts
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can update own org alerts"
  ON transaction_alerts
  FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- INSERT policies
DROP POLICY IF EXISTS "Admins can insert all transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users can insert own org alerts" ON transaction_alerts;

CREATE POLICY "Admins can insert all transaction alerts"
  ON transaction_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Users can insert own org alerts"
  ON transaction_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- DELETE policies
DROP POLICY IF EXISTS "Admins can delete all transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users can delete own org alerts" ON transaction_alerts;

CREATE POLICY "Admins can delete all transaction alerts"
  ON transaction_alerts
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can delete own org alerts"
  ON transaction_alerts
  FOR DELETE
  TO authenticated
  USING (organization_id = get_user_organization_id());

COMMENT ON POLICY "Admins can update all transaction alerts" ON transaction_alerts IS
'Allows admins to update any transaction alert using is_admin() to prevent RLS recursion';

COMMENT ON POLICY "Users can update own org alerts" ON transaction_alerts IS
'Allows users to update alerts from their own organization using SECURITY DEFINER function';

COMMENT ON POLICY "Admins can insert all transaction alerts" ON transaction_alerts IS
'Allows admins to insert any transaction alert using is_admin() to prevent RLS recursion';

COMMENT ON POLICY "Users can insert own org alerts" ON transaction_alerts IS
'Allows users to insert alerts for their own organization using SECURITY DEFINER function';

COMMENT ON POLICY "Admins can delete all transaction alerts" ON transaction_alerts IS
'Allows admins to delete any transaction alert using is_admin() to prevent RLS recursion';

COMMENT ON POLICY "Users can delete own org alerts" ON transaction_alerts IS
'Allows users to delete alerts from their own organization using SECURITY DEFINER function';