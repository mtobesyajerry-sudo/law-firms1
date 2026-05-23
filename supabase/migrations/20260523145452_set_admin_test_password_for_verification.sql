-- Set a temporary known password on the admin account for test execution.
-- This migration is for Verification 11 test execution only.
-- The password will be reset immediately after tests complete.
UPDATE auth.users
SET encrypted_password = crypt('V3rif!cation2026#Test', gen_salt('bf'))
WHERE email = 'mtobesyaj@gmail.com';