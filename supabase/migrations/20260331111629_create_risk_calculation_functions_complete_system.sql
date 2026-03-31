/*
  # Create Complete Risk Calculation Functions System

  ## Overview
  Creates all necessary functions for calculating FATF-aligned risk scores from assessment responses.
  
  ## Functions Created
  1. get_assessment_responses_jsonb() - Convert responses to JSONB for processing
  2. map_inherent_response_to_score() - Map Yes/No/Partially to 1-5 scale
  3. map_control_response_to_score() - Map control responses to 0-1 effectiveness scale
  4. calculate_pillar_score() - Calculate average score for a set of questions
  5. calculate_inherent_risk() - Calculate 4 pillar scores and overall inherent risk
  6. calculate_control_effectiveness() - Calculate control effectiveness from Module 2
  7. calculate_residual_risk() - Calculate residual risk after controls

  ## Scoring Model
  - Inherent Risk (Module 1): Yes=5, Partially=3, No=1 (1-5 scale, higher = more risk)
  - Controls (Module 2): Fully=1.0, Partially=0.6, Weak=0.3, No=0.0 (0-1 scale, higher = better)
  - Residual Risk = Inherent Risk × (1 - Control Effectiveness)
*/

-- ============================================================================
-- STEP 1: HELPER FUNCTIONS FOR RESPONSE CONVERSION
-- ============================================================================

-- Convert assessment responses to JSONB format for efficient processing
CREATE OR REPLACE FUNCTION get_assessment_responses_jsonb(p_assessment_id uuid)
RETURNS jsonb AS $$
DECLARE
  responses_json jsonb;
BEGIN
  SELECT jsonb_object_agg(question_code, response) INTO responses_json
  FROM assessment_responses
  WHERE assessment_id = p_assessment_id;
  
  RETURN COALESCE(responses_json, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_assessment_responses_jsonb IS 'Convert assessment responses to JSONB for efficient processing';

-- Map inherent risk responses to 1-5 scale (higher = more risk)
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

COMMENT ON FUNCTION map_inherent_response_to_score IS 'Map Yes/No/Partially responses to 1-5 risk scale';

-- Map control effectiveness responses to 0-1 scale (higher = better controls)
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

COMMENT ON FUNCTION map_control_response_to_score IS 'Map control implementation responses to 0-1 effectiveness scale';

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
    RETURN 1.0;  -- Default to low risk if no questions answered
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_pillar_score IS 'Calculate average score for a set of inherent risk questions';

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
    RETURN 0.0;  -- Default to no controls if no questions answered
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_control_area_score IS 'Calculate average effectiveness for a set of control questions';

-- ============================================================================
-- STEP 3: MAIN RISK CALCULATION FUNCTIONS
-- ============================================================================

-- Calculate inherent risk breakdown (4 pillars + overall)
CREATE OR REPLACE FUNCTION calculate_inherent_risk(p_assessment_id uuid)
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
  assessment_responses := get_assessment_responses_jsonb(p_assessment_id);
  
  -- Calculate Product/Service Risk (Services offered) - Section A
  product_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['A1.1', 'A1.2', 'A1.3', 'A1.4', 'A1.5', 'A1.6', 'A1.7', 'A1.8', 'A1.9', 'A1.10']
  );
  
  -- Calculate Client Risk (Client types + Delivery channels) - Sections B + E
  client_score := (
    calculate_pillar_score(
      assessment_responses,
      ARRAY['A2.1', 'A2.2', 'A2.3', 'A2.4', 'A2.5', 'A2.6', 'A2.7', 'A2.8', 'A2.9']
    ) * 0.7 +
    calculate_pillar_score(
      assessment_responses,
      ARRAY['A5.1', 'A5.2', 'A5.3', 'A5.4', 'A5.5']
    ) * 0.3
  );
  
  -- Calculate Transaction Risk (Transaction types + Other factors) - Sections C + F
  transaction_score := (
    calculate_pillar_score(
      assessment_responses,
      ARRAY['A3.1', 'A3.2', 'A3.3', 'A3.4', 'A3.5', 'A3.6']
    ) * 0.6 +
    calculate_pillar_score(
      assessment_responses,
      ARRAY['A6.1', 'A6.2', 'A6.3', 'A6.4', 'A6.5']
    ) * 0.4
  );
  
  -- Calculate Geographic Risk (Jurisdictions) - Section D
  geographic_score := calculate_pillar_score(
    assessment_responses,
    ARRAY['A4.1', 'A4.2', 'A4.3', 'A4.4', 'A4.5']
  );
  
  -- Calculate weighted Inherent Risk (FATF methodology)
  ir_score := (client_score * 0.30) + 
              (product_score * 0.25) + 
              (geographic_score * 0.20) + 
              (transaction_score * 0.25);
  
  RETURN QUERY SELECT client_score, product_score, geographic_score, transaction_score, ir_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_inherent_risk IS 'Calculate FATF-aligned inherent risk breakdown (4 pillars + overall)';

-- Calculate control effectiveness from Module 2
CREATE OR REPLACE FUNCTION calculate_control_effectiveness(p_assessment_id uuid)
RETURNS numeric AS $$
DECLARE
  assessment_responses jsonb;
  avg_effectiveness numeric;
BEGIN
  -- Get assessment responses as JSONB
  assessment_responses := get_assessment_responses_jsonb(p_assessment_id);
  
  -- Calculate average control effectiveness across all Module 2 control areas
  -- Using sections from B1 through B8 (8 control areas)
  avg_effectiveness := (
    calculate_control_area_score(assessment_responses, ARRAY['B1.1', 'B1.2', 'B1.3', 'B1.4', 'B1.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B2.1', 'B2.2', 'B2.3', 'B2.4', 'B2.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B3.1', 'B3.2', 'B3.3', 'B3.4', 'B3.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B4.1', 'B4.2', 'B4.3', 'B4.4', 'B4.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B5.1', 'B5.2', 'B5.3', 'B5.4', 'B5.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B6.1', 'B6.2', 'B6.3', 'B6.4', 'B6.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B7.1', 'B7.2', 'B7.3', 'B7.4', 'B7.5']) +
    calculate_control_area_score(assessment_responses, ARRAY['B8.1', 'B8.2', 'B8.3', 'B8.4', 'B8.5'])
  ) / 8.0;
  
  RETURN COALESCE(avg_effectiveness, 0.0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_control_effectiveness IS 'Calculate overall control effectiveness from Module 2 responses';

-- Calculate residual risk after controls
CREATE OR REPLACE FUNCTION calculate_residual_risk(inherent_risk_score numeric, control_effectiveness numeric)
RETURNS numeric AS $$
BEGIN
  -- Residual Risk = Inherent Risk × (1 - Control Effectiveness)
  -- This represents the risk remaining after controls are applied
  RETURN inherent_risk_score * (1 - COALESCE(control_effectiveness, 0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_residual_risk IS 'Calculate residual risk after control mitigation';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_assessment_responses_jsonb TO authenticated;
GRANT EXECUTE ON FUNCTION map_inherent_response_to_score TO authenticated;
GRANT EXECUTE ON FUNCTION map_control_response_to_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pillar_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_control_area_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_inherent_risk TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_control_effectiveness TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_residual_risk TO authenticated;
