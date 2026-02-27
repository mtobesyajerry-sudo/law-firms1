/*
  # Fix Module 2 and Module 3 Response Scoring

  1. Problem
    - Module 1 uses: "Yes", "No", "Partially"
    - Modules 2 & 3 use: "Fully implemented", "Partially implemented", "Not in place"
    - Current scoring function only handles Module 1 responses

  2. Solution
    - Update scoring function to handle both response formats
    - Map implementation status responses to FATF risk scores
    - Recalculate all section scores with comprehensive response handling

  3. Response Mapping
    Module 1 (Risk questions):
    - "Yes" = 1.0 (Low risk)
    - "Partially" = 3.0 (Medium risk)
    - "No" = 5.0 (High risk)
    
    Modules 2 & 3 (Control questions):
    - "Fully implemented" = 1.0 (Good controls = Low risk)
    - "Partially implemented" = 3.0 (Partial controls = Medium risk)
    - "Not in place" = 5.0 (No controls = High risk)
*/

-- Comprehensive scoring function for all response types
CREATE OR REPLACE FUNCTION get_risk_score(response_value TEXT) 
RETURNS NUMERIC AS $$
DECLARE
  response_lower TEXT;
BEGIN
  response_lower := LOWER(TRIM(response_value));
  
  RETURN CASE response_lower
    -- Module 1 risk assessment responses
    WHEN 'yes' THEN 1.0
    WHEN 'partial' THEN 3.0
    WHEN 'partially' THEN 3.0
    WHEN 'no' THEN 5.0
    
    -- Modules 2 & 3 control implementation responses
    WHEN 'fully implemented' THEN 1.0
    WHEN 'partially implemented' THEN 3.0
    WHEN 'not in place' THEN 5.0
    
    -- Default for any unrecognized response
    ELSE 0.0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_risk_level(score NUMERIC) 
RETURNS TEXT AS $$
BEGIN
  IF score < 1.5 THEN RETURN 'Low';
  ELSIF score < 2.5 THEN RETURN 'Moderate';
  ELSE RETURN 'High';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalculate ALL section scores with comprehensive response handling
DO $$
DECLARE
  section_rec RECORD;
  response_rec RECORD;
  
  total_weighted_score NUMERIC;
  total_weight NUMERIC;
  tc_weighted_score NUMERIC;
  tc_total_weight NUMERIC;
  e_weighted_score NUMERIC;
  e_total_weight NUMERIC;
  
  question_weight INTEGER := 1;
  score_value NUMERIC;
  final_overall_score NUMERIC;
  final_tc_score NUMERIC;
  final_e_score NUMERIC;
  final_risk_level TEXT;
  answered_count INTEGER;
  total_count INTEGER;
  
  recognized_responses INTEGER := 0;
  unrecognized_responses INTEGER := 0;
BEGIN
  RAISE NOTICE 'Recalculating ALL section scores with comprehensive response handling...';
  
  FOR section_rec IN
    SELECT id, assessment_id, section_code, section_name
    FROM section_scores
    ORDER BY assessment_id, section_code
  LOOP
    -- Reset counters
    total_weighted_score := 0;
    total_weight := 0;
    tc_weighted_score := 0;
    tc_total_weight := 0;
    e_weighted_score := 0;
    e_total_weight := 0;
    answered_count := 0;
    recognized_responses := 0;
    unrecognized_responses := 0;
    
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
      score_value := get_risk_score(response_rec.response);
      
      IF score_value > 0 THEN
        recognized_responses := recognized_responses + 1;
        
        total_weighted_score := total_weighted_score + (score_value * question_weight);
        total_weight := total_weight + question_weight;
        answered_count := answered_count + 1;
        
        -- Separate TC and E questions
        IF response_rec.question_code LIKE '%-E' THEN
          e_weighted_score := e_weighted_score + (score_value * question_weight);
          e_total_weight := e_total_weight + question_weight;
        ELSE
          tc_weighted_score := tc_weighted_score + (score_value * question_weight);
          tc_total_weight := tc_total_weight + question_weight;
        END IF;
      ELSE
        unrecognized_responses := unrecognized_responses + 1;
        RAISE WARNING 'Unrecognized response: "%" for question % in section %', 
          response_rec.response, response_rec.question_code, section_rec.section_code;
      END IF;
    END LOOP;
    
    -- Calculate final scores
    final_overall_score := CASE 
      WHEN total_weight > 0 THEN total_weighted_score / total_weight 
      ELSE 0 
    END;
    
    final_tc_score := CASE 
      WHEN tc_total_weight > 0 THEN tc_weighted_score / tc_total_weight 
      ELSE 0 
    END;
    
    final_e_score := CASE 
      WHEN e_total_weight > 0 THEN e_weighted_score / e_total_weight 
      ELSE 0 
    END;
    
    final_risk_level := get_risk_level(final_overall_score);
    
    -- Update section_scores
    UPDATE section_scores
    SET 
      risk_score = final_overall_score,
      technical_compliance_score = final_tc_score,
      effectiveness_score = final_e_score,
      risk_level = final_risk_level,
      risk_rating = final_risk_level,
      answered_questions = answered_count,
      total_questions = GREATEST(total_count, answered_count),
      updated_at = NOW()
    WHERE id = section_rec.id;
    
    IF answered_count > 0 THEN
      RAISE NOTICE 'Section %: Overall=%, TC=%, E=%, Answered=%/%, Risk=%',
        section_rec.section_code,
        ROUND(final_overall_score::numeric, 2),
        ROUND(final_tc_score::numeric, 2),
        ROUND(final_e_score::numeric, 2),
        answered_count,
        total_count,
        final_risk_level;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Section score recalculation complete';
END $$;

-- Update assessment overall scores
DO $$
DECLARE
  assessment_rec RECORD;
  avg_overall_score NUMERIC;
  avg_tc_score NUMERIC;
  avg_e_score NUMERIC;
  overall_risk_level TEXT;
  section_count INTEGER;
BEGIN
  RAISE NOTICE 'Updating assessment overall scores...';
  
  FOR assessment_rec IN
    SELECT DISTINCT assessment_id
    FROM section_scores
  LOOP
    SELECT COUNT(*) INTO section_count
    FROM section_scores
    WHERE assessment_id = assessment_rec.assessment_id;
    
    SELECT 
      AVG(risk_score),
      AVG(technical_compliance_score),
      AVG(effectiveness_score)
    INTO 
      avg_overall_score,
      avg_tc_score,
      avg_e_score
    FROM section_scores
    WHERE assessment_id = assessment_rec.assessment_id;
    
    overall_risk_level := get_risk_level(COALESCE(avg_overall_score, 0));
    
    UPDATE assessments
    SET 
      overall_risk_score = COALESCE(avg_overall_score, 0),
      overall_risk_rating = overall_risk_level,
      module_1_score = COALESCE(avg_overall_score, 0),
      module_2_score = COALESCE(avg_tc_score, 0),
      module_3_score = COALESCE(avg_e_score, 0),
      updated_at = NOW()
    WHERE id = assessment_rec.assessment_id;
    
    RAISE NOTICE 'Assessment % (% sections): Overall=%, TC=%, E=%, Risk=%',
      LEFT(assessment_rec.assessment_id::text, 8),
      section_count,
      ROUND(COALESCE(avg_overall_score, 0)::numeric, 2),
      ROUND(COALESCE(avg_tc_score, 0)::numeric, 2),
      ROUND(COALESCE(avg_e_score, 0)::numeric, 2),
      overall_risk_level;
  END LOOP;
  
  RAISE NOTICE 'Assessment score updates complete';
END $$;

-- Cleanup
DROP FUNCTION IF EXISTS get_risk_score(TEXT);
DROP FUNCTION IF EXISTS get_risk_level(NUMERIC);

-- Final summary with sample data
DO $$
DECLARE
  sample_rec RECORD;
  total_assessments INTEGER;
  total_sections INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_assessments FROM assessments WHERE status = 'completed';
  SELECT COUNT(*) INTO total_sections FROM section_scores;
  
  RAISE NOTICE '=== COMPREHENSIVE SCORING UPDATE COMPLETE ===';
  RAISE NOTICE 'Total completed assessments: %', total_assessments;
  RAISE NOTICE 'Total section scores: %', total_sections;
  RAISE NOTICE '';
  RAISE NOTICE 'Sample assessment scores:';
  
  FOR sample_rec IN
    SELECT 
      o.name,
      a.overall_risk_score,
      a.overall_risk_rating,
      (SELECT STRING_AGG(section_code || '=' || ROUND(risk_score::numeric, 2)::text, ', ' ORDER BY section_code)
       FROM section_scores WHERE assessment_id = a.id) as section_scores
    FROM assessments a
    LEFT JOIN organizations o ON a.organization_id = o.id
    WHERE a.status = 'completed'
    LIMIT 3
  LOOP
    RAISE NOTICE '  %: Overall=% (%), Sections: %',
      sample_rec.name,
      ROUND(sample_rec.overall_risk_score::numeric, 2),
      sample_rec.overall_risk_rating,
      COALESCE(sample_rec.section_scores, 'none');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'FATF 5-Point Risk Scale Applied Successfully';
  RAISE NOTICE 'Scale: 1=Low Risk, 3=Medium Risk, 5=High Risk';
END $$;
