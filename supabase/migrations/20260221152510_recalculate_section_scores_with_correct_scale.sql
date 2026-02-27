/*
  # Recalculate Section Scores with Correct FATF Scale
  
  ## Purpose
  Update section_scores table to reflect the corrected FATF 1-5 scale calculations
  that match the fixed frontend scoring logic.
  
  ## Changes
  1. Recalculate risk_score for each section based on responses
  2. Update technical_compliance_score for MODULE_2 sections
  3. Update effectiveness_score for MODULE_3 sections
  4. Update answered_questions and total_questions counts
  
  ## FATF Scale
  - Module 1: Yes=5, Partially=3, No=1
  - Module 2: Fully implemented=1, Partially=0.5, Not in place=0 → Convert to 1-5
  - Module 3: Effective=1, Weak=0.25, Ineffective=0 → Convert to 1-5
*/

-- Recalculate section scores for all assessments
DO $$
DECLARE
  section_rec RECORD;
  response_rec RECORD;
  
  total_weighted_score NUMERIC;
  total_weight NUMERIC;
  raw_score NUMERIC;
  effectiveness NUMERIC;
  fatf_score NUMERIC;
  
  question_weight INTEGER := 1;
  score_value NUMERIC;
  final_risk_level TEXT;
  answered_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE 'Recalculating section scores with correct FATF scale...';
  RAISE NOTICE '';
  
  FOR section_rec IN
    SELECT DISTINCT
      ss.id,
      ss.assessment_id,
      ss.section_code,
      ss.section_name,
      a.framework_type
    FROM section_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    ORDER BY ss.assessment_id, ss.section_code
  LOOP
    -- Reset counters
    total_weighted_score := 0;
    total_weight := 0;
    answered_count := 0;
    raw_score := 0;
    
    -- Count total questions
    SELECT COUNT(*) INTO total_count
    FROM assessment_responses
    WHERE assessment_id = section_rec.assessment_id
      AND section_code = section_rec.section_code;
    
    -- Determine section type
    DECLARE
      is_module1 BOOLEAN := section_rec.section_code ILIKE 'MODULE_1%' OR section_rec.section_code ILIKE '1%';
      is_module2 BOOLEAN := section_rec.section_code ILIKE 'MODULE_2%' OR section_rec.section_code ILIKE '2%';
      is_module3 BOOLEAN := section_rec.section_code ILIKE 'MODULE_3%' OR section_rec.section_code ILIKE '3%';
    BEGIN
      -- Process responses based on module type
      FOR response_rec IN
        SELECT question_code, response
        FROM assessment_responses
        WHERE assessment_id = section_rec.assessment_id
          AND section_code = section_rec.section_code
          AND response IS NOT NULL
          AND LOWER(response) NOT IN ('na', 'n/a', 'not applicable')
      LOOP
        IF is_module1 THEN
          -- Module 1: Inherent Risk (1-5 scale directly)
          score_value := CASE LOWER(TRIM(response_rec.response))
            WHEN 'yes' THEN 5.0
            WHEN 'partial' THEN 3.0
            WHEN 'partially' THEN 3.0
            WHEN 'no' THEN 1.0
            ELSE 3.0
          END;
          
        ELSIF is_module2 THEN
          -- Module 2: Control Compliance (0-1 effectiveness scale)
          score_value := CASE LOWER(TRIM(response_rec.response))
            WHEN 'fully implemented & documented' THEN 1.0
            WHEN 'fully implemented' THEN 1.0
            WHEN 'partially implemented' THEN 0.5
            WHEN 'not in place' THEN 0.0
            ELSE 0.0
          END;
          
        ELSIF is_module3 THEN
          -- Module 3: Effectiveness (0-1 effectiveness scale)
          score_value := CASE LOWER(TRIM(response_rec.response))
            WHEN 'effective' THEN 1.0
            WHEN 'weak' THEN 0.25
            WHEN 'ineffective' THEN 0.0
            ELSE 0.0
          END;
          
        ELSE
          score_value := 3.0; -- Default moderate
        END IF;
        
        IF score_value >= 0 THEN
          total_weighted_score := total_weighted_score + (score_value * question_weight);
          total_weight := total_weight + question_weight;
          answered_count := answered_count + 1;
        END IF;
      END LOOP;
      
      -- Calculate final score based on module type
      IF answered_count > 0 THEN
        IF is_module1 THEN
          -- Module 1: Already on 1-5 scale
          fatf_score := total_weighted_score / total_weight;
          
        ELSIF is_module2 OR is_module3 THEN
          -- Module 2 & 3: Convert effectiveness (0-1) to FATF scale (1-5)
          effectiveness := total_weighted_score / total_weight;
          raw_score := total_weighted_score;
          -- Formula: 5.0 - (effectiveness × 4.0)
          -- 100% effective (1.0) = 1.0/5.0
          -- 0% effective (0.0) = 5.0/5.0
          fatf_score := 5.0 - (effectiveness * 4.0);
          
        ELSE
          fatf_score := 3.0; -- Default moderate
        END IF;
      ELSE
        fatf_score := 3.0; -- No answers = moderate risk
      END IF;
      
      -- Determine risk level
      final_risk_level := CASE
        WHEN fatf_score < 2.0 THEN 'Low'
        WHEN fatf_score < 3.5 THEN 'Moderate'
        ELSE 'High'
      END;
      
      -- Update section_scores with correct values
      UPDATE section_scores
      SET 
        risk_score = fatf_score,
        technical_compliance_score = CASE 
          WHEN is_module2 THEN fatf_score
          ELSE 0
        END,
        effectiveness_score = CASE 
          WHEN is_module3 THEN fatf_score
          ELSE 0
        END,
        risk_level = final_risk_level,
        risk_rating = final_risk_level,
        answered_questions = answered_count,
        total_questions = GREATEST(total_count, answered_count),
        updated_at = NOW()
      WHERE id = section_rec.id;
      
      RAISE NOTICE 'Section %: Score=% (raw=%, answers=%/%)',
        section_rec.section_code,
        ROUND(fatf_score::numeric, 2),
        ROUND(raw_score::numeric, 2),
        answered_count,
        total_count;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Section score recalculation complete';
END $$;

-- Verify the results
DO $$
DECLARE
  verification_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION: Section Scores ===';
  RAISE NOTICE '';
  
  FOR verification_rec IN
    SELECT 
      a.id as assessment_id,
      ss.section_code,
      ss.risk_score,
      ss.technical_compliance_score,
      ss.effectiveness_score,
      ss.answered_questions,
      ss.total_questions,
      ss.risk_level
    FROM section_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    WHERE a.status = 'completed'
    ORDER BY a.created_at DESC, ss.section_code
  LOOP
    RAISE NOTICE 'Assessment % - Section %:',
      LEFT(verification_rec.assessment_id::text, 8),
      verification_rec.section_code;
    RAISE NOTICE '  Risk Score: % / 5.0 (%)',
      ROUND(verification_rec.risk_score::numeric, 2),
      verification_rec.risk_level;
    
    IF verification_rec.technical_compliance_score > 0 THEN
      RAISE NOTICE '  Technical Compliance: % / 5.0',
        ROUND(verification_rec.technical_compliance_score::numeric, 2);
    END IF;
    
    IF verification_rec.effectiveness_score > 0 THEN
      RAISE NOTICE '  Effectiveness: % / 5.0',
        ROUND(verification_rec.effectiveness_score::numeric, 2);
    END IF;
    
    RAISE NOTICE '  Questions: % / %',
      verification_rec.answered_questions,
      verification_rec.total_questions;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== Section Scores Properly Scaled to FATF 1-5 ===';
END $$;
