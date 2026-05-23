/*
  # Temporary: set Sarah's password for privilege escalation tests
  Will be invalidated immediately after tests complete.
*/
UPDATE auth.users
SET encrypted_password = crypt('EscTest@9999!', gen_salt('bf'))
WHERE email = 'sarah@bowerassociates.co.tz';
