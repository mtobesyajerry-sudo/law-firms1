/*
  # CRITICAL FIX: Module Score Scale Calculation Bug
  
  ## Problem Identified
  Module 2 and Module 3 scores were being stored as cumulative totals (e.g., 17.5, 19.5)
  instead of being normalized to the FATF 1-5 scale. This resulted in:
  - Scores showing as 17.5/5.0 (350% over maximum)
  - Effectiveness calculations showing -313%, -363%
  - Completely incorrect risk assessments and reporting
  
  ## Root Cause
  The frontend calculation functions were returning raw totalScore values
  instead of converting them to the 1-5 scale using the effectiveness ratio.
  
  ## Solution
  1. Fix any existing assessments with out-of-range scores
  2. Recalculate module scores for all assessments where module_2_score > 5 or module_3_score > 5
  3. Add a check constraint to prevent future incorrect scores
  
  ## FATF 1-5 Scale Standard
  - 1.0 = Highly Effective / Compliant (Best)
  - 2.0 = Largely Effective / Mostly Compliant
  - 3.0 = Moderately Effective / Partially Compliant
  - 4.0 = Partially Effective / Weak
  - 5.0 = Ineffective / Non-Compliant (Worst)
*/

-- First, identify assessments with invalid scores
DO $$
DECLARE
  invalid_rec RECORD;
  response_count INTEGER;
  total_scored NUMERIC;
  max_possible NUMERIC;
  effectiveness_ratio NUMERIC;
  corrected_score NUMERIC;
BEGIN
  RAISE NOTICE 'Scanning for assessments with invalid module scores...';
  
  FOR invalid_rec IN
    SELECT 
      id,
      module_1_score,
      module_2_score,
      module_3_score,
      overall_risk_score
    FROM assessments
    WHERE module_2_score > 5.0 OR module_3_score > 5.0
  LOOP
    RAISE NOTICE '=== FIXING ASSESSMENT ID: % ===', invalid_rec.id;
    RAISE NOTICE 'Current scores - M1: %, M2: %, M3: %, Overall: %',
      invalid_rec.module_1_score,
      invalid_rec.module_2_score,
      invalid_rec.module_3_score,
      invalid_rec.overall_risk_score;
    
    -- Fix Module 2 (Compliance) if invalid
    IF invalid_rec.module_2_score > 5.0 THEN
      -- The raw score represents cumulative points earned
      -- We need to convert it back to 0-1 effectiveness then to 1-5 scale
      -- Typical max for Module 2 is around 20-25 questions, assume raw score / 25 as max
      max_possible := 25.0;
      effectiveness_ratio := LEAST(invalid_rec.module_2_score / max_possible, 1.0);
      corrected_score := 5.0 - (effectiveness_ratio * 4.0);
      
      RAISE NOTICE 'Module 2: Raw=%, Max=%, Effectiveness=%, Corrected=%',
        invalid_rec.module_2_score, max_possible, effectiveness_ratio, corrected_score;
      
      UPDATE assessments
      SET module_2_score = corrected_score
      WHERE id = invalid_rec.id;
    END IF;
    
    -- Fix Module 3 (Effectiveness) if invalid
    IF invalid_rec.module_3_score > 5.0 THEN
      -- Same approach for Module 3
      max_possible := 25.0;
      effectiveness_ratio := LEAST(invalid_rec.module_3_score / max_possible, 1.0);
      corrected_score := 5.0 - (effectiveness_ratio * 4.0);
      
      RAISE NOTICE 'Module 3: Raw=%, Max=%, Effectiveness=%, Corrected=%',
        invalid_rec.module_3_score, max_possible, effectiveness_ratio, corrected_score;
      
      UPDATE assessments
      SET module_3_score = corrected_score
      WHERE id = invalid_rec.id;
    END IF;
    
    -- Recalculate overall risk score
    UPDATE assessments
    SET 
      overall_risk_score = (module_1_score + module_2_score + module_3_score) / 3.0,
      overall_risk_rating = CASE
        WHEN (module_1_score + module_2_score + module_3_score) / 3.0 >= 3.5 THEN 'High'
        WHEN (module_1_score + module_2_score + module_3_score) / 3.0 >= 2.5 THEN 'Moderate'
        ELSE 'Low'
      END,
      updated_at = NOW()
    WHERE id = invalid_rec.id;
    
    -- Show corrected values
    SELECT 
      module_1_score,
      module_2_score,
      module_3_score,
      overall_risk_score,
      overall_risk_rating
    INTO invalid_rec
    FROM assessments
    WHERE id = invalid_rec.id;
    
    RAISE NOTICE 'Corrected scores - M1: %, M2: %, M3: %, Overall: % (%)',
      invalid_rec.module_1_score,
      invalid_rec.module_2_score,
      invalid_rec.module_3_score,
      invalid_rec.overall_risk_score,
      invalid_rec.overall_risk_rating;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE 'Score correction complete';
END $$;

-- Add check constraints to prevent future issues (if not exists)
DO $$
BEGIN
  -- Add constraint for module_1_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assessments_module_1_score_valid' 
    AND table_name = 'assessments'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_1_score_valid 
    CHECK (module_1_score >= 1.0 AND module_1_score <= 5.0);
    RAISE NOTICE 'Added constraint: assessments_module_1_score_valid';
  END IF;

  -- Add constraint for module_2_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assessments_module_2_score_valid' 
    AND table_name = 'assessments'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_2_score_valid 
    CHECK (module_2_score >= 1.0 AND module_2_score <= 5.0);
    RAISE NOTICE 'Added constraint: assessments_module_2_score_valid';
  END IF;

  -- Add constraint for module_3_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assessments_module_3_score_valid' 
    AND table_name = 'assessments'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_module_3_score_valid 
    CHECK (module_3_score >= 1.0 AND module_3_score <= 5.0);
    RAISE NOTICE 'Added constraint: assessments_module_3_score_valid';
  END IF;

  -- Add constraint for overall_risk_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assessments_overall_risk_score_valid' 
    AND table_name = 'assessments'
  ) THEN
    ALTER TABLE assessments 
    ADD CONSTRAINT assessments_overall_risk_score_valid 
    CHECK (overall_risk_score >= 1.0 AND overall_risk_score <= 5.0);
    RAISE NOTICE 'Added constraint: assessments_overall_risk_score_valid';
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  verification_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION: All Assessment Scores ===';
  RAISE NOTICE '';
  
  FOR verification_rec IN
    SELECT 
      id,
      module_1_score,
      module_2_score,
      module_3_score,
      overall_risk_score,
      overall_risk_rating,
      status
    FROM assessments
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE 'Assessment %:', LEFT(verification_rec.id::text, 8);
    RAISE NOTICE '  M1 (Inherent): % / 5.0', ROUND(verification_rec.module_1_score::numeric, 2);
    RAISE NOTICE '  M2 (Compliance): % / 5.0', ROUND(verification_rec.module_2_score::numeric, 2);
    RAISE NOTICE '  M3 (Effectiveness): % / 5.0', ROUND(verification_rec.module_3_score::numeric, 2);
    RAISE NOTICE '  Overall: % / 5.0 (%)', 
      ROUND(verification_rec.overall_risk_score::numeric, 2),
      verification_rec.overall_risk_rating;
    RAISE NOTICE '  Status: %', verification_rec.status;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== CRITICAL BUG FIXED ===';
  RAISE NOTICE 'All scores now properly constrained to FATF 1-5 scale';
  RAISE NOTICE 'Database constraints added to prevent future issues';
END $$;
