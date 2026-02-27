/*
  # Fix Case-Sensitive Response Scoring

  1. Problem
    - Responses stored as "Yes", "No", "Partially" (capitalized)
    - Scoring function was looking for lowercase "yes", "no", "partial"
    - This caused all scores to be calculated as 0

  2. Solution
    - Update scoring function to handle both capitalized and lowercase responses
    - Handle "Partially" as well as "partial"
    - Recalculate all section scores with correct case handling

  3. Scoring
    - Yes/yes = 1.0 (Low risk - good controls)
    - Partially/partial = 3.0 (Medium risk - partial controls)
    - No/no = 5.0 (High risk - no controls)
*/

-- Create case-insensitive scoring function
CREATE OR REPLACE FUNCTION get_risk_score(response_value TEXT) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE LOWER(response_value)
    WHEN 'yes' THEN 1.0
    WHEN 'partial' THEN 3.0
    WHEN 'partially' THEN 3.0
    WHEN 'no' THEN 5.0
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

-- Recalculate ALL section scores with case-insensitive matching
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
BEGIN
  RAISE NOTICE 'Recalculating section scores with case-insensitive matching...';
  
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
        AND LOWER(response) != 'na'
    LOOP
      score_value := get_risk_score(response_rec.response) * question_weight;
      
      total_weighted_score := total_weighted_score + score_value;
      total_weight := total_weight + question_weight;
      answered_count := answered_count + 1;
      
      IF response_rec.question_code LIKE '%-E' THEN
        e_weighted_score := e_weighted_score + score_value;
        e_total_weight := e_total_weight + question_weight;
      ELSE
        tc_weighted_score := tc_weighted_score + score_value;
        tc_total_weight := tc_total_weight + question_weight;
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
      RAISE NOTICE 'Section %: Overall=%, TC=%, E=%, Risk=%',
        section_rec.section_code,
        ROUND(final_overall_score::numeric, 2),
        ROUND(final_tc_score::numeric, 2),
        ROUND(final_e_score::numeric, 2),
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

-- Final verification
DO $$
DECLARE
  sample_rec RECORD;
BEGIN
  RAISE NOTICE '=== SCORING VERIFICATION ===';
  
  FOR sample_rec IN
    SELECT 
      a.id,
      o.name,
      a.overall_risk_score,
      a.overall_risk_rating,
      (SELECT COUNT(*) FROM section_scores WHERE assessment_id = a.id) as sections
    FROM assessments a
    LEFT JOIN organizations o ON a.organization_id = o.id
    WHERE a.status = 'completed'
    LIMIT 5
  LOOP
    RAISE NOTICE 'Assessment: %, Score: %, Risk: %, Sections: %',
      sample_rec.name,
      ROUND(sample_rec.overall_risk_score::numeric, 2),
      sample_rec.overall_risk_rating,
      sample_rec.sections;
  END LOOP;
  
  RAISE NOTICE '=== All scores recalculated with FATF 5-point scale ===';
END $$;
