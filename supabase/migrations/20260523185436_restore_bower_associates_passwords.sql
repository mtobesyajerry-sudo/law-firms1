/*
  # Restore Bower Associates user passwords

  The post-verification cleanup migrations (20260523115040 and 20260523121120)
  randomised the passwords for as@bowerassociates.co.tz and sarah@bowerassociates.co.tz,
  making them unable to log in. This restores them to their permanent known passwords.
*/

UPDATE auth.users
SET encrypted_password = crypt('Anna@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'as@bowerassociates.co.tz';

UPDATE auth.users
SET encrypted_password = crypt('Sarah@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'sarah@bowerassociates.co.tz';
