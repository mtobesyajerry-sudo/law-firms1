/*
  # Reset test backup code for clean M5/M6 run
  Clears used_at so the code ABCD2345 is usable again for a clean first-use test.
*/
UPDATE mfa_backup_codes
SET used_at = NULL
WHERE user_id = '2dfd8973-6f88-4f56-979f-d56c3c332a20'
  AND code_hash = 'a00d76646eba91b057841554d5c8334f498dc592ed744bce404f21fe271cd36e';
