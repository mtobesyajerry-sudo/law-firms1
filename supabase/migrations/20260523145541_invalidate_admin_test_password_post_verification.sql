-- Invalidate the temporary test password set during Verification 11 test execution.
-- Forces a re-authentication requirement by setting an unusable encrypted password.
UPDATE auth.users
SET encrypted_password = '$2a$10$INVALIDATED_TEST_PASSWORD_HASH_POSTVERIF11_XXXXXXXX'
WHERE email = 'mtobesyaj@gmail.com';