/*
  # Fix Question Weight Consistency

  1. Purpose
    - Recalculates all scores using consistent weight of 1 (not 8)
    - Ensures database calculations match frontend scoring logic
    - Maintains FATF 5-point risk scale from previous migration

  2. Changes
    - Recalculates section_scores using weight=1 for all questions
    - Updates overall assessment scores accordingly

  3. Notes
    - All questions default to weight=1 unless explicitly specified
    - This ensures consistency between frontend and backend calculations
*/

-- Function to map response to 5-point risk score
CREATE OR REPLACE FUNCTION get_risk_score(response_value TEXT) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE response_value
    WHEN 'yes' THEN 1.0      -- Good controls = Low risk
    WHEN 'partial' THEN 3.0  -- Partial controls = Medium risk
    WHEN 'no' THEN 5.0       -- No controls = High risk
    ELSE 0.0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine risk level from score
CREATE OR REPLACE FUNCTION get_risk_level(score NUMERIC) 
RETURNS TEXT AS $$
BEGIN
  IF score < 1.5 THEN
    RETURN 'Low';
  ELSIF score < 2.5 THEN
    RETURN 'Moderate';
  ELSE
    RETURN 'High';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalculate all section scores with weight=1
DO $$
DECLARE
  section_record RECORD;
  response_record RECORD;
  
  -- Overall scoring
  total_weighted_score NUMERIC := 0;
  total_weight NUMERIC := 0;
  
  -- TC (Technical Compliance) scoring
  tc_weighted_score NUMERIC := 0;
  tc_total_weight NUMERIC := 0;
  
  -- E (Effectiveness) scoring
  e_weighted_score NUMERIC := 0;
  e_total_weight NUMERIC := 0;
  
  question_weight INTEGER;
  score_value NUMERIC;
  final_overall_score NUMERIC;
  final_tc_score NUMERIC;
  final_e_score NUMERIC;
  final_risk_level TEXT;
  answered_count INTEGER := 0;
BEGIN
  -- Loop through all section scores
  FOR section_record IN 
    SELECT id, assessment_id, section_code, section_name
    FROM section_scores
  LOOP
    -- Reset counters for this section
    total_weighted_score := 0;
    total_weight := 0;
    tc_weighted_score := 0;
    tc_total_weight := 0;
    e_weighted_score := 0;
    e_total_weight := 0;
    answered_count := 0;
    
    -- Get all responses for this assessment and section
    FOR response_record IN
      SELECT question_code, response
      FROM assessment_responses
      WHERE assessment_id = section_record.assessment_id
        AND section_code = section_record.section_code
        AND response IS NOT NULL
        AND response != 'na'
    LOOP
      -- Use weight of 1 (consistent with frontend)
      question_weight := 1;
      
      -- Calculate risk score using 5-point scale
      score_value := get_risk_score(response_record.response) * question_weight;
      
      -- Add to overall totals
      total_weighted_score := total_weighted_score + score_value;
      total_weight := total_weight + question_weight;
      answered_count := answered_count + 1;
      
      -- Separate into TC and E buckets
      IF response_record.question_code LIKE '%-E' THEN
        e_weighted_score := e_weighted_score + score_value;
        e_total_weight := e_total_weight + question_weight;
      ELSE
        tc_weighted_score := tc_weighted_score + score_value;
        tc_total_weight := tc_total_weight + question_weight;
      END IF;
    END LOOP;
    
    -- Calculate final scores on 5-point scale
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
    
    -- Update the section_scores record
    UPDATE section_scores
    SET 
      risk_score = final_overall_score,
      technical_compliance_score = final_tc_score,
      effectiveness_score = final_e_score,
      risk_level = final_risk_level,
      answered_questions = answered_count
    WHERE id = section_record.id;
    
  END LOOP;
  
  RAISE NOTICE 'Section scores recalculated with weight=1 and 5-point scale';
END $$;

-- Recalculate overall assessment scores
DO $$
DECLARE
  assessment_record RECORD;
  avg_overall_score NUMERIC;
  avg_tc_score NUMERIC;
  avg_e_score NUMERIC;
  overall_risk_level TEXT;
BEGIN
  -- Loop through all completed assessments
  FOR assessment_record IN 
    SELECT DISTINCT assessment_id
    FROM section_scores
  LOOP
    -- Calculate average scores across all sections
    SELECT 
      AVG(risk_score),
      AVG(technical_compliance_score),
      AVG(effectiveness_score)
    INTO 
      avg_overall_score,
      avg_tc_score,
      avg_e_score
    FROM section_scores
    WHERE assessment_id = assessment_record.assessment_id;
    
    overall_risk_level := get_risk_level(COALESCE(avg_overall_score, 0));
    
    -- Update the assessment with recalculated scores
    UPDATE assessments
    SET 
      overall_risk_score = COALESCE(avg_overall_score, 0),
      overall_risk_rating = overall_risk_level,
      module_1_score = COALESCE(avg_overall_score, 0),
      module_2_score = COALESCE(avg_tc_score, 0),
      module_3_score = COALESCE(avg_e_score, 0)
    WHERE id = assessment_record.assessment_id;
    
  END LOOP;
  
  RAISE NOTICE 'Assessment scores recalculated with correct weighting';
END $$;

-- Drop the helper functions
DROP FUNCTION IF EXISTS get_risk_score(TEXT);
DROP FUNCTION IF EXISTS get_risk_level(NUMERIC);
