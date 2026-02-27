/*
  # Automatic Risk Scoring Details Creation

  ## Overview
  Creates detailed risk scoring breakdown automatically when a DD profile is created.

  ## Changes
  
  1. **Function: auto_create_risk_scoring_details**
     - Automatically creates risk_scoring_details record when DD profile is created
     - Breaks down risk score into components
     - Provides detailed risk factor analysis
  
  2. **Trigger**
     - `trigger_auto_create_risk_scoring` - After INSERT on client_due_diligence_profiles
  
  ## Risk Scoring Components
  
  The function calculates:
  - Client risk score (based on client type, PEP status)
  - Geographic risk score (based on jurisdiction)
  - Service risk score (based on business activity)
  - Behavioural risk score (placeholder for ongoing monitoring)
*/

-- Function to create risk scoring details
CREATE OR REPLACE FUNCTION auto_create_risk_scoring_details()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  client_record RECORD;
  client_risk INTEGER;
  geo_risk INTEGER;
  service_risk INTEGER;
  behavioural_risk INTEGER;
  risk_factors JSONB;
BEGIN
  -- Get client details
  SELECT * INTO client_record
  FROM kyc_clients
  WHERE id = NEW.client_id;
  
  -- Calculate client risk component
  client_risk := 25; -- Base
  IF client_record.client_type IN ('corporate', 'trust') THEN
    client_risk := client_risk + 25;
  END IF;
  IF client_record.pep_status = true THEN
    client_risk := client_risk + 50;
  END IF;
  IF client_risk > 100 THEN client_risk := 100; END IF;
  
  -- Calculate geographic risk
  geo_risk := 15; -- Base
  IF client_record.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
     OR client_record.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') THEN
    geo_risk := 85;
  ELSIF client_record.country_of_residence IN ('Russia', 'Myanmar', 'Venezuela', 'Zimbabwe') 
     OR client_record.country_of_incorporation IN ('Russia', 'Myanmar', 'Venezuela', 'Zimbabwe') THEN
    geo_risk := 65;
  END IF;
  
  -- Calculate service risk
  service_risk := 20; -- Base
  IF client_record.business_activity ILIKE '%casino%' 
     OR client_record.business_activity ILIKE '%gambling%'
     OR client_record.business_activity ILIKE '%cryptocurrency%' THEN
    service_risk := 75;
  ELSIF client_record.business_activity ILIKE '%money%transfer%'
     OR client_record.business_activity ILIKE '%gold%'
     OR client_record.business_activity ILIKE '%jewelry%'
     OR client_record.business_activity ILIKE '%real estate%' THEN
    service_risk := 55;
  END IF;
  
  -- Calculate behavioural risk (starts at baseline)
  behavioural_risk := 10; -- Low initially, increases with monitoring
  
  -- Build risk factors JSON
  risk_factors := jsonb_build_object(
    'client_type', client_record.client_type,
    'pep_status', client_record.pep_status,
    'high_risk_jurisdiction', (
      client_record.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
      OR client_record.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen')
    ),
    'cash_intensive_business', (
      client_record.business_activity ILIKE '%casino%' 
      OR client_record.business_activity ILIKE '%money%transfer%'
      OR client_record.business_activity ILIKE '%cryptocurrency%'
    ),
    'auto_generated', true
  );
  
  -- Insert risk scoring details
  INSERT INTO risk_scoring_details (
    organization_id,
    dd_profile_id,
    client_id,
    client_risk_score,
    geographic_risk_score,
    service_risk_score,
    behavioural_risk_score,
    risk_factors,
    assessment_notes,
    created_at,
    updated_at
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    NEW.client_id,
    client_risk,
    geo_risk,
    service_risk,
    behavioural_risk,
    risk_factors,
    'Automatically generated initial risk assessment. Full assessment recommended.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_risk_scoring ON client_due_diligence_profiles;
CREATE TRIGGER trigger_auto_create_risk_scoring
  AFTER INSERT ON client_due_diligence_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_risk_scoring_details();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_risk_scoring_details() TO authenticated;
