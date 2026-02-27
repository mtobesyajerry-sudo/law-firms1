/*
  # Fix Assessment Risk Breakdown View to Calculate Real Risk Scores
  
  1. Updates
    - Replace hardcoded placeholder values with actual calculations from Module 1 responses
    - Calculate client_risk_score from Module 1A responses (Yes = 3, Partially = 2, No = 1)
    - Calculate product_risk_score from Module 1B responses
    - Calculate geographic_risk_score from Module 1C responses
    - Calculate transaction_risk_score from Module 1D responses
    - Derive risk ratings based on calculated scores
    
  2. Risk Rating Logic
    - Low: score < 1.5
    - Moderate: 1.5 <= score < 2.5
    - High: score >= 2.5
*/

-- Drop existing view
DROP VIEW IF EXISTS assessment_risk_breakdown CASCADE;

-- Recreate with real calculations
CREATE OR REPLACE VIEW assessment_risk_breakdown AS
SELECT 
  a.id AS assessment_id,
  a.organization_id,
  o.name AS organization_name,
  a.status,
  a.overall_risk_score,
  a.overall_risk_rating,
  
  -- Inherent risk from Module 1
  COALESCE(a.module_1_score, 0) AS inherent_risk_score,
  
  -- Control risk from Module 2
  COALESCE(a.module_2_score, 0) AS control_risk_score,
  
  -- Residual risk from Module 3
  COALESCE(a.module_3_score, 0) AS residual_risk_score,
  
  -- Calculate individual risk factor scores from Module 1 responses
  -- Module 1A: Customer Risk (Yes=3, Partially=2, No=1)
  COALESCE(
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
    ), 2.0
  ) AS client_risk_score,
  
  -- Module 1B: Product/Service Risk
  COALESCE(
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
    ), 2.0
  ) AS product_risk_score,
  
  -- Module 1C: Geographic Risk
  COALESCE(
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
    ), 2.0
  ) AS geographic_risk_score,
  
  -- Module 1D: Transaction/Delivery Channel Risk
  COALESCE(
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
    ), 2.0
  ) AS transaction_risk_score,
  
  -- Control effectiveness (inverse of control gap)
  CASE 
    WHEN a.module_2_score IS NOT NULL 
    THEN GREATEST(0, 1 - ((a.module_2_score - 1) / 4.0))
    ELSE 0
  END AS control_effectiveness,
  
  -- Control gap percentage
  CASE 
    WHEN a.module_2_score IS NOT NULL 
    THEN ROUND(LEAST(100, (a.module_2_score - 1) * 25), 1)
    ELSE 0
  END AS control_gap_percentage,
  
  -- Calculated residual risk
  a.module_3_score AS calculated_residual_risk,
  
  -- No governance override
  false AS governance_override_applied,
  
  -- Derive risk ratings from calculated scores
  CASE 
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1A%' AND ar.response IS NOT NULL), 2.0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1A%' AND ar.response IS NOT NULL), 2.0) < 2.5 THEN 'Moderate'
    ELSE 'High'
  END AS client_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1B%' AND ar.response IS NOT NULL), 2.0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1B%' AND ar.response IS NOT NULL), 2.0) < 2.5 THEN 'Moderate'
    ELSE 'High'
  END AS product_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1C%' AND ar.response IS NOT NULL), 2.0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1C%' AND ar.response IS NOT NULL), 2.0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1C%' AND ar.response IS NOT NULL), 2.0) < 2.5 THEN 'Moderate'
    ELSE 'High'
  END AS geographic_risk_rating,
  
  CASE 
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1D%' AND ar.response IS NOT NULL), 2.0) < 1.5 THEN 'Low'
    WHEN COALESCE((SELECT AVG(CASE WHEN ar.response = 'Yes' THEN 3.0 WHEN ar.response = 'Partially' OR ar.response = 'Partial' THEN 2.0 WHEN ar.response = 'No' THEN 1.0 ELSE 2.0 END) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.question_code LIKE '1D%' AND ar.response IS NOT NULL), 2.0) < 2.5 THEN 'Moderate'
    ELSE 'High'
  END AS transaction_risk_rating,
  
  a.created_at,
  a.updated_at,
  a.completed_at
FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'completed';
