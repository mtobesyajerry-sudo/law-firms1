
/*
  # Encrypt client_name — Step 6b: Drop view, drop plaintext column, recreate view

  Drops the view first (to remove its dependency on client_name), then drops the
  legacy plaintext column, then recreates the finalized view reading purely from
  decrypt_pii(client_name_encrypted).
*/

-- 1. Drop the view that depends on client_name
DROP VIEW IF EXISTS kyc_clients_decrypted;

-- 2. Drop the legacy plaintext column
ALTER TABLE kyc_clients DROP COLUMN IF EXISTS client_name;

-- 3. Recreate the finalized view — client_name now comes only from decryption
CREATE VIEW kyc_clients_decrypted AS
SELECT
  id,
  organization_id,
  client_type,
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
  -- Decrypted PII fields
  decrypt_pii(passport_number_encrypted) AS passport_number,
  decrypt_pii(national_id_encrypted)     AS national_id,
  decrypt_pii(address_encrypted)         AS address,
  decrypt_pii(phone_encrypted)           AS phone,
  decrypt_pii(tax_id_encrypted)          AS tax_id,
  decrypt_pii(client_name_encrypted)     AS client_name
FROM kyc_clients
WHERE deleted_at IS NULL;
