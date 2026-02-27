/*
  # Standardize Risk Scoring to 1-5 Scale

  This migration standardizes all risk scoring across the system to use the FATF-aligned 1-5 scale consistently.
  
  ## Problem
  - Risk scores were being normalized between different scales causing data loss
  - Inconsistent risk level mappings across different parts of the system
  
  ## Solution
  - Define standard 1-5 scale with clear thresholds
  - Create helper functions for consistent risk level determination
  - Add constraints to ensure scores stay within valid ranges
  - Update all scoring functions to use the standard scale
  
  ## Risk Score Scale (FATF-Aligned)
  - Score 1.0-1.5: Low Risk
  - Score 1.6-2.5: Medium Risk
  - Score 2.6-3.5: Substantial Risk
  - Score 3.6-4.5: High Risk
  - Score 4.6-5.0: Very High Risk
  
  ## Security
  - Constraints prevent invalid risk scores
  - Functions are SECURITY DEFINER to prevent manipulation
*/

-- ============================================================================
-- PART 1: ADD CHECK CONSTRAINTS FOR RISK SCORES
-- ============================================================================

-- Module scores must be between 1.0 and 5.0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assessments_module_1_score_check'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_1_score_check 
    CHECK (module_1_score IS NULL OR (module_1_score >= 1.0 AND module_1_score <= 5.0));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assessments_module_2_score_check'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_2_score_check 
    CHECK (module_2_score IS NULL OR (module_2_score >= 1.0 AND module_2_score <= 5.0));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assessments_module_3_score_check'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_3_score_check 
    CHECK (module_3_score IS NULL OR (module_3_score >= 1.0 AND module_3_score <= 5.0));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assessments_module_4_score_check'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_4_score_check 
    CHECK (module_4_score IS NULL OR (module_4_score >= 1.0 AND module_4_score <= 5.0));
  END IF;
END $$;

-- Section risk scores must be between 1.0 and 5.0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'section_scores_risk_score_check'
  ) THEN
    ALTER TABLE section_scores 
    ADD CONSTRAINT section_scores_risk_score_check 
    CHECK (risk_score IS NULL OR (risk_score >= 1.0 AND risk_score <= 5.0));
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE STANDARD RISK LEVEL DETERMINATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_risk_level_from_score(score NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Handle NULL scores
  IF score IS NULL THEN
    RETURN 'Not Assessed';
  END IF;
  
  -- FATF-aligned 1-5 scale risk level determination
  IF score >= 1.0 AND score <= 1.5 THEN
    RETURN 'Low';
  ELSIF score > 1.5 AND score <= 2.5 THEN
    RETURN 'Medium';
  ELSIF score > 2.5 AND score <= 3.5 THEN
    RETURN 'Substantial';
  ELSIF score > 3.5 AND score <= 4.5 THEN
    RETURN 'High';
  ELSIF score > 4.5 AND score <= 5.0 THEN
    RETURN 'Very High';
  ELSE
    -- Score is out of valid range
    RETURN 'Invalid Score';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_risk_level_from_score(NUMERIC) TO authenticated;

-- ============================================================================
-- PART 3: CREATE COMPOSITE RISK CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_composite_risk_score(
  inherent_risk NUMERIC,
  control_effectiveness NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
DECLARE
  residual_risk NUMERIC;
BEGIN
  -- Validate inputs
  IF inherent_risk IS NULL OR control_effectiveness IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF inherent_risk < 1.0 OR inherent_risk > 5.0 THEN
    RAISE EXCEPTION 'Inherent risk must be between 1.0 and 5.0';
  END IF;
  
  IF control_effectiveness < 1.0 OR control_effectiveness > 5.0 THEN
    RAISE EXCEPTION 'Control effectiveness must be between 1.0 and 5.0';
  END IF;
  
  -- Calculate residual risk using FATF methodology
  -- Residual Risk = Inherent Risk × (1 - ((Control Effectiveness - 1) / 4))
  -- This gives higher weight to inherent risk while factoring in controls
  
  residual_risk := inherent_risk * (1 - ((control_effectiveness - 1.0) / 4.0));
  
  -- Ensure result stays within 1-5 range
  residual_risk := GREATEST(1.0, LEAST(5.0, residual_risk));
  
  -- Round to 2 decimal places
  residual_risk := ROUND(residual_risk, 2);
  
  RETURN residual_risk;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_composite_risk_score(NUMERIC, NUMERIC) TO authenticated;

-- ============================================================================
-- PART 4: CREATE RISK SCORE VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_risk_score(score NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  IF score IS NULL THEN
    RETURN TRUE; -- NULL is valid (not yet scored)
  END IF;
  
  -- Score must be between 1.0 and 5.0
  RETURN (score >= 1.0 AND score <= 5.0);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_risk_score(NUMERIC) TO authenticated;

-- ============================================================================
-- PART 5: UPDATE EXISTING SCORING VIEWS TO USE STANDARD SCALE
-- ============================================================================

-- Drop and recreate assessment_risk_breakdown view with standardized scoring
DROP VIEW IF EXISTS assessment_risk_breakdown CASCADE;

CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT 
  a.id AS assessment_id,
  a.organization_id,
  a.status,
  a.assessment_date,
  a.overall_risk_rating,
  
  -- Module scores (already on 1-5 scale)
  COALESCE(a.module_1_score, 0) AS inherent_risk_score,
  COALESCE(a.module_2_score, 0) AS control_score,
  COALESCE(a.module_3_score, 0) AS effectiveness_score,
  COALESCE(a.module_4_score, 0) AS governance_score,
  
  -- Calculate composite residual risk
  CASE 
    WHEN a.module_1_score IS NOT NULL AND a.module_2_score IS NOT NULL THEN
      calculate_composite_risk_score(a.module_1_score, a.module_2_score)
    ELSE NULL
  END AS residual_risk_score,
  
  -- Risk levels using standard function
  get_risk_level_from_score(a.module_1_score) AS inherent_risk_level,
  get_risk_level_from_score(a.module_2_score) AS control_level,
  get_risk_level_from_score(a.module_3_score) AS effectiveness_level,
  get_risk_level_from_score(a.module_4_score) AS governance_level,
  
  -- Composite residual risk level
  CASE 
    WHEN a.module_1_score IS NOT NULL AND a.module_2_score IS NOT NULL THEN
      get_risk_level_from_score(
        calculate_composite_risk_score(a.module_1_score, a.module_2_score)
      )
    ELSE 'Not Assessed'
  END AS residual_risk_level,
  
  -- Metadata
  a.created_at,
  a.updated_at,
  a.completed_at
FROM assessments a;

GRANT SELECT ON assessment_risk_breakdown TO authenticated;

-- ============================================================================
-- PART 6: CREATE RISK SCORE NORMALIZATION FUNCTION (FOR LEGACY DATA)
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_to_1_5_scale(
  score NUMERIC,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 100
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
DECLARE
  normalized_score NUMERIC;
BEGIN
  IF score IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Normalize to 0-1 range first
  normalized_score := (score - min_value) / (max_value - min_value);
  
  -- Convert to 1-5 scale
  normalized_score := 1.0 + (normalized_score * 4.0);
  
  -- Ensure within bounds
  normalized_score := GREATEST(1.0, LEAST(5.0, normalized_score));
  
  -- Round to 2 decimal places
  RETURN ROUND(normalized_score, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION normalize_to_1_5_scale(NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- ============================================================================
-- PART 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_risk_level_from_score(NUMERIC) IS 
'Converts a 1-5 numeric risk score to a standardized risk level text value (Low/Medium/Substantial/High/Very High) using FATF-aligned thresholds';

COMMENT ON FUNCTION calculate_composite_risk_score(NUMERIC, NUMERIC) IS 
'Calculates residual risk score by combining inherent risk with control effectiveness using FATF methodology. Returns value between 1.0 and 5.0';

COMMENT ON FUNCTION validate_risk_score(NUMERIC) IS 
'Validates that a risk score is within the valid 1.0 to 5.0 range. Returns TRUE if valid or NULL, FALSE otherwise';

COMMENT ON FUNCTION normalize_to_1_5_scale(NUMERIC, NUMERIC, NUMERIC) IS 
'Converts scores from other scales (e.g., 0-100) to the standard 1-5 scale. Used for legacy data migration';

-- ============================================================================
-- PART 8: CREATE HELPER FUNCTION TO GET OVERALL RISK RATING
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_overall_risk_rating(
  assessment_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inherent_risk NUMERIC;
  control_score NUMERIC;
  residual_score NUMERIC;
  overall_rating TEXT;
BEGIN
  -- Get scores from assessment
  SELECT module_1_score, module_2_score
  INTO inherent_risk, control_score
  FROM assessments
  WHERE id = assessment_id;
  
  -- If either score is missing, return Not Assessed
  IF inherent_risk IS NULL OR control_score IS NULL THEN
    RETURN 'Not Assessed';
  END IF;
  
  -- Calculate residual risk
  residual_score := calculate_composite_risk_score(inherent_risk, control_score);
  
  -- Convert to risk level
  overall_rating := get_risk_level_from_score(residual_score);
  
  RETURN overall_rating;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_overall_risk_rating(UUID) TO authenticated;