/*
  # Create Matter AML Alerts View

  1. Purpose
    - Create a view that aggregates AML trigger activities from matters
    - Used by ComplianceOfficerDashboard and ClientManagementDashboard
  
  2. View Structure
    - Combines matter data with AML trigger flags
    - Provides quick overview of matters requiring AML attention
*/

CREATE OR REPLACE VIEW matter_aml_alerts AS
SELECT 
  m.id,
  m.organization_id,
  m.matter_name,
  m.matter_type,
  m.status,
  m.aml_trigger_activities,
  m.created_at,
  m.updated_at,
  CASE 
    WHEN m.aml_trigger_activities IS NOT NULL 
      AND jsonb_array_length(m.aml_trigger_activities) > 0 
    THEN 'active'
    ELSE 'inactive'
  END as alert_status
FROM matters m
WHERE m.aml_trigger_activities IS NOT NULL 
  AND jsonb_array_length(m.aml_trigger_activities) > 0;

-- Grant access to authenticated users
GRANT SELECT ON matter_aml_alerts TO authenticated;
