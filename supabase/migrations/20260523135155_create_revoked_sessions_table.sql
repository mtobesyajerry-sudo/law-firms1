/*
  # Create revoked_sessions table for real token revocation

  ## Purpose
  Enables admin session termination that actually works. When an admin revokes
  a session, a row is inserted here. Every authenticated Edge Function checks
  this table after JWT verification. Even a cryptographically valid JWT is
  rejected if its user/session appears here.

  ## New Tables
  - `revoked_sessions`
    - `id` (uuid, pk)
    - `user_id` (uuid, FK auth.users)
    - `jti` (text, nullable) — JWT ID claim if present
    - `session_id` (text, nullable) — Supabase auth.sessions.id
    - `revoked_at` (timestamptz)
    - `revoked_by` (uuid, FK auth.users, nullable) — admin who revoked
    - `reason` (text, required)
    - `expires_at` (timestamptz, default NOW()+7 days) — auto-cleanup bound

  ## Security
  - RLS enabled
  - Admins and the affected user can SELECT
  - No user-level writes (service_role only for INSERT/UPDATE/DELETE)

  ## Maintenance
  - pg_cron job `cleanup_revoked_sessions` runs daily at 03:00 UTC
    deleting entries whose expires_at has passed
*/

CREATE TABLE IF NOT EXISTS revoked_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jti         TEXT,
  session_id  TEXT,
  revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by  UUID        REFERENCES auth.users(id),
  reason      TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_user_id  ON revoked_sessions(user_id, revoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_jti      ON revoked_sessions(jti)        WHERE jti IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_session  ON revoked_sessions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expires  ON revoked_sessions(expires_at);

ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;

-- Admins and the affected user can read revocation records
CREATE POLICY "revoked_sessions_admin_or_self_read"
  ON revoked_sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'system_admin')
        AND is_active = true
    )
  );

-- No direct user writes — only service_role (Edge Functions) may insert/update/delete
CREATE POLICY "revoked_sessions_service_role_write"
  ON revoked_sessions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "revoked_sessions_service_role_delete"
  ON revoked_sessions FOR DELETE
  TO service_role
  USING (true);

-- Daily cleanup of entries past their expires_at
SELECT cron.schedule(
  'cleanup_revoked_sessions',
  '0 3 * * *',
  $$DELETE FROM revoked_sessions WHERE expires_at < NOW();$$
);
