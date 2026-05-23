/*
  # MFA Backup Codes and Grace Period

  1. New Tables
    - `mfa_backup_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users, cascade delete)
      - `code_hash` (text, bcrypt hash of the backup code)
      - `used_at` (timestamptz, null until code is consumed)
      - `created_at` (timestamptz, default now())
      - UNIQUE constraint on (user_id, code_hash)
      - Partial index on user_id WHERE used_at IS NULL (fast unused-code lookup)

  2. New Column on user_profiles
    - `mfa_grace_period_ends` (timestamptz)
      - Non-admin existing users: created_at + 14 days
      - Admin/system_admin existing users: now() (immediate enforcement)
      - New users: set by create-user Edge Function based on role

  3. Security
    - RLS enabled on mfa_backup_codes
    - Owner-only SELECT (user reads their own codes)
    - Owner-only INSERT (user inserts at enrollment time via client)
    - Owner-only UPDATE (mark as used)
    - No DELETE policy — used codes are permanent evidence
*/

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user
  ON mfa_backup_codes(user_id)
  WHERE used_at IS NULL;

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfa_backup_codes_own_select"
  ON mfa_backup_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "mfa_backup_codes_own_insert"
  ON mfa_backup_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mfa_backup_codes_own_update"
  ON mfa_backup_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role needs full access for the Edge Function verify path
CREATE POLICY "mfa_backup_codes_service_role_all"
  ON mfa_backup_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add grace period column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mfa_grace_period_ends'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN mfa_grace_period_ends TIMESTAMPTZ;
  END IF;
END $$;

-- Backfill grace period for existing users
-- Admins and system_admins: immediate enforcement (grace period already expired)
UPDATE user_profiles
SET mfa_grace_period_ends = NOW()
WHERE mfa_grace_period_ends IS NULL
  AND role IN ('admin', 'system_admin');

-- All other roles: 14 days from account creation
UPDATE user_profiles
SET mfa_grace_period_ends = COALESCE(created_at, NOW()) + INTERVAL '14 days'
WHERE mfa_grace_period_ends IS NULL;
