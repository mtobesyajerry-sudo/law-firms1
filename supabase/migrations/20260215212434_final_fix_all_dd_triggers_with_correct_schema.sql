/*
  # Final Fix: All DD Triggers with Correct Schema

  ## Overview
  Comprehensive fix for all DD profile triggers using correct table schemas.

  ## Changes
  - Fix dd_audit_trail inserts to use: previous_state, new_state, justification instead of changes_made
  - Ensure all functions use correct column names
  - Backfill existing clients
*/

-- Drop all existing triggers and functions
DROP TRIGGER IF EXISTS trigger_auto_create_dd_profile ON kyc_clients;
DROP TRIGGER IF EXISTS trigger_auto_update_dd_profile ON kyc_clients;
DROP TRIGGER IF EXISTS trigger_auto_create_risk_scoring ON client_due_diligence_profiles;
DROP FUNCTION IF EXISTS auto_create_dd_profile_for_client();
DROP FUNCTION IF EXISTS auto_update_dd_profile_on_client_change();
DROP FUNCTION IF EXISTS auto_create_risk_scoring_details();
DROP FUNCTION IF EXISTS backfill_dd_profiles_for_existing_clients();

-- 1. Function to automatically create DD profile for new clients
CREATE OR REPLACE FUNCTION auto_create_dd_profile_for_client()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  initial_risk_score INTEGER;
  initial_dd_level dd_level;
  initial_risk_category TEXT;
  review_months INTEGER;
  next_review TIMESTAMPTZ;
  risk_justification_text TEXT;
BEGIN
  initial_risk_score := 30;
  risk_justification_text := 'Automatic risk assessment: ';
  
  IF NEW.client_type IN ('corporate', 'trust') THEN
    initial_risk_score := initial_risk_score + 20;
    risk_justification_text := risk_justification_text || 'Corporate entity (+20). ';
  END IF;
  
  IF NEW.pep_status = true THEN
    initial_risk_score := initial_risk_score + 30;
    risk_justification_text := risk_justification_text || 'PEP (+30). ';
  END IF;
  
  IF NEW.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
     OR NEW.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') THEN
    initial_risk_score := initial_risk_score + 25;
    risk_justification_text := risk_justification_text || 'High-risk jurisdiction (+25). ';
  END IF;
  
  IF NEW.business_activity ILIKE '%casino%' OR NEW.business_activity ILIKE '%money%transfer%'
     OR NEW.business_activity ILIKE '%cryptocurrency%' OR NEW.business_activity ILIKE '%gold%'
     OR NEW.business_activity ILIKE '%jewelry%' THEN
    initial_risk_score := initial_risk_score + 15;
    risk_justification_text := risk_justification_text || 'Cash-intensive business (+15). ';
  END IF;
  
  IF initial_risk_score > 100 THEN initial_risk_score := 100; END IF;
  
  IF initial_risk_score >= 70 THEN
    initial_risk_category := 'high';
    initial_dd_level := 'enhanced';
    review_months := 6;
    risk_justification_text := risk_justification_text || 'HIGH RISK: EDD required.';
  ELSIF initial_risk_score >= 40 THEN
    initial_risk_category := 'medium';
    initial_dd_level := 'moderate';
    review_months := 12;
    risk_justification_text := risk_justification_text || 'MEDIUM RISK: CDD required.';
  ELSE
    initial_risk_category := 'low';
    initial_dd_level := 'simplified';
    review_months := 24;
    risk_justification_text := risk_justification_text || 'LOW RISK: SDD sufficient.';
  END IF;
  
  next_review := CURRENT_TIMESTAMP + (review_months || ' months')::INTERVAL;
  
  INSERT INTO client_due_diligence_profiles (
    client_id, dd_level, risk_score, risk_category, risk_justification,
    last_assessment_date, next_review_date, created_at, updated_at
  ) VALUES (
    NEW.id, initial_dd_level, initial_risk_score, initial_risk_category, risk_justification_text,
    CURRENT_TIMESTAMP, next_review, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );
  
  INSERT INTO dd_audit_trail (
    client_id, action_type, action_description, performed_by,
    previous_state, new_state, justification, performed_at, metadata
  ) VALUES (
    NEW.id, 'profile_created', 'Automatic DD profile creation upon client onboarding', NEW.created_by,
    '{}'::jsonb,
    jsonb_build_object('risk_score', initial_risk_score, 'dd_level', initial_dd_level, 'risk_category', initial_risk_category),
    'Automatically generated based on client profile data',
    CURRENT_TIMESTAMP,
    jsonb_build_object('trigger', 'auto_create', 'auto_generated', true)
  );
  
  IF initial_risk_category = 'high' THEN
    INSERT INTO senior_management_approvals (
      client_id, approval_type, status, justification, requested_by, requested_at
    ) VALUES (
      NEW.id, 'onboarding', 'pending',
      'High-risk client (score: ' || initial_risk_score || '). EDD required. Senior approval needed.',
      NEW.created_by, CURRENT_TIMESTAMP
    );
    
    INSERT INTO system_alerts (
      organization_id, client_id, alert_type, severity, title, description,
      status, triggered_date, created_at
    ) VALUES (
      NEW.organization_id, NEW.id, 'approval_required', 'high',
      'Senior Management Approval Required',
      'High-risk client ' || NEW.client_name || ' requires approval.',
      'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Function to handle client updates
CREATE OR REPLACE FUNCTION auto_update_dd_profile_on_client_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_dd_profile RECORD;
  significant_change BOOLEAN := false;
BEGIN
  SELECT * INTO current_dd_profile
  FROM client_due_diligence_profiles
  WHERE client_id = NEW.id;
  
  IF current_dd_profile IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.client_type IS DISTINCT FROM NEW.client_type
     OR OLD.pep_status IS DISTINCT FROM NEW.pep_status
     OR OLD.country_of_residence IS DISTINCT FROM NEW.country_of_residence
     OR OLD.country_of_incorporation IS DISTINCT FROM NEW.country_of_incorporation
     OR OLD.business_activity IS DISTINCT FROM NEW.business_activity THEN
    significant_change := true;
  END IF;
  
  IF significant_change THEN
    UPDATE client_due_diligence_profiles
    SET 
      risk_justification = COALESCE(risk_justification, '') || E'\n\n[' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD') || '] REASSESSMENT REQUIRED: Profile changes detected.',
      updated_at = CURRENT_TIMESTAMP
    WHERE client_id = NEW.id;
    
    INSERT INTO dd_audit_trail (
      client_id, action_type, action_description, performed_by,
      previous_state, new_state, justification, performed_at, metadata
    ) VALUES (
      NEW.id, 'reassessment_triggered', 'Significant profile changes detected', NEW.created_by,
      jsonb_build_object('client_type', OLD.client_type, 'pep_status', OLD.pep_status),
      jsonb_build_object('client_type', NEW.client_type, 'pep_status', NEW.pep_status),
      'Client profile updated - risk assessment review required',
      CURRENT_TIMESTAMP,
      jsonb_build_object('trigger', 'profile_update')
    );
    
    INSERT INTO system_alerts (
      organization_id, client_id, alert_type, severity, title, description,
      status, triggered_date, created_at
    ) VALUES (
      NEW.organization_id, NEW.id, 'reassessment_required', 'medium',
      'Risk Re-assessment Required',
      'Client ' || NEW.client_name || ' profile updated. Review risk assessment.',
      'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Function to create risk scoring details
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
BEGIN
  SELECT * INTO client_record FROM kyc_clients WHERE id = NEW.client_id;
  
  IF client_record IS NULL THEN RETURN NEW; END IF;
  
  client_risk := 25;
  IF client_record.client_type IN ('corporate', 'trust') THEN client_risk := client_risk + 25; END IF;
  IF client_record.pep_status = true THEN client_risk := client_risk + 50; END IF;
  IF client_risk > 100 THEN client_risk := 100; END IF;
  
  geo_risk := 15;
  IF client_record.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
     OR client_record.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') THEN
    geo_risk := 85;
  END IF;
  
  service_risk := 20;
  IF client_record.business_activity ILIKE '%casino%' OR client_record.business_activity ILIKE '%cryptocurrency%' THEN
    service_risk := 75;
  END IF;
  
  behavioural_risk := 10;
  institutional_risk := 15;
  total_risk := ROUND((client_risk + geo_risk + service_risk + behavioural_risk + institutional_risk) / 5.0);
  
  INSERT INTO risk_scoring_details (
    dd_profile_id, client_risk_score, geographic_risk_score, service_risk_score,
    behavioural_risk_score, institutional_risk_score, total_risk_score,
    scoring_factors, created_at
  ) VALUES (
    NEW.id, client_risk, geo_risk, service_risk, behavioural_risk, institutional_risk, total_risk,
    jsonb_build_object('auto_generated', true, 'date', CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$;

-- 4. Backfill function
CREATE OR REPLACE FUNCTION backfill_dd_profiles_for_existing_clients()
RETURNS TABLE (clients_processed INTEGER, profiles_created INTEGER, high_risk_clients INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record RECORD;
  processed_count INTEGER := 0;
  created_count INTEGER := 0;
  high_risk_count INTEGER := 0;
  initial_risk_score INTEGER;
  initial_dd_level dd_level;
  initial_risk_category TEXT;
  review_months INTEGER;
  next_review TIMESTAMPTZ;
BEGIN
  FOR client_record IN
    SELECT c.* FROM kyc_clients c
    LEFT JOIN client_due_diligence_profiles dd ON c.id = dd.client_id
    WHERE dd.id IS NULL
  LOOP
    processed_count := processed_count + 1;
    initial_risk_score := 30;
    
    IF client_record.client_type IN ('corporate', 'trust') THEN initial_risk_score := initial_risk_score + 20; END IF;
    IF client_record.pep_status = true THEN initial_risk_score := initial_risk_score + 30; END IF;
    IF initial_risk_score > 100 THEN initial_risk_score := 100; END IF;
    
    IF initial_risk_score >= 70 THEN
      initial_risk_category := 'high';
      initial_dd_level := 'enhanced';
      review_months := 6;
      high_risk_count := high_risk_count + 1;
    ELSIF initial_risk_score >= 40 THEN
      initial_risk_category := 'medium';
      initial_dd_level := 'moderate';
      review_months := 12;
    ELSE
      initial_risk_category := 'low';
      initial_dd_level := 'simplified';
      review_months := 24;
    END IF;
    
    next_review := CURRENT_TIMESTAMP + (review_months || ' months')::INTERVAL;
    
    INSERT INTO client_due_diligence_profiles (
      client_id, dd_level, risk_score, risk_category,
      risk_justification, last_assessment_date, next_review_date, created_at, updated_at
    ) VALUES (
      client_record.id, initial_dd_level, initial_risk_score, initial_risk_category,
      'Backfilled assessment. Score: ' || initial_risk_score || '. Level: ' || initial_dd_level,
      CURRENT_TIMESTAMP, next_review, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    
    created_count := created_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed_count, created_count, high_risk_count;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_auto_create_dd_profile
  AFTER INSERT ON kyc_clients
  FOR EACH ROW EXECUTE FUNCTION auto_create_dd_profile_for_client();

CREATE TRIGGER trigger_auto_update_dd_profile
  AFTER UPDATE ON kyc_clients
  FOR EACH ROW EXECUTE FUNCTION auto_update_dd_profile_on_client_change();

CREATE TRIGGER trigger_auto_create_risk_scoring
  AFTER INSERT ON client_due_diligence_profiles
  FOR EACH ROW EXECUTE FUNCTION auto_create_risk_scoring_details();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_dd_profile_for_client() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_update_dd_profile_on_client_change() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_create_risk_scoring_details() TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_dd_profiles_for_existing_clients() TO authenticated;

-- Run backfill
SELECT * FROM backfill_dd_profiles_for_existing_clients();
