/*
  # Emergency admin password reset

  The admin account has password_change_required = true (set by a previous
  security-rotation migration) which may be blocking login.

  This resets the admin password to a known value and clears the
  password_change_required flag so the admin can access the system immediately.

  Admin email: mtobesyaj@gmail.com
  Temporary password: Admin@2026!
  (Change this immediately after logging in)
*/

-- Reset the password
UPDATE auth.users
SET
  encrypted_password = crypt('Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE id = '2dfd8973-6f88-4f56-979f-d56c3c332a20';

-- Clear the forced password change flag
UPDATE user_profiles
SET password_change_required = false
WHERE id = '2dfd8973-6f88-4f56-979f-d56c3c332a20';
