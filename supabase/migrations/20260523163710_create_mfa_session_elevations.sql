/*
  # MFA Session Elevations Table

  Short-lived tokens issued by verify-mfa-backup-code Edge Function.
  When a user authenticates with a backup code (which bypasses the Supabase TOTP
  verify path), the Edge Function issues a 5-minute elevation token. The client
  reads this to confirm backup-code verification succeeded for the current login.

  1. New Table
    - `mfa_session_elevations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users, cascade delete)
      - `token` (uuid, unique — the one-time elevation token)
      - `consumed_at` (timestamptz, null until the client redeems it)
      - `expires_at` (timestamptz — 5 min window)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Owner SELECT only
    - Owner UPDATE only (mark consumed)
    - Service role full access (Edge Function writes)
    - No INSERT for authenticated (only service_role writes tokens)
    - No DELETE policy

  3. Cleanup
    - pg_cron job to purge expired/consumed elevations older than 1 hour
*/

CREATE TABLE IF NOT EXISTS mfa_session_elevations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_elevations_user_token
  ON mfa_session_elevations(user_id, token)
  WHERE consumed_at IS NULL;

ALTER TABLE mfa_session_elevations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfa_elevations_own_select"
  ON mfa_session_elevations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "mfa_elevations_own_update"
  ON mfa_session_elevations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mfa_elevations_service_role_all"
  ON mfa_session_elevations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Purge expired elevation tokens every hour
SELECT cron.schedule(
  'cleanup_mfa_elevations',
  '0 * * * *',
  $$DELETE FROM mfa_session_elevations WHERE expires_at < NOW() - INTERVAL '1 hour';$$
);
