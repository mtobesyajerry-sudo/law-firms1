/*
  # Fix Risk Breakdown View with Correct Calculations

  ## Problem
  The assessment_risk_breakdown view was using hardcoded "Moderate" ratings
  instead of calculating actual risk ratings from assessment responses.

  ## Solution
  Recreate the view to use the calculate_inherent_risk() function and apply
  proper FATF-aligned risk rating thresholds.

  ## Risk Rating Thresholds (1-5 scale)
  - 1.0 - 1.5 = Low
  - 1.5 - 2.5 = Moderate
  - 2.5 - 3.5 = High
  - 3.5 - 5.0 = Very High

  ## Example Calculation
  If firm answered "Yes" to 7 out of 10 high-risk service questions:
  - Score = (7×5 + 3×1) / 10 = 3.8
  - Rating = "Very High" ✓
*/

-- Drop existing view
DROP VIEW IF EXISTS assessment_risk_breakdown CASCADE;

-- Recreate with proper calculations
CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT 
  a.id as assessment_id,
  a.organization_id,
  o.name as organization_name,
  a.status,
  a.overall_risk_score,
  a.overall_risk_rating,
  
  -- Module scores
  COALESCE(a.module_1_score, 0) as inherent_risk_score,
  COALESCE(a.module_2_score, 0) as control_risk_score,
  COALESCE(a.module_3_score, 0) as residual_risk_score,
  
  -- Get pillar scores from calculate_inherent_risk function
  COALESCE((SELECT client_risk FROM calculate_inherent_risk(a.id)), 0) as client_risk_score,
  COALESCE((SELECT product_risk FROM calculate_inherent_risk(a.id)), 0) as product_risk_score,
  COALESCE((SELECT geographic_risk FROM calculate_inherent_risk(a.id)), 0) as geographic_risk_score,
  COALESCE((SELECT transaction_risk FROM calculate_inherent_risk(a.id)), 0) as transaction_risk_score,
  
  -- Get control effectiveness
  COALESCE(calculate_control_effectiveness(a.id), 0) as control_effectiveness,
  ROUND((1 - COALESCE(calculate_control_effectiveness(a.id), 0)) * 100, 1) as control_gap_percentage,
  
  -- Calculate what residual risk would be without overrides
  calculate_residual_risk(
    COALESCE(a.module_1_score, 0), 
    COALESCE(calculate_control_effectiveness(a.id), 0)
  ) as calculated_residual_risk,
  
  -- Check if governance override was applied
  CASE 
    WHEN a.overall_risk_score >= 4.0 AND 
         calculate_residual_risk(COALESCE(a.module_1_score, 0), COALESCE(calculate_control_effectiveness(a.id), 0)) < 4.0
    THEN true
    ELSE false
  END as governance_override_applied,
  
  -- Classify pillar risks with FATF-aligned thresholds
  CASE 
    WHEN COALESCE((SELECT client_risk FROM calculate_inherent_risk(a.id)), 0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT client_risk FROM calculate_inherent_risk(a.id)), 0) < 2.5 THEN 'Moderate'
    WHEN COALESCE((SELECT client_risk FROM calculate_inherent_risk(a.id)), 0) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as client_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT product_risk FROM calculate_inherent_risk(a.id)), 0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT product_risk FROM calculate_inherent_risk(a.id)), 0) < 2.5 THEN 'Moderate'
    WHEN COALESCE((SELECT product_risk FROM calculate_inherent_risk(a.id)), 0) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as product_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT geographic_risk FROM calculate_inherent_risk(a.id)), 0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT geographic_risk FROM calculate_inherent_risk(a.id)), 0) < 2.5 THEN 'Moderate'
    WHEN COALESCE((SELECT geographic_risk FROM calculate_inherent_risk(a.id)), 0) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as geographic_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT transaction_risk FROM calculate_inherent_risk(a.id)), 0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT transaction_risk FROM calculate_inherent_risk(a.id)), 0) < 2.5 THEN 'Moderate'
    WHEN COALESCE((SELECT transaction_risk FROM calculate_inherent_risk(a.id)), 0) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as transaction_risk_rating,
  
  a.created_at,
  a.updated_at,
  a.completed_at

FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'completed';

COMMENT ON VIEW assessment_risk_breakdown IS 'FATF-aligned risk calculation breakdown with correct rating thresholds';

-- Grant access to the view
GRANT SELECT ON assessment_risk_breakdown TO authenticated;
GRANT SELECT ON assessment_risk_breakdown TO anon;
