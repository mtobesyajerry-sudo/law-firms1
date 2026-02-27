/*
  # Fix Integration Data and Scoring System - Correct Risk Ratings
  
  **Problem**: Assessments show NULL scores causing "No integration data available"
  
  **Solution**: Calculate scores and use correct risk rating values that match the constraint:
  - Low, Moderate, High, Very High (not Medium or Substantial)
*/

-- Step 1: Update answered_questions count
UPDATE section_scores ss
SET 
  answered_questions = (
    SELECT COUNT(DISTINCT ar.question_code)
    FROM assessment_responses ar
    WHERE ar.assessment_id = ss.assessment_id
    AND ar.section_code = ss.section_code
    AND ar.response IS NOT NULL
    AND ar.response != ''
  ),
  updated_at = NOW()
WHERE assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 2: Calculate MODULE_2 scores (Technical Compliance)
UPDATE section_scores ss
SET 
  technical_compliance_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'yes' THEN 1.0
            WHEN ar.response ILIKE 'no' THEN 5.0
            ELSE 3.0
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.section_code = ss.section_code
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'yes' THEN 1.0
            WHEN ar.response ILIKE 'no' THEN 5.0
            ELSE 3.0
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.section_code = ss.section_code
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE ss.section_code = 'MODULE_2'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 3: Calculate MODULE_3 scores (Effectiveness)
UPDATE section_scores ss
SET 
  effectiveness_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'yes' THEN 1.0
            WHEN ar.response ILIKE 'no' THEN 5.0
            ELSE 3.0
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.section_code = ss.section_code
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'yes' THEN 1.0
            WHEN ar.response ILIKE 'no' THEN 5.0
            ELSE 3.0
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.section_code = ss.section_code
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE ss.section_code = 'MODULE_3'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 4: Calculate MODULE_1 scores (Inherent Risk)
UPDATE section_scores ss
SET 
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'yes' THEN 1.0
            WHEN ar.response ILIKE 'no' THEN 5.0
            ELSE 3.0
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.section_code = ss.section_code
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE ss.section_code = 'MODULE_1'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 5: Update risk_level with correct values
UPDATE section_scores
SET 
  risk_level = CASE
    WHEN risk_score IS NULL THEN NULL
    WHEN risk_score <= 2.0 THEN 'Low'
    WHEN risk_score <= 3.5 THEN 'Moderate'
    WHEN risk_score <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  risk_rating = CASE
    WHEN risk_score IS NULL THEN NULL
    WHEN risk_score <= 2.0 THEN 'Low'
    WHEN risk_score <= 3.5 THEN 'Moderate'
    WHEN risk_score <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  updated_at = NOW()
WHERE assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
AND risk_score IS NOT NULL;

-- Step 6: Copy scores to assessments table
UPDATE assessments a
SET 
  module_1_score = (SELECT risk_score FROM section_scores WHERE assessment_id = a.id AND section_code = 'MODULE_1' LIMIT 1),
  module_2_score = (SELECT risk_score FROM section_scores WHERE assessment_id = a.id AND section_code = 'MODULE_2' LIMIT 1),
  module_3_score = (SELECT risk_score FROM section_scores WHERE assessment_id = a.id AND section_code = 'MODULE_3' LIMIT 1),
  updated_at = NOW()
WHERE status = 'completed';

-- Step 7: Calculate overall_risk_rating (using correct values)
UPDATE assessments
SET 
  overall_risk_rating = CASE
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1, 
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 2.0 THEN 'Low'
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1,
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 3.5 THEN 'Moderate'
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1,
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  updated_at = NOW()
WHERE status = 'completed'
AND (module_1_score IS NOT NULL OR module_2_score IS NOT NULL OR module_3_score IS NOT NULL);
