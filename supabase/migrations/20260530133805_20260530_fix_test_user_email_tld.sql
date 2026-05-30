/*
  # Fix TEST user emails — replace .local TLD with .invalid
  
  Supabase GoTrue rejects logins for users whose email uses a non-standard TLD
  like .local. Using .invalid is the RFC-compliant reserved TLD for testing.
  Update both auth.users and user_profiles.
*/

DO $$
BEGIN
  UPDATE auth.users SET email = 'test-insurer@test-verification.invalid'
  WHERE email = 'test-insurer@test-verification.local';

  UPDATE auth.users SET email = 'test-accountant@test-verification.invalid'
  WHERE email = 'test-accountant@test-verification.local';

  UPDATE user_profiles SET email = 'test-insurer@test-verification.invalid'
  WHERE email = 'test-insurer@test-verification.local';

  UPDATE user_profiles SET email = 'test-accountant@test-verification.invalid'
  WHERE email = 'test-accountant@test-verification.local';
END $$;
