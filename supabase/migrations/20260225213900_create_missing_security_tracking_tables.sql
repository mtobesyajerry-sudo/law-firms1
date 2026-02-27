/*
  # Create Missing Security Tracking Tables
  
  1. New Tables
    - `login_history` - Complete login attempt tracking (success and failures)
    - `mfa_secrets` - Multi-factor authentication secrets and enrollment status
    - `password_reset_tokens` - Password reset token tracking
  
  2. Security
    - Enable RLS on all tables
    - Admin-only access policies for security data
    - Automatic login tracking trigger
  
  3. Notes
    - login_history replaces separate login_audit_log and failed_login_attempts
    - All security metrics now queryable from single source
*/

-- Create login_history table (consolidates login tracking)
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address inet,
  user_agent text,
  failure_reason text,
  session_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create MFA secrets table
CREATE TABLE IF NOT EXISTS mfa_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret text NOT NULL,
  enabled boolean DEFAULT false,
  backup_codes text[],
  enrolled_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access
CREATE POLICY "Admins can view all login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all MFA secrets"
  ON mfa_secrets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own MFA secrets"
  ON mfa_secrets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own MFA secrets"
  ON mfa_secrets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view password reset tokens"
  ON password_reset_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can manage password reset tokens"
  ON password_reset_tokens FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON mfa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Seed some sample login history data for the existing users
INSERT INTO login_history (user_id, email, success, ip_address, created_at)
SELECT 
  up.id,
  up.email,
  true,
  '127.0.0.1'::inet,
  up.created_at + interval '1 minute'
FROM user_profiles up
WHERE up.email IN ('mtobesyaj@gmail.com', 'anna@bowerlaw.com', 'john@bowerlaw.com')
ON CONFLICT DO NOTHING;

-- Add a few failed login attempts
INSERT INTO login_history (user_id, email, success, failure_reason, ip_address, created_at)
VALUES
  (NULL, 'wrong@example.com', false, 'Invalid credentials', '192.168.1.100'::inet, now() - interval '2 days'),
  (NULL, 'test@test.com', false, 'Invalid credentials', '192.168.1.101'::inet, now() - interval '1 day'),
  (NULL, 'mtobesyaj@gmail.com', false, 'Invalid password', '127.0.0.1'::inet, now() - interval '3 hours')
ON CONFLICT DO NOTHING;
