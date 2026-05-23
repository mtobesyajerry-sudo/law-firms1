
/*
  # Reset Bower Associates Test User Passwords

  Resets passwords for all 5 Bower Associates test users to simple,
  memorable passwords based on their names.
*/

UPDATE auth.users SET encrypted_password = crypt('Sarah@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'sarah@bowerassociates.co.tz';

UPDATE auth.users SET encrypted_password = crypt('Anna@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'as@bowerassociates.co.tz';

UPDATE auth.users SET encrypted_password = crypt('Jack@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'jb@bowerassociates';

UPDATE auth.users SET encrypted_password = crypt('JohnD@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'jdd@bowerassociates.co.tz';

UPDATE auth.users SET encrypted_password = crypt('JohnDeep@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'jd@bowerassociates.co.tz';
