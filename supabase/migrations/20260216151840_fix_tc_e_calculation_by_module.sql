/*
  # Fix TC/E Calculation Based on Module Structure

  1. Problem
    - System was looking for "-E" suffix in question codes
    - Actual structure uses modules: module1, module2, module3
    - Module 1: Inherent Risk (contributes to overall risk only)
    - Module 2: Control Compliance (TC)
    - Module 3: Effectiveness Assessment (E)

  2. Solution
    - Module 1 questions → Overall score only (inherent risk)
    - Module 2 questions → Technical Compliance (TC)
    - Module 3 questions → Effectiveness (E)
    - Calculate proper averages at assessment level

  3. Assessment-Level Scores
    - module_1_score: Module 1 average (Inherent Risk)
    - module_2_score: Module 2 average (TC)
    - module_3_score: Module 3 average (E)
    - overall_risk_score: Average of all three modules
*/

-- Recalculate section scores with module-based TC/E mapping
DO $$
DECLARE
  section_rec RECORD;
  response_rec RECORD;
  
  total_weighted_score NUMERIC;
  total_weight NUMERIC;
  
  question_weight INTEGER := 1;
  score_value NUMERIC;
  final_score NUMERIC;
  final_risk_level TEXT;
  answered_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE 'Recalculating section scores with module-based mapping...';
  
  FOR section_rec IN
    SELECT id, assessment_id, section_code, section_name
    FROM section_scores
    ORDER BY assessment_id, section_code
  LOOP
    -- Reset counters
    total_weighted_score := 0;
    total_weight := 0;
    answered_count := 0;
    
    -- Count total questions
    SELECT COUNT(*) INTO total_count
    FROM assessment_responses
    WHERE assessment_id = section_rec.assessment_id
      AND section_code = section_rec.section_code;
    
    -- Process responses
    FOR response_rec IN
      SELECT question_code, response
      FROM assessment_responses
      WHERE assessment_id = section_rec.assessment_id
        AND section_code = section_rec.section_code
        AND response IS NOT NULL
        AND LOWER(response) NOT IN ('na', 'n/a', 'not applicable')
    LOOP
      -- Calculate score based on response type
      score_value := CASE LOWER(TRIM(response_rec.response))
        -- Module 1: Risk assessment
        WHEN 'yes' THEN 1.0
        WHEN 'partial' THEN 3.0
        WHEN 'partially' THEN 3.0
        WHEN 'no' THEN 5.0
        -- Module 2: Control implementation
        WHEN 'fully implemented' THEN 1.0
        WHEN 'partially implemented' THEN 3.0
        WHEN 'not in place' THEN 5.0
        -- Module 3: Effectiveness
        WHEN 'effective' THEN 1.0
        WHEN 'weak' THEN 3.0
        WHEN 'ineffective' THEN 5.0
        ELSE 0.0
      END;
      
      IF score_value > 0 THEN
        total_weighted_score := total_weighted_score + (score_value * question_weight);
        total_weight := total_weight + question_weight;
        answered_count := answered_count + 1;
      END IF;
    END LOOP;
    
    -- Calculate final score
    final_score := CASE 
      WHEN total_weight > 0 THEN total_weighted_score / total_weight 
      ELSE 0 
    END;
    
    final_risk_level := CASE
      WHEN final_score < 1.5 THEN 'Low'
      WHEN final_score < 2.5 THEN 'Moderate'
      ELSE 'High'
    END;
    
    -- Update section_scores
    -- For module-based approach:
    -- - risk_score = section score
    -- - technical_compliance_score = section score (for module2) or 0
    -- - effectiveness_score = section score (for module3) or 0
    UPDATE section_scores
    SET 
      risk_score = final_score,
      technical_compliance_score = CASE 
        WHEN section_rec.section_code = 'module2' THEN final_score
        ELSE 0
      END,
      effectiveness_score = CASE 
        WHEN section_rec.section_code = 'module3' THEN final_score
        ELSE 0
      END,
      risk_level = final_risk_level,
      risk_rating = final_risk_level,
      answered_questions = answered_count,
      total_questions = GREATEST(total_count, answered_count),
      updated_at = NOW()
    WHERE id = section_rec.id;
    
    RAISE NOTICE 'Section %: Score=%/5.0, Risk=%',
      section_rec.section_code,
      ROUND(final_score::numeric, 2),
      final_risk_level;
  END LOOP;
  
  RAISE NOTICE 'Section score recalculation complete';
END $$;

-- Update assessment-level scores with proper module mapping
DO $$
DECLARE
  assessment_rec RECORD;
  module1_score NUMERIC;
  module2_score NUMERIC;
  module3_score NUMERIC;
  avg_overall_score NUMERIC;
  overall_risk_level TEXT;
BEGIN
  RAISE NOTICE 'Updating assessment-level scores...';
  
  FOR assessment_rec IN
    SELECT DISTINCT assessment_id
    FROM section_scores
  LOOP
    -- Get individual module scores
    SELECT risk_score INTO module1_score
    FROM section_scores
    WHERE assessment_id = assessment_rec.assessment_id
      AND section_code = 'module1';
    
    SELECT risk_score INTO module2_score
    FROM section_scores
    WHERE assessment_id = assessment_rec.assessment_id
      AND section_code = 'module2';
    
    SELECT risk_score INTO module3_score
    FROM section_scores
    WHERE assessment_id = assessment_rec.assessment_id
      AND section_code = 'module3';
    
    -- Calculate overall average
    avg_overall_score := (
      COALESCE(module1_score, 0) + 
      COALESCE(module2_score, 0) + 
      COALESCE(module3_score, 0)
    ) / 3.0;
    
    overall_risk_level := CASE
      WHEN avg_overall_score < 1.5 THEN 'Low'
      WHEN avg_overall_score < 2.5 THEN 'Moderate'
      ELSE 'High'
    END;
    
    -- Update assessment with module-specific scores
    UPDATE assessments
    SET 
      overall_risk_score = avg_overall_score,
      overall_risk_rating = overall_risk_level,
      module_1_score = COALESCE(module1_score, 0),
      module_2_score = COALESCE(module2_score, 0),
      module_3_score = COALESCE(module3_score, 0),
      updated_at = NOW()
    WHERE id = assessment_rec.assessment_id;
    
    RAISE NOTICE 'Assessment %: Overall=%/5.0, M1=%/5.0, M2=%/5.0, M3=%/5.0',
      LEFT(assessment_rec.assessment_id::text, 8),
      ROUND(avg_overall_score::numeric, 2),
      ROUND(COALESCE(module1_score, 0)::numeric, 2),
      ROUND(COALESCE(module2_score, 0)::numeric, 2),
      ROUND(COALESCE(module3_score, 0)::numeric, 2);
  END LOOP;
  
  RAISE NOTICE 'Assessment score updates complete';
END $$;

-- Final verification
DO $$
DECLARE
  sample_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL VERIFICATION: MODULE-BASED SCORING ===';
  RAISE NOTICE '';
  
  FOR sample_rec IN
    SELECT 
      o.name,
      a.overall_risk_score,
      a.overall_risk_rating,
      a.module_1_score,
      a.module_2_score,
      a.module_3_score
    FROM assessments a
    LEFT JOIN organizations o ON a.organization_id = o.id
    WHERE a.status = 'completed'
  LOOP
    RAISE NOTICE 'Assessment: %', sample_rec.name;
    RAISE NOTICE '  Overall Score: % / 5.0 (%)',
      ROUND(sample_rec.overall_risk_score::numeric, 2),
      sample_rec.overall_risk_rating;
    RAISE NOTICE '  Module 1 (Inherent Risk): % / 5.0',
      ROUND(sample_rec.module_1_score::numeric, 2);
    RAISE NOTICE '  Module 2 (TC - Controls): % / 5.0',
      ROUND(sample_rec.module_2_score::numeric, 2);
    RAISE NOTICE '  Module 3 (E - Effectiveness): % / 5.0',
      ROUND(sample_rec.module_3_score::numeric, 2);
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== FATF 5-POINT SCALE SUCCESSFULLY APPLIED ===';
  RAISE NOTICE 'Scale: 1.0 = Low Risk | 3.0 = Medium Risk | 5.0 = High Risk';
  RAISE NOTICE 'Module Structure:';
  RAISE NOTICE '  - Module 1: Inherent Risk Assessment';
  RAISE NOTICE '  - Module 2: Technical Compliance (Controls)';
  RAISE NOTICE '  - Module 3: Effectiveness Assessment';
END $$;
