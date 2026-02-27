/*
  # Fix FATF Scoring Model to Use assessment_responses Table

  ## Changes
  - Updates all scoring functions to query assessment_responses table instead of non-existent responses column
  - Builds JSONB responses object dynamically from assessment_responses rows
  - Maintains all FATF scoring logic while fixing data access
*/

-- Drop and recreate functions with correct data access

-- ============================================================================
-- Helper function to build responses JSONB from assessment_responses table
-- ============================================================================

CREATE OR REPLACE FUNCTION get_assessment_responses_jsonb(assessment_id uuid)
RETURNS jsonb AS $$
DECLARE
  responses_json jsonb;
BEGIN
  SELECT jsonb_object_agg(question_code, response)
  INTO responses_json
  FROM assessment_responses
  WHERE assessment_id = get_assessment_responses_jsonb.assessment_id
    AND response IS NOT NULL;
  
  RETURN COALESCE(responses_json, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INHERENT RISK CALCULATION (Fixed to use assessment_responses)
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
  
  -- Calculate Client Risk (30% weight)
  client_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1A1', '1A2', '1A3', '1A4', '1A5', '1C1', '1C2', '1C3', '1E1', '1E2']
  );
  
  -- Calculate Product/Service Risk (25% weight)
  product_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1B1', '1B2', '1B3', '1B4', '1B5', '1B6']
  );
  
  -- Calculate Geographic Risk (20% weight)
  geographic_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1D1', '1D2', '1D3', '1D4', '1D5']
  );
  
  -- Calculate Transaction Risk (25% weight)
  transaction_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1B2', '1B3', '1B5', '1E1', '1E2']
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
-- CONTROL EFFECTIVENESS CALCULATION (Fixed to use assessment_responses)
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
  independent_review_score numeric;
  ce_score numeric;
BEGIN
  -- Get assessment responses as JSONB
  assessment_responses := get_assessment_responses_jsonb(assessment_id);
  
  -- Calculate Governance & Compliance (20% weight)
  governance_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2A1', '2A2', '2A3', '2A4', '2A5']
  );
  
  -- Calculate Risk Assessment (10% weight)
  risk_assessment_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2B1', '2B2', '2B3']
  );
  
  -- Calculate CDD & EDD (15% weight)
  cdd_edd_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2C1', '2C2', '2C3', '2C4', '2C5']
  );
  
  -- Calculate Monitoring & Review (15% weight)
  monitoring_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2D1', '2D2', '2D3', '2D4']
  );
  
  -- Calculate STR & Reporting (15% weight)
  str_reporting_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2E1', '2E2', '2E3']
  );
  
  -- Calculate Sanctions (10% weight)
  sanctions_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2F1', '2F2', '2F3']
  );
  
  -- Calculate Training (5% weight)
  training_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2G1', '2G2']
  );
  
  -- Calculate Recordkeeping (5% weight)
  recordkeeping_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2H1', '2H2']
  );
  
  -- Calculate Independent Review (5% weight)
  independent_review_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2I1', '2I2']
  );
  
  -- Calculate weighted Control Effectiveness (0-1 scale)
  ce_score := (governance_score * 0.20) + 
              (risk_assessment_score * 0.10) + 
              (cdd_edd_score * 0.15) + 
              (monitoring_score * 0.15) + 
              (str_reporting_score * 0.15) + 
              (sanctions_score * 0.10) + 
              (training_score * 0.05) + 
              (recordkeeping_score * 0.05) + 
              (independent_review_score * 0.05);
  
  RETURN ce_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MASTER RECALCULATION FUNCTION (Fixed to use assessment_responses)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_assessment_risk_scores(assessment_id uuid)
RETURNS void AS $$
DECLARE
  ir_data record;
  ce_score numeric;
  rr_score numeric;
  min_risk numeric;
  final_risk numeric;
  final_rating text;
  assessment_responses jsonb;
BEGIN
  -- Get assessment responses as JSONB
  assessment_responses := get_assessment_responses_jsonb(assessment_id);
  
  -- Calculate Inherent Risk
  SELECT * INTO ir_data FROM calculate_inherent_risk(assessment_id);
  
  -- Calculate Control Effectiveness
  ce_score := calculate_control_effectiveness(assessment_id);
  
  -- Calculate Residual Risk
  rr_score := calculate_residual_risk(ir_data.inherent_risk, ce_score);
  
  -- Check for critical control gaps
  min_risk := check_critical_controls(assessment_responses);
  
  -- Apply governance override (force minimum risk if critical controls missing)
  IF rr_score < min_risk THEN
    final_risk := min_risk;
  ELSE
    final_risk := rr_score;
  END IF;
  
  -- Classify risk rating
  final_rating := classify_risk_rating(final_risk);
  
  -- Update assessment with new scores
  UPDATE assessments SET
    module_1_score = ir_data.inherent_risk,
    module_2_score = 5 - (ce_score * 4),  -- Convert 0-1 CE to 1-5 risk scale (inverted)
    module_3_score = final_risk,
    overall_risk_score = final_risk,
    overall_risk_rating = final_rating,
    updated_at = now()
  WHERE id = assessment_id;
  
  -- Log the calculation for audit trail
  RAISE NOTICE 'Assessment % recalculated: IR=%, CE=%, RR=%, Final=% (%)', 
    assessment_id, ir_data.inherent_risk, ce_score, rr_score, final_risk, final_rating;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_assessment_responses_jsonb IS 'Builds JSONB object from assessment_responses table for a given assessment';
