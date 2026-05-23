/*
  # Invalidate temporary test passwords set during Edge Function verification
  Replaces the bcrypt hashes set for the test run with a new random hash
  so the known passwords ("TestAdmin@9999!" etc.) no longer work.
  Real users must log in via the app's password-reset flow.
*/
UPDATE auth.users
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE email IN (
  'mtobesyaj@gmail.com',
  'sarah@bowerassociates.co.tz',
  'as@bowerassociates.co.tz'
);
