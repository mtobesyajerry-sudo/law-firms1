
/*
  # Encrypt client_name — Step 3b: Recreate decrypted view

  Drops and recreates kyc_clients_decrypted to resolve column order conflict
  from the previous view definition. The new view exposes client_name as a
  COALESCE of decrypt_pii(client_name_encrypted) and the legacy plaintext
  client_name column — ensuring zero disruption during the transition period.
*/

DROP VIEW IF EXISTS kyc_clients_decrypted;

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
  -- Decrypted identity fields
  decrypt_pii(passport_number_encrypted) AS passport_number,
  decrypt_pii(national_id_encrypted)     AS national_id,
  decrypt_pii(address_encrypted)         AS address,
  decrypt_pii(phone_encrypted)           AS phone,
  decrypt_pii(tax_id_encrypted)          AS tax_id,
  -- client_name: decrypted when available, falls back to legacy plaintext during transition
  COALESCE(decrypt_pii(client_name_encrypted), client_name) AS client_name
FROM kyc_clients
WHERE deleted_at IS NULL;
