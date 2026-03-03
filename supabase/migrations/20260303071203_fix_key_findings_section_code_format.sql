/*
  # Fix Key Findings View Section Code Format

  ## Problem
  The assessment_key_findings view was looking for section codes like:
  - MODULE_1, MODULE_2, MODULE_3, MODULE_4
  
  But the actual data in assessment_responses uses:
  - MODULE_module1, MODULE_module2, MODULE_module3, MODULE_module4
  
  This caused all Module 1-3 counts to show as zero in reports.

  ## Solution
  Update the view to use the correct section_code format that matches the actual data.

  ## Changes
  - Fix all section_code filters to use correct format (case-insensitive)
  - Module 4 counts remain from control_assessments (correct)
  - Maintain all other functionality
*/

DROP VIEW IF EXISTS assessment_key_findings;

CREATE VIEW assessment_key_findings AS
SELECT
  a.id as assessment_id,
  a.organization_id,
  a.framework_type,
  a.overall_risk_score,

  -- Total assessment scope
  (SELECT COUNT(*) FROM assessment_responses WHERE assessment_id = a.id) as total_criteria,

  -- Module 1: Inherent Risk Profile (using correct section_code format)
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module1'
   AND LOWER(response) = 'yes') as m1_high_risk_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module1'
   AND LOWER(response) IN ('partial', 'partially')) as m1_moderate_risk_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module1'
   AND LOWER(response) = 'no') as m1_low_risk_count,

  -- Module 2: Control Implementation Status
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module2'
   AND LOWER(response) LIKE '%not in place%') as m2_not_implemented_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module2'
   AND LOWER(response) LIKE '%partially%') as m2_partially_implemented_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module2'
   AND LOWER(response) LIKE '%fully%') as m2_fully_implemented_count,

  -- Module 3: Control Effectiveness
  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module3'
   AND LOWER(response) = 'ineffective') as m3_ineffective_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module3'
   AND LOWER(response) = 'weak') as m3_weak_count,

  (SELECT COUNT(*)
   FROM assessment_responses
   WHERE assessment_id = a.id
   AND LOWER(section_code) = 'module_module3'
   AND LOWER(response) = 'effective') as m3_effective_count,

  -- Module 4: Institutional Maturity Assessment (FROM control_assessments)
  (SELECT COUNT(*)
   FROM control_assessments
   WHERE assessment_id = a.id
   AND maturity_level < 1.5) as m4_initial_count,

  (SELECT COUNT(*)
   FROM control_assessments
   WHERE assessment_id = a.id
   AND maturity_level >= 1.5 AND maturity_level < 2.5) as m4_developing_count,

  (SELECT COUNT(*)
   FROM control_assessments
   WHERE assessment_id = a.id
   AND maturity_level >= 2.5 AND maturity_level < 3.5) as m4_defined_count,

  (SELECT COUNT(*)
   FROM control_assessments
   WHERE assessment_id = a.id
   AND maturity_level >= 3.5 AND maturity_level < 4.5) as m4_managed_count,

  (SELECT COUNT(*)
   FROM control_assessments
   WHERE assessment_id = a.id
   AND maturity_level >= 4.5) as m4_optimised_count,

  -- Module scores from assessment table
  a.module_1_score as inherent_risk_score,
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
          AND LOWER(section_code) = 'module_module2'
          AND LOWER(response) LIKE '%not in place%') >= 5
    THEN 'immediate'
    WHEN (SELECT COUNT(*)
          FROM assessment_responses
          WHERE assessment_id = a.id
          AND LOWER(section_code) = 'module_module2'
          AND LOWER(response) LIKE '%not in place%') > 0
    THEN 'high'
    ELSE 'monitoring'
  END as priority_level,

  a.created_at,
  a.completed_at,
  a.updated_at

FROM assessments a
WHERE a.status IN ('in_progress', 'completed');

GRANT SELECT ON assessment_key_findings TO authenticated;

COMMENT ON VIEW assessment_key_findings IS 'Provides comprehensive key findings for assessment reports. Module 1-3 counts are derived from assessment_responses using the correct section_code format (MODULE_module1, MODULE_module2, MODULE_module3). Module 4 (Institutional Maturity) counts are derived from control_assessments table, reflecting the detailed 20-control maturity assessment across 9 AML/CFT domains.';