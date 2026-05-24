
/*
  # Encrypt client_name — Step 4: Backfill existing rows

  For each existing row that has a plaintext client_name but no encrypted
  version yet, writes client_name into client_name_plain. The BEFORE UPDATE
  trigger fires, encrypts it into client_name_encrypted, and nulls client_name_plain
  before the row is committed. client_name stays in sync during transition.
*/

UPDATE kyc_clients
SET client_name_plain = client_name
WHERE client_name_encrypted IS NULL
  AND client_name IS NOT NULL
  AND deleted_at IS NULL;
