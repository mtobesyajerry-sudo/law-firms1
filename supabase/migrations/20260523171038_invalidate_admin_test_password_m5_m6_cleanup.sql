/*
  # Invalidate M5/M6 test password and remove test backup code
  Cleans up all test artifacts from M5/M6 verification run.
*/
UPDATE auth.users
SET
  encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
  updated_at = now()
WHERE email = 'mtobesyaj@gmail.com';

DELETE FROM mfa_backup_codes
WHERE user_id = '2dfd8973-6f88-4f56-979f-d56c3c332a20'
  AND code_hash = 'a00d76646eba91b057841554d5c8334f498dc592ed744bce404f21fe271cd36e';
