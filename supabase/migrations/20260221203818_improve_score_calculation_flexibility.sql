/*
  # Improve Score Calculation to Handle Partial Assessments

  ## Problem
  Current calculation requires Module 1 (Inherent Risk) to calculate overall risk.
  But users may complete modules in any order, so we need flexibility.

  ## Solution
  Calculate overall risk based on whatever modules are completed:
  - If Module 1 + others: Use full risk formula
  - If only Module 2/3/4: Calculate based on available data
  - Always show individual module scores even if overall can't be calculated

  ## Changes
  - More flexible overall risk calculation
  - Better handling of partial assessments
  - Clear logic for different scenarios
*/

DROP FUNCTION IF EXISTS recalculate_assessment_risk_scores(uuid);

CREATE OR REPLACE FUNCTION recalculate_assessment_risk_scores(p_assessment_id uuid)
RETURNS void AS $$
DECLARE
  v_module_1_score numeric;
  v_module_2_score numeric;
  v_module_3_score numeric;
  v_module_4_score numeric;
  v_overall_risk numeric;
  v_overall_rating text;
  v_completed_modules integer := 0;
BEGIN
  -- Get Module 1 score (Inherent Risk) from section_scores
  SELECT risk_score INTO v_module_1_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_1'
  AND answered_questions > 0;

  IF v_module_1_score IS NOT NULL THEN
    v_completed_modules := v_completed_modules + 1;
  END IF;

  -- Get Module 2 score (Technical Compliance) from section_scores
  SELECT risk_score INTO v_module_2_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_2'
  AND answered_questions > 0;

  IF v_module_2_score IS NOT NULL THEN
    v_completed_modules := v_completed_modules + 1;
  END IF;

  -- Get Module 3 score (Effectiveness) from section_scores
  SELECT risk_score INTO v_module_3_score
  FROM section_scores
  WHERE assessment_id = p_assessment_id
  AND section_code = 'MODULE_3'
  AND answered_questions > 0;

  IF v_module_3_score IS NOT NULL THEN
    v_completed_modules := v_completed_modules + 1;
  END IF;

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

  IF v_module_4_score IS NOT NULL AND v_module_4_score > 0 THEN
    v_completed_modules := v_completed_modules + 1;
  END IF;

  -- Calculate overall risk score based on available modules
  IF v_completed_modules >= 2 THEN
    -- Scenario 1: Full assessment (Module 1 + controls)
    IF v_module_1_score IS NOT NULL AND (v_module_2_score IS NOT NULL OR v_module_3_score IS NOT NULL) THEN
      -- Weighted average: Inherent risk reduced by control effectiveness
      v_overall_risk := (
        (COALESCE(v_module_1_score, 3.0) * 0.40) + 
        ((6 - COALESCE(v_module_2_score, 3.0)) * 0.20) + 
        (COALESCE(v_module_3_score, 3.0) * 0.30) +
        ((6 - COALESCE(v_module_4_score, 3.0)) * 0.10)
      );
    -- Scenario 2: Only control modules (no Module 1)
    ELSIF v_module_2_score IS NOT NULL OR v_module_3_score IS NOT NULL THEN
      -- Average the available control scores
      v_overall_risk := (
        COALESCE(v_module_2_score, 0) + 
        COALESCE(v_module_3_score, 0) + 
        COALESCE(v_module_4_score, 0)
      ) / NULLIF(
        (CASE WHEN v_module_2_score IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN v_module_3_score IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN v_module_4_score IS NOT NULL THEN 1 ELSE 0 END),
        0
      );
    -- Scenario 3: Only Module 1 completed
    ELSIF v_module_1_score IS NOT NULL THEN
      v_overall_risk := v_module_1_score;
    ELSE
      v_overall_risk := NULL;
    END IF;

    -- Ensure within bounds
    IF v_overall_risk IS NOT NULL THEN
      v_overall_risk := LEAST(GREATEST(v_overall_risk, 1.0), 5.0);
    END IF;
  ELSE
    -- Not enough data to calculate overall risk
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

  RAISE NOTICE 'Assessment % recalculated: M1=%, M2=%, M3=%, M4=%, Overall=% (%) [%/4 modules]', 
    p_assessment_id, v_module_1_score, v_module_2_score, v_module_3_score, 
    v_module_4_score, v_overall_risk, v_overall_rating, v_completed_modules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_assessment_risk_scores IS 
'Flexibly recalculates module scores and overall risk from section_scores. Works with partial or complete assessments.';