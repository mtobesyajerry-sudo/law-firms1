
/*
  # Encrypt client_name — Step 1: Add columns

  Adds the encrypted storage column and the transient plaintext relay column
  for client_name, following the same pattern as the existing 5 encrypted PII
  fields (passport_number, national_id, address, phone, tax_id).

  New columns:
  - client_name_encrypted (bytea) — stores AES-encrypted name via Vault
  - client_name_plain (text, nullable) — transient input; trigger encrypts and nulls it before commit
*/

ALTER TABLE kyc_clients
  ADD COLUMN IF NOT EXISTS client_name_encrypted bytea,
  ADD COLUMN IF NOT EXISTS client_name_plain text;
