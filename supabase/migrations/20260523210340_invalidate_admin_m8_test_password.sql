/*
  # Invalidate temporary admin password set for M8 verification.
  The IP mismatch on TOTP verify prevented completion from server side.
  Admin must re-authenticate via the app to obtain a valid AAL2 token.
*/
UPDATE auth.users
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')), updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';
