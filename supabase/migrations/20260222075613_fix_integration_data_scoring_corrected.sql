/*
  # Fix Integration Data and Scoring System - Corrected
  
  **Problem**: Assessments marked as "completed" have NULL scores because:
  - Section scores show 0 answered_questions despite having 148+ responses
  - Module scores (module_1_score, module_2_score, module_3_score) are NULL
  - overall_risk_rating is NULL
  - This causes the integration dashboard to show "No integration data available"
  
  **Root Cause**: The scoring calculation system is not being triggered properly when assessments
  are marked as completed, leaving section_scores with incorrect data.
  
  **Solution**:
  1. Recalculate all section scores from existing assessment_responses
  2. Update module scores on assessments table from section_scores
  3. Calculate and set overall_risk_rating based on module scores
  4. Fix the scoring system to prevent this issue in the future
  
  **Tables Affected**:
  - section_scores: Updates answered_questions, risk_score, risk_level
  - assessments: Updates module_1_score, module_2_score, module_3_score, overall_risk_rating
*/

-- Step 1: Update section_scores with correct answered_questions count
UPDATE section_scores ss
SET 
  answered_questions = (
    SELECT COUNT(DISTINCT ar.question_code)
    FROM assessment_responses ar
    WHERE ar.assessment_id = ss.assessment_id
    AND ar.question_code LIKE ss.section_code || '%'
    AND ar.response IS NOT NULL
    AND ar.response != ''
  ),
  updated_at = NOW()
WHERE assessment_id IN (
  SELECT id FROM assessments WHERE status = 'completed'
);

-- Step 2: Recalculate risk scores for MODULE_2 (Technical Compliance)
UPDATE section_scores ss
SET 
  technical_compliance_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'fully compliant' OR ar.response ILIKE '%compliant%' THEN 1
            WHEN ar.response ILIKE 'largely compliant' THEN 2
            WHEN ar.response ILIKE 'partially compliant' THEN 3
            WHEN ar.response ILIKE 'materially non-compliant' OR ar.response ILIKE '%non compliant%' THEN 4
            WHEN ar.response ILIKE 'non-compliant' THEN 5
            ELSE 3
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.question_code LIKE ss.section_code || '%'
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'fully compliant' OR ar.response ILIKE '%compliant%' THEN 1
            WHEN ar.response ILIKE 'largely compliant' THEN 2
            WHEN ar.response ILIKE 'partially compliant' THEN 3
            WHEN ar.response ILIKE 'materially non-compliant' OR ar.response ILIKE '%non compliant%' THEN 4
            WHEN ar.response ILIKE 'non-compliant' THEN 5
            ELSE 3
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.question_code LIKE ss.section_code || '%'
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE ss.section_code = 'MODULE_2'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 3: Recalculate effectiveness scores for MODULE_3
UPDATE section_scores ss
SET 
  effectiveness_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'highly effective' OR ar.response ILIKE '%effective%' THEN 1
            WHEN ar.response ILIKE 'substantially effective' THEN 2
            WHEN ar.response ILIKE 'moderately effective' THEN 3
            WHEN ar.response ILIKE 'partially effective' THEN 4
            WHEN ar.response ILIKE 'ineffective' OR ar.response ILIKE 'not effective' THEN 5
            ELSE 3
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.question_code LIKE ss.section_code || '%'
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE 'highly effective' OR ar.response ILIKE '%effective%' THEN 1
            WHEN ar.response ILIKE 'substantially effective' THEN 2
            WHEN ar.response ILIKE 'moderately effective' THEN 3
            WHEN ar.response ILIKE 'partially effective' THEN 4
            WHEN ar.response ILIKE 'ineffective' OR ar.response ILIKE 'not effective' THEN 5
            ELSE 3
          END
        )::numeric
        FROM assessment_responses ar
        WHERE ar.assessment_id = ss.assessment_id
        AND ar.question_code LIKE ss.section_code || '%'
        AND ar.response IS NOT NULL
      ), 2)
    ELSE NULL
  END,
  updated_at = NOW()
WHERE ss.section_code = 'MODULE_3'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 4: Update risk_level and risk_rating based on risk_score
UPDATE section_scores
SET 
  risk_level = CASE
    WHEN risk_score IS NULL THEN NULL
    WHEN risk_score <= 1.5 THEN 'Low'
    WHEN risk_score <= 2.5 THEN 'Moderate'
    WHEN risk_score <= 3.5 THEN 'Substantial'
    WHEN risk_score <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  risk_rating = CASE
    WHEN risk_score IS NULL THEN NULL
    WHEN risk_score <= 1.5 THEN 'Low'
    WHEN risk_score <= 2.5 THEN 'Moderate'
    WHEN risk_score <= 3.5 THEN 'Substantial'
    WHEN risk_score <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  updated_at = NOW()
WHERE assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
AND risk_score IS NOT NULL;

-- Step 5: Update module scores on assessments table from section_scores
UPDATE assessments a
SET 
  module_1_score = (
    SELECT risk_score 
    FROM section_scores 
    WHERE assessment_id = a.id AND section_code = 'MODULE_1'
    LIMIT 1
  ),
  module_2_score = (
    SELECT risk_score 
    FROM section_scores 
    WHERE assessment_id = a.id AND section_code = 'MODULE_2'
    LIMIT 1
  ),
  module_3_score = (
    SELECT risk_score 
    FROM section_scores 
    WHERE assessment_id = a.id AND section_code = 'MODULE_3'
    LIMIT 1
  ),
  updated_at = NOW()
WHERE status = 'completed';

-- Step 6: Calculate and set overall_risk_rating based on average of module scores
UPDATE assessments
SET 
  overall_risk_rating = CASE
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1, 
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 1.5 THEN 'Low'
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1,
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 2.5 THEN 'Medium'
    WHEN (COALESCE(module_1_score, 0) + COALESCE(module_2_score, 0) + COALESCE(module_3_score, 0)) / 
         GREATEST(1,
           (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
            CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END)
         ) <= 3.5 THEN 'Substantial'
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
