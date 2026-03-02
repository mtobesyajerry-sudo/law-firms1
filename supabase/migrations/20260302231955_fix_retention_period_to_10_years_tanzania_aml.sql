/*
  # Fix Data Retention Period to 10 Years (Tanzania AML Compliance)
  
  1. Correction
    - Anti-Money Laundering Act (Cap.423): 10 years retention required
    - FIU Guidelines: 10 years from end of business relationship
    - Previous migration incorrectly used 7 years (GDPR standard)
  
  2. Changes
    - Update retention period to 3650 days (10 years)
    - Update all documentation references
    - Update GDPR functions to use correct period
  
  3. Legal Basis
    - Tanzania AML Act Section 16(1): 10 years retention
    - Bank of Tanzania regulations: 10 years
    - FIU reporting obligations: 10 years
*/

-- Update the identify_expired_records function to use 10 years
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
  -- Check kyc_clients (10 years = 3650 days per Tanzania AML Act)
  RETURN QUERY
  SELECT
    'kyc_clients'::text,
    kc.id,
    kc.created_at,
    EXTRACT(DAY FROM (now() - kc.created_at))::integer,
    3650, -- 10 years per Tanzania AML Act Cap.423
    EXTRACT(DAY FROM (now() - kc.created_at)) > 3650
  FROM kyc_clients kc
  WHERE kc.deleted_at IS NULL
    AND EXTRACT(DAY FROM (now() - kc.created_at)) > 3650;

  -- Check client_documents (10 years retention)
  RETURN QUERY
  SELECT
    'client_documents'::text,
    cd.id,
    cd.created_at,
    EXTRACT(DAY FROM (now() - cd.created_at))::integer,
    3650,
    EXTRACT(DAY FROM (now() - cd.created_at)) > 3650
  FROM client_documents cd
  WHERE cd.deleted_at IS NULL
    AND EXTRACT(DAY FROM (now() - cd.created_at)) > 3650;
    
  -- Check assessments (10 years retention)
  RETURN QUERY
  SELECT
    'assessments'::text,
    a.id,
    a.created_at,
    EXTRACT(DAY FROM (now() - a.created_at))::integer,
    3650,
    EXTRACT(DAY FROM (now() - a.created_at)) > 3650
  FROM assessments a
  WHERE EXTRACT(DAY FROM (now() - a.created_at)) > 3650;
  
  -- Check matters (10 years retention)
  RETURN QUERY
  SELECT
    'matters'::text,
    m.id,
    m.created_at,
    EXTRACT(DAY FROM (now() - m.created_at))::integer,
    3650,
    EXTRACT(DAY FROM (now() - m.created_at)) > 3650
  FROM matters m
  WHERE EXTRACT(DAY FROM (now() - m.created_at)) > 3650;
END;
$$;

-- Update data retention policies to reflect 10-year requirement
UPDATE data_retention_policies
SET 
  retention_period_days = 3650,
  retention_basis = 'Tanzania Anti-Money Laundering Act (Cap.423) Section 16(1) - 10 years'
WHERE table_name IN ('kyc_clients', 'client_documents', 'assessments', 'matters');

-- Add comment documenting legal requirement
COMMENT ON FUNCTION identify_expired_records() IS 
'Identifies records exceeding 10-year retention period as required by Tanzania Anti-Money Laundering Act (Cap.423) Section 16(1) and FIU Guidelines. Records must be retained for 10 years from the date of transaction completion or end of business relationship.';