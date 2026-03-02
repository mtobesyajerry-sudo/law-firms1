/*
  # Fix Control Effectiveness Calculation

  ## Overview
  Corrects the control effectiveness calculation to properly combine:
  - Module 2 (Technical Compliance): 60% weight
  - Module 3 (Operational Effectiveness): 40% weight
  
  ## Formula
  CE = (M2_normalized × 0.60) + (M3_normalized × 0.40)
  
  Where normalized means converting from 1-5 scale to 0-1 scale:
  - Score 1 = 100% effective (1.0)
  - Score 5 = 0% effective (0.0)
  - Formula: (5 - score) / 4
  
  ## Changes
  - Updates assessment_risk_breakdown view with correct CE calculation
  - Fixes residual risk narrative to show meaningful data
*/

DROP VIEW IF EXISTS assessment_risk_breakdown;

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
  
  -- Normalize Module 2 to 0-1 scale (lower score = better = higher effectiveness)
  -- Score 1 = 1.0 (100% compliant), Score 5 = 0.0 (0% compliant)
  GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_2_score, 5)) / 4.0)) as m2_normalized,
  
  -- Normalize Module 3 to 0-1 scale (lower score = better = higher effectiveness)
  -- Score 1 = 1.0 (100% effective), Score 5 = 0.0 (0% effective)
  GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_3_score, 5)) / 4.0)) as m3_normalized,
  
  -- Calculate Overall Control Effectiveness: (M2 × 60%) + (M3 × 40%)
  GREATEST(0, LEAST(1, 
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_2_score, 5)) / 4.0)) * 0.60) +
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_3_score, 5)) / 4.0)) * 0.40)
  )) as control_effectiveness,
  
  -- Control Gap Percentage = (1 - CE) × 100
  ROUND((1 - GREATEST(0, LEAST(1, 
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_2_score, 5)) / 4.0)) * 0.60) +
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_3_score, 5)) / 4.0)) * 0.40)
  ))) * 100, 1) as control_gap_percentage,
  
  -- Calculate Residual Risk: IR × (1 - CE)
  COALESCE(a.module_1_score, 0) * (1 - GREATEST(0, LEAST(1, 
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_2_score, 5)) / 4.0)) * 0.60) +
    (GREATEST(0, LEAST(1, (5.0 - COALESCE(a.module_3_score, 5)) / 4.0)) * 0.40)
  ))) as residual_risk_score,
  
  -- Also keep module_3_score as calculated_residual_risk for reference
  a.module_3_score as calculated_residual_risk,
  
  -- Placeholder pillar scores (can be calculated from responses if needed)
  0.0 as client_risk_score,
  0.0 as product_risk_score,
  0.0 as geographic_risk_score,
  0.0 as transaction_risk_score,
  
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

COMMENT ON VIEW assessment_risk_breakdown IS 'FATF-compliant risk breakdown with proper control effectiveness calculation';

-- Grant access to the view
GRANT SELECT ON assessment_risk_breakdown TO authenticated;
GRANT SELECT ON assessment_risk_breakdown TO anon;