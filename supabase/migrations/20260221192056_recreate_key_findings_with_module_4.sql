/*
  # Recreate Key Findings View with Module 4 Details

  This migration drops and recreates the assessment_key_findings view to include 
  Module 4 (Institutional Maturity Assessment) response counts and breakdown.

  ## Changes

  1. **Drop and Recreate View**: `assessment_key_findings`
     - Add Module 4 response counts by maturity level
     - Add Module 4 rating/label
     - Maintain all existing fields
*/

-- Drop the existing view
DROP VIEW IF EXISTS assessment_key_findings;

-- Recreate with Module 4 details
CREATE VIEW assessment_key_findings AS
SELECT
  a.id as assessment_id,
  a.organization_id,
  a.dnfbp_category,
  a.overall_risk_score,

  -- Total assessment scope
  (SELECT COUNT(*) FROM assessment_responses WHERE assessment_id = a.id) as total_criteria,

  -- Module 1: Inherent Risk Profile
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_1'
   AND LOWER(response) = 'yes') as m1_high_risk_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_1'
   AND LOWER(response) IN ('partial', 'partially')) as m1_moderate_risk_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_1'
   AND LOWER(response) = 'no') as m1_low_risk_count,

  -- Module 2: Control Implementation Status
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_2'
   AND LOWER(response) LIKE '%not in place%') as m2_not_implemented_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_2'
   AND LOWER(response) LIKE '%partially%') as m2_partially_implemented_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_2'
   AND LOWER(response) LIKE '%fully%') as m2_fully_implemented_count,

  -- Module 3: Control Effectiveness
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_3'
   AND LOWER(response) = 'ineffective') as m3_ineffective_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_3'
   AND LOWER(response) = 'weak') as m3_weak_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_3'
   AND LOWER(response) = 'effective') as m3_effective_count,

  -- Module 4: Institutional Maturity Assessment
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_4'
   AND LOWER(response) = 'initial') as m4_initial_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_4'
   AND LOWER(response) = 'developing') as m4_developing_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_4'
   AND LOWER(response) = 'defined') as m4_defined_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_4'
   AND LOWER(response) = 'managed') as m4_managed_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND section_code = 'MODULE_4'
   AND LOWER(response) = 'optimised') as m4_optimised_count,

  -- Module scores from assessment table
  a.module_2_score as technical_compliance_score,
  a.module_3_score as effectiveness_score,
  a.module_4_score as maturity_score,
  a.module_4_rating as maturity_rating,

  -- Risk rating
  CASE
    WHEN a.overall_risk_score >= 2.5 THEN 'High'
    WHEN a.overall_risk_score >= 1.5 THEN 'Moderate'
    ELSE 'Low'
  END as risk_rating,

  -- Maturity rating (computed from module_4_score)
  CASE
    WHEN a.module_4_score >= 4.5 THEN 'Optimised'
    WHEN a.module_4_score >= 3.5 THEN 'Managed'
    WHEN a.module_4_score >= 2.5 THEN 'Defined'
    WHEN a.module_4_score >= 1.5 THEN 'Developing'
    ELSE 'Initial'
  END as computed_maturity_rating,

  -- Priority action guidance
  CASE
    WHEN (SELECT COUNT(*)
          FROM assessment_responses
          WHERE assessment_id = a.id
          AND section_code = 'MODULE_2'
          AND LOWER(response) LIKE '%not in place%') >= 5
    THEN 'immediate'
    WHEN (SELECT COUNT(*)
          FROM assessment_responses
          WHERE assessment_id = a.id
          AND section_code = 'MODULE_2'
          AND LOWER(response) LIKE '%not in place%') > 0
    THEN 'high'
    ELSE 'monitoring'
  END as priority_level,

  a.created_at,
  a.completed_at,
  a.updated_at

FROM assessments a
WHERE a.status IN ('in_progress', 'completed');

-- Grant access to view
GRANT SELECT ON assessment_key_findings TO authenticated;

-- Add helpful comment
COMMENT ON VIEW assessment_key_findings IS 'Provides accurate key findings data for assessment reports including Module 4 (Institutional Maturity) breakdown by aggregating response counts from assessment_responses table.';
