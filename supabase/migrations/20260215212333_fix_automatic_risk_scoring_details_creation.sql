/*
  # Fix Automatic Risk Scoring Details Creation

  ## Overview
  Corrects the risk scoring details function to match actual table schema.

  ## Changes
  - Remove references to non-existent columns (organization_id, client_id, assessment_notes)
  - Use correct column names: risk_factors instead of scoring_factors
  - Ensure compatibility with actual database schema
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_auto_create_risk_scoring ON client_due_diligence_profiles;
DROP FUNCTION IF EXISTS auto_create_risk_scoring_details();

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
  institutional_risk INTEGER;
  total_risk INTEGER;
  risk_factors JSONB;
BEGIN
  -- Get client details
  SELECT * INTO client_record
  FROM kyc_clients
  WHERE id = NEW.client_id;
  
  -- If client not found, skip
  IF client_record IS NULL THEN
    RETURN NEW;
  END IF;
  
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
  
  -- Calculate institutional risk (placeholder)
  institutional_risk := 15; -- Base level
  
  -- Calculate total
  total_risk := ROUND((client_risk + geo_risk + service_risk + behavioural_risk + institutional_risk) / 5.0);
  
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
    'auto_generated', true,
    'assessment_date', CURRENT_TIMESTAMP,
    'note', 'Automatically generated initial risk assessment. Full assessment recommended.'
  );
  
  -- Insert risk scoring details
  INSERT INTO risk_scoring_details (
    dd_profile_id,
    client_risk_score,
    geographic_risk_score,
    service_risk_score,
    behavioural_risk_score,
    institutional_risk_score,
    total_risk_score,
    scoring_factors,
    created_at
  ) VALUES (
    NEW.id,
    client_risk,
    geo_risk,
    service_risk,
    behavioural_risk,
    institutional_risk,
    total_risk,
    risk_factors,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_create_risk_scoring
  AFTER INSERT ON client_due_diligence_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_risk_scoring_details();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_risk_scoring_details() TO authenticated;
