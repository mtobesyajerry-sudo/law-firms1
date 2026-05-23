/*
  # Set temporary test password for M7 AAL1 gate verification
  Sets a known password for the admin account so the M1-M10 MFA tests
  can obtain a real AAL1 JWT and verify the AAL2 gate in Edge Functions.
  This password is invalidated in the immediately following migration.
*/
UPDATE auth.users
SET
  encrypted_password = crypt('TestM7Admin@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
