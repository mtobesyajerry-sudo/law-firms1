/*
  # Create Simple Assessment Risk Breakdown View
  
  ## Overview
  Creates a simplified view for assessment reports without dependencies on missing functions.
  This provides the essential data needed for the report display.
  
  ## Structure
  - Assessment ID and basic info
  - Module scores
  - Risk ratings
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
  COALESCE(a.module_1_score, 0) as inherent_risk_score,
  COALESCE(a.module_2_score, 0) as control_risk_score,
  COALESCE(a.module_3_score, 0) as residual_risk_score,
  
  -- Placeholder pillar scores (can be calculated from responses if needed)
  0.0 as client_risk_score,
  0.0 as product_risk_score,
  0.0 as geographic_risk_score,
  0.0 as transaction_risk_score,
  
  -- Control effectiveness (based on module 2 score inverted to 0-1 scale)
  CASE 
    WHEN a.module_2_score IS NOT NULL THEN GREATEST(0, 1 - (a.module_2_score - 1) / 4.0)
    ELSE 0
  END as control_effectiveness,
  
  CASE 
    WHEN a.module_2_score IS NOT NULL THEN ROUND(LEAST(100, (a.module_2_score - 1) * 25), 1)
    ELSE 0
  END as control_gap_percentage,
  
  -- Calculated residual risk
  a.module_3_score as calculated_residual_risk,
  
  -- No governance override in simplified version
  false as governance_override_applied,
  
  -- Placeholder risk ratings
  'Moderate' as client_risk_rating,
  'Moderate' as product_risk_rating,
  'Moderate' as geographic_risk_rating,
  'Moderate' as transaction_risk_rating,
  
  a.created_at,
  a.updated_at,
  a.completed_at

FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'completed';

COMMENT ON VIEW assessment_risk_breakdown IS 'Simplified FATF risk breakdown for compliance reports';

-- Grant access to the view
GRANT SELECT ON assessment_risk_breakdown TO authenticated;
GRANT SELECT ON assessment_risk_breakdown TO anon;
