/*
  # Add MODULE_4 to Scoring System - Complete 4-Module Integration
  
  **Problem**: MODULE_4 (Control Maturity Assessment) was excluded from scoring calculations
  - Module 4 scores are not being calculated
  - overall_risk_rating only considers modules 1-3
  - Integration dashboard missing module 4 data
  
  **Solution**: 
  1. Calculate MODULE_4 risk scores based on maturity level responses
  2. Update assessments table to include module_4_score in overall calculation
  3. Ensure integration service gets all 4 module scores
  
  **Maturity Scale Mapping**:
  - Initial: 5.0 (lowest maturity, highest risk)
  - Developing: 4.0
  - Defined: 3.0
  - Managed: 2.0
  - Optimizing: 1.0 (highest maturity, lowest risk)
*/

-- Step 1: Calculate MODULE_4 risk scores based on maturity responses
UPDATE section_scores ss
SET 
  risk_score = CASE
    WHEN ss.answered_questions > 0 THEN
      ROUND((
        SELECT AVG(
          CASE 
            WHEN ar.response ILIKE '%initial%' THEN 5.0
            WHEN ar.response ILIKE '%developing%' THEN 4.0
            WHEN ar.response ILIKE '%defined%' THEN 3.0
            WHEN ar.response ILIKE '%managed%' THEN 2.0
            WHEN ar.response ILIKE '%optimiz%' THEN 1.0
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
WHERE ss.section_code = 'MODULE_4'
AND ss.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed');

-- Step 2: Update risk_level for MODULE_4
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
WHERE section_code = 'MODULE_4'
AND assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
AND risk_score IS NOT NULL;

-- Step 3: Update module_4_score in assessments table
UPDATE assessments a
SET 
  module_4_score = (
    SELECT risk_score 
    FROM section_scores 
    WHERE assessment_id = a.id AND section_code = 'MODULE_4'
    LIMIT 1
  ),
  updated_at = NOW()
WHERE status = 'completed'
AND (module_4_score IS NULL OR module_4_score != (
  SELECT risk_score 
  FROM section_scores 
  WHERE assessment_id = a.id AND section_code = 'MODULE_4'
  LIMIT 1
));

-- Step 4: Recalculate overall_risk_rating INCLUDING MODULE_4
UPDATE assessments
SET 
  overall_risk_rating = CASE
    WHEN (
      COALESCE(module_1_score, 0) + 
      COALESCE(module_2_score, 0) + 
      COALESCE(module_3_score, 0) + 
      COALESCE(module_4_score, 0)
    ) / GREATEST(1, 
      (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_4_score IS NOT NULL THEN 1 ELSE 0 END)
    ) <= 2.0 THEN 'Low'
    WHEN (
      COALESCE(module_1_score, 0) + 
      COALESCE(module_2_score, 0) + 
      COALESCE(module_3_score, 0) + 
      COALESCE(module_4_score, 0)
    ) / GREATEST(1,
      (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_4_score IS NOT NULL THEN 1 ELSE 0 END)
    ) <= 3.5 THEN 'Moderate'
    WHEN (
      COALESCE(module_1_score, 0) + 
      COALESCE(module_2_score, 0) + 
      COALESCE(module_3_score, 0) + 
      COALESCE(module_4_score, 0)
    ) / GREATEST(1,
      (CASE WHEN module_1_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_2_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_3_score IS NOT NULL THEN 1 ELSE 0 END + 
       CASE WHEN module_4_score IS NOT NULL THEN 1 ELSE 0 END)
    ) <= 4.5 THEN 'High'
    ELSE 'Very High'
  END,
  updated_at = NOW()
WHERE status = 'completed'
AND (
  module_1_score IS NOT NULL OR 
  module_2_score IS NOT NULL OR 
  module_3_score IS NOT NULL OR 
  module_4_score IS NOT NULL
);

-- Step 5: Create function to ensure all 4 modules are always included in scoring
CREATE OR REPLACE FUNCTION calculate_overall_risk_rating(
  m1 NUMERIC,
  m2 NUMERIC,
  m3 NUMERIC,
  m4 NUMERIC
)
RETURNS TEXT AS $$
DECLARE
  total_score NUMERIC;
  module_count INTEGER;
  avg_score NUMERIC;
BEGIN
  -- Count non-null modules
  module_count := 
    (CASE WHEN m1 IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN m2 IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN m3 IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN m4 IS NOT NULL THEN 1 ELSE 0 END);
  
  -- Return NULL if no modules have scores
  IF module_count = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Calculate average score
  total_score := COALESCE(m1, 0) + COALESCE(m2, 0) + COALESCE(m3, 0) + COALESCE(m4, 0);
  avg_score := total_score / module_count;
  
  -- Map to risk rating
  IF avg_score <= 2.0 THEN
    RETURN 'Low';
  ELSIF avg_score <= 3.5 THEN
    RETURN 'Moderate';
  ELSIF avg_score <= 4.5 THEN
    RETURN 'High';
  ELSE
    RETURN 'Very High';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create view for complete assessment scores including all 4 modules
CREATE OR REPLACE VIEW assessment_complete_scores AS
SELECT 
  a.id,
  a.organization_id,
  a.status,
  a.completed_at,
  a.module_1_score,
  a.module_2_score,
  a.module_3_score,
  a.module_4_score,
  a.overall_risk_rating,
  calculate_overall_risk_rating(
    a.module_1_score,
    a.module_2_score,
    a.module_3_score,
    a.module_4_score
  ) as calculated_overall_rating,
  -- Count how many modules have scores
  (CASE WHEN a.module_1_score IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN a.module_2_score IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN a.module_3_score IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN a.module_4_score IS NOT NULL THEN 1 ELSE 0 END) as modules_completed,
  -- Average score across all modules
  (COALESCE(a.module_1_score, 0) + 
   COALESCE(a.module_2_score, 0) + 
   COALESCE(a.module_3_score, 0) + 
   COALESCE(a.module_4_score, 0)) / GREATEST(1,
    CASE WHEN a.module_1_score IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN a.module_2_score IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN a.module_3_score IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN a.module_4_score IS NOT NULL THEN 1 ELSE 0 END
  ) as average_score
FROM assessments a;
