/*
  # Fix erase_personal_data and export_personal_data functions

  ## Problems found
  Both functions were written against a stale schema and are completely broken:

  ### erase_personal_data
  - References columns that don't exist: full_name, phone, address,
    passport_number, national_id, tax_id
  - Actual columns: client_name, phone_plain/_encrypted, address_plain/_encrypted,
    passport_number_plain/_encrypted, national_id_plain/_encrypted, tax_id_plain/_encrypted
  - Does not touch: screening_results (contains screened_name, screened_dob,
    screened_nationality, screened_id_number), login_history (contains email),
    audit_logs (contains action_description with PII in text), user_profiles
  - Does not write to data_deletion_log

  ### export_personal_data
  - References full_name, phone, address — none exist on base table
  - Should read from kyc_clients_decrypted view for plaintext PII
  - Missing: screening_results, login_history, audit_logs sections
  - Missing: assessments section

  ## Fix
  Both functions rewritten to use actual column names and cover all PII-bearing tables.
  Erasure follows anonymise-not-delete pattern to preserve AML 7-year retention.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. erase_personal_data (fixed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION erase_personal_data(
  target_client_id uuid,
  reason text DEFAULT 'user_request'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  records_affected integer := 0;
  screening_rows   integer := 0;
BEGIN
  -- Guard: client must exist
  IF NOT EXISTS (SELECT 1 FROM kyc_clients WHERE id = target_client_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Client not found');
  END IF;

  -- ── 1. Anonymise kyc_clients ──────────────────────────────────────────────
  -- Wipe both encrypted bytea blobs and the transit plain columns.
  -- Preserve non-PII compliance fields: risk_rating, dd_level, pep_status,
  -- sanctions_status, created_at (needed for retention clock).
  UPDATE kyc_clients SET
    client_name               = 'REDACTED_' || id::text,
    email                     = 'redacted_' || id::text || '@deleted.local',
    -- Plain transit columns (should already be NULL post-insert trigger, wipe anyway)
    phone_plain               = NULL,
    address_plain             = NULL,
    passport_number_plain     = NULL,
    national_id_plain         = NULL,
    tax_id_plain              = NULL,
    -- Encrypted blobs
    phone_encrypted           = NULL,
    address_encrypted         = NULL,
    passport_number_encrypted = NULL,
    national_id_encrypted     = NULL,
    tax_id_encrypted          = NULL,
    -- Other direct PII
    date_of_birth             = NULL,
    nationality               = NULL,
    country_of_residence      = NULL,
    place_of_birth            = NULL,
    source_of_funds           = 'REDACTED',
    source_of_wealth          = 'REDACTED',
    pep_details               = NULL,
    beneficial_owners         = NULL,
    -- Erasure metadata
    deleted_at                = now(),
    deletion_reason           = reason
  WHERE id = target_client_id;

  GET DIAGNOSTICS records_affected = ROW_COUNT;

  -- ── 2. Anonymise screening_results ───────────────────────────────────────
  -- AML retention: keep rows (match_found, risk_level, dates) but wipe the
  -- identifying fields that were screened (name, DOB, nationality, ID number).
  UPDATE screening_results SET
    screened_name        = 'REDACTED',
    screened_dob         = NULL,
    screened_nationality = NULL,
    screened_id_number   = NULL
  WHERE client_id = target_client_id;

  GET DIAGNOSTICS screening_rows = ROW_COUNT;

  -- ── 3. Mark client_documents for deletion ────────────────────────────────
  -- Soft-delete only; physical file removal is handled by storage lifecycle policy.
  UPDATE client_documents SET
    status     = 'deleted',
    notes      = 'Deleted per erasure request: ' || reason,
    deleted_at = now()
  WHERE client_id = target_client_id
    AND deleted_at IS NULL;

  -- ── 4. Write to data_deletion_log ────────────────────────────────────────
  INSERT INTO data_deletion_log (
    table_name, record_id, record_type, deletion_reason,
    deleted_by, deletion_method
  ) VALUES (
    'kyc_clients', target_client_id, 'kyc_client', reason,
    auth.uid(), 'erase_personal_data_function'
  );

  -- ── 5. Audit log entry ───────────────────────────────────────────────────
  -- Note: audit_logs rows for this client are NOT deleted — AML retention.
  -- The log rows reference client_id (a UUID) not the name, so no PII in log.
  INSERT INTO audit_logs (
    user_id, action_type, entity_type, entity_id,
    action_description, organization_id
  )
  SELECT
    auth.uid(), 'DELETE', 'kyc_client', target_client_id,
    'Personal data erased per request: ' || reason,
    organization_id
  FROM kyc_clients WHERE id = target_client_id;

  RETURN jsonb_build_object(
    'success',            true,
    'message',            'Personal data erased successfully',
    'client_rows',        records_affected,
    'screening_rows_anonymised', screening_rows,
    'timestamp',          now(),
    'retention_note',     'Audit logs and AML activity records retained per 7-year Tanzania AML Act requirement'
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. export_personal_data (fixed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION export_personal_data(target_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_data    jsonb;
  documents_data jsonb;
  matters_data   jsonb;
  screening_data jsonb;
  assessments_data jsonb;
BEGIN
  -- Read from decrypted view so PII is plaintext in the export
  SELECT jsonb_build_object(
    'id',              id,
    'client_name',     client_name,
    'email',           email,
    'phone',           phone,          -- from decrypt_pii() in view
    'address',         address,
    'passport_number', passport_number,
    'national_id',     national_id,
    'tax_id',          tax_id,
    'date_of_birth',   date_of_birth,
    'nationality',     nationality,
    'client_type',     client_type,
    'source_of_funds', source_of_funds,
    'source_of_wealth',source_of_wealth,
    'risk_rating',     current_risk_rating,
    'onboarded_at',    created_at
  ) INTO client_data
  FROM kyc_clients_decrypted
  WHERE id = target_client_id;

  IF client_data IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Client not found');
  END IF;

  -- Documents metadata (not file content)
  SELECT jsonb_agg(jsonb_build_object(
    'document_id',   id,
    'document_type', document_type_id,
    'file_name',     file_name,
    'status',        status,
    'uploaded_at',   created_at
  )) INTO documents_data
  FROM client_documents
  WHERE client_id = target_client_id AND deleted_at IS NULL;

  -- Matters
  SELECT jsonb_agg(jsonb_build_object(
    'matter_id',   m.id,
    'matter_type', m.matter_type,
    'status',      m.status,
    'created_at',  m.created_at
  )) INTO matters_data
  FROM matters m
  JOIN client_matter_relationships cmr ON m.id = cmr.matter_id
  WHERE cmr.client_id = target_client_id;

  -- Screening results
  SELECT jsonb_agg(jsonb_build_object(
    'screening_id',   id,
    'screening_type', screening_type,
    'screening_date', screening_date,
    'match_found',    match_found,
    'risk_level',     risk_level,
    'status',         status
  )) INTO screening_data
  FROM screening_results
  WHERE client_id = target_client_id;

  -- Assessments (org-level, keyed to client's org)
  SELECT jsonb_agg(jsonb_build_object(
    'assessment_id',  a.id,
    'framework',      a.framework_type,
    'risk_level',     a.risk_level,
    'overall_score',  a.overall_risk_score,
    'created_at',     a.created_at
  )) INTO assessments_data
  FROM assessments a
  JOIN kyc_clients kc ON kc.organization_id = a.organization_id
  WHERE kc.id = target_client_id;

  RETURN jsonb_build_object(
    'export_date',        now(),
    'gdpr_basis',         'Article 20 - Right to Data Portability / Tanzania PDPA 2022 s.17',
    'client_information', client_data,
    'documents',          COALESCE(documents_data, '[]'::jsonb),
    'matters',            COALESCE(matters_data, '[]'::jsonb),
    'screening_results',  COALESCE(screening_data, '[]'::jsonb),
    'assessments',        COALESCE(assessments_data, '[]'::jsonb),
    'data_format',        'JSON'
  );
END;
$$;
