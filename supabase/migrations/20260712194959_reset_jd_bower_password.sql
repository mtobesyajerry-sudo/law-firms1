
/*
# Reset password for jd@bowerassociates.co.tz

Sets a known working password for the compliance officer account.
*/
UPDATE auth.users
SET 
  encrypted_password = crypt('BowerAML2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'jd@bowerassociates.co.tz';
