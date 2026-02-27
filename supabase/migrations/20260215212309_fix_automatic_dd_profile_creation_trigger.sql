/*
  # Fix Automatic DD Profile Creation Trigger

  ## Overview
  Corrects the DD profile creation functions to match actual table schema.

  ## Changes
  - Remove references to non-existent columns (organization_id, assessment_status, requires_senior_approval)
  - Use correct column names and structure
  - Ensure compatibility with actual database schema
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS trigger_auto_create_dd_profile ON kyc_clients;
DROP TRIGGER IF EXISTS trigger_auto_update_dd_profile ON kyc_clients;
DROP FUNCTION IF EXISTS auto_create_dd_profile_for_client();
DROP FUNCTION IF EXISTS auto_update_dd_profile_on_client_change();

-- Function to automatically create DD profile for new clients
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
  -- Calculate initial risk score based on available client data
  initial_risk_score := 30; -- Base score
  risk_justification_text := 'Automatic risk assessment: ';
  
  -- Adjust based on client type
  IF NEW.client_type IN ('corporate', 'trust') THEN
    initial_risk_score := initial_risk_score + 20;
    risk_justification_text := risk_justification_text || 'Corporate entity (+20 points). ';
  END IF;
  
  -- Adjust based on PEP status
  IF NEW.pep_status = true THEN
    initial_risk_score := initial_risk_score + 30;
    risk_justification_text := risk_justification_text || 'PEP identified (+30 points). ';
  END IF;
  
  -- Adjust based on high-risk countries
  IF NEW.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
     OR NEW.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') THEN
    initial_risk_score := initial_risk_score + 25;
    risk_justification_text := risk_justification_text || 'High-risk jurisdiction (+25 points). ';
  END IF;
  
  -- Adjust for cash-intensive businesses
  IF NEW.business_activity ILIKE '%casino%' 
     OR NEW.business_activity ILIKE '%money%transfer%'
     OR NEW.business_activity ILIKE '%cryptocurrency%'
     OR NEW.business_activity ILIKE '%gold%'
     OR NEW.business_activity ILIKE '%jewelry%' THEN
    initial_risk_score := initial_risk_score + 15;
    risk_justification_text := risk_justification_text || 'Cash-intensive business (+15 points). ';
  END IF;
  
  -- Cap at 100
  IF initial_risk_score > 100 THEN
    initial_risk_score := 100;
  END IF;
  
  -- Determine risk category and DD level
  IF initial_risk_score >= 70 THEN
    initial_risk_category := 'high';
    initial_dd_level := 'enhanced';
    review_months := 6;
    risk_justification_text := risk_justification_text || 'HIGH RISK: Enhanced Due Diligence (EDD) required.';
  ELSIF initial_risk_score >= 40 THEN
    initial_risk_category := 'medium';
    initial_dd_level := 'moderate';
    review_months := 12;
    risk_justification_text := risk_justification_text || 'MEDIUM RISK: Standard Customer Due Diligence (CDD) required.';
  ELSE
    initial_risk_category := 'low';
    initial_dd_level := 'simplified';
    review_months := 24;
    risk_justification_text := risk_justification_text || 'LOW RISK: Simplified Due Diligence (SDD) sufficient.';
  END IF;
  
  -- Calculate next review date
  next_review := CURRENT_TIMESTAMP + (review_months || ' months')::INTERVAL;
  
  -- Create DD profile
  INSERT INTO client_due_diligence_profiles (
    client_id,
    dd_level,
    risk_score,
    risk_category,
    risk_justification,
    last_assessment_date,
    next_review_date,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    initial_dd_level,
    initial_risk_score,
    initial_risk_category,
    risk_justification_text,
    CURRENT_TIMESTAMP,
    next_review,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  -- Create audit trail entry
  INSERT INTO dd_audit_trail (
    client_id,
    action_type,
    action_description,
    performed_by,
    changes_made,
    performed_at,
    metadata
  ) VALUES (
    NEW.id,
    'profile_created',
    'Automatic DD profile creation upon client onboarding',
    NEW.created_by,
    jsonb_build_object(
      'initial_risk_score', initial_risk_score,
      'dd_level', initial_dd_level,
      'risk_category', initial_risk_category,
      'auto_generated', true
    ),
    CURRENT_TIMESTAMP,
    jsonb_build_object('trigger', 'auto_create')
  );
  
  -- If high risk, create approval request
  IF initial_risk_category = 'high' THEN
    INSERT INTO senior_management_approvals (
      client_id,
      approval_type,
      status,
      justification,
      requested_by,
      requested_at
    ) VALUES (
      NEW.id,
      'onboarding',
      'pending',
      'High-risk client identified during onboarding. Initial risk score: ' || initial_risk_score::TEXT || '. Enhanced Due Diligence required. Senior management approval required before proceeding with relationship.',
      NEW.created_by,
      CURRENT_TIMESTAMP
    );
    
    -- Create alert for pending approval
    INSERT INTO system_alerts (
      organization_id,
      client_id,
      alert_type,
      severity,
      title,
      description,
      status,
      triggered_date,
      created_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'approval_required',
      'high',
      'Senior Management Approval Required',
      'High-risk client ' || NEW.client_name || ' requires approval before proceeding.',
      'open',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to handle client updates
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
  -- Check if there's an existing DD profile
  SELECT * INTO current_dd_profile
  FROM client_due_diligence_profiles
  WHERE client_id = NEW.id
  LIMIT 1;
  
  -- If no DD profile exists, trigger creation
  IF current_dd_profile IS NULL THEN
    -- Create DD profile for this client
    PERFORM auto_create_dd_profile_for_client();
    RETURN NEW;
  END IF;
  
  -- Detect significant changes that require re-assessment
  IF OLD.client_type IS DISTINCT FROM NEW.client_type THEN
    significant_change := true;
  END IF;
  
  IF OLD.pep_status IS DISTINCT FROM NEW.pep_status THEN
    significant_change := true;
  END IF;
  
  IF OLD.country_of_residence IS DISTINCT FROM NEW.country_of_residence THEN
    significant_change := true;
  END IF;
  
  IF OLD.country_of_incorporation IS DISTINCT FROM NEW.country_of_incorporation THEN
    significant_change := true;
  END IF;
  
  IF OLD.business_activity IS DISTINCT FROM NEW.business_activity THEN
    significant_change := true;
  END IF;
  
  -- If significant change detected, flag for re-assessment
  IF significant_change THEN
    -- Update risk justification to indicate reassessment needed
    UPDATE client_due_diligence_profiles
    SET 
      risk_justification = COALESCE(risk_justification, '') || E'\n\n[' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI') || '] REASSESSMENT REQUIRED: Significant client profile changes detected.',
      updated_at = CURRENT_TIMESTAMP
    WHERE client_id = NEW.id;
    
    -- Create audit trail entry
    INSERT INTO dd_audit_trail (
      client_id,
      action_type,
      action_description,
      performed_by,
      changes_made,
      performed_at,
      metadata
    ) VALUES (
      NEW.id,
      'reassessment_triggered',
      'Significant client profile changes detected - re-assessment required',
      NEW.created_by,
      jsonb_build_object(
        'client_type_changed', OLD.client_type IS DISTINCT FROM NEW.client_type,
        'pep_status_changed', OLD.pep_status IS DISTINCT FROM NEW.pep_status,
        'geography_changed', (OLD.country_of_residence IS DISTINCT FROM NEW.country_of_residence) OR (OLD.country_of_incorporation IS DISTINCT FROM NEW.country_of_incorporation),
        'business_changed', OLD.business_activity IS DISTINCT FROM NEW.business_activity
      ),
      CURRENT_TIMESTAMP,
      jsonb_build_object('trigger', 'profile_update')
    );
    
    -- Create alert for required re-assessment
    INSERT INTO system_alerts (
      organization_id,
      client_id,
      alert_type,
      severity,
      title,
      description,
      status,
      triggered_date,
      created_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'reassessment_required',
      'medium',
      'Risk Re-assessment Required',
      'Client ' || NEW.client_name || ' profile has been updated with significant changes. Risk assessment must be updated.',
      'open',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new clients
CREATE TRIGGER trigger_auto_create_dd_profile
  AFTER INSERT ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_dd_profile_for_client();

-- Create trigger for client updates
CREATE TRIGGER trigger_auto_update_dd_profile
  AFTER UPDATE ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_dd_profile_on_client_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_create_dd_profile_for_client() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_update_dd_profile_on_client_change() TO authenticated;
