/*
  # Set temporary test passwords for Edge Function security verification
  Passwords will be rotated to unknown values immediately after testing.
  These are test-only credentials used to obtain JWTs for automated tests.
*/
-- Admin user: mtobesyaj@gmail.com
UPDATE auth.users
SET encrypted_password = crypt('EdgeTest@Admin1!', gen_salt('bf'))
WHERE id = '2dfd8973-6f88-4f56-979f-d56c3c332a20';

-- Staff user (Bower & Associates): sarah@bowerassociates.co.tz
UPDATE auth.users
SET encrypted_password = crypt('EdgeTest@Staff1!', gen_salt('bf'))
WHERE id = 'dbf24637-9e5d-4620-b515-4201d6331d95';

-- Non-admin user in different org (LawAge): robertmajigeesq@gmail.com
UPDATE auth.users
SET encrypted_password = crypt('EdgeTest@Staff2!', gen_salt('bf'))
WHERE id = '0c79c32a-58b7-47b6-af68-7df235880b98';
