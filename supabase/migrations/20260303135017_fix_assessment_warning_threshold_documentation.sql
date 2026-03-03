/*
  # Assessment Warning Threshold Fix - Documentation

  ## Summary
  This migration documents the fix for the assessment report warning logic threshold.
  The "Critical Control Deficiencies" warning was incorrectly showing for scores of 2.5,
  which represents "moderately effective" performance on the FATF 1-5 scale.

  ## Problem Identified
  - Frontend code used `>= 2.5` threshold
  - This treated 2.5 as "critical deficiency"
  - 2.5 = "Moderately Effective" (acceptable, not critical)
  - Caused false positive warnings for borderline cases

  ## Solution Applied
  - Changed threshold from `>= 2.5` to `> 2.5` in AssessmentReport.jsx
  - Warning now only shows for scores above 2.5 (2.6+)
  - Aligns with FATF risk assessment methodology

  ## FATF Risk Scoring Scale (1-5, lower is better)
  
  | Score Range | Implementation | Effectiveness | Warning Level |
  |-------------|---------------|---------------|---------------|
  | 1.0-1.9     | Fully/Largely Compliant | Highly Effective | None |
  | 2.0-2.4     | Largely Compliant | Effective | None |
  | 2.5         | BOUNDARY CASE | Moderately Effective | None (acceptable) |
  | 2.6-3.4     | Partially Compliant | Weak | ⚠️ Warning |
  | 3.5-4.4     | Non-Compliant | Ineffective | 🔴 Critical |
  | 4.5-5.0     | Critical Deficiency | Critical Failure | 🔴 Emergency |

  ## Current Assessment Example (ID: adbe2ada-d7c5-477d-8ffc-aacfdba7b22e)
  - Module 1 (Inherent Risk): 2.17 - Low-Moderate
  - Module 2 (Implementation): 1.0 - Perfect (all 19 controls fully implemented)
  - Module 3 (Effectiveness): 2.5 - Moderately effective (5 effective + 5 weak)
  - Module 4 (Maturity): 4.15 - Managed (high maturity)
  - Overall Risk: 0.43 - Very Low Risk
  
  Result: No critical warning should display (acceptable performance)

  ## No Database Changes Required
  This is a documentation-only migration. All assessment data is correct.
  The fix was applied to frontend logic in src/components/AssessmentReport.jsx
*/

-- Add a comment to the assessments table documenting the warning threshold
COMMENT ON COLUMN assessments.module_2_score IS 
  'Module 2 Implementation Score (1-5 scale, lower is better). 
   FATF Scale: 1=Fully Compliant, 2=Largely Compliant, 3=Partially Compliant, 4=Non-Compliant, 5=Critical Deficiency.
   Warning Threshold: Scores > 2.5 (not >=) indicate significant control gaps requiring Enhanced Due Diligence.
   Score 2.5 = Moderately effective, acceptable performance.';

COMMENT ON COLUMN assessments.module_3_score IS 
  'Module 3 Effectiveness Score (1-5 scale, lower is better).
   FATF Scale: 1=Highly Effective, 2=Effective, 3=Weak, 4=Ineffective, 5=Critical Failure.
   Warning Threshold: Scores > 2.5 (not >=) indicate controls not operating effectively requiring Enhanced Due Diligence.
   Score 2.5 = Moderately effective, acceptable performance.';

COMMENT ON COLUMN assessments.overall_risk_score IS 
  'Overall Risk Score calculated from inherent risk adjusted by control effectiveness.
   Lower scores indicate better risk management.
   Scale: <0.5=Very Low, 0.5-1.0=Low, 1.0-1.5=Moderate, 1.5-2.0=High, >2.0=Very High.';

-- Create a view to help identify assessments that should trigger warnings
CREATE OR REPLACE VIEW assessment_warning_status AS
SELECT 
  a.id,
  a.organization_id,
  o.name as organization_name,
  a.module_2_score,
  a.module_3_score,
  a.module_4_score,
  a.overall_risk_score,
  
  -- Warning triggers (strict > 2.5, not >=)
  (a.module_2_score > 2.5) as implementation_warning,
  (a.module_3_score > 2.5) as effectiveness_warning,
  (a.module_2_score > 2.5 OR a.module_3_score > 2.5) as should_show_critical_warning,
  
  -- Score interpretations
  CASE 
    WHEN a.module_2_score <= 1.9 THEN 'Fully/Largely Compliant'
    WHEN a.module_2_score <= 2.5 THEN 'Largely Compliant/Acceptable'
    WHEN a.module_2_score <= 3.4 THEN 'Partially Compliant'
    WHEN a.module_2_score <= 4.4 THEN 'Non-Compliant'
    ELSE 'Critical Deficiency'
  END as implementation_status,
  
  CASE 
    WHEN a.module_3_score <= 1.9 THEN 'Highly Effective'
    WHEN a.module_3_score <= 2.5 THEN 'Effective/Acceptable'
    WHEN a.module_3_score <= 3.4 THEN 'Weak'
    WHEN a.module_3_score <= 4.4 THEN 'Ineffective'
    ELSE 'Critical Failure'
  END as effectiveness_status,
  
  CASE 
    WHEN a.overall_risk_score < 0.5 THEN 'Very Low Risk'
    WHEN a.overall_risk_score < 1.0 THEN 'Low Risk'
    WHEN a.overall_risk_score < 1.5 THEN 'Moderate Risk'
    WHEN a.overall_risk_score < 2.0 THEN 'High Risk'
    ELSE 'Very High Risk'
  END as risk_category,
  
  a.created_at,
  a.updated_at

FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON assessment_warning_status TO authenticated;

-- Add helpful comment to the view
COMMENT ON VIEW assessment_warning_status IS 
  'Provides assessment warning status with correct threshold logic.
   Critical warnings should only display when module_2_score > 2.5 OR module_3_score > 2.5.
   Score of exactly 2.5 = Moderately effective/acceptable, does NOT trigger critical warning.
   This view helps verify that warning logic is correctly implemented in the frontend.';
