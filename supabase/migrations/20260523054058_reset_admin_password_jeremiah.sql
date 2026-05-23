
/*
  # Reset Admin Password for Jeremiah Mtobesya

  Resets the password for the system admin account (mtobesyaj@gmail.com)
  to a known value so the admin can log in again.

  New password: Admin@2026!
*/

UPDATE auth.users
SET 
  encrypted_password = crypt('Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
