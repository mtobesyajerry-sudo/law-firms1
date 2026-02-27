/*
  # Drop and Recreate All Scoring Functions with Fixed Parameter Names

  ## Changes
  - Drops all scoring functions
  - Recreates them with non-ambiguous parameter names (using p_ prefix)
  - Fixes column reference ambiguity issues
*/

-- Drop all scoring functions
DROP FUNCTION IF EXISTS get_assessment_responses_jsonb(uuid);
DROP FUNCTION IF EXISTS calculate_inherent_risk(uuid);
DROP FUNCTION IF EXISTS calculate_control_effectiveness(uuid);
DROP FUNCTION IF EXISTS recalculate_assessment_risk_scores(uuid);
DROP FUNCTION IF EXISTS recalculate_all_assessment_scores();

-- ============================================================================
-- Helper function to build responses JSONB from assessment_responses table
-- ============================================================================

CREATE FUNCTION get_assessment_responses_jsonb(p_assessment_id uuid)
RETURNS jsonb AS $$
DECLARE
  responses_json jsonb;
BEGIN
  SELECT jsonb_object_agg(ar.question_code, ar.response)
  INTO responses_json
  FROM assessment_responses ar
  WHERE ar.assessment_id = p_assessment_id
    AND ar.response IS NOT NULL;
  
  RETURN COALESCE(responses_json, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INHERENT RISK CALCULATION
-- ============================================================================

CREATE FUNCTION calculate_inherent_risk(p_assessment_id uuid)
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
-- CONTROL EFFECTIVENESS CALCULATION
-- ============================================================================

CREATE FUNCTION calculate_control_effectiveness(p_assessment_id uuid)
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
  assessment_responses := get_assessment_responses_jsonb(p_assessment_id);
  
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
  
  -- Calculate Training (10% weight)
  training_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2G.1', '2G.2', '2G.3', '2G.4', '2G.5']
  );
  
  -- Calculate Recordkeeping (10% weight)
  recordkeeping_score := calculate_control_area_score(
    assessment_responses,
    ARRAY['2H.1', '2H.2', '2H.3', '2H.4', '2H.5']
  );
  
  -- Calculate weighted Control Effectiveness (0-1 scale)
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
-- MASTER RECALCULATION FUNCTION
-- ============================================================================

CREATE FUNCTION recalculate_assessment_risk_scores(p_assessment_id uuid)
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
  assessment_responses := get_assessment_responses_jsonb(p_assessment_id);
  
  -- Calculate Inherent Risk
  SELECT * INTO ir_data FROM calculate_inherent_risk(p_assessment_id);
  
  -- Calculate Control Effectiveness
  ce_score := calculate_control_effectiveness(p_assessment_id);
  
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
  WHERE id = p_assessment_id;
  
  -- Log the calculation for audit trail
  RAISE NOTICE 'Assessment % recalculated: IR=%, CE=%, RR=%, Final=% (%)', 
    p_assessment_id, ir_data.inherent_risk, ce_score, rr_score, final_risk, final_rating;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BULK RECALCULATION FUNCTION
-- ============================================================================

CREATE FUNCTION recalculate_all_assessment_scores()
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
    SELECT a.id, o.name, a.overall_risk_score, a.overall_risk_rating
    FROM assessments a
    LEFT JOIN organizations o ON a.organization_id = o.id
    WHERE a.status = 'completed'
  LOOP
    -- Store old values
    assessment_id := assessment_record.id;
    organization_name := assessment_record.name;
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

COMMENT ON FUNCTION get_assessment_responses_jsonb IS 'Builds JSONB object from assessment_responses table for a given assessment';
COMMENT ON FUNCTION calculate_inherent_risk IS 'Calculates FATF-aligned inherent risk with weighted pillars';
COMMENT ON FUNCTION calculate_control_effectiveness IS 'Calculates control effectiveness score (0-1 scale)';
COMMENT ON FUNCTION recalculate_assessment_risk_scores IS 'Master function to recalculate all risk scores using FATF model';
COMMENT ON FUNCTION recalculate_all_assessment_scores IS 'Bulk recalculation showing before/after comparison';
