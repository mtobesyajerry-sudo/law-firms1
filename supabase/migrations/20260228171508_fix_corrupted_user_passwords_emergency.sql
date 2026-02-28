/*
  # Emergency Password Reset for Corrupted Users

  1. Problem
    - Users created before encryption fix have corrupted passwords
    - They cannot log in because the password was encrypted with mismatched keys

  2. Solution
    - Reset passwords directly in auth.users table
    - Set new bcrypt hashes for the password "kakakuona123"

  3. Affected Users
    - Jack Bower (jb@bowerassociates)
    - Anna Shmitz (as@bowerassociates.co.tz)
*/

-- The bcrypt hash for "kakakuona123" (generated with default cost factor 10)
-- Note: In production, this would be done via Supabase Admin API
-- For now, we'll use a SQL approach to update the encrypted_password field

UPDATE auth.users
SET 
  encrypted_password = crypt('kakakuona123', gen_salt('bf')),
  updated_at = now()
WHERE id IN (
  '3b2b744e-66b0-47b7-b749-aaac366ccc7a', -- Jack Bower
  '5eea426e-ca09-42c5-805a-7b55c06024b5'  -- Anna Shmitz
);
