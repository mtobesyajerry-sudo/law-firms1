/*
  # Add Admin Access to Transaction Alerts

  1. Changes
    - Add admin policies for transaction_alerts table
    - Allow admins to view all transaction alerts across all organizations
    - Allow admins to manage all transaction alerts

  2. Security
    - Policies use is_admin() function to verify admin role
    - Maintains organization-level isolation for non-admin users
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users view own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users manage own org alerts" ON transaction_alerts;

-- Admin can view all transaction alerts
CREATE POLICY "Admins can view all transaction alerts"
  ON transaction_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admin can manage all transaction alerts
CREATE POLICY "Admins can manage all transaction alerts"
  ON transaction_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Regular users can view alerts in their organization
CREATE POLICY "Users view own org alerts"
  ON transaction_alerts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Regular users can manage alerts in their organization
CREATE POLICY "Users manage own org alerts"
  ON transaction_alerts
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );
