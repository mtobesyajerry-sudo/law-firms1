/*
  # Comprehensive AML Compliance Workflows Extension

  ## Overview
  Extends the AML system with complete compliance workflows aligned with Tanzania AML laws and FATF standards

  ## New Tables

  ### 1. `client_onboarding_workflows` - Tracks complete client onboarding process
  ### 2. `beneficial_owners` - Records beneficial ownership information (UBOs)
  ### 3. `screening_records` - PEP and sanctions screening history
  ### 4. `source_verification` - Source of funds and wealth documentation
  ### 5. `red_flags` - Suspicious activity and red flag indicators
  ### 6. `edd_workflows` - Enhanced due diligence workflow tracking
  ### 7. `str_workflows` - STR reporting workflow stages
  ### 8. `documents` - Document management with versioning
  ### 9. `audit_logs` - Comprehensive audit trail
  ### 10. `approval_workflows` - Multi-level approval tracking
  ### 11. `review_schedules` - Automated periodic review scheduling
  ### 12. `compliance_configuration` - Configurable compliance parameters

  ## Security
  - Enable RLS on all tables
  - Organization-based access control
*/

-- Client Onboarding Workflows
CREATE TABLE IF NOT EXISTS client_onboarding_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  workflow_status text DEFAULT 'initiated' CHECK (workflow_status IN ('initiated', 'documents_pending', 'verification_in_progress', 'screening_in_progress', 'risk_assessment_pending', 'approval_pending', 'completed', 'rejected', 'on_hold')),
  initiated_date timestamptz DEFAULT now(),
  initiated_by uuid REFERENCES auth.users(id),
  completion_date timestamptz,
  current_stage text DEFAULT 'client_information' CHECK (current_stage IN ('client_information', 'beneficial_ownership', 'document_collection', 'screening', 'risk_assessment', 'approval', 'completed')),
  stages_completed jsonb DEFAULT '[]'::jsonb,
  documents_collected jsonb DEFAULT '[]'::jsonb,
  verifications_completed jsonb DEFAULT '{}'::jsonb,
  rejection_reason text,
  notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Beneficial Owners
CREATE TABLE IF NOT EXISTS beneficial_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  identification_type text CHECK (identification_type IN ('passport', 'national_id', 'drivers_license', 'other')),
  identification_number text,
  identification_expiry date,
  ownership_percentage numeric CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  control_type text[] DEFAULT ARRAY[]::text[],
  pep_status boolean DEFAULT false,
  pep_details text,
  sanctions_screening_result text,
  sanctions_screening_date date,
  adverse_media_findings text,
  residential_address text,
  contact_information jsonb DEFAULT '{}'::jsonb,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  verification_date date,
  verified_by uuid REFERENCES auth.users(id),
  documents jsonb DEFAULT '[]'::jsonb,
  risk_rating text CHECK (risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Screening Records
CREATE TABLE IF NOT EXISTS screening_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'beneficial_owner', 'related_party')),
  entity_id uuid NOT NULL,
  screening_type text NOT NULL CHECK (screening_type IN ('pep', 'sanctions', 'adverse_media', 'watchlist')),
  screening_date date DEFAULT CURRENT_DATE,
  screening_provider text,
  search_criteria jsonb DEFAULT '{}'::jsonb,
  results_summary text,
  matches_found integer DEFAULT 0,
  match_details jsonb DEFAULT '[]'::jsonb,
  risk_score integer CHECK (risk_score >= 0 AND risk_score <= 100),
  screening_status text DEFAULT 'completed' CHECK (screening_status IN ('pending', 'in_progress', 'completed', 'failed')),
  false_positive boolean DEFAULT false,
  escalated boolean DEFAULT false,
  escalation_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  review_date date,
  review_notes text,
  next_screening_date date,
  created_at timestamptz DEFAULT now()
);

-- Source Verification
CREATE TABLE IF NOT EXISTS source_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('source_of_funds', 'source_of_wealth')),
  description text,
  amount_range text,
  documentation_type text[] DEFAULT ARRAY[]::text[],
  documents_received jsonb DEFAULT '[]'::jsonb,
  verification_method text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'insufficient', 'rejected')),
  verification_date date,
  verified_by uuid REFERENCES auth.users(id),
  credibility_assessment text CHECK (credibility_assessment IN ('high', 'medium', 'low', 'unverifiable')),
  red_flags_identified jsonb DEFAULT '[]'::jsonb,
  risk_indicators jsonb DEFAULT '[]'::jsonb,
  additional_information_required text,
  follow_up_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Red Flags
CREATE TABLE IF NOT EXISTS red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  flag_category text NOT NULL CHECK (flag_category IN ('client_profile', 'transaction', 'behavioral', 'geographic', 'screening', 'structural', 'documentation')),
  flag_type text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  detection_date timestamptz DEFAULT now(),
  detection_method text CHECK (detection_method IN ('automated', 'manual_review', 'customer_interaction', 'third_party_info')),
  related_entities jsonb DEFAULT '[]'::jsonb,
  supporting_evidence jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_investigation', 'resolved', 'false_positive', 'escalated')),
  assigned_to uuid REFERENCES auth.users(id),
  investigation_notes text,
  resolution_action text,
  resolved_date timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  str_filed boolean DEFAULT false,
  str_id uuid REFERENCES suspicious_transaction_reports(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- EDD Workflows
CREATE TABLE IF NOT EXISTS edd_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  edd_id uuid REFERENCES enhanced_due_diligence(id) ON DELETE SET NULL,
  workflow_status text DEFAULT 'initiated' CHECK (workflow_status IN ('initiated', 'information_gathering', 'senior_review', 'approval_pending', 'approved', 'rejected', 'completed')),
  initiated_date timestamptz DEFAULT now(),
  initiated_by uuid REFERENCES auth.users(id),
  triggers jsonb DEFAULT '[]'::jsonb,
  additional_info_required jsonb DEFAULT '[]'::jsonb,
  documents_requested jsonb DEFAULT '[]'::jsonb,
  documents_received jsonb DEFAULT '[]'::jsonb,
  senior_reviewer uuid REFERENCES auth.users(id),
  senior_review_date date,
  senior_review_notes text,
  approver uuid REFERENCES auth.users(id),
  approval_date date,
  approval_notes text,
  rejection_reason text,
  completion_date timestamptz,
  ongoing_measures jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STR Workflows
CREATE TABLE IF NOT EXISTS str_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  str_id uuid NOT NULL REFERENCES suspicious_transaction_reports(id) ON DELETE CASCADE,
  workflow_status text DEFAULT 'initiated' CHECK (workflow_status IN ('initiated', 'investigation', 'report_drafting', 'compliance_review', 'mlro_review', 'approved', 'submitted', 'acknowledged')),
  current_stage text DEFAULT 'investigation',
  initiated_date timestamptz DEFAULT now(),
  initiated_by uuid REFERENCES auth.users(id),
  investigator uuid REFERENCES auth.users(id),
  investigation_start_date date,
  investigation_completion_date date,
  investigation_findings text,
  report_drafter uuid REFERENCES auth.users(id),
  draft_completion_date date,
  compliance_reviewer uuid REFERENCES auth.users(id),
  compliance_review_date date,
  compliance_review_notes text,
  mlro_reviewer uuid REFERENCES auth.users(id),
  mlro_review_date date,
  mlro_decision text CHECK (mlro_decision IN ('approve', 'reject', 'request_additional_info')),
  mlro_notes text,
  submission_date date,
  submission_method text,
  fiu_acknowledgement_received boolean DEFAULT false,
  fiu_acknowledgement_date date,
  fiu_reference_number text,
  follow_up_actions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_category text NOT NULL CHECK (document_category IN ('identification', 'proof_of_address', 'financial', 'corporate', 'legal', 'screening', 'correspondence', 'other')),
  document_type text NOT NULL,
  document_name text NOT NULL,
  description text,
  related_entity_type text CHECK (related_entity_type IN ('client', 'beneficial_owner', 'assessment', 'edd', 'str', 'monitoring')),
  related_entity_id uuid,
  file_name text,
  file_size integer,
  file_type text,
  file_url text,
  storage_path text,
  version integer DEFAULT 1,
  is_current_version boolean DEFAULT true,
  previous_version_id uuid REFERENCES documents(id),
  upload_date timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  expiry_date date,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by uuid REFERENCES auth.users(id),
  verification_date date,
  verification_notes text,
  retention_period_years integer DEFAULT 7,
  deletion_eligible_date date,
  deleted boolean DEFAULT false,
  deleted_date timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL CHECK (action_type IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'submit', 'export', 'login', 'logout')),
  entity_type text NOT NULL,
  entity_id uuid,
  action_description text NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  additional_data jsonb DEFAULT '{}'::jsonb
);

-- Approval Workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approval_type text NOT NULL CHECK (approval_type IN ('client_onboarding', 'kyc_assessment', 'edd', 'str', 'high_risk_engagement', 'policy_exception')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  workflow_status text DEFAULT 'pending' CHECK (workflow_status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
  required_approvers jsonb DEFAULT '[]'::jsonb,
  approval_sequence jsonb DEFAULT '[]'::jsonb,
  current_approver uuid REFERENCES auth.users(id),
  initiated_by uuid REFERENCES auth.users(id),
  initiated_date timestamptz DEFAULT now(),
  completed_date timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review Schedules
CREATE TABLE IF NOT EXISTS review_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  review_type text NOT NULL CHECK (review_type IN ('kyc_periodic', 'edd_periodic', 'institutional', 'transaction_monitoring', 'screening')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  frequency_months integer,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES auth.users(id),
  completed_date date,
  completed_by uuid REFERENCES auth.users(id),
  next_review_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Compliance Configuration
CREATE TABLE IF NOT EXISTS compliance_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  tanzania_fiu_settings jsonb DEFAULT '{
    "reporting_threshold": 10000000,
    "currency": "TZS",
    "fiu_contact": "",
    "institution_code": ""
  }'::jsonb,
  red_flag_rules jsonb DEFAULT '{
    "transaction_thresholds": {"single": 10000000, "cumulative_monthly": 50000000},
    "high_risk_countries": [],
    "pep_enhanced_monitoring": true,
    "cash_intensive_threshold": 5000000
  }'::jsonb,
  screening_configuration jsonb DEFAULT '{
    "pep_screening_frequency_days": 90,
    "sanctions_screening_frequency_days": 30,
    "adverse_media_enabled": true,
    "auto_screening_enabled": false
  }'::jsonb,
  document_requirements jsonb DEFAULT '{
    "individual": ["identification", "proof_of_address", "source_of_funds"],
    "corporate": ["registration_certificate", "memorandum", "directors_list", "shareholders_list", "beneficial_ownership"],
    "retention_years": 7
  }'::jsonb,
  approval_matrix jsonb DEFAULT '{
    "low_risk": "officer",
    "medium_risk": "manager",
    "high_risk": "senior_manager",
    "very_high_risk": "mlro"
  }'::jsonb,
  monitoring_rules jsonb DEFAULT '{
    "transaction_monitoring_enabled": true,
    "behavior_monitoring_enabled": true,
    "relationship_monitoring_enabled": true
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_client ON client_onboarding_workflows(client_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON client_onboarding_workflows(workflow_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_org ON client_onboarding_workflows(organization_id);

CREATE INDEX IF NOT EXISTS idx_beneficial_owners_client ON beneficial_owners(client_id);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_org ON beneficial_owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_pep ON beneficial_owners(pep_status);

CREATE INDEX IF NOT EXISTS idx_screening_entity ON screening_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_screening_type ON screening_records(screening_type);
CREATE INDEX IF NOT EXISTS idx_screening_date ON screening_records(screening_date);

CREATE INDEX IF NOT EXISTS idx_source_verification_client ON source_verification(client_id);
CREATE INDEX IF NOT EXISTS idx_source_verification_status ON source_verification(verification_status);

CREATE INDEX IF NOT EXISTS idx_red_flags_client ON red_flags(client_id);
CREATE INDEX IF NOT EXISTS idx_red_flags_status ON red_flags(status);
CREATE INDEX IF NOT EXISTS idx_red_flags_severity ON red_flags(severity);

CREATE INDEX IF NOT EXISTS idx_edd_workflows_client ON edd_workflows(client_id);
CREATE INDEX IF NOT EXISTS idx_edd_workflows_status ON edd_workflows(workflow_status);

CREATE INDEX IF NOT EXISTS idx_str_workflows_str ON str_workflows(str_id);
CREATE INDEX IF NOT EXISTS idx_str_workflows_status ON str_workflows(workflow_status);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(document_category);
CREATE INDEX IF NOT EXISTS idx_documents_current ON documents(is_current_version);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(workflow_status);

CREATE INDEX IF NOT EXISTS idx_review_schedules_entity ON review_schedules(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_date ON review_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_review_schedules_status ON review_schedules(status);

-- Enable Row Level Security
ALTER TABLE client_onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficial_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE edd_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE str_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policies (organization-based access)
CREATE POLICY "Users can access onboarding in their organization"
  ON client_onboarding_workflows FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access beneficial owners in their organization"
  ON beneficial_owners FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access screening records in their organization"
  ON screening_records FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access source verification in their organization"
  ON source_verification FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access red flags in their organization"
  ON red_flags FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access edd workflows in their organization"
  ON edd_workflows FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access str workflows in their organization"
  ON str_workflows FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access documents in their organization"
  ON documents FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access audit logs in their organization"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can access approval workflows in their organization"
  ON approval_workflows FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access review schedules in their organization"
  ON review_schedules FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can access compliance config for their organization"
  ON compliance_configuration FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_onboarding_updated_at BEFORE UPDATE ON client_onboarding_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficial_owners_updated_at BEFORE UPDATE ON beneficial_owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_verification_updated_at BEFORE UPDATE ON source_verification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_red_flags_updated_at BEFORE UPDATE ON red_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edd_workflows_updated_at BEFORE UPDATE ON edd_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_str_workflows_updated_at BEFORE UPDATE ON str_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_schedules_updated_at BEFORE UPDATE ON review_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_config_updated_at BEFORE UPDATE ON compliance_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
