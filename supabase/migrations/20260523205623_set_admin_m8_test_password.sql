/*
  # Temporary: set known password for admin for M8 AAL2 gate verification.
  Invalidated immediately after test in a follow-up migration.
*/
UPDATE auth.users
SET encrypted_password = crypt('M8verify!Adm#2026', gen_salt('bf')), updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
