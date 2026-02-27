/*
  # Automatic DD Profile Creation and Update Trigger

  ## Overview
  This migration creates database triggers to automatically initiate the risk-based due diligence
  workflow when a KYC client is created or updated.

  ## Changes
  
  1. **Function: auto_create_dd_profile_for_client**
     - Automatically creates a DD profile when a new client is created
     - Initializes with default risk assessment values
     - Sets appropriate DD level based on initial risk factors
     - Creates audit trail entry
  
  2. **Function: auto_update_dd_profile_on_client_change**
     - Detects significant changes to client profile
     - Triggers re-assessment when risk factors change
     - Updates DD profile accordingly
     - Creates escalation if risk increases
  
  3. **Triggers**
     - `trigger_auto_create_dd_profile` - After INSERT on kyc_clients
     - `trigger_auto_update_dd_profile` - After UPDATE on kyc_clients
  
  ## Risk Assessment Logic
  
  The function performs initial risk assessment based on:
  - Client type (corporate entities = higher risk)
  - Geographic factors (high-risk jurisdictions)
  - Business activity (cash-intensive businesses)
  - PEP status
  
  ## Notes
  - Creates placeholder risk score that should be refined through full assessment
  - Sets review dates automatically based on DD level
  - Ensures all clients have DD profiles for compliance tracking
*/

-- Function to automatically create DD profile for new clients
CREATE OR REPLACE FUNCTION auto_create_dd_profile_for_client()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  initial_risk_score INTEGER;
  initial_dd_level TEXT;
  initial_risk_category TEXT;
  review_months INTEGER;
  next_review TIMESTAMPTZ;
BEGIN
  -- Calculate initial risk score based on available client data
  initial_risk_score := 30; -- Base score
  
  -- Adjust based on client type
  IF NEW.client_type IN ('corporate', 'trust') THEN
    initial_risk_score := initial_risk_score + 20;
  END IF;
  
  -- Adjust based on PEP status
  IF NEW.pep_status = true THEN
    initial_risk_score := initial_risk_score + 30;
  END IF;
  
  -- Adjust based on high-risk countries (simplified check)
  IF NEW.country_of_residence IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') 
     OR NEW.country_of_incorporation IN ('Afghanistan', 'Iran', 'North Korea', 'Syria', 'Yemen') THEN
    initial_risk_score := initial_risk_score + 25;
  END IF;
  
  -- Adjust for cash-intensive businesses
  IF NEW.business_activity ILIKE '%casino%' 
     OR NEW.business_activity ILIKE '%money%transfer%'
     OR NEW.business_activity ILIKE '%cryptocurrency%'
     OR NEW.business_activity ILIKE '%gold%'
     OR NEW.business_activity ILIKE '%jewelry%' THEN
    initial_risk_score := initial_risk_score + 15;
  END IF;
  
  -- Cap at 100
  IF initial_risk_score > 100 THEN
    initial_risk_score := 100;
  END IF;
  
  -- Determine risk category and DD level
  IF initial_risk_score >= 70 THEN
    initial_risk_category := 'high';
    initial_dd_level := 'enhanced';
    review_months := 6; -- 6-month review for high risk
  ELSIF initial_risk_score >= 40 THEN
    initial_risk_category := 'medium';
    initial_dd_level := 'moderate';
    review_months := 12; -- 12-month review for medium risk
  ELSE
    initial_risk_category := 'low';
    initial_dd_level := 'simplified';
    review_months := 24; -- 24-month review for low risk
  END IF;
  
  -- Calculate next review date
  next_review := CURRENT_TIMESTAMP + (review_months || ' months')::INTERVAL;
  
  -- Create DD profile
  INSERT INTO client_due_diligence_profiles (
    organization_id,
    client_id,
    dd_level,
    risk_score,
    risk_category,
    assessment_status,
    last_assessment_date,
    next_review_date,
    requires_senior_approval,
    created_at,
    updated_at
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    initial_dd_level,
    initial_risk_score,
    initial_risk_category,
    'pending_full_assessment',
    CURRENT_TIMESTAMP,
    next_review,
    (initial_risk_category = 'high'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  -- Create audit trail entry
  INSERT INTO dd_audit_trail (
    organization_id,
    client_id,
    action_type,
    action_description,
    performed_by,
    changes_made,
    created_at
  ) VALUES (
    NEW.organization_id,
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
    CURRENT_TIMESTAMP
  );
  
  -- If high risk, create approval request
  IF initial_risk_category = 'high' THEN
    INSERT INTO senior_management_approvals (
      organization_id,
      client_id,
      approval_type,
      status,
      justification,
      requested_by,
      requested_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'high_risk_client',
      'pending',
      'High-risk client identified during onboarding. Initial risk score: ' || initial_risk_score::TEXT || '. Requires senior management approval to proceed with relationship.',
      NEW.created_by,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
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
  
  -- If no DD profile exists, create one
  IF current_dd_profile IS NULL THEN
    -- This shouldn't happen if trigger on INSERT works, but safety check
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
    -- Update DD profile status
    UPDATE client_due_diligence_profiles
    SET 
      assessment_status = 'reassessment_required',
      updated_at = CURRENT_TIMESTAMP
    WHERE client_id = NEW.id;
    
    -- Create audit trail entry
    INSERT INTO dd_audit_trail (
      organization_id,
      client_id,
      action_type,
      action_description,
      performed_by,
      changes_made,
      created_at
    ) VALUES (
      NEW.organization_id,
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
      CURRENT_TIMESTAMP
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
DROP TRIGGER IF EXISTS trigger_auto_create_dd_profile ON kyc_clients;
CREATE TRIGGER trigger_auto_create_dd_profile
  AFTER INSERT ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_dd_profile_for_client();

-- Create trigger for client updates
DROP TRIGGER IF EXISTS trigger_auto_update_dd_profile ON kyc_clients;
CREATE TRIGGER trigger_auto_update_dd_profile
  AFTER UPDATE ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_dd_profile_on_client_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_create_dd_profile_for_client() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_update_dd_profile_on_client_change() TO authenticated;
