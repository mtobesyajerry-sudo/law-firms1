/*
  # Fix backup_logs — replace permissive ALL policy with append-only pattern

  ## Problem
  backup_logs had a single "System can manage backups" policy with cmd=ALL
  and qual=true. This means any authenticated user could DELETE or UPDATE
  backup log entries, defeating the integrity guarantee that log tables
  should be append-only.

  ## Changes
  - Drop the permissive ALL policy
  - Add separate INSERT (unrestricted write for service role / system)
  - Add SELECT restricted to admin role with is_active check
  - Add DELETE blocked unconditionally (USING false)
  - Add UPDATE blocked unconditionally (USING false)

  This matches the same pattern already used on audit_logs, login_history,
  document_access_logs, and document_verification_log.
*/

DROP POLICY IF EXISTS "System can manage backups" ON backup_logs;

CREATE POLICY "backup_logs_insert"
  ON backup_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "backup_logs_read"
  ON backup_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.is_active = true
    )
  );

CREATE POLICY "backup_logs_no_delete"
  ON backup_logs FOR DELETE
  USING (false);

CREATE POLICY "backup_logs_no_update"
  ON backup_logs FOR UPDATE
  USING (false);
