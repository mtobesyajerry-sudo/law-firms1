/*
  # Add TC/E Score Columns and Recalculate ALL Scores with FATF 5-Point Scale

  1. Purpose
    - Adds technical_compliance_score and effectiveness_score columns to section_scores
    - Recalculates ALL scores using proper FATF 5-point risk scale
    - Response scoring: Yes=1 (low risk), Partial=3 (medium risk), No=5 (high risk)
    - Separates TC questions (non -E) from E questions (ending in -E)

  2. Changes
    - Add technical_compliance_score column to section_scores
    - Add effectiveness_score column to section_scores
    - Recalculate all section scores with new 5-point scale
    - Update all assessment overall scores

  3. Risk Levels
    - Low: score < 1.5
    - Moderate: 1.5 ≤ score < 2.5
    - High: score ≥ 2.5

  4. Notes
    - This is the definitive scoring migration
    - All previous data will be recalculated correctly
    - Future assessments will use this scoring logic
*/

-- Step 1: Add the TC and E score columns
DO $$ 
BEGIN
  -- Add technical_compliance_score if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'technical_compliance_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN technical_compliance_score numeric DEFAULT 0;
    RAISE NOTICE 'Added technical_compliance_score column';
  END IF;

  -- Add effectiveness_score if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'effectiveness_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN effectiveness_score numeric DEFAULT 0;
    RAISE NOTICE 'Added effectiveness_score column';
  END IF;
END $$;

-- Step 2: Create helper functions for scoring
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

-- Step 3: Recalculate ALL section scores using 5-point FATF scale
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
  total_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting section score recalculation...';
  
  -- Loop through all section scores
  FOR section_record IN 
    SELECT id, assessment_id, section_code, section_name
    FROM section_scores
    ORDER BY assessment_id, section_code
  LOOP
    -- Reset counters for this section
    total_weighted_score := 0;
    total_weight := 0;
    tc_weighted_score := 0;
    tc_total_weight := 0;
    e_weighted_score := 0;
    e_total_weight := 0;
    answered_count := 0;
    
    -- Count total questions for this section (including NA responses)
    SELECT COUNT(*) INTO total_count
    FROM assessment_responses
    WHERE assessment_id = section_record.assessment_id
      AND section_code = section_record.section_code;
    
    -- Get all responses for this assessment and section (excluding NA)
    FOR response_record IN
      SELECT question_code, response
      FROM assessment_responses
      WHERE assessment_id = section_record.assessment_id
        AND section_code = section_record.section_code
        AND response IS NOT NULL
        AND response != 'na'
    LOOP
      -- Use weight of 1 for all questions
      question_weight := 1;
      
      -- Calculate risk score using 5-point scale
      score_value := get_risk_score(response_record.response) * question_weight;
      
      -- Add to overall totals
      total_weighted_score := total_weighted_score + score_value;
      total_weight := total_weight + question_weight;
      answered_count := answered_count + 1;
      
      -- Separate into TC and E buckets based on question code
      IF response_record.question_code LIKE '%-E' THEN
        -- Effectiveness question
        e_weighted_score := e_weighted_score + score_value;
        e_total_weight := e_total_weight + question_weight;
      ELSE
        -- Technical Compliance question
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
    
    -- Update the section_scores record with all scores
    UPDATE section_scores
    SET 
      risk_score = final_overall_score,
      technical_compliance_score = final_tc_score,
      effectiveness_score = final_e_score,
      risk_level = final_risk_level,
      risk_rating = final_risk_level,
      answered_questions = answered_count,
      total_questions = GREATEST(total_count, answered_count)
    WHERE id = section_record.id;
    
  END LOOP;
  
  RAISE NOTICE 'Section scores recalculated successfully';
END $$;

-- Step 4: Recalculate overall assessment scores
DO $$
DECLARE
  assessment_record RECORD;
  avg_overall_score NUMERIC;
  avg_tc_score NUMERIC;
  avg_e_score NUMERIC;
  overall_risk_level TEXT;
  section_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting assessment overall score recalculation...';
  
  -- Loop through all assessments that have section scores
  FOR assessment_record IN 
    SELECT DISTINCT assessment_id
    FROM section_scores
    ORDER BY assessment_id
  LOOP
    -- Count sections for this assessment
    SELECT COUNT(*) INTO section_count
    FROM section_scores
    WHERE assessment_id = assessment_record.assessment_id;
    
    -- Calculate average scores across all sections for this assessment
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
    
    RAISE NOTICE 'Updated assessment % with % sections, overall score: %', 
      assessment_record.assessment_id, section_count, COALESCE(avg_overall_score, 0);
    
  END LOOP;
  
  RAISE NOTICE 'Assessment overall scores recalculated successfully';
END $$;

-- Step 5: Drop the helper functions (no longer needed)
DROP FUNCTION IF EXISTS get_risk_score(TEXT);
DROP FUNCTION IF EXISTS get_risk_level(NUMERIC);

-- Final verification query (optional - just for logging)
DO $$
DECLARE
  total_assessments INTEGER;
  total_sections INTEGER;
BEGIN
  SELECT COUNT(DISTINCT id) INTO total_assessments FROM assessments WHERE status = 'completed';
  SELECT COUNT(*) INTO total_sections FROM section_scores;
  
  RAISE NOTICE '=== RECALCULATION COMPLETE ===';
  RAISE NOTICE 'Total completed assessments: %', total_assessments;
  RAISE NOTICE 'Total section scores updated: %', total_sections;
  RAISE NOTICE 'All scores now use FATF 5-point risk scale';
  RAISE NOTICE 'Scoring: Yes=1 (Low), Partial=3 (Medium), No=5 (High)';
END $$;
