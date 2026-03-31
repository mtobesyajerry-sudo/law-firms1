/*
  # Add Technical Compliance and Operational Effectiveness Scores to Risk Breakdown View

  ## Problem
  The FIUComplianceReport component needs separate scores for:
  - Technical Compliance (Module 2 score on 1-5 scale)
  - Operational Effectiveness (Module 3 score on 1-5 scale)
  
  But the view was only exposing control_effectiveness (0-1 scale).

  ## Solution
  Add columns that map to the actual module scores:
  - technical_compliance_score = module_2_score (1-5 scale)
  - operational_effectiveness_score = module_3_score (1-5 scale)
  - Keep control_effectiveness from calculate_control_effectiveness() (0-1 scale)

  ## Correct Formula
  Residual Risk = IR × (1 - CE)
  Where CE = from Module 2 responses (0-1 scale)
*/

-- Drop and recreate the view with correct column mappings
DROP VIEW IF EXISTS assessment_risk_breakdown CASCADE;

CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT 
  a.id as assessment_id,
  a.organization_id,
  o.name as organization_name,
  a.status,
  a.overall_risk_score,
  a.overall_risk_rating,
  
  -- Module scores (1-5 scale)
  COALESCE(a.module_1_score, 0) as inherent_risk_score,
  COALESCE(a.module_2_score, 0) as technical_compliance_score,
  COALESCE(a.module_3_score, 0) as operational_effectiveness_score,
  COALESCE(a.module_4_score, 0) as maturity_score,
  
  -- Legacy aliases for backward compatibility
  COALESCE(a.module_2_score, 0) as control_risk_score,
  COALESCE(a.module_3_score, 0) as residual_risk_score,
  
  -- Get pillar scores from calculate_inherent_risk function
  COALESCE((SELECT client_risk FROM calculate_inherent_risk(a.id)), 0) as client_risk_score,
  COALESCE((SELECT product_risk FROM calculate_inherent_risk(a.id)), 0) as product_risk_score,
  COALESCE((SELECT geographic_risk FROM calculate_inherent_risk(a.id)), 0) as geographic_risk_score,
  COALESCE((SELECT transaction_risk FROM calculate_inherent_risk(a.id)), 0) as transaction_risk_score,
  
  -- Get control effectiveness (0-1 scale from Module 2 responses)
  COALESCE(calculate_control_effectiveness(a.id), 0) as control_effectiveness,
  ROUND((1 - COALESCE(calculate_control_effectiveness(a.id), 0)) * 100, 1) as control_gap_percentage,
  
  -- Calculate residual risk: IR × (1 - CE)
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

COMMENT ON VIEW assessment_risk_breakdown IS 
'FATF-aligned risk calculation with correct Module 2/3 scores and control effectiveness from responses';

-- Grant access to the view
GRANT SELECT ON assessment_risk_breakdown TO authenticated;
GRANT SELECT ON assessment_risk_breakdown TO anon;
