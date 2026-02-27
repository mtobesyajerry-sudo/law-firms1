/*
  # Correspondent Banking Module
  
  ## Overview
  Complete correspondent banking due diligence system including:
  - Respondent bank registry
  - Enhanced due diligence assessments
  - Ongoing monitoring
  - Senior management approval workflow
  
  ## Tables Created
  1. `correspondent_banks` - Respondent bank registry
  2. `correspondent_risk_assessments` - Due diligence assessments
  3. `correspondent_monitoring` - Ongoing monitoring records
  
  ## Security
  - RLS enabled
  - Organization-scoped
  
  ## Compliance
  - Tanzania AML Regulations - Correspondent banking requirements
  - FATF Recommendation 13 - Correspondent banking
  - Basel Committee guidance
*/

-- Correspondent Bank Registry
CREATE TABLE IF NOT EXISTS correspondent_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  bank_name text NOT NULL,
  bank_code text,
  swift_code text,
  country text NOT NULL,
  jurisdiction text,
  relationship_type text CHECK (relationship_type IN ('nostro', 'vostro', 'bilateral')),
  relationship_status text DEFAULT 'active' CHECK (relationship_status IN ('active', 'suspended', 'terminated', 'pending_approval')),
  services_provided text[],
  annual_volume_usd numeric,
  relationship_start_date date,
  relationship_end_date date,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  aml_certification_received boolean DEFAULT false,
  aml_certification_date date,
  aml_certification_expiry date,
  regulatory_license_verified boolean DEFAULT false,
  shell_bank_declaration_received boolean DEFAULT false,
  senior_management_approved boolean DEFAULT false,
  senior_management_approver_id uuid,
  approval_date date,
  next_review_date date,
  risk_rating text CHECK (risk_rating IN ('low', 'medium', 'high', 'very_high')),
  notes text,
  created_by_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondent_banks_org ON correspondent_banks(organization_id);
CREATE INDEX IF NOT EXISTS idx_correspondent_banks_status ON correspondent_banks(relationship_status);
CREATE INDEX IF NOT EXISTS idx_correspondent_banks_country ON correspondent_banks(country);
CREATE INDEX IF NOT EXISTS idx_correspondent_banks_swift ON correspondent_banks(swift_code);
CREATE INDEX IF NOT EXISTS idx_correspondent_banks_review ON correspondent_banks(next_review_date);

-- Correspondent Risk Assessments
CREATE TABLE IF NOT EXISTS correspondent_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondent_bank_id uuid REFERENCES correspondent_banks(id) ON DELETE CASCADE,
  assessment_type text DEFAULT 'initial' CHECK (assessment_type IN ('initial', 'periodic', 'triggered', 'renewal')),
  assessment_date date NOT NULL,
  assessor_name text,
  assessor_position text,
  country_risk_score integer DEFAULT 0,
  regulatory_risk_score integer DEFAULT 0,
  aml_controls_score integer DEFAULT 0,
  reputational_risk_score integer DEFAULT 0,
  operational_risk_score integer DEFAULT 0,
  overall_risk_score integer DEFAULT 0,
  risk_rating text CHECK (risk_rating IN ('low', 'medium', 'high', 'very_high')),
  key_findings text,
  recommendations text,
  edd_required boolean DEFAULT false,
  edd_measures_applied jsonb,
  approved_by_id uuid,
  approval_date date,
  next_assessment_due date,
  assessment_document_path text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondent_assessments_bank ON correspondent_risk_assessments(correspondent_bank_id);
CREATE INDEX IF NOT EXISTS idx_correspondent_assessments_type ON correspondent_risk_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_correspondent_assessments_date ON correspondent_risk_assessments(assessment_date);

-- Correspondent Monitoring
CREATE TABLE IF NOT EXISTS correspondent_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondent_bank_id uuid REFERENCES correspondent_banks(id) ON DELETE CASCADE,
  monitoring_date date DEFAULT CURRENT_DATE,
  monitoring_type text CHECK (monitoring_type IN ('transaction_review', 'news_screening', 'regulatory_check', 'volume_analysis', 'periodic_review')),
  findings text,
  issues_identified boolean DEFAULT false,
  issue_description text,
  action_taken text,
  monitored_by_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondent_monitoring_bank ON correspondent_monitoring(correspondent_bank_id);
CREATE INDEX IF NOT EXISTS idx_correspondent_monitoring_date ON correspondent_monitoring(monitoring_date);
CREATE INDEX IF NOT EXISTS idx_correspondent_monitoring_type ON correspondent_monitoring(monitoring_type);

-- Enable RLS
ALTER TABLE correspondent_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondent_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondent_monitoring ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Correspondent Banks
CREATE POLICY "Users can view own organization correspondent banks"
  ON correspondent_banks FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create correspondent banks"
  ON correspondent_banks FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization correspondent banks"
  ON correspondent_banks FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies for Risk Assessments
CREATE POLICY "Users can view correspondent risk assessments"
  ON correspondent_risk_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM correspondent_banks
      WHERE correspondent_banks.id = correspondent_risk_assessments.correspondent_bank_id
      AND correspondent_banks.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create risk assessments"
  ON correspondent_risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM correspondent_banks
      WHERE correspondent_banks.id = correspondent_risk_assessments.correspondent_bank_id
      AND correspondent_banks.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update risk assessments"
  ON correspondent_risk_assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM correspondent_banks
      WHERE correspondent_banks.id = correspondent_risk_assessments.correspondent_bank_id
      AND correspondent_banks.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Monitoring
CREATE POLICY "Users can view correspondent monitoring"
  ON correspondent_monitoring FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM correspondent_banks
      WHERE correspondent_banks.id = correspondent_monitoring.correspondent_bank_id
      AND correspondent_banks.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create monitoring records"
  ON correspondent_monitoring FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM correspondent_banks
      WHERE correspondent_banks.id = correspondent_monitoring.correspondent_bank_id
      AND correspondent_banks.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );