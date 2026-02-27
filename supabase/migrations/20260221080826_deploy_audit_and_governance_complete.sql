/*
  # Audit & Governance System
  
  ## Overview
  Comprehensive audit trail and governance system including:
  - Complete audit logging for all actions
  - Regulatory inspection management
  - Compliance reporting engine
  
  ## Tables Created
  1. `aml_audit_trail` - Comprehensive audit logging
  2. `regulatory_inspections` - Inspection management
  3. `compliance_reports` - Report generation tracking
  
  ## Security
  - RLS enabled
  - Tamper-proof audit trail
  - Organization-scoped
  
  ## Compliance
  - Tanzania AML Regulations - Record keeping
  - FATF Recommendation 11 - Record keeping
  - 10-year retention requirement
  - Regulatory inspection readiness
*/

-- Comprehensive Audit Trail
CREATE TABLE IF NOT EXISTS aml_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  audit_category text NOT NULL CHECK (audit_category IN ('client_access', 'data_modification', 'screening', 'transaction_review', 'case_action', 'str_submission', 'system_config', 'user_management', 'document_access', 'report_generation')),
  entity_type text,
  entity_id uuid,
  action text NOT NULL,
  action_details jsonb,
  performed_by_id uuid,
  user_role text,
  ip_address text,
  user_agent text,
  before_state jsonb,
  after_state jsonb,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_org ON aml_audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_category ON aml_audit_trail(audit_category);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON aml_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON aml_audit_trail(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_date ON aml_audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_risk ON aml_audit_trail(risk_level);

-- Regulatory Inspections
CREATE TABLE IF NOT EXISTS regulatory_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  inspection_type text NOT NULL CHECK (inspection_type IN ('onsite', 'offsite', 'targeted', 'routine', 'followup')),
  regulator text NOT NULL,
  inspection_date_start date NOT NULL,
  inspection_date_end date,
  inspector_name text,
  areas_examined text[],
  findings text,
  recommendations text,
  corrective_actions_required jsonb,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  deadline_for_response date,
  response_submitted boolean DEFAULT false,
  response_date date,
  response_document_path text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  inspection_status text DEFAULT 'open' CHECK (inspection_status IN ('open', 'in_progress', 'completed', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_inspections_org ON regulatory_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_inspections_status ON regulatory_inspections(inspection_status);
CREATE INDEX IF NOT EXISTS idx_regulatory_inspections_regulator ON regulatory_inspections(regulator);
CREATE INDEX IF NOT EXISTS idx_regulatory_inspections_date ON regulatory_inspections(inspection_date_start);

-- Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('monthly_aml', 'quarterly_risk', 'annual_compliance', 'str_summary', 'client_risk_profile', 'transaction_monitoring', 'screening_results', 'regulatory_submission')),
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  report_data jsonb NOT NULL,
  generated_by_id uuid,
  generation_date timestamptz DEFAULT now(),
  report_file_path text,
  report_format text DEFAULT 'pdf' CHECK (report_format IN ('pdf', 'excel', 'csv', 'json')),
  report_status text DEFAULT 'generated' CHECK (report_status IN ('draft', 'generated', 'reviewed', 'approved', 'submitted')),
  reviewed_by_id uuid,
  review_date timestamptz,
  approved_by_id uuid,
  approval_date timestamptz,
  submitted_to text,
  submission_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_org ON compliance_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period ON compliance_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(report_status);

-- Enable RLS
ALTER TABLE aml_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Audit Trail (Read-only for users, insert-only for system)
CREATE POLICY "Users can view own organization audit trail"
  ON aml_audit_trail FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can create audit trail entries"
  ON aml_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies for Regulatory Inspections
CREATE POLICY "Users can view own organization inspections"
  ON regulatory_inspections FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage inspections"
  ON regulatory_inspections FOR ALL
  TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' 
    AND organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for Compliance Reports
CREATE POLICY "Users can view own organization compliance reports"
  ON compliance_reports FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create compliance reports"
  ON compliance_reports FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update compliance reports"
  ON compliance_reports FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));