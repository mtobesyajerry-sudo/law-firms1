/*
  # Add Admin Access to Monitoring Data

  1. Changes
    - Add admin SELECT policies for screening_results
    - Add admin SELECT policies for transaction_alerts
    - Add admin SELECT policies for transactions
  
  2. Security
    - Admins can view all monitoring data across all organizations
    - Non-admin access remains unchanged (organization-scoped)
*/

-- Add admin access to screening_results
CREATE POLICY "Admins can view all screening results"
  ON screening_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add admin access to transaction_alerts
CREATE POLICY "Admins can view all transaction alerts"
  ON transaction_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add admin access to transactions
CREATE POLICY "Admins can view all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
