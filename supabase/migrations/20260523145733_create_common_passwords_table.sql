/*
  # Create common_passwords table with 10k SecLists blacklist

  ## Summary
  Creates a common_passwords table storing MD5 hashes of the top 9,916 most-breached
  passwords sourced from SecLists xato-net-10-million-passwords-10000.txt
  (deduplicated and lowercased). Hashes are used instead of plaintext so the table
  does not act as a password dictionary.

  ## New Tables
  - common_passwords: stores MD5(lower(password)) hashes only, no plaintext
    - password_hash (text, primary key)

  ## Security
  - RLS enabled; SELECT restricted to service_role only (used by Edge Functions)
  - No authenticated or anon access

  ## Usage
  Edge Functions check: SELECT EXISTS(SELECT 1 FROM common_passwords WHERE password_hash = md5(lower($candidate)))
  Client side: src/utils/commonPasswords.json contains the same plain list for in-browser Set lookup
*/

CREATE TABLE IF NOT EXISTS common_passwords (
  password_hash text PRIMARY KEY
);

ALTER TABLE common_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only read"
  ON common_passwords FOR SELECT
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS common_passwords_hash_idx ON common_passwords (password_hash);
