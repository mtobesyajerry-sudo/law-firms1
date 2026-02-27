/*
  # Fix Question Codes for FATF Pillar Mapping

  ## Changes
  - Updates all question code references to use dots (e.g., "1A.1" not "1A1")
  - Maps questions correctly to FATF risk pillars based on actual data structure:
    
    **Module 1 - Inherent Risk Pillars:**
    - Client Risk (30%): 1B.* (client types) + 1E.* (delivery channels)
    - Product/Service Risk (25%): 1A.* (services offered)
    - Geographic Risk (20%): 1D.* (jurisdictions)
    - Transaction Risk (25%): 1C.* (transaction types) + 1F.* (other risk factors)
    
    **Module 2 - Control Effectiveness:**
    - Governance: 2A.*
    - Risk Assessment: 2B.*
    - CDD/EDD: 2C.*
    - Monitoring: 2D.*
    - STR/Reporting: 2E.*
    - Sanctions: 2F.*
    - Training: 2G.*
    - Recordkeeping: 2H.*
*/

-- ============================================================================
-- INHERENT RISK CALCULATION (Fixed with correct question codes and mappings)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_inherent_risk(assessment_id uuid)
RETURNS TABLE(
  client_risk numeric,
  product_risk numeric,
  geographic_risk numeric,
  transaction_risk numeric,
  inherent_risk numeric
) AS $$
DECLARE
  assessment_responses jsonb;
  client_score numeric;
  product_score numeric;
  geographic_score numeric;
  transaction_score numeric;
  ir_score numeric;
BEGIN
  -- Get assessment responses as JSONB
  assessment_responses := get_assessment_responses_jsonb(assessment_id);
  
  -- Calculate Client Risk (30% weight) - Client types + Delivery channels
  client_score := (
    calculate_pillar_score(
      assessment_responses,
      ARRAY['1B.1', '1B.2', '1B.3', '1B.4', '1B.5', '1B.6', '1B.7', '1B.8', '1B.9']
    ) * 0.6 +
    calculate_pillar_score(
      assessment_responses,
      ARRAY['1E.1', '1E.2', '1E.3', '1E.4', '1E.5']
    ) * 0.4
  );
  
  -- Calculate Product/Service Risk (25% weight) - Services offered
  product_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1A.1', '1A.2', '1A.3', '1A.4', '1A.5', '1A.6', '1A.7', '1A.8', '1A.9', '1A.10']
  );
  
  -- Calculate Geographic Risk (20% weight) - Jurisdictions
  geographic_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1D.1', '1D.2', '1D.3', '1D.4', '1D.5']
  );
  
  -- Calculate Transaction Risk (25% weight) - Transaction types + Other factors
  transaction_score := (
    calculate_pillar_score(
      assessment_responses,
      ARRAY['1C.1', '1C.2', '1C.3', '1C.4', '1C.5', '1C.6']
    ) * 0.55 +
    calculate_pillar_score(
      assessment_responses,
      ARRAY['1F.1', '1F.2', '1F.3', '1F.4', '1F.5']
    ) * 0.45
  );
  
  -- Calculate weighted Inherent Risk
  ir_score := (client_score * 0.30) + 
              (product_score * 0.25) + 
              (geographic_score * 0.20) + 
              (transaction_score * 0.25);
  
  RETURN QUERY SELECT client_score, product_score, geographic_score, transaction_score, ir_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONTROL EFFECTIVENESS CALCULATION (Fixed with correct question codes)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_control_effectiveness(assessment_id uuid)
RETURNS numeric AS $$
DECLARE
  assessment_responses jsonb;
  governance_score numeric;
  risk_assessment_score numeric;
  cdd_edd_score numeric;
  monitoring_score numeric;
  str_reporting_score numeric;
  sanctions_score numeric;
  training_score numeric;
  recordkeeping_score numeric;
  ce_score numeric;
BEGIN
  -- Get assessment responses as JSONB
  assessment_responses := get_assessment_responses_jsonb(assessment_id);
  
  -- Calculate Governance & Compliance (20% weight)
  governance_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2A.1', '2A.2', '2A.3', '2A.4', '2A.5']
  );
  
  -- Calculate Risk Assessment (10% weight)
  risk_assessment_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2B.1', '2B.2', '2B.3', '2B.4']
  );
  
  -- Calculate CDD & EDD (15% weight)
  cdd_edd_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2C.1', '2C.2', '2C.3', '2C.4', '2C.5', '2C.6']
  );
  
  -- Calculate Monitoring & Review (15% weight)
  monitoring_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2D.1', '2D.2', '2D.3']
  );
  
  -- Calculate STR & Reporting (15% weight)
  str_reporting_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2E.1', '2E.2', '2E.3', '2E.4']
  );
  
  -- Calculate Sanctions (10% weight)
  sanctions_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2F.1', '2F.2', '2F.3']
  );
  
  -- Calculate Training (10% weight) - increased from 5%
  training_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2G.1', '2G.2', '2G.3', '2G.4', '2G.5']
  );
  
  -- Calculate Recordkeeping (10% weight) - increased from 5%
  recordkeeping_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2H.1', '2H.2', '2H.3', '2H.4', '2H.5']
  );
  
  -- Calculate weighted Control Effectiveness (0-1 scale)
  -- Note: Removed independent review as it's not in the data
  ce_score := (governance_score * 0.20) + 
              (risk_assessment_score * 0.10) + 
              (cdd_edd_score * 0.15) + 
              (monitoring_score * 0.15) + 
              (str_reporting_score * 0.15) + 
              (sanctions_score * 0.10) + 
              (training_score * 0.10) + 
              (recordkeeping_score * 0.10);
  
  RETURN ce_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRITICAL CONTROLS CHECK (Fixed with correct question codes)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_critical_controls(responses jsonb)
RETURNS numeric AS $$
DECLARE
  has_compliance_officer boolean;
  has_str_framework boolean;
  has_sanctions_screening boolean;
  has_risk_rating boolean;
  has_policies boolean;
  minimum_risk numeric := 1.0;
BEGIN
  -- Check critical controls using correct question codes with dots
  has_compliance_officer := map_control_response_to_score(responses->>'2A.1') > 0;
  has_str_framework := map_control_response_to_score(responses->>'2E.1') > 0;
  has_sanctions_screening := map_control_response_to_score(responses->>'2F.1') > 0;
  has_risk_rating := map_control_response_to_score(responses->>'2B.1') > 0;
  has_policies := map_control_response_to_score(responses->>'2A.2') > 0;
  
  -- If ANY critical control is missing, force minimum High risk (4.0)
  IF NOT (has_compliance_officer AND has_str_framework AND has_sanctions_screening AND has_risk_rating AND has_policies) THEN
    minimum_risk := 4.0;
  END IF;
  
  RETURN minimum_risk;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
