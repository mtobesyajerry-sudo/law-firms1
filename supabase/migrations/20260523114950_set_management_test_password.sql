/*
  # Temporary: set known test passwords for verification run
  Sets as@bowerassociates.co.tz (management, Org A) to a known password.
  Reset immediately after tests.
*/
UPDATE auth.users
SET encrypted_password = crypt('TestMgmt@9999!', gen_salt('bf'))
WHERE email = 'as@bowerassociates.co.tz';
