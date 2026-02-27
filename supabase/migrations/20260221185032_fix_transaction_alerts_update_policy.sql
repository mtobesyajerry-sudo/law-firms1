/*
  # Fix Transaction Alerts Update Policy

  1. Issue
    - UPDATE operations failing due to missing WITH CHECK clause
    - FOR ALL policies need proper WITH CHECK for UPDATE operations

  2. Changes
    - Replace FOR ALL policies with separate SELECT, INSERT, UPDATE, DELETE policies
    - Add proper WITH CHECK clauses for UPDATE operations
    - Maintain organization-level isolation

  3. Security
    - Users can only update alerts in their organization
    - Admins can update all alerts
    - Proper USING and WITH CHECK clauses prevent unauthorized modifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Admins can manage all transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users view own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users manage own org alerts" ON transaction_alerts;

-- Admin policies - separate by operation
CREATE POLICY "Admins can select all transaction alerts"
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

CREATE POLICY "Admins can insert all transaction alerts"
  ON transaction_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all transaction alerts"
  ON transaction_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all transaction alerts"
  ON transaction_alerts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- User policies - separate by operation
CREATE POLICY "Users can select own org alerts"
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

CREATE POLICY "Users can insert own org alerts"
  ON transaction_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org alerts"
  ON transaction_alerts
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org alerts"
  ON transaction_alerts
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );
