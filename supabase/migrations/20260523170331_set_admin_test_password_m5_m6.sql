/*
  # Set temporary test password for M5/M6 backup code verification
  Immediately invalidated after test run.
*/
UPDATE auth.users
SET
  encrypted_password = crypt('TestM5Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
