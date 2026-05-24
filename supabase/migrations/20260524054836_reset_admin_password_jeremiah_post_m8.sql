/*
  # Reset Admin Password — Jeremiah Mtobesya (post-M8 cleanup)

  The M8 test invalidation migration randomised the password.
  Restores it to the known strong password so the admin can log in again.

  Password: Admin@2026!
*/
UPDATE auth.users
SET
  encrypted_password = crypt('Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
