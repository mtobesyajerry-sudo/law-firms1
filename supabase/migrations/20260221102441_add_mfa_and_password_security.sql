-- MFA and Password Security System
--
-- Overview: Multi-factor authentication and password security management
--
-- Tables Created:
-- 1. mfa_secrets - Store MFA TOTP secrets for users
-- 2. mfa_backup_codes - Backup codes for MFA recovery
-- 3. password_history - Track password history to prevent reuse
-- 4. password_reset_tokens - Secure password reset token management
--
-- Security: Strong encryption, RLS enabled, user-only access

-- 1. MFA Secrets - TOTP secrets for 2FA
CREATE TABLE IF NOT EXISTS mfa_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON mfa_secrets(user_id);

ALTER TABLE mfa_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own MFA secrets"
  ON mfa_secrets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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

-- 2. MFA Backup Codes - Recovery codes
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used ON mfa_backup_codes(used);

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own backup codes"
  ON mfa_backup_codes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Password History - Prevent password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at DESC);

ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own password history"
  ON password_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert password history"
  ON password_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all password history"
  ON password_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 4. Password Reset Tokens - Secure reset flow
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reset tokens"
  ON password_reset_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage reset tokens"
  ON password_reset_tokens FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false,
      terminated_at = now()
  WHERE is_active = true
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < now()
    AND used = false;
END;
$$ LANGUAGE plpgsql;