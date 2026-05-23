/*
  # Invalidate test password set for privilege escalation verification
*/
UPDATE auth.users
SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE email = 'sarah@bowerassociates.co.tz';
