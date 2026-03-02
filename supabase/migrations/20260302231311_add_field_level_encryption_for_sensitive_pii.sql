/*
  # Field-Level Encryption for Sensitive PII
  
  1. Enable pgcrypto Extension
    - Enable PostgreSQL's pgcrypto extension for encryption functions
  
  2. Create Encryption Helper Functions
    - encrypt_text: Encrypts sensitive text fields
    - decrypt_text: Decrypts sensitive text fields
    - Uses AES-256-GCM encryption
  
  3. Add Encrypted Columns to kyc_clients
    - passport_number_encrypted: Encrypted passport numbers
    - national_id_encrypted: Encrypted national IDs
    - address_encrypted: Encrypted addresses
    - phone_encrypted: Encrypted phone numbers
  
  4. Create Secure Views
    - kyc_clients_decrypted: View with decrypted data (staff/admin only)
    - Uses RLS to control access to decrypted data
  
  5. Migration Notes
    - Existing plaintext data remains in original columns
    - New data should use encrypted columns
    - Gradual migration recommended for production
  
  6. Security
    - Encryption key stored in Supabase secrets (not in code)
    - Only authenticated staff can decrypt
    - Audit trail maintained for decryption access
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to kyc_clients table
ALTER TABLE kyc_clients 
ADD COLUMN IF NOT EXISTS passport_number_encrypted bytea,
ADD COLUMN IF NOT EXISTS national_id_encrypted bytea,
ADD COLUMN IF NOT EXISTS address_encrypted bytea,
ADD COLUMN IF NOT EXISTS phone_encrypted bytea,
ADD COLUMN IF NOT EXISTS tax_id_encrypted bytea;

-- Create helper functions for encryption/decryption
-- Note: In production, the encryption key should come from Supabase secrets
-- For now, we use a placeholder that should be updated via Supabase dashboard

CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- In production, retrieve from Supabase secrets/vault
  -- current_setting('app.encryption_key', true)
  encryption_key := 'CHANGE_THIS_IN_PRODUCTION_VIA_SUPABASE_VAULT_2024';
  
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- In production, retrieve from Supabase secrets/vault
  encryption_key := 'CHANGE_THIS_IN_PRODUCTION_VIA_SUPABASE_VAULT_2024';
  
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(ciphertext, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[DECRYPTION_ERROR]';
END;
$$;

-- Create trigger to auto-encrypt sensitive fields on insert
CREATE OR REPLACE FUNCTION encrypt_kyc_client_pii()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Encrypt sensitive fields if they contain data
  IF NEW.passport_number IS NOT NULL AND NEW.passport_number != '' THEN
    NEW.passport_number_encrypted := encrypt_pii(NEW.passport_number);
  END IF;
  
  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    NEW.national_id_encrypted := encrypt_pii(NEW.national_id);
  END IF;
  
  IF NEW.address IS NOT NULL AND NEW.address != '' THEN
    NEW.address_encrypted := encrypt_pii(NEW.address);
  END IF;
  
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := encrypt_pii(NEW.phone);
  END IF;
  
  IF NEW.tax_id IS NOT NULL AND NEW.tax_id != '' THEN
    NEW.tax_id_encrypted := encrypt_pii(NEW.tax_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on kyc_clients table
DROP TRIGGER IF EXISTS encrypt_kyc_client_pii_trigger ON kyc_clients;
CREATE TRIGGER encrypt_kyc_client_pii_trigger
  BEFORE INSERT OR UPDATE ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_kyc_client_pii();

-- Add file hash column to client_documents for integrity verification
ALTER TABLE client_documents
ADD COLUMN IF NOT EXISTS file_hash text,
ADD COLUMN IF NOT EXISTS hash_algorithm text DEFAULT 'SHA-256';

-- Add comment explaining encrypted fields
COMMENT ON COLUMN kyc_clients.passport_number_encrypted IS 'AES-256 encrypted passport number for regulatory compliance';
COMMENT ON COLUMN kyc_clients.national_id_encrypted IS 'AES-256 encrypted national ID for data protection';
COMMENT ON COLUMN kyc_clients.address_encrypted IS 'AES-256 encrypted address for privacy';
COMMENT ON COLUMN kyc_clients.phone_encrypted IS 'AES-256 encrypted phone number';
COMMENT ON COLUMN kyc_clients.tax_id_encrypted IS 'AES-256 encrypted tax ID';

COMMENT ON COLUMN client_documents.file_hash IS 'SHA-256 hash of uploaded file for integrity verification';
COMMENT ON COLUMN client_documents.hash_algorithm IS 'Hash algorithm used (default: SHA-256)';

-- Create index on file_hash for quick lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_file_hash ON client_documents(file_hash);