/*
  # Generate Missing Section Scores and Recalculate with 5-Point FATF Scale

  1. Purpose
    - Creates section_scores records for assessments that don't have them
    - Calculates scores using FATF 5-point risk scale
    - Properly separates TC and E questions
    - Updates assessment overall scores

  2. Process
    - Find assessments with responses but no section_scores
    - Group responses by section_code
    - Calculate scores: Yes=1 (low), Partial=3 (medium), No=5 (high)
    - Create section_scores records
    - Update assessment overall scores

  3. Notes
    - Fixes historical data where section_scores weren't created
    - Ensures all completed assessments have proper scoring
*/

-- Helper functions
CREATE OR REPLACE FUNCTION get_risk_score(response_value TEXT) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE response_value
    WHEN 'yes' THEN 1.0
    WHEN 'partial' THEN 3.0
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

-- Create section_scores for assessments that don't have them
DO $$
DECLARE
  assessment_rec RECORD;
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
  
  section_name_map JSONB := '{
    "module1": "Module 1: Inherent Risk Assessment",
    "module2": "Module 2: Control Environment & Compliance",
    "module3": "Module 3: Effectiveness Assessment"
  }'::jsonb;
  
  section_display_name TEXT;
BEGIN
  RAISE NOTICE 'Generating missing section scores...';
  
  -- Find assessments with responses but no section_scores
  FOR assessment_rec IN
    SELECT DISTINCT ar.assessment_id
    FROM assessment_responses ar
    LEFT JOIN section_scores ss ON ar.assessment_id = ss.assessment_id
    WHERE ss.id IS NULL
  LOOP
    RAISE NOTICE 'Processing assessment: %', assessment_rec.assessment_id;
    
    -- Get distinct sections for this assessment
    FOR section_rec IN
      SELECT DISTINCT section_code
      FROM assessment_responses
      WHERE assessment_id = assessment_rec.assessment_id
      ORDER BY section_code
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
      WHERE assessment_id = assessment_rec.assessment_id
        AND section_code = section_rec.section_code;
      
      -- Process each response in this section
      FOR response_rec IN
        SELECT question_code, response
        FROM assessment_responses
        WHERE assessment_id = assessment_rec.assessment_id
          AND section_code = section_rec.section_code
          AND response IS NOT NULL
          AND response != 'na'
      LOOP
        score_value := get_risk_score(response_rec.response) * question_weight;
        
        total_weighted_score := total_weighted_score + score_value;
        total_weight := total_weight + question_weight;
        answered_count := answered_count + 1;
        
        -- Separate TC and E
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
      
      -- Get section display name
      section_display_name := COALESCE(
        section_name_map->>section_rec.section_code,
        section_rec.section_code
      );
      
      -- Insert section_scores record
      INSERT INTO section_scores (
        assessment_id,
        section_code,
        section_name,
        total_questions,
        answered_questions,
        risk_score,
        technical_compliance_score,
        effectiveness_score,
        risk_level,
        risk_rating,
        created_at,
        updated_at
      ) VALUES (
        assessment_rec.assessment_id,
        section_rec.section_code,
        section_display_name,
        total_count,
        answered_count,
        final_overall_score,
        final_tc_score,
        final_e_score,
        final_risk_level,
        final_risk_level,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE '  Created section score for % - Score: %, TC: %, E: %', 
        section_rec.section_code, 
        ROUND(final_overall_score::numeric, 2),
        ROUND(final_tc_score::numeric, 2),
        ROUND(final_e_score::numeric, 2);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Section scores generation complete';
END $$;

-- Update overall assessment scores
DO $$
DECLARE
  assessment_rec RECORD;
  avg_overall_score NUMERIC;
  avg_tc_score NUMERIC;
  avg_e_score NUMERIC;
  overall_risk_level TEXT;
BEGIN
  RAISE NOTICE 'Updating assessment overall scores...';
  
  FOR assessment_rec IN
    SELECT DISTINCT assessment_id
    FROM section_scores
  LOOP
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
      module_3_score = COALESCE(avg_e_score, 0)
    WHERE id = assessment_rec.assessment_id;
    
    RAISE NOTICE 'Updated assessment % - Overall: %, TC: %, E: %',
      assessment_rec.assessment_id,
      ROUND(COALESCE(avg_overall_score, 0)::numeric, 2),
      ROUND(COALESCE(avg_tc_score, 0)::numeric, 2),
      ROUND(COALESCE(avg_e_score, 0)::numeric, 2);
  END LOOP;
  
  RAISE NOTICE 'Assessment score updates complete';
END $$;

-- Cleanup
DROP FUNCTION IF EXISTS get_risk_score(TEXT);
DROP FUNCTION IF EXISTS get_risk_level(NUMERIC);

-- Final summary
DO $$
DECLARE
  total_assessments INTEGER;
  total_sections INTEGER;
  avg_score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_assessments FROM assessments WHERE status = 'completed';
  SELECT COUNT(*) INTO total_sections FROM section_scores;
  SELECT AVG(overall_risk_score) INTO avg_score FROM assessments WHERE status = 'completed';
  
  RAISE NOTICE '=== SCORING UPDATE COMPLETE ===';
  RAISE NOTICE 'Total assessments: %', total_assessments;
  RAISE NOTICE 'Total section scores: %', total_sections;
  RAISE NOTICE 'Average risk score: %', ROUND(avg_score::numeric, 2);
  RAISE NOTICE 'Scale: 1-5 (1=Low Risk, 5=High Risk)';
END $$;
