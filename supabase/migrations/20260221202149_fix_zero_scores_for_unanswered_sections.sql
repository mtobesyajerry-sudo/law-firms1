/*
  # Fix Zero Scores for Unanswered Assessment Sections

  ## Critical Bug Fix

  This migration addresses a critical bug where assessment sections with zero responses
  were displaying a score of 0.0 and risk level of "Low" instead of NULL or "Not Assessed".

  This misleading display suggests that the assessment has been completed and received
  a perfect low-risk score, when in reality, no questions have been answered at all.

  ## Changes

  1. **Alter section_scores table defaults**
     - Change `answered_questions` default from 0 to NULL
     - Change `risk_score` default from 0 to NULL
     - Change `technical_compliance_score` default to NULL
     - Change `effectiveness_score` default to NULL
     - Change `risk_level` default from implicit to NULL

  2. **Update existing records**
     - Set risk_score to NULL where answered_questions = 0
     - Set risk_level to NULL where answered_questions = 0
     - Set technical_compliance_score to NULL where answered_questions = 0
     - Set effectiveness_score to NULL where answered_questions = 0

  3. **Update assessment_risk_breakdown view**
     - Return NULL instead of 0 for scores when no responses exist
     - Return NULL for risk ratings when no responses exist

  ## Expected Behavior After Fix

  - Sections with 0 answered questions will show:
    - Score: NULL (displayed as "N/A" in frontend)
    - Risk Level: NULL (displayed as "Not Assessed" in frontend)
  - Only sections with at least 1 answered question will show numeric scores
  - This prevents false impression of completed assessments
*/

-- Step 1: Alter table to change defaults
ALTER TABLE section_scores
  ALTER COLUMN answered_questions SET DEFAULT 0,
  ALTER COLUMN risk_score DROP DEFAULT,
  ALTER COLUMN risk_level DROP DEFAULT;

-- Add new columns if they don't exist (they should from previous migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section_scores' AND column_name = 'technical_compliance_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN technical_compliance_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section_scores' AND column_name = 'effectiveness_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN effectiveness_score numeric;
  END IF;
END $$;

-- Step 2: Update existing records where no questions have been answered
UPDATE section_scores
SET
  risk_score = NULL,
  risk_level = NULL,
  technical_compliance_score = NULL,
  effectiveness_score = NULL
WHERE answered_questions = 0 OR answered_questions IS NULL;

-- Step 3: Recreate assessment_risk_breakdown view to return NULL instead of 0
DROP VIEW IF EXISTS assessment_risk_breakdown CASCADE;

CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT
  a.id AS assessment_id,
  a.organization_id,
  o.name AS organization_name,
  a.status,
  a.overall_risk_score,
  a.overall_risk_rating,

  -- Inherent risk from Module 1 - NULL if no score
  a.module_1_score AS inherent_risk_score,

  -- Control risk from Module 2 - NULL if no score
  a.module_2_score AS control_risk_score,

  -- Residual risk from Module 3 - NULL if no score
  a.module_3_score AS residual_risk_score,

  -- Calculate individual risk factor scores from Module 1 responses
  -- Module 1A: Customer Risk (Yes=3, Partially=2, No=1)
  -- Return NULL if no responses exist
  (SELECT AVG(
    CASE
      WHEN ar.response = 'Yes' THEN 3.0
      WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0
      WHEN ar.response = 'No' THEN 1.0
      ELSE 2.0
    END
  )
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id
    AND ar.question_code LIKE '1A%'
    AND ar.response IS NOT NULL
  ) AS client_risk_score,

  -- Module 1B: Product/Service Risk
  (SELECT AVG(
    CASE
      WHEN ar.response = 'Yes' THEN 3.0
      WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0
      WHEN ar.response = 'No' THEN 1.0
      ELSE 2.0
    END
  )
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id
    AND ar.question_code LIKE '1B%'
    AND ar.response IS NOT NULL
  ) AS product_risk_score,

  -- Module 1C: Geographic Risk
  (SELECT AVG(
    CASE
      WHEN ar.response = 'Yes' THEN 3.0
      WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0
      WHEN ar.response = 'No' THEN 1.0
      ELSE 2.0
    END
  )
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id
    AND ar.question_code LIKE '1C%'
    AND ar.response IS NOT NULL
  ) AS geographic_risk_score,

  -- Module 1D: Transaction/Delivery Channel Risk
  (SELECT AVG(
    CASE
      WHEN ar.response = 'Yes' THEN 3.0
      WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0
      WHEN ar.response = 'No' THEN 1.0
      ELSE 2.0
    END
  )
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id
    AND ar.question_code LIKE '1D%'
    AND ar.response IS NOT NULL
  ) AS transaction_risk_score,

  -- Control effectiveness (inverse of control gap) - NULL if no score
  CASE
    WHEN a.module_2_score IS NOT NULL
    THEN GREATEST(0, 1 - ((a.module_2_score - 1) / 4.0))
    ELSE NULL
  END AS control_effectiveness,

  -- Control gap percentage - NULL if no score
  CASE
    WHEN a.module_2_score IS NOT NULL
    THEN ROUND(LEAST(100, (a.module_2_score - 1) * 25), 1)
    ELSE NULL
  END AS control_gap_percentage,

  -- Calculated residual risk
  a.module_3_score AS calculated_residual_risk,

  -- No governance override
  false AS governance_override_applied,

  -- Derive risk ratings from calculated scores - NULL if no responses
  (SELECT
    CASE
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 1.5 THEN 'Low'
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 2.5 THEN 'Moderate'
      ELSE 'High'
    END
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1A%' AND ar.response IS NOT NULL
  ) AS client_risk_rating,

  (SELECT
    CASE
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 1.5 THEN 'Low'
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 2.5 THEN 'Moderate'
      ELSE 'High'
    END
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1B%' AND ar.response IS NOT NULL
  ) AS product_risk_rating,

  (SELECT
    CASE
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 1.5 THEN 'Low'
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 2.5 THEN 'Moderate'
      ELSE 'High'
    END
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1C%' AND ar.response IS NOT NULL
  ) AS geographic_risk_rating,

  (SELECT
    CASE
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 1.5 THEN 'Low'
      WHEN AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) < 2.5 THEN 'Moderate'
      ELSE 'High'
    END
  FROM assessment_responses ar
  WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1D%' AND ar.response IS NOT NULL
  ) AS transaction_risk_rating,

  a.created_at,
  a.updated_at,
  a.completed_at
FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'completed';

-- Add comment explaining the fix
COMMENT ON VIEW assessment_risk_breakdown IS 'Risk breakdown view that returns NULL for scores when no assessment responses exist, preventing false 0.0 scores from being displayed.';