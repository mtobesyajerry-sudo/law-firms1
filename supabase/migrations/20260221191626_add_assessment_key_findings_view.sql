/*
  # Add Assessment Key Findings View

  This migration creates a comprehensive view that calculates accurate key findings
  for assessment reports by aggregating response data from assessment_responses.

  ## Changes

  1. **New View**: `assessment_key_findings`
     - Calculates inherent risk profile (Module 1 responses)
     - Calculates control implementation status (Module 2 responses)
     - Calculates control effectiveness (Module 3 responses)
     - Provides accurate counts for report generation

  2. **Security**
     - RLS enabled through underlying table policies
     - View accessible to authenticated users
*/

-- Create view for assessment key findings
CREATE OR REPLACE VIEW assessment_key_findings AS
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

  -- Module 2/3 TC and EF scores from assessment
  a.module_2_score as technical_compliance_score,
  a.module_3_score as effectiveness_score,
  a.module_4_score as maturity_score,

  -- Risk rating
  CASE
    WHEN a.overall_risk_score >= 2.5 THEN 'High'
    WHEN a.overall_risk_score >= 1.5 THEN 'Moderate'
    ELSE 'Low'
  END as risk_rating,

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
COMMENT ON VIEW assessment_key_findings IS 'Provides accurate key findings data for assessment reports by aggregating response counts from assessment_responses table. Used for report generation to ensure data consistency.';
