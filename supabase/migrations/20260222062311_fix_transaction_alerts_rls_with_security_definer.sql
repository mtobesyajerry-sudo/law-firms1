/*
  # Fix Transaction Alerts RLS Policies to Prevent Recursion

  ## Problem
  The transaction_alerts SELECT policies query user_profiles directly in their
  USING clauses, which can cause RLS recursion issues when user_profiles also
  has RLS policies enabled.

  ## Solution
  Create SECURITY DEFINER helper functions that bypass RLS when checking
  user permissions, similar to the is_admin() function pattern.

  ## Changes
  1. Create get_user_organization_id() function with SECURITY DEFINER
  2. Update transaction_alerts SELECT policies to use the new function
  3. This prevents RLS recursion by making the function bypass RLS on user_profiles
*/

-- Create helper function to get user's organization ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id 
  FROM user_profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION get_user_organization_id() IS 
'Returns the organization_id for the current user. SECURITY DEFINER bypasses RLS to prevent recursion.';

-- Drop and recreate the SELECT policies with the new function

DROP POLICY IF EXISTS "Users can select own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Admins can select all transaction alerts" ON transaction_alerts;

-- Admin policy using is_admin() function (already SECURITY DEFINER)
CREATE POLICY "Admins can select all transaction alerts"
  ON transaction_alerts
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- User policy using the new helper function
CREATE POLICY "Users can select own org alerts"
  ON transaction_alerts
  FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

COMMENT ON POLICY "Users can select own org alerts" ON transaction_alerts IS
'Allows users to view alerts from their own organization using SECURITY DEFINER function to prevent RLS recursion';