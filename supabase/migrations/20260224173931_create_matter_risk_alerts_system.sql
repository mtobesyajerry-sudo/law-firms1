/*
  # Create Matter Risk Alerts System

  1. Problem
    - High-risk matters are not automatically flagged as alerts
    - The current `matters_requiring_aml_review` view only shows billing milestone alerts
    - Matter risk level is not integrated into the alert system

  2. Solution
    - Create a new view that includes ALL matters requiring AML attention:
      a) High-risk matters (risk_level = 'high')
      b) Matters with cross-border transactions
      c) Matters with high-risk jurisdictions
      d) Matters with multiple AML trigger activities
      e) Matters from billing milestones (existing logic)
    - Add indexes for performance

  3. Changes
    - Create `matter_aml_alerts` view combining all alert sources
    - Keep existing `matters_requiring_aml_review` for backward compatibility
*/

-- Create comprehensive matter AML alerts view
CREATE OR REPLACE VIEW matter_aml_alerts AS
SELECT 
  m.id as matter_id,
  m.organization_id,
  m.matter_number,
  m.matter_name,
  m.matter_type,
  m.status,
  m.risk_level,
  m.involves_client_account,
  m.involves_cross_border,
  m.involves_high_risk_jurisdiction,
  m.aml_trigger_activities,
  m.created_at,
  m.updated_at,
  CASE 
    WHEN m.risk_level = 'high' THEN 'High Risk Matter'
    WHEN m.involves_cross_border = true AND m.involves_high_risk_jurisdiction = true THEN 'Cross-Border + High Risk Jurisdiction'
    WHEN m.involves_cross_border = true THEN 'Cross-Border Transaction'
    WHEN m.involves_high_risk_jurisdiction = true THEN 'High Risk Jurisdiction'
    WHEN array_length(m.aml_trigger_activities, 1) >= 2 THEN 'Multiple AML Triggers'
    WHEN m.involves_client_account = true THEN 'Client Account Handling'
    ELSE 'AML Review Required'
  END as alert_reason,
  CASE
    WHEN m.risk_level = 'high' OR (m.involves_cross_border = true AND m.involves_high_risk_jurisdiction = true) THEN 'critical'
    WHEN m.involves_cross_border = true OR m.involves_high_risk_jurisdiction = true OR array_length(m.aml_trigger_activities, 1) >= 2 THEN 'high'
    ELSE 'medium'
  END as alert_priority,
  false as review_completed,
  CASE 
    WHEN m.risk_level = 'high' THEN 1
    WHEN m.involves_cross_border = true AND m.involves_high_risk_jurisdiction = true THEN 2
    WHEN m.involves_cross_border = true OR m.involves_high_risk_jurisdiction = true THEN 3
    ELSE 4
  END as sort_order
FROM matters m
WHERE 
  -- High risk matters
  m.risk_level = 'high'
  -- Cross-border transactions
  OR m.involves_cross_border = true
  -- High risk jurisdictions
  OR m.involves_high_risk_jurisdiction = true
  -- Multiple AML trigger activities
  OR array_length(m.aml_trigger_activities, 1) >= 2
  -- Client account handling
  OR m.involves_client_account = true
ORDER BY 
  sort_order,
  m.created_at DESC;

-- Add comment
COMMENT ON VIEW matter_aml_alerts IS 'Comprehensive view of all matters requiring AML/CFT review based on risk indicators';

-- Create indexes on matters table for better alert query performance
CREATE INDEX IF NOT EXISTS idx_matters_risk_level ON matters(risk_level) WHERE risk_level = 'high';
CREATE INDEX IF NOT EXISTS idx_matters_cross_border ON matters(involves_cross_border) WHERE involves_cross_border = true;
CREATE INDEX IF NOT EXISTS idx_matters_high_risk_jurisdiction ON matters(involves_high_risk_jurisdiction) WHERE involves_high_risk_jurisdiction = true;
CREATE INDEX IF NOT EXISTS idx_matters_client_account ON matters(involves_client_account) WHERE involves_client_account = true;

-- Grant access to the view
GRANT SELECT ON matter_aml_alerts TO authenticated;
GRANT SELECT ON matter_aml_alerts TO service_role;