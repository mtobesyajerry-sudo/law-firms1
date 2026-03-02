/*
  # GDPR Compliance Functions

  1. Right to Erasure (Article 17)
    - Function to anonymize/delete personal data
    - Maintains audit trail while removing PII

  2. Right to Data Portability (Article 20)
    - Function to export all user data in JSON format
*/

-- Add deleted_at and deletion_reason columns to kyc_clients
ALTER TABLE kyc_clients
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Add deleted_at column to client_documents
ALTER TABLE client_documents
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Function for Right to Erasure (GDPR Article 17)
CREATE OR REPLACE FUNCTION erase_personal_data(target_client_id uuid, reason text DEFAULT 'user_request')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  records_affected integer := 0;
BEGIN
  -- Check if client exists
  IF NOT EXISTS (SELECT 1 FROM kyc_clients WHERE id = target_client_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Client not found'
    );
  END IF;

  -- Anonymize kyc_clients record
  UPDATE kyc_clients
  SET
    full_name = 'REDACTED_' || id::text,
    email = 'redacted_' || id::text || '@deleted.local',
    phone = NULL,
    address = NULL,
    passport_number = NULL,
    national_id = NULL,
    tax_id = NULL,
    passport_number_encrypted = NULL,
    national_id_encrypted = NULL,
    address_encrypted = NULL,
    phone_encrypted = NULL,
    tax_id_encrypted = NULL,
    date_of_birth = NULL,
    place_of_birth = NULL,
    nationality = NULL,
    source_of_funds = 'REDACTED',
    source_of_wealth = 'REDACTED',
    deleted_at = now(),
    deletion_reason = reason
  WHERE id = target_client_id;
  
  GET DIAGNOSTICS records_affected = ROW_COUNT;

  -- Mark associated documents for deletion
  UPDATE client_documents
  SET
    status = 'deleted',
    notes = 'Deleted per GDPR erasure request: ' || reason,
    deleted_at = now()
  WHERE client_id = target_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Personal data erased successfully',
    'records_affected', records_affected,
    'timestamp', now()
  );
END;
$$;

-- Function for Right to Data Portability (GDPR Article 20)
CREATE OR REPLACE FUNCTION export_personal_data(target_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_data jsonb;
  documents_data jsonb;
  matters_data jsonb;
  result jsonb;
BEGIN
  -- Export client data
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'email', email,
    'phone', phone,
    'address', address,
    'date_of_birth', date_of_birth,
    'nationality', nationality,
    'client_type', client_type,
    'risk_rating', current_risk_rating,
    'onboarded_at', created_at
  ) INTO client_data
  FROM kyc_clients
  WHERE id = target_client_id;

  -- Export documents metadata (not file content)
  SELECT jsonb_agg(jsonb_build_object(
    'document_id', id,
    'document_type', document_type_id,
    'uploaded_at', created_at,
    'status', status,
    'file_name', file_name
  )) INTO documents_data
  FROM client_documents
  WHERE client_id = target_client_id;

  -- Export matters
  SELECT jsonb_agg(jsonb_build_object(
    'matter_id', m.id,
    'matter_type', m.matter_type,
    'status', m.status,
    'created_at', m.created_at
  )) INTO matters_data
  FROM matters m
  JOIN client_matter_relationships cmr ON m.id = cmr.matter_id
  WHERE cmr.client_id = target_client_id;

  -- Combine all data
  result := jsonb_build_object(
    'export_date', now(),
    'client_information', client_data,
    'documents', COALESCE(documents_data, '[]'::jsonb),
    'matters', COALESCE(matters_data, '[]'::jsonb),
    'data_format', 'JSON',
    'gdpr_article', 'Article 20 - Right to Data Portability'
  );

  RETURN result;
END;
$$;

-- Function to identify records exceeding 7-year retention period
CREATE OR REPLACE FUNCTION identify_expired_records()
RETURNS TABLE (
  table_name text,
  record_id uuid,
  created_date timestamptz,
  days_old integer,
  retention_period integer,
  should_review boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check kyc_clients (7 years = 2555 days)
  RETURN QUERY
  SELECT
    'kyc_clients'::text,
    kc.id,
    kc.created_at,
    EXTRACT(DAY FROM (now() - kc.created_at))::integer,
    2555,
    EXTRACT(DAY FROM (now() - kc.created_at)) > 2555
  FROM kyc_clients kc
  WHERE kc.deleted_at IS NULL
    AND EXTRACT(DAY FROM (now() - kc.created_at)) > 2555;

  -- Check client_documents
  RETURN QUERY
  SELECT
    'client_documents'::text,
    cd.id,
    cd.created_at,
    EXTRACT(DAY FROM (now() - cd.created_at))::integer,
    2555,
    EXTRACT(DAY FROM (now() - cd.created_at)) > 2555
  FROM client_documents cd
  WHERE cd.deleted_at IS NULL
    AND EXTRACT(DAY FROM (now() - cd.created_at)) > 2555;
END;
$$;