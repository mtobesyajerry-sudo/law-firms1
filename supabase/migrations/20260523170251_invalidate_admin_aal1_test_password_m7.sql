/*
  # Invalidate temporary M7 test password
  Replaces the bcrypt hash set for M7 AAL1 testing with a random value
  so the known password "TestM7Admin@2026!" no longer works.
*/
UPDATE auth.users
SET
  encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
