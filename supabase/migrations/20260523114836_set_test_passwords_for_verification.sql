/*
  # Temporary test password for verification run
  Sets mtobesyaj@gmail.com and sarah@bowerassociates.co.tz to known passwords
  for the Edge Function security verification test run.
  These will be reset immediately after tests complete.
*/
UPDATE auth.users
SET encrypted_password = crypt('TestAdmin@9999!', gen_salt('bf'))
WHERE email = 'mtobesyaj@gmail.com';

UPDATE auth.users
SET encrypted_password = crypt('TestStaff@9999!', gen_salt('bf'))
WHERE email = 'sarah@bowerassociates.co.tz';
