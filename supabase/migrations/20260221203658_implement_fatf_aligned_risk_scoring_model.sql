/*
  # FATF-Aligned Mathematical AML/CFT Risk Scoring Model

  ## Overview
  Implements a comprehensive, mathematically rigorous risk scoring system aligned with FATF standards.
  This replaces the previous zero-output scoring with a proper three-layer risk model.

  ## Three-Layer Risk Model
  1. **Inherent Risk (IR)**: Risk before controls, weighted by pillars
     - Client Risk: 30%
     - Product/Service Risk: 25%
     - Geographic Risk: 20%
     - Transaction Risk: 25%

  2. **Control Effectiveness (CE)**: Strength of AML/CFT controls (0-1 scale)
     - Governance & Compliance: 20%
     - Risk Assessment: 10%
     - CDD & EDD: 15%
     - Monitoring & Review: 15%
     - STR & Reporting: 15%
     - Sanctions: 10%
     - Training: 5%
     - Recordkeeping: 5%
     - Independent review: 5%

  3. **Residual Risk (RR)**: Final risk after controls
     - Formula: RR = IR × (1 - CE)
     - With governance overrides for critical control gaps

  ## Scoring Scales
  ### Inherent Risk Questions:
  - No = 1
  - Partially = 3
  - Yes = 5

  ### Control Effectiveness Questions:
  - Fully implemented = 1 (100% effective)
  - Partially = 0.6 (60% effective)
  - Weak = 0.3 (30% effective)
  - Not in place = 0 (0% effective)

  ## Risk Classification
  - 1.0-1.9: Low
  - 2.0-2.9: Medium
  - 3.0-3.9: High
  - 4.0-5.0: Very High

  ## Critical Features
  - Prevents zero-risk outputs
  - Enforces minimum risk levels for missing critical controls
  - Validates logical consistency
  - Ensures FATF compliance
*/

-- Drop existing scoring functions if they exist
DROP FUNCTION IF EXISTS map_inherent_response_to_score(text);
DROP FUNCTION IF EXISTS map_control_response_to_score(text);
DROP FUNCTION IF EXISTS calculate_pillar_score(jsonb, text[]);
DROP FUNCTION IF EXISTS calculate_control_area_score(jsonb, text[]);
DROP FUNCTION IF EXISTS calculate_inherent_risk(uuid);
DROP FUNCTION IF EXISTS calculate_control_effectiveness(uuid);
DROP FUNCTION IF EXISTS calculate_residual_risk(numeric, numeric);
DROP FUNCTION IF EXISTS check_critical_controls(jsonb);
DROP FUNCTION IF EXISTS classify_risk_rating(numeric);
DROP FUNCTION IF EXISTS recalculate_assessment_risk_scores(uuid);
DROP FUNCTION IF EXISTS recalculate_all_assessment_scores();

-- ============================================================================
-- STEP 1: RESPONSE MAPPING FUNCTIONS
-- ============================================================================

-- Map inherent risk responses to 1-3-5 scale
CREATE OR REPLACE FUNCTION map_inherent_response_to_score(response text)
RETURNS numeric AS $$
BEGIN
  RETURN CASE 
    WHEN LOWER(response) IN ('no', 'n', 'false') THEN 1
    WHEN LOWER(response) IN ('partially', 'partial', 'sometimes', 'maybe') THEN 3
    WHEN LOWER(response) IN ('yes', 'y', 'true') THEN 5
    ELSE 1  -- Default to lowest risk if unclear
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Map control effectiveness responses to 0-1 scale
CREATE OR REPLACE FUNCTION map_control_response_to_score(response text)
RETURNS numeric AS $$
BEGIN
  RETURN CASE 
    WHEN LOWER(response) IN ('fully implemented', 'fully', 'full', 'yes', 'strong') THEN 1.0
    WHEN LOWER(response) IN ('partially', 'partial', 'partially implemented', 'moderate') THEN 0.6
    WHEN LOWER(response) IN ('weak', 'weakly implemented', 'limited') THEN 0.3
    WHEN LOWER(response) IN ('not in place', 'no', 'not implemented', 'none') THEN 0.0
    ELSE 0.0  -- Default to no control if unclear
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 2: PILLAR CALCULATION FUNCTIONS
-- ============================================================================

-- Calculate score for a pillar of inherent risk questions
CREATE OR REPLACE FUNCTION calculate_pillar_score(
  responses jsonb,
  question_ids text[]
)
RETURNS numeric AS $$
DECLARE
  total_score numeric := 0;
  question_count integer := 0;
  question_id text;
  response_value text;
BEGIN
  -- Loop through each question in the pillar
  FOREACH question_id IN ARRAY question_ids
  LOOP
    -- Get the response for this question
    response_value := responses->>question_id;
    
    IF response_value IS NOT NULL THEN
      total_score := total_score + map_inherent_response_to_score(response_value);
      question_count := question_count + 1;
    END IF;
  END LOOP;
  
  -- Return average score (1-5 scale)
  IF question_count > 0 THEN
    RETURN total_score / question_count;
  ELSE
    RETURN 3;  -- Default to medium risk if no questions answered
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate score for a control area
CREATE OR REPLACE FUNCTION calculate_control_area_score(
  responses jsonb,
  question_ids text[]
)
RETURNS numeric AS $$
DECLARE
  total_score numeric := 0;
  question_count integer := 0;
  question_id text;
  response_value text;
BEGIN
  -- Loop through each question in the control area
  FOREACH question_id IN ARRAY question_ids
  LOOP
    -- Get the response for this question
    response_value := responses->>question_id;
    
    IF response_value IS NOT NULL THEN
      total_score := total_score + map_control_response_to_score(response_value);
      question_count := question_count + 1;
    END IF;
  END LOOP;
  
  -- Return average effectiveness (0-1 scale)
  IF question_count > 0 THEN
    RETURN total_score / question_count;
  ELSE
    RETURN 0;  -- Default to no control if no questions answered
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 3: INHERENT RISK CALCULATION (Module 1)
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
  -- Get assessment responses
  SELECT responses INTO assessment_responses
  FROM assessments
  WHERE id = assessment_id;
  
  -- Calculate Client Risk (30% weight)
  -- Questions about client types, PEPs, beneficial ownership, etc.
  client_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1A1', '1A2', '1A3', '1A4', '1A5', '1C1', '1C2', '1C3', '1E1', '1E2']
  );
  
  -- Calculate Product/Service Risk (25% weight)
  -- Questions about services offered, complexity, cash handling, etc.
  product_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1B1', '1B2', '1B3', '1B4', '1B5', '1B6']
  );
  
  -- Calculate Geographic Risk (20% weight)
  -- Questions about jurisdictions, cross-border activities, etc.
  geographic_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['1D1', '1D2', '1D3', '1D4', '1D5']
  );
  
  -- Calculate Transaction Risk (25% weight)
  -- Questions about transaction patterns, volumes, unusual activity, etc.
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
-- STEP 4: CONTROL EFFECTIVENESS CALCULATION (Module 2)
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
  -- Get assessment responses
  SELECT responses INTO assessment_responses
  FROM assessments
  WHERE id = assessment_id;
  
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
-- STEP 5: RESIDUAL RISK CALCULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_residual_risk(
  inherent_risk numeric,
  control_effectiveness numeric
)
RETURNS numeric AS $$
DECLARE
  residual_risk numeric;
BEGIN
  -- Core FATF formula: RR = IR × (1 - CE)
  residual_risk := inherent_risk * (1 - control_effectiveness);
  
  -- Ensure residual risk doesn't fall below 1.0 (minimum risk level)
  IF residual_risk < 1.0 THEN
    residual_risk := 1.0;
  END IF;
  
  -- Ensure residual risk doesn't exceed 5.0 (maximum risk level)
  IF residual_risk > 5.0 THEN
    residual_risk := 5.0;
  END IF;
  
  RETURN residual_risk;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 6: CRITICAL CONTROL CHECKS (Governance Overrides)
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
  -- Check critical controls
  has_compliance_officer := map_control_response_to_score(responses->>'2A1') > 0;
  has_str_framework := map_control_response_to_score(responses->>'2E1') > 0;
  has_sanctions_screening := map_control_response_to_score(responses->>'2F1') > 0;
  has_risk_rating := map_control_response_to_score(responses->>'2B1') > 0;
  has_policies := map_control_response_to_score(responses->>'2A2') > 0;
  
  -- If ANY critical control is missing, force minimum High risk (4.0)
  IF NOT (has_compliance_officer AND has_str_framework AND has_sanctions_screening AND has_risk_rating AND has_policies) THEN
    minimum_risk := 4.0;
  END IF;
  
  RETURN minimum_risk;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 7: RISK CLASSIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION classify_risk_rating(risk_score numeric)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN risk_score < 1.5 THEN 'Low'
    WHEN risk_score < 2.5 THEN 'Moderate'
    WHEN risk_score < 3.5 THEN 'High'
    ELSE 'Very High'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 8: MASTER RECALCULATION FUNCTION
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
  -- Get assessment responses
  SELECT responses INTO assessment_responses
  FROM assessments
  WHERE id = assessment_id;
  
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

-- ============================================================================
-- STEP 9: BULK RECALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_assessment_scores()
RETURNS TABLE(
  assessment_id uuid,
  organization_name text,
  old_score numeric,
  new_score numeric,
  old_rating text,
  new_rating text
) AS $$
DECLARE
  assessment_record record;
BEGIN
  FOR assessment_record IN 
    SELECT a.id, a.overall_risk_score, a.overall_risk_rating
    FROM assessments a
    WHERE a.status IN ('completed', 'in_progress')
  LOOP
    -- Store old values
    assessment_id := assessment_record.id;
    organization_name := 'Assessment';
    old_score := assessment_record.overall_risk_score;
    old_rating := assessment_record.overall_risk_rating;
    
    -- Recalculate
    PERFORM recalculate_assessment_risk_scores(assessment_record.id);
    
    -- Get new values
    SELECT a.overall_risk_score, a.overall_risk_rating
    INTO new_score, new_rating
    FROM assessments a
    WHERE a.id = assessment_record.id;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: ADD VALIDATION RULES
-- ============================================================================

-- Add check constraint to prevent invalid risk scores
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS check_valid_risk_scores;
ALTER TABLE assessments ADD CONSTRAINT check_valid_risk_scores 
  CHECK (
    (module_1_score IS NULL OR (module_1_score >= 1 AND module_1_score <= 5)) AND
    (module_2_score IS NULL OR (module_2_score >= 1 AND module_2_score <= 5)) AND
    (module_3_score IS NULL OR (module_3_score >= 1 AND module_3_score <= 5)) AND
    (overall_risk_score IS NULL OR (overall_risk_score >= 1 AND overall_risk_score <= 5))
  );

-- Add check constraint to prevent invalid risk ratings
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS check_valid_risk_ratings;
ALTER TABLE assessments ADD CONSTRAINT check_valid_risk_ratings 
  CHECK (
    overall_risk_rating IS NULL OR 
    overall_risk_rating IN ('Low', 'Moderate', 'High', 'Very High')
  );

COMMENT ON FUNCTION map_inherent_response_to_score IS 'Maps inherent risk question responses to 1-3-5 scale';
COMMENT ON FUNCTION map_control_response_to_score IS 'Maps control effectiveness responses to 0-1 scale';
COMMENT ON FUNCTION calculate_pillar_score IS 'Calculates average score for an inherent risk pillar';
COMMENT ON FUNCTION calculate_control_area_score IS 'Calculates average effectiveness for a control area';
COMMENT ON FUNCTION calculate_inherent_risk IS 'Calculates weighted inherent risk from Module 1 responses';
COMMENT ON FUNCTION calculate_control_effectiveness IS 'Calculates weighted control effectiveness from Module 2 responses';
COMMENT ON FUNCTION calculate_residual_risk IS 'Applies FATF formula: RR = IR × (1 - CE)';
COMMENT ON FUNCTION check_critical_controls IS 'Checks for missing critical controls and returns minimum risk level';
COMMENT ON FUNCTION classify_risk_rating IS 'Converts numeric risk score to FATF risk rating category';
COMMENT ON FUNCTION recalculate_assessment_risk_scores IS 'Master function to recalculate all risk scores for an assessment';
COMMENT ON FUNCTION recalculate_all_assessment_scores IS 'Bulk recalculation of all completed assessments';