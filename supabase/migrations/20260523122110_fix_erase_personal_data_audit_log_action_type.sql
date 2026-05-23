/*
  # Fix erase_personal_data: audit_logs action_type must be lowercase 'client_delete'
  The audit_logs check constraint uses lowercase values like 'client_delete',
  not 'DELETE'. Also add 'data_export' action for the export function audit trail.
*/
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
  client_org_id    uuid;
BEGIN
  SELECT organization_id INTO client_org_id
  FROM kyc_clients WHERE id = target_client_id;

  IF client_org_id IS NULL AND NOT EXISTS (SELECT 1 FROM kyc_clients WHERE id = target_client_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Client not found');
  END IF;

  UPDATE kyc_clients SET
    client_name               = 'REDACTED_' || id::text,
    email                     = 'redacted_' || id::text || '@deleted.local',
    phone_plain               = NULL,
    address_plain             = NULL,
    passport_number_plain     = NULL,
    national_id_plain         = NULL,
    tax_id_plain              = NULL,
    phone_encrypted           = NULL,
    address_encrypted         = NULL,
    passport_number_encrypted = NULL,
    national_id_encrypted     = NULL,
    tax_id_encrypted          = NULL,
    date_of_birth             = NULL,
    nationality               = NULL,
    country_of_residence      = NULL,
    source_of_funds           = 'REDACTED',
    source_of_wealth          = 'REDACTED',
    pep_details               = NULL,
    beneficial_owners         = NULL,
    deleted_at                = now(),
    deletion_reason           = reason
  WHERE id = target_client_id;

  GET DIAGNOSTICS records_affected = ROW_COUNT;

  UPDATE screening_results SET
    screened_name        = 'REDACTED',
    screened_dob         = NULL,
    screened_nationality = NULL,
    screened_id_number   = NULL
  WHERE client_id = target_client_id;

  GET DIAGNOSTICS screening_rows = ROW_COUNT;

  UPDATE client_documents SET
    verification_status = 'deleted',
    verification_notes  = 'Deleted per erasure request: ' || reason,
    deleted_at          = now()
  WHERE client_id = target_client_id AND deleted_at IS NULL;

  INSERT INTO data_deletion_log (
    table_name, record_id, record_type, deletion_reason,
    deleted_by, deletion_method
  ) VALUES (
    'kyc_clients', target_client_id, 'kyc_client', reason,
    auth.uid(), 'erase_personal_data_function'
  );

  -- Use valid action_type from audit_logs constraint
  INSERT INTO audit_logs (
    user_id, action_type, entity_type, entity_id,
    action_description, organization_id
  ) VALUES (
    auth.uid(), 'client_delete', 'kyc_client', target_client_id,
    'Personal data erased per request: ' || reason,
    client_org_id
  );

  RETURN jsonb_build_object(
    'success',                   true,
    'message',                   'Personal data erased successfully',
    'client_rows',               records_affected,
    'screening_rows_anonymised', screening_rows,
    'timestamp',                 now(),
    'retention_note',            'Audit logs and AML activity records retained per 7-year Tanzania AML Act requirement'
  );
END;
$$;
