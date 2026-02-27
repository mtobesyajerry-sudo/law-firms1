/*
  # Fix FATF Scoring Functions to Use Actual Database Structure

  ## Problem
  The FATF scoring functions were looking for an `assessments.responses` JSONB column
  that doesn't exist. The system actually stores:
  - Individual responses in `assessment_responses` table
  - Aggregated section scores in `section_scores` table

  ## Solution
  Rewrite the recalculation function to:
  1. Calculate module scores from `section_scores` aggregates
  2. Use proper risk calculation formulas
  3. Work with the actual database structure

  ## Changes
  - Drop and recreate `recalculate_assessment_risk_scores()` to work with section_scores
  - Use simpler, direct calculation from section-level scores
  - Maintain FATF-aligned risk model principles
*/

-- Drop the old version that doesn't work with our structure
DROP FUNCTION IF EXISTS recalculate_assessment_risk_scores(uuid);

-- Create new version that works with section_scores
CREATE OR REPLACE FUNCTION recalculate_assessment_risk_scores(p_assessment_id uuid)
RETURNS void AS $$
DECLARE
  v_module_1_score numeric;
  v_module_2_score numeric;
  v_module_3_score numeric;
  v_module_4_score numeric;
  v_overall_risk numeric;
  v_overall_rating text;
  v_count integer;
BEGIN
  -- Get Module 1 score (Inherent Risk) from section_scores
  SELECT risk_score INTO v_module_1_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_1'
  AND answered_questions > 0;

  -- Get Module 2 score (Technical Compliance) from section_scores
  SELECT risk_score INTO v_module_2_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_2'
  AND answered_questions > 0;

  -- Get Module 3 score (Effectiveness) from section_scores
  SELECT risk_score INTO v_module_3_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_3'
  AND answered_questions > 0;

  -- Get Module 4 score (Institutional Maturity) from control_assessments if available
  SELECT 
    COALESCE(AVG(ca.maturity_level), 0)
  INTO v_module_4_score
  FROM control_assessments ca
  WHERE ca.assessment_id = p_assessment_id;

  -- If no control assessments, try from section_scores
  IF v_module_4_score = 0 THEN
    SELECT risk_score INTO v_module_4_score
    FROM section_scores
    WHERE assessment_id = p_assessment_id
    AND section_code = 'MODULE_4'
    AND answered_questions > 0;
  END IF;

  -- Calculate overall risk score
  -- Formula: Weighted average with emphasis on Module 1 (inherent) and Module 3 (effectiveness)
  IF v_module_1_score IS NOT NULL AND v_module_3_score IS NOT NULL THEN
    -- Residual Risk = Inherent Risk adjusted by Control Effectiveness
    -- Higher Module 2/3 scores (better controls) reduce overall risk
    v_overall_risk := (v_module_1_score * 0.4) + 
                      ((6 - COALESCE(v_module_2_score, 3)) * 0.2) + 
                      (v_module_3_score * 0.3) +
                      ((6 - COALESCE(v_module_4_score, 3)) * 0.1);
    
    -- Ensure within bounds
    v_overall_risk := LEAST(GREATEST(v_overall_risk, 1.0), 5.0);
  ELSIF v_module_1_score IS NOT NULL THEN
    -- If only Module 1 answered, use it as baseline
    v_overall_risk := v_module_1_score;
  ELSE
    -- Not enough data to calculate
    v_overall_risk := NULL;
  END IF;

  -- Classify risk rating
  IF v_overall_risk IS NOT NULL THEN
    v_overall_rating := CASE 
      WHEN v_overall_risk < 2.0 THEN 'Low'
      WHEN v_overall_risk < 3.0 THEN 'Moderate'
      WHEN v_overall_risk < 4.0 THEN 'High'
      ELSE 'Very High'
    END;
  ELSE
    v_overall_rating := NULL;
  END IF;

  -- Update assessment with calculated scores
  UPDATE assessments SET
    module_1_score = v_module_1_score,
    module_2_score = v_module_2_score,
    module_3_score = v_module_3_score,
    module_4_score = v_module_4_score,
    overall_risk_score = v_overall_risk,
    overall_risk_rating = v_overall_rating,
    updated_at = now()
  WHERE id = p_assessment_id;

  RAISE NOTICE 'Assessment % recalculated: M1=%, M2=%, M3=%, M4=%, Overall=% (%)', 
    p_assessment_id, v_module_1_score, v_module_2_score, v_module_3_score, 
    v_module_4_score, v_overall_risk, v_overall_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the bulk recalculation function
DROP FUNCTION IF EXISTS recalculate_all_assessment_scores();

CREATE OR REPLACE FUNCTION recalculate_all_assessment_scores()
RETURNS TABLE(
  assessment_id uuid,
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

COMMENT ON FUNCTION recalculate_assessment_risk_scores IS 
'Recalculates all module scores and overall risk from section_scores table. Works with actual database structure.';

COMMENT ON FUNCTION recalculate_all_assessment_scores IS 
'Bulk recalculation of all assessments. Returns before/after scores for comparison.';