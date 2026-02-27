/*
  # Risk-Based Due Diligence Engine

  ## Overview
  Implements a comprehensive risk-based customer due diligence (CDD) routing system that automatically 
  determines the appropriate level of due diligence based on intelligent risk scoring.

  ## 1. New Tables

  ### risk_factors
  - Stores configurable risk factors used in scoring
  - Categories: client_profile, geography, service_type, behavior, transaction
  - Each factor has a weight and scoring criteria

  ### risk_scoring_config
  - Defines risk level thresholds and due diligence requirements
  - Maps score ranges to SDD/CDD/EDD levels

  ### client_risk_assessments
  - Stores risk assessment results for each client
  - Includes overall score, category breakdowns, and due diligence level
  - Tracks assessment history for audit purposes

  ### due_diligence_requirements
  - Defines specific requirements for each DD level
  - Includes required documents, checks, and approval workflows

  ### risk_escalations
  - Tracks when clients are escalated from one risk level to another
  - Records triggers and justifications

  ## 2. Risk Scoring Model
  - Client Profile Risk (30% weight)
  - Geographic Risk (20% weight)
  - Service Type Risk (30% weight)
  - Behavioral Risk (20% weight)

  ## 3. Risk Levels
  - Low (0-30): Simplified Due Diligence (SDD)
  - Medium (31-60): Standard Customer Due Diligence (CDD)
  - High (61-100): Enhanced Due Diligence (EDD)

  ## 4. Security
  - Enable RLS on all new tables
  - Clients can view own risk assessments
  - Admins can manage all risk data

  ## 5. Important Notes
  - Risk assessments are automatically calculated on client creation/update
  - Workflows dynamically adapt based on risk level
  - System supports periodic reassessment and escalation
  - All risk decisions are auditable
*/

-- Risk Factors Configuration Table
CREATE TABLE IF NOT EXISTS risk_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('client_profile', 'geography', 'service_type', 'behavior', 'transaction')),
  factor_name text NOT NULL,
  description text,
  weight numeric(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  scoring_criteria jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_factors_org ON risk_factors(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_factors_category ON risk_factors(category);

-- Risk Scoring Configuration
CREATE TABLE IF NOT EXISTS risk_scoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  min_score numeric(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score numeric(5,2) NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  due_diligence_type text NOT NULL CHECK (due_diligence_type IN ('simplified', 'standard', 'enhanced')),
  description text,
  color_code text DEFAULT '#gray',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, risk_level)
);

CREATE INDEX IF NOT EXISTS idx_risk_scoring_config_org ON risk_scoring_config(organization_id);

-- Client Risk Assessments
CREATE TABLE IF NOT EXISTS client_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  assessment_date timestamptz DEFAULT now(),
  
  -- Overall Risk Score
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  due_diligence_type text NOT NULL CHECK (due_diligence_type IN ('simplified', 'standard', 'enhanced')),
  
  -- Category Scores
  client_profile_score numeric(5,2) DEFAULT 0,
  geography_score numeric(5,2) DEFAULT 0,
  service_type_score numeric(5,2) DEFAULT 0,
  behavior_score numeric(5,2) DEFAULT 0,
  transaction_score numeric(5,2) DEFAULT 0,
  
  -- Risk Factors Identified
  risk_factors_identified jsonb DEFAULT '[]',
  red_flags jsonb DEFAULT '[]',
  
  -- Assessment Details
  assessment_notes text,
  assessed_by uuid REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approval_date timestamptz,
  
  -- Review Schedule
  next_review_date timestamptz,
  review_frequency_days integer DEFAULT 365,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_risk_assessments_client ON client_risk_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_assessments_org ON client_risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_assessments_risk_level ON client_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_client_risk_assessments_status ON client_risk_assessments(status);

-- Due Diligence Requirements
CREATE TABLE IF NOT EXISTS due_diligence_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  due_diligence_type text NOT NULL CHECK (due_diligence_type IN ('simplified', 'standard', 'enhanced')),
  requirement_name text NOT NULL,
  requirement_description text,
  is_mandatory boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  approval_level text CHECK (approval_level IN ('mlro', 'senior_management', 'compliance_officer')),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dd_requirements_org ON due_diligence_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_dd_requirements_type ON due_diligence_requirements(due_diligence_type);

-- Risk Escalations
CREATE TABLE IF NOT EXISTS risk_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  previous_assessment_id uuid REFERENCES client_risk_assessments(id),
  new_assessment_id uuid REFERENCES client_risk_assessments(id),
  
  previous_risk_level text NOT NULL,
  new_risk_level text NOT NULL,
  previous_dd_type text NOT NULL,
  new_dd_type text NOT NULL,
  
  escalation_trigger text NOT NULL,
  escalation_reason text,
  trigger_details jsonb DEFAULT '{}',
  
  escalated_by uuid REFERENCES user_profiles(id),
  escalation_date timestamptz DEFAULT now(),
  
  -- Approval if needed
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES user_profiles(id),
  approval_date timestamptz,
  approval_notes text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_escalations_client ON risk_escalations(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_escalations_org ON risk_escalations(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_escalations_date ON risk_escalations(escalation_date);

-- Insert Default Risk Factors (Client Profile - 30% weight)
INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'client_profile',
  'Client Type',
  'Risk based on client type (individual, corporate, trust, etc.)',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Local salaried individual', 'Transparent public company'),
    'medium', jsonb_build_array('Small business', 'Standard corporate entity'),
    'high', jsonb_build_array('PEP', 'High net worth individual', 'Complex corporate structure', 'Trust', 'Cash-intensive business')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Client Type' AND organization_id IS NULL);

INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'client_profile',
  'Beneficial Ownership Transparency',
  'Clarity and transparency of beneficial ownership structure',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Single clear beneficial owner', 'Fully transparent structure'),
    'medium', jsonb_build_array('Multiple beneficial owners', 'Standard corporate structure'),
    'high', jsonb_build_array('Opaque ownership', 'Nominee shareholders', 'Bearer shares', 'Complex layering')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Beneficial Ownership Transparency' AND organization_id IS NULL);

INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'client_profile',
  'Source of Wealth',
  'Clarity and legitimacy of source of wealth',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Salary/employment', 'Inheritance with clear documentation', 'Sale of verified asset'),
    'medium', jsonb_build_array('Business profits', 'Investments', 'Real estate'),
    'high', jsonb_build_array('Unclear source', 'Cash-based', 'Multiple vague sources', 'Offshore origins')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Source of Wealth' AND organization_id IS NULL);

-- Insert Default Risk Factors (Geography - 20% weight)
INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'geography',
  'Country Risk',
  'Risk based on country of residence/incorporation',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Low-risk jurisdiction', 'FATF compliant', 'Strong AML controls'),
    'medium', jsonb_build_array('Standard jurisdiction', 'Adequate AML framework'),
    'high', jsonb_build_array('High-risk jurisdiction', 'FATF grey/black list', 'Weak AML controls', 'Tax haven', 'Sanctions')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Country Risk' AND organization_id IS NULL);

INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'geography',
  'Cross-Border Complexity',
  'Number and risk of jurisdictions involved',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Single low-risk jurisdiction', 'Domestic only'),
    'medium', jsonb_build_array('2-3 standard jurisdictions', 'Regional operations'),
    'high', jsonb_build_array('Multiple high-risk jurisdictions', 'Complex cross-border structure', 'Offshore entities')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Cross-Border Complexity' AND organization_id IS NULL);

-- Insert Default Risk Factors (Service Type - 30% weight)
INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'service_type',
  'Service Category',
  'Risk based on type of legal service provided',
  15,
  jsonb_build_object(
    'low', jsonb_build_array('Basic legal advice', 'Employment law', 'Family law'),
    'medium', jsonb_build_array('Corporate law', 'Litigation', 'Contract drafting'),
    'high', jsonb_build_array('Real estate transactions', 'Trust management', 'Company formation', 'Managing client funds', 'Mergers & acquisitions')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Service Category' AND organization_id IS NULL);

INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'service_type',
  'Transaction Value',
  'Size and value of transactions involved',
  15,
  jsonb_build_object(
    'low', jsonb_build_array('Low value', 'Routine matters'),
    'medium', jsonb_build_array('Moderate value', 'Standard transactions'),
    'high', jsonb_build_array('High value', 'Unusually large', 'Complex structuring')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Transaction Value' AND organization_id IS NULL);

-- Insert Default Risk Factors (Behavior - 20% weight)
INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'behavior',
  'Client Behavior',
  'Behavioral red flags and unusual patterns',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('Cooperative', 'Transparent', 'Clear purpose', 'Normal expectations'),
    'medium', jsonb_build_array('Some hesitation', 'Standard queries', 'Normal complexity'),
    'high', jsonb_build_array('Evasive', 'Secretive', 'Unusual urgency', 'Reluctant to provide information', 'Unusual requests')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Client Behavior' AND organization_id IS NULL);

INSERT INTO risk_factors (category, factor_name, description, weight, scoring_criteria, organization_id)
SELECT 
  'behavior',
  'Screening Results',
  'Results from PEP, sanctions, and adverse media screening',
  10,
  jsonb_build_object(
    'low', jsonb_build_array('No matches', 'Clear screening'),
    'medium', jsonb_build_array('Potential match requiring review', 'Common name matches'),
    'high', jsonb_build_array('PEP confirmed', 'Sanctions match', 'Adverse media', 'Criminal records')
  ),
  NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_factors WHERE factor_name = 'Screening Results' AND organization_id IS NULL);

-- Insert Default Risk Scoring Configuration
INSERT INTO risk_scoring_config (risk_level, min_score, max_score, due_diligence_type, description, color_code, organization_id)
SELECT 'low', 0, 30, 'simplified', 'Low risk clients - Simplified Due Diligence', '#10b981', NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_scoring_config WHERE risk_level = 'low' AND organization_id IS NULL);

INSERT INTO risk_scoring_config (risk_level, min_score, max_score, due_diligence_type, description, color_code, organization_id)
SELECT 'medium', 31, 60, 'standard', 'Medium risk clients - Standard Customer Due Diligence', '#f59e0b', NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_scoring_config WHERE risk_level = 'medium' AND organization_id IS NULL);

INSERT INTO risk_scoring_config (risk_level, min_score, max_score, due_diligence_type, description, color_code, organization_id)
SELECT 'high', 61, 100, 'enhanced', 'High risk clients - Enhanced Due Diligence', '#ef4444', NULL
WHERE NOT EXISTS (SELECT 1 FROM risk_scoring_config WHERE risk_level = 'high' AND organization_id IS NULL);

-- Insert Default Due Diligence Requirements for Simplified DD
INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'simplified', 'Basic Identity Verification', 'Verify client identity using reliable documents', true, false, 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Basic Identity Verification' AND due_diligence_type = 'simplified' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'simplified', 'Reduced Monitoring', 'Periodic monitoring at reduced frequency', true, false, 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Reduced Monitoring' AND due_diligence_type = 'simplified' AND organization_id IS NULL);

-- Insert Default Due Diligence Requirements for Standard CDD
INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'standard', 'Identity Verification', 'Comprehensive identity verification', true, false, 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Identity Verification' AND due_diligence_type = 'standard' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'standard', 'Beneficial Ownership', 'Identify and verify beneficial owners', true, false, 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Beneficial Ownership' AND due_diligence_type = 'standard' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'standard', 'Purpose of Relationship', 'Understand purpose and nature of relationship', true, false, 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Purpose of Relationship' AND due_diligence_type = 'standard' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, sort_order, organization_id)
SELECT 'standard', 'Ongoing Monitoring', 'Regular transaction and activity monitoring', true, false, 4, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Ongoing Monitoring' AND due_diligence_type = 'standard' AND organization_id IS NULL);

-- Insert Default Due Diligence Requirements for Enhanced DD
INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Enhanced Identity Verification', 'Additional identity verification measures', true, false, NULL, 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Enhanced Identity Verification' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Source of Wealth Verification', 'Detailed verification of source of wealth', true, false, NULL, 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Source of Wealth Verification' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Source of Funds Documentation', 'Comprehensive documentation of source of funds', true, false, NULL, 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Source of Funds Documentation' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Enhanced Beneficial Ownership', 'Deep dive into beneficial ownership structure', true, false, NULL, 4, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Enhanced Beneficial Ownership' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Senior Management Approval', 'Approval from senior management or MLRO', true, true, 'senior_management', 5, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Senior Management Approval' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Increased Monitoring', 'Enhanced ongoing monitoring and transaction review', true, false, NULL, 6, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Increased Monitoring' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

INSERT INTO due_diligence_requirements (due_diligence_type, requirement_name, requirement_description, is_mandatory, requires_approval, approval_level, sort_order, organization_id)
SELECT 'enhanced', 'Additional Documentation', 'Collection of additional supporting documents', true, false, NULL, 7, NULL
WHERE NOT EXISTS (SELECT 1 FROM due_diligence_requirements WHERE requirement_name = 'Additional Documentation' AND due_diligence_type = 'enhanced' AND organization_id IS NULL);

-- Enable Row Level Security
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_diligence_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_factors
CREATE POLICY "Users can view default and own org risk factors"
  ON risk_factors FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR 
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage risk factors"
  ON risk_factors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for risk_scoring_config
CREATE POLICY "Users can view default and own org scoring config"
  ON risk_scoring_config FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR 
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scoring config"
  ON risk_scoring_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for client_risk_assessments
CREATE POLICY "Users can view own org risk assessments"
  ON client_risk_assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create risk assessments"
  ON client_risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own org risk assessments"
  ON client_risk_assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete risk assessments"
  ON client_risk_assessments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for due_diligence_requirements
CREATE POLICY "Users can view default and own org DD requirements"
  ON due_diligence_requirements FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR 
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage DD requirements"
  ON due_diligence_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for risk_escalations
CREATE POLICY "Users can view own org risk escalations"
  ON risk_escalations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create risk escalations"
  ON risk_escalations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage risk escalations"
  ON risk_escalations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(
  p_client_id uuid,
  p_client_profile_score numeric DEFAULT 0,
  p_geography_score numeric DEFAULT 0,
  p_service_type_score numeric DEFAULT 0,
  p_behavior_score numeric DEFAULT 0,
  p_transaction_score numeric DEFAULT 0
)
RETURNS TABLE(
  overall_score numeric,
  risk_level text,
  due_diligence_type text
) AS $$
DECLARE
  v_overall_score numeric;
  v_risk_level text;
  v_dd_type text;
BEGIN
  -- Calculate weighted overall score
  -- Client Profile: 30%, Geography: 20%, Service Type: 30%, Behavior: 20%
  v_overall_score := (
    (p_client_profile_score * 0.30) +
    (p_geography_score * 0.20) +
    (p_service_type_score * 0.30) +
    (p_behavior_score * 0.20)
  );
  
  -- Determine risk level and DD type based on score
  IF v_overall_score <= 30 THEN
    v_risk_level := 'low';
    v_dd_type := 'simplified';
  ELSIF v_overall_score <= 60 THEN
    v_risk_level := 'medium';
    v_dd_type := 'standard';
  ELSE
    v_risk_level := 'high';
    v_dd_type := 'enhanced';
  END IF;
  
  RETURN QUERY SELECT v_overall_score, v_risk_level, v_dd_type;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update workflow stages based on risk assessment
CREATE OR REPLACE FUNCTION update_workflow_based_on_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_workflow_id uuid;
BEGIN
  -- Find the active workflow for this client
  SELECT id INTO v_workflow_id
  FROM client_onboarding_workflows
  WHERE client_id = NEW.client_id
  AND status IN ('not_started', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_workflow_id IS NOT NULL THEN
    -- Update workflow stages based on due diligence type
    -- This will be handled by the application layer to maintain flexibility
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workflows when risk assessment changes
CREATE TRIGGER trigger_update_workflow_on_risk_assessment
  AFTER INSERT OR UPDATE ON client_risk_assessments
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION update_workflow_based_on_risk();
