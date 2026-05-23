/*
  # Fix test user passwords for Edge Function security tests
*/
UPDATE auth.users
SET encrypted_password = crypt('EdgeTest@Staff1!', gen_salt('bf'))
WHERE email = 'sarah@bowerassociates.co.tz';

UPDATE auth.users
SET encrypted_password = crypt('EdgeTest@Staff2!', gen_salt('bf'))
WHERE email = 'robertmajigeesq@gmail.com';
