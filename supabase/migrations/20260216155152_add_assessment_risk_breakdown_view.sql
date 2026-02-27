/*
  # Add Assessment Risk Breakdown View

  ## Overview
  Creates a view that provides detailed FATF risk calculations for display in reports.
  This view shows pillar scores, control effectiveness, and residual risk calculations.

  ## Structure
  - Assessment ID and basic info
  - Inherent Risk pillar breakdown (Client, Product, Geographic, Transaction)
  - Control Effectiveness score and percentage
  - Residual Risk calculation steps
  - Governance override information
  - Final risk scores and ratings
*/

CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT 
  a.id as assessment_id,
  a.organization_id,
  o.name as organization_name,
  a.status,
  a.overall_risk_score,
  a.overall_risk_rating,
  
  -- Module scores
  a.module_1_score as inherent_risk_score,
  a.module_2_score as control_risk_score,
  a.module_3_score as residual_risk_score,
  
  -- Get pillar scores from calculate_inherent_risk function
  (SELECT client_risk FROM calculate_inherent_risk(a.id)) as client_risk_score,
  (SELECT product_risk FROM calculate_inherent_risk(a.id)) as product_risk_score,
  (SELECT geographic_risk FROM calculate_inherent_risk(a.id)) as geographic_risk_score,
  (SELECT transaction_risk FROM calculate_inherent_risk(a.id)) as transaction_risk_score,
  
  -- Get control effectiveness
  calculate_control_effectiveness(a.id) as control_effectiveness,
  ROUND((1 - calculate_control_effectiveness(a.id)) * 100, 1) as control_gap_percentage,
  
  -- Calculate what residual risk would be without overrides
  calculate_residual_risk(
    a.module_1_score, 
    calculate_control_effectiveness(a.id)
  ) as calculated_residual_risk,
  
  -- Check if governance override was applied
  CASE 
    WHEN a.overall_risk_score >= 4.0 AND 
         calculate_residual_risk(a.module_1_score, calculate_control_effectiveness(a.id)) < 4.0
    THEN true
    ELSE false
  END as governance_override_applied,
  
  -- Classify pillar risks
  CASE 
    WHEN (SELECT client_risk FROM calculate_inherent_risk(a.id)) < 1.5 THEN 'Low'
    WHEN (SELECT client_risk FROM calculate_inherent_risk(a.id)) < 2.5 THEN 'Moderate'
    WHEN (SELECT client_risk FROM calculate_inherent_risk(a.id)) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as client_risk_rating,
  
  CASE 
    WHEN (SELECT product_risk FROM calculate_inherent_risk(a.id)) < 1.5 THEN 'Low'
    WHEN (SELECT product_risk FROM calculate_inherent_risk(a.id)) < 2.5 THEN 'Moderate'
    WHEN (SELECT product_risk FROM calculate_inherent_risk(a.id)) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as product_risk_rating,
  
  CASE 
    WHEN (SELECT geographic_risk FROM calculate_inherent_risk(a.id)) < 1.5 THEN 'Low'
    WHEN (SELECT geographic_risk FROM calculate_inherent_risk(a.id)) < 2.5 THEN 'Moderate'
    WHEN (SELECT geographic_risk FROM calculate_inherent_risk(a.id)) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as geographic_risk_rating,
  
  CASE 
    WHEN (SELECT transaction_risk FROM calculate_inherent_risk(a.id)) < 1.5 THEN 'Low'
    WHEN (SELECT transaction_risk FROM calculate_inherent_risk(a.id)) < 2.5 THEN 'Moderate'
    WHEN (SELECT transaction_risk FROM calculate_inherent_risk(a.id)) < 3.5 THEN 'High'
    ELSE 'Very High'
  END as transaction_risk_rating,
  
  a.created_at,
  a.updated_at,
  a.completed_at

FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'completed';

COMMENT ON VIEW assessment_risk_breakdown IS 'Detailed FATF risk calculation breakdown for compliance reports';

-- Grant access to the view
GRANT SELECT ON assessment_risk_breakdown TO authenticated;
GRANT SELECT ON assessment_risk_breakdown TO anon;
