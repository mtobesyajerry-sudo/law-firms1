/*
  # Reset Admin Password for Jeremiah Mtobesya

  The password was randomised by the M5/M6 test cleanup migration.
  This restores it to a known strong password so the admin can log in.

  New password: Admin@2026!
*/
UPDATE auth.users
SET
  encrypted_password = crypt('Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
