/*
  # Enforce Client Risk Independence from Institutional Assessments
  
  1. Critical Design Principle
    - Client risk scores are based ONLY on client-specific factors
    - Institutional assessments provide context for viewing, NOT calculation
    - This separation is fundamental to proper risk management
    
  2. Changes
    - Add database comments to prevent future misuse
    - Create helper view for client-inherent risk factors only
    - Document that institutional scores are for context viewing only
    
  3. Client Risk Factors (ONLY these should be used)
    - KYC ratings and due diligence level
    - PEP status
    - Sanctions screening results
    - Geographic/jurisdiction risk (FATF high-risk)
    - Transaction patterns and behavior
    - Source of funds/wealth verification
    - Adverse information
*/

-- Add comment to assessments table to prevent future misuse
COMMENT ON TABLE assessments IS 
'Institutional AML/CFT Risk Assessments - These assess the ORGANIZATION''s controls and compliance framework. 

CRITICAL WARNING: These assessments should NEVER be used to calculate individual client risk scores!

Client risk is inherent to the client based on their own characteristics:
- Client type, industry, business nature
- PEP status and sanctions screening
- Geographic jurisdiction (FATF high-risk countries)
- Transaction behavior and patterns
- Source of funds/wealth verification

Institutional assessments provide organizational context only for:
- Understanding monitoring effectiveness
- Viewing control maturity
- Strategic planning
- Regulatory reporting

DO NOT mix institutional risk with client risk calculations!';

-- Add comments to module score columns
COMMENT ON COLUMN assessments.module_1_score IS 
'Module 1: Inherent Risk - ORGANIZATIONAL inherent risk assessment. This is NOT client risk. For institutional context viewing only.';

COMMENT ON COLUMN assessments.module_2_score IS 
'Module 2: Technical Compliance - ORGANIZATIONAL compliance level. This is NOT client risk. For institutional context viewing only.';

COMMENT ON COLUMN assessments.module_3_score IS 
'Module 3: Effectiveness - ORGANIZATIONAL control effectiveness. This is NOT client risk. For institutional context viewing only.';

COMMENT ON COLUMN assessments.module_4_score IS 
'Module 4: Maturity - ORGANIZATIONAL maturity level. This is NOT client risk. For institutional context viewing only.';

COMMENT ON COLUMN assessments.overall_risk_rating IS
'Overall institutional risk rating. This represents the ORGANIZATION''s risk profile, NOT individual client risk.';

-- Add comprehensive comment to kyc_clients table
COMMENT ON TABLE kyc_clients IS 
'KYC/CDD Client Records - Client risk ratings must be calculated based ONLY on client-specific factors.

APPROVED RISK FACTORS (use these only):
✓ Client type and business nature
✓ PEP status (is_pep, pep_category)
✓ Sanctions screening results (is_sanctioned)
✓ Geographic jurisdiction risk (country, FATF high-risk jurisdictions)
✓ Transaction patterns and behavior (from transaction monitoring)
✓ Screening match results
✓ Enhanced monitoring requirements
✓ Source of funds/wealth verification status
✓ Adverse information findings
✓ Due diligence level and completion status

PROHIBITED RISK FACTORS (NEVER use these):
✗ Institutional assessment scores (module_1_score, module_2_score, etc.)
✗ Organizational risk ratings
✗ Control effectiveness scores
✗ Institutional maturity levels

The institutional assessment may be displayed for CONTEXT ONLY but must never influence client risk calculations.';

-- Add specific column comments for key risk fields
COMMENT ON COLUMN kyc_clients.risk_level IS 
'Client inherent risk level calculated from client-specific factors only. Independent of institutional assessments.';

COMMENT ON COLUMN kyc_clients.risk_score IS 
'Client risk score (0-100) based on client characteristics only. Does not include institutional factors.';

COMMENT ON COLUMN kyc_clients.current_dd_level IS 
'Current due diligence level (simplified/standard/enhanced) determined by client risk factors only.';

-- Create a helper view that shows ONLY client-inherent risk factors
CREATE OR REPLACE VIEW client_inherent_risk_factors AS
SELECT 
  id as client_id,
  client_name,
  risk_level,
  risk_score,
  client_type,
  is_pep,
  pep_category,
  is_sanctioned,
  sanctions_list,
  country as client_country,
  current_dd_level,
  sof_sow_verified,
  last_review_date,
  next_review_due,
  client_status,
  organization_id,
  aml_trigger_activities,
  -- Risk indicator summary based ONLY on client data
  CASE 
    WHEN is_pep = true AND is_sanctioned = true THEN 'Critical: PEP + Sanctioned'
    WHEN is_sanctioned = true THEN 'Critical: Sanctioned Entity'
    WHEN is_pep = true THEN 'High Risk: PEP Status'
    WHEN current_dd_level = 'enhanced' THEN 'Enhanced DD Applied'
    WHEN current_dd_level = 'simplified' THEN 'Low Risk: Simplified DD'
    ELSE 'Standard Risk Profile'
  END as risk_indicator_summary,
  -- Flag high-risk indicators
  (is_pep = true OR is_sanctioned = true OR current_dd_level = 'enhanced') as has_high_risk_indicators
FROM kyc_clients;

COMMENT ON VIEW client_inherent_risk_factors IS 
'Client-specific risk factors ONLY - no institutional assessment data included.

Use this view to ensure client risk calculations remain completely independent of organizational assessments.

This view contains ONLY client-inherent characteristics that should drive risk ratings.';
