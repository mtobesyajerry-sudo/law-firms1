/*
  # PII Field-Level Encryption — Complete Implementation (v2)
  
  Fixes search_path to include 'extensions' so pgp_sym_encrypt/pgp_sym_decrypt
  resolve correctly inside SECURITY DEFINER functions that also need vault access.

  Steps executed in order:
  1. Rewrite encrypt_pii() — Vault key, correct search_path
  2. Rewrite decrypt_pii() — Vault key, correct search_path  
  3. Backfill existing plaintext rows into encrypted columns
  4. Drop duplicate plaintext PII columns
  5. Add transient _plain input columns
  6. Wire real encryption trigger
  7. Create kyc_clients_decrypted view
  8. Assert no hardcoded key remains in pg_proc
*/

-- ============================================================
-- 1. encrypt_pii() — reads key from Vault
-- ============================================================
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext text)
  RETURNS bytea
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in Vault (name: pii_encryption_key).';
  END IF;

  RETURN extensions.pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;

-- ============================================================
-- 2. decrypt_pii() — reads key from Vault
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrypt_pii(ciphertext bytea)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = extensions, public, vault
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in Vault (name: pii_encryption_key).';
  END IF;

  RETURN extensions.pgp_sym_decrypt(ciphertext, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'decrypt_pii: failed for ciphertext length %: %', length(ciphertext), SQLERRM;
    RETURN '[DECRYPTION_ERROR]';
END;
$$;

-- ============================================================
-- 3. Backfill existing plaintext data before dropping columns
-- ============================================================
DO $$
DECLARE
  n int;
BEGIN
  UPDATE kyc_clients
    SET national_id_encrypted = encrypt_pii(client_id_number)
  WHERE client_id_number IS NOT NULL
    AND client_id_number != ''
    AND national_id_encrypted IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'national_id_encrypted backfilled: % rows', n;

  UPDATE kyc_clients
    SET phone_encrypted = encrypt_pii(phone_number)
  WHERE phone_number IS NOT NULL
    AND phone_number != ''
    AND phone_encrypted IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'phone_encrypted backfilled: % rows', n;

  -- physical_address first (preferred over mailing)
  UPDATE kyc_clients
    SET address_encrypted = encrypt_pii(physical_address)
  WHERE physical_address IS NOT NULL
    AND physical_address != ''
    AND address_encrypted IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'address_encrypted backfilled from physical_address: % rows', n;

  -- mailing_address fallback where physical was NULL
  UPDATE kyc_clients
    SET address_encrypted = encrypt_pii(mailing_address)
  WHERE mailing_address IS NOT NULL
    AND mailing_address != ''
    AND address_encrypted IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'address_encrypted backfilled from mailing_address: % rows', n;
END $$;

-- ============================================================
-- 4. Drop duplicate plaintext PII columns
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='client_id_number') THEN
    ALTER TABLE kyc_clients DROP COLUMN client_id_number;
    RAISE NOTICE 'Dropped: client_id_number';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='phone_number') THEN
    ALTER TABLE kyc_clients DROP COLUMN phone_number;
    RAISE NOTICE 'Dropped: phone_number';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='physical_address') THEN
    ALTER TABLE kyc_clients DROP COLUMN physical_address;
    RAISE NOTICE 'Dropped: physical_address';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='mailing_address') THEN
    ALTER TABLE kyc_clients DROP COLUMN mailing_address;
    RAISE NOTICE 'Dropped: mailing_address';
  END IF;
END $$;

-- ============================================================
-- 5. Add transient plaintext input columns
-- These are nulled by the trigger before the row reaches storage.
-- Application writes plaintext here; trigger encrypts and clears.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='passport_number_plain') THEN
    ALTER TABLE kyc_clients ADD COLUMN passport_number_plain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='national_id_plain') THEN
    ALTER TABLE kyc_clients ADD COLUMN national_id_plain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='address_plain') THEN
    ALTER TABLE kyc_clients ADD COLUMN address_plain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='phone_plain') THEN
    ALTER TABLE kyc_clients ADD COLUMN phone_plain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_clients' AND column_name='tax_id_plain') THEN
    ALTER TABLE kyc_clients ADD COLUMN tax_id_plain text;
  END IF;
END $$;

-- ============================================================
-- 6. Real encryption trigger — replaces the no-op stub
-- ============================================================
CREATE OR REPLACE FUNCTION public.encrypt_kyc_client_pii()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = extensions, public, vault
AS $$
BEGIN
  IF NEW.passport_number_plain IS NOT NULL AND NEW.passport_number_plain != '' THEN
    NEW.passport_number_encrypted := encrypt_pii(NEW.passport_number_plain);
    NEW.passport_number_plain     := NULL;
  END IF;

  IF NEW.national_id_plain IS NOT NULL AND NEW.national_id_plain != '' THEN
    NEW.national_id_encrypted := encrypt_pii(NEW.national_id_plain);
    NEW.national_id_plain     := NULL;
  END IF;

  IF NEW.address_plain IS NOT NULL AND NEW.address_plain != '' THEN
    NEW.address_encrypted := encrypt_pii(NEW.address_plain);
    NEW.address_plain     := NULL;
  END IF;

  IF NEW.phone_plain IS NOT NULL AND NEW.phone_plain != '' THEN
    NEW.phone_encrypted := encrypt_pii(NEW.phone_plain);
    NEW.phone_plain     := NULL;
  END IF;

  IF NEW.tax_id_plain IS NOT NULL AND NEW.tax_id_plain != '' THEN
    NEW.tax_id_encrypted := encrypt_pii(NEW.tax_id_plain);
    NEW.tax_id_plain     := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_clients_encrypt_pii_trigger ON kyc_clients;

CREATE TRIGGER kyc_clients_encrypt_pii_trigger
  BEFORE INSERT OR UPDATE
  ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_kyc_client_pii();

-- ============================================================
-- 7. kyc_clients_decrypted — transparent read view
-- Application always reads from this view, never the base table directly.
-- ============================================================
DROP VIEW IF EXISTS kyc_clients_decrypted;

CREATE VIEW kyc_clients_decrypted AS
SELECT
  id,
  organization_id,
  client_type,
  client_name,
  date_of_birth,
  nationality,
  country_of_residence,
  email,
  business_activity,
  industry_sector,
  registration_number,
  registration_country,
  source_of_funds,
  source_of_wealth,
  estimated_annual_income,
  estimated_net_worth,
  purpose_of_relationship,
  expected_transaction_volume,
  expected_transaction_frequency,
  pep_status,
  pep_details,
  sanctioned_entity,
  adverse_media,
  base_risk_score,
  current_risk_rating,
  current_dd_level,
  aml_trigger_activities,
  client_status,
  onboarding_status,
  next_review_date,
  last_review_date,
  monitoring_frequency,
  edd_required,
  edd_reason,
  senior_approval_status,
  senior_approval_date,
  senior_approval_by,
  senior_approval_notes,
  beneficial_owners,
  ownership_structure_verified,
  relationship_manager_id,
  compliance_officer_assigned,
  created_by,
  created_at,
  updated_at,
  source_of_funds_verified,
  sof_verification_date,
  sof_verified_by,
  source_of_wealth_verified,
  sow_verified_by,
  sow_verification_date,
  deleted_at,
  deletion_reason,
  alert_count,
  review_frequency,
  -- Decrypted PII — named without suffix so app code reads naturally
  decrypt_pii(passport_number_encrypted) AS passport_number,
  decrypt_pii(national_id_encrypted)     AS national_id,
  decrypt_pii(address_encrypted)         AS address,
  decrypt_pii(phone_encrypted)           AS phone,
  decrypt_pii(tax_id_encrypted)          AS tax_id
FROM kyc_clients
WHERE deleted_at IS NULL;

GRANT SELECT ON kyc_clients_decrypted TO authenticated;

-- ============================================================
-- 8. Runtime assertion: no hardcoded placeholder key in pg_proc
-- ============================================================
DO $$
DECLARE
  bad_func text;
BEGIN
  SELECT proname INTO bad_func
  FROM pg_proc
  WHERE (prosrc ILIKE '%CHANGE_THIS%' OR prosrc ILIKE '%CHANGE_THIS_IN_PRODUCTION%')
    AND proname NOT ILIKE 'pg_%'
  LIMIT 1;

  IF bad_func IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: hardcoded placeholder key still in function: %', bad_func;
  END IF;

  RAISE NOTICE 'SECURITY CHECK PASSED: No hardcoded placeholder keys in any function body.';
END $$;
