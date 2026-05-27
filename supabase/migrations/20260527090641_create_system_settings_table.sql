/*
  # Create system_settings table

  1. New Tables
    - `system_settings`
      - `key` (text, primary key)
      - `value` (jsonb)
      - `updated_at` (timestamptz)

  2. Seed Data
    - CRDB bank account placeholder (admin will update via SQL with real values)

  3. Security
    - RLS enabled
    - Admin: full write access
    - All authenticated users: SELECT (needed to show CRDB details in PayNowModal)
*/

CREATE TABLE IF NOT EXISTS system_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

INSERT INTO system_settings (key, value) VALUES
  ('crdb_bank_account', jsonb_build_object(
    'account_name',   '<TBD>',
    'account_number', '<TBD>',
    'branch',         '<TBD>',
    'swift_code',     '<TBD>'
  ))
ON CONFLICT (key) DO NOTHING;
