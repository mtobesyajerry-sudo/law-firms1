-- Insurance KYC: Related-Party Encryption — Migration 1 of 2

-- ============================================================
-- SECTION A: New columns
-- ============================================================
ALTER TABLE kyc_clients
  ADD COLUMN IF NOT EXISTS beneficiaries_plain             text,
  ADD COLUMN IF NOT EXISTS beneficiaries_encrypted         bytea,
  ADD COLUMN IF NOT EXISTS beneficial_owners_plain         text,
  ADD COLUMN IF NOT EXISTS beneficial_owners_encrypted     bytea,
  ADD COLUMN IF NOT EXISTS payer_name_plain                text,
  ADD COLUMN IF NOT EXISTS payer_name_encrypted            bytea,
  ADD COLUMN IF NOT EXISTS payer_identification_plain      text,
  ADD COLUMN IF NOT EXISTS payer_identification_encrypted  bytea;

-- ============================================================
-- SECTION B: Extended trigger
-- ============================================================
CREATE OR REPLACE FUNCTION encrypt_kyc_client_pii()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_name text;
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

  IF NEW.client_name_plain IS NOT NULL AND NEW.client_name_plain != '' THEN
    v_client_name             := NEW.client_name_plain;
    NEW.client_name_encrypted := encrypt_pii(v_client_name);
    NEW.client_name_plain     := NULL;
  END IF;

  IF NEW.beneficiaries_plain IS NOT NULL AND NEW.beneficiaries_plain != '' THEN
    NEW.beneficiaries_encrypted := encrypt_pii(NEW.beneficiaries_plain);
    NEW.beneficiaries_plain     := NULL;
  END IF;

  IF NEW.beneficial_owners_plain IS NOT NULL AND NEW.beneficial_owners_plain != '' THEN
    NEW.beneficial_owners_encrypted := encrypt_pii(NEW.beneficial_owners_plain);
    NEW.beneficial_owners_plain     := NULL;
  END IF;

  IF NEW.payer_name_plain IS NOT NULL AND NEW.payer_name_plain != '' THEN
    NEW.payer_name_encrypted := encrypt_pii(NEW.payer_name_plain);
    NEW.payer_name_plain     := NULL;
  END IF;

  IF NEW.payer_identification_plain IS NOT NULL AND NEW.payer_identification_plain != '' THEN
    NEW.payer_identification_encrypted := encrypt_pii(NEW.payer_identification_plain);
    NEW.payer_identification_plain     := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- SECTION C: Rebuilt view — drop then recreate to allow
-- column reordering and addition of new columns.
-- ============================================================
DROP VIEW IF EXISTS public.kyc_clients_decrypted;

CREATE VIEW public.kyc_clients_decrypted
WITH (security_invoker = true)
AS
SELECT
  id,
  organization_id,
  matter_id,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  deletion_reason,
  client_type,
  client_status,
  onboarding_status,
  customer_type,
  customer_status,
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
  total_risk_score,
  risk_level,
  risk_assessment,
  enhanced_dd_required,
  edd_required,
  edd_reason,
  aml_trigger_activities,
  alert_count,
  monitoring_frequency,
  monitoring_status,
  review_frequency,
  next_review_date,
  last_review_date,
  senior_approval_status,
  senior_approval_date,
  senior_approval_by,
  senior_approval_notes,
  ownership_structure_verified,
  source_of_funds_verified,
  sof_verification_date,
  sof_verified_by,
  source_of_wealth_verified,
  sow_verified_by,
  sow_verification_date,
  first_payment_verified,
  relationship_manager_id,
  compliance_officer_assigned,
  customer_data,
  policy_information,
  pep_declaration,
  sanctions_screening,
  ongoing_monitoring,
  suspicious_indicators,
  customer_declaration,
  compliance_approval,
  decrypt_pii(client_name_encrypted)     AS client_name,
  decrypt_pii(national_id_encrypted)     AS national_id,
  decrypt_pii(passport_number_encrypted) AS passport_number,
  decrypt_pii(phone_encrypted)           AS phone,
  decrypt_pii(address_encrypted)         AS address,
  decrypt_pii(tax_id_encrypted)          AS tax_id,
  CASE
    WHEN beneficiaries_encrypted IS NOT NULL
      THEN decrypt_pii(beneficiaries_encrypted)::jsonb
    ELSE beneficiaries
  END AS beneficiaries,
  CASE
    WHEN beneficial_owners_encrypted IS NOT NULL
      THEN decrypt_pii(beneficial_owners_encrypted)::jsonb
    ELSE beneficial_owners
  END AS beneficial_owners,
  decrypt_pii(payer_name_encrypted)           AS payer_name,
  decrypt_pii(payer_identification_encrypted) AS payer_identification
FROM kyc_clients
WHERE deleted_at IS NULL;

-- ============================================================
-- SECTION D: Step-1 data migration
-- ============================================================
UPDATE kyc_clients
SET beneficiaries_plain = beneficiaries::text
WHERE beneficiaries IS NOT NULL
  AND jsonb_array_length(beneficiaries) > 0
  AND beneficiaries_encrypted IS NULL;

UPDATE kyc_clients
SET beneficial_owners_plain = beneficial_owners::text
WHERE beneficial_owners IS NOT NULL
  AND jsonb_array_length(beneficial_owners) > 0
  AND beneficial_owners_encrypted IS NULL;
