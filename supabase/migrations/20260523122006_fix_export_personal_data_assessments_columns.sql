/*
  # Fix export_personal_data: assessments columns
  assessments has no risk_level column — only overall_risk_score and framework_type.
*/
CREATE OR REPLACE FUNCTION export_personal_data(target_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_data      jsonb;
  documents_data   jsonb;
  matters_data     jsonb;
  screening_data   jsonb;
  assessments_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',              id,
    'client_name',     client_name,
    'email',           email,
    'phone',           phone,
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

  SELECT jsonb_agg(jsonb_build_object(
    'document_id',         id,
    'document_type',       document_type,
    'document_name',       document_name,
    'file_name',           file_name,
    'verification_status', verification_status,
    'uploaded_at',         uploaded_at
  )) INTO documents_data
  FROM client_documents
  WHERE client_id = target_client_id AND deleted_at IS NULL;

  SELECT jsonb_agg(jsonb_build_object(
    'matter_id',   m.id,
    'matter_type', m.matter_type,
    'status',      m.status,
    'created_at',  m.created_at
  )) INTO matters_data
  FROM matters m
  JOIN client_matter_relationships cmr ON m.id = cmr.matter_id
  WHERE cmr.client_id = target_client_id;

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

  SELECT jsonb_agg(jsonb_build_object(
    'assessment_id', a.id,
    'framework',     a.framework_type,
    'overall_score', a.overall_risk_score,
    'created_at',    a.created_at
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
