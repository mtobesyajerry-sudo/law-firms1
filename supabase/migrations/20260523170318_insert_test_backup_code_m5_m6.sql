/*
  # Insert test backup code for M5/M6 verification
  Inserts a single backup code for mtobesyaj@gmail.com with the SHA-256
  hash of "ABCD2345" so the Edge Function test can verify both:
    M5: first use succeeds (200) and marks used_at
    M6: second use of the same code is rejected (401)
  This row is test-only and will be cleaned up after the test run.
*/
INSERT INTO mfa_backup_codes (user_id, code_hash, used_at)
VALUES (
  '2dfd8973-6f88-4f56-979f-d56c3c332a20',
  'a00d76646eba91b057841554d5c8334f498dc592ed744bce404f21fe271cd36e',
  NULL
)
ON CONFLICT DO NOTHING;
