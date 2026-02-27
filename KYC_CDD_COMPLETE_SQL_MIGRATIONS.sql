-- ============================================================================
-- COMPLETE KYC/CDD SYSTEM - SQL MIGRATIONS
-- ============================================================================
-- This file contains all SQL migrations needed to implement a complete
-- KYC/CDD system with three-tier due diligence, document management,
-- SOF/SOW verification, continuous monitoring, and STR detection.
--
-- USAGE: Execute this entire file in your PostgreSQL database
-- PREREQUISITES:
--   - organizations table exists
--   - user_profiles table exists
--   - auth.users table exists (Supabase auth)
-- ============================================================================

-- ============================================================================
-- PART 1: CORE KYC TABLES
-- ============================================================================

-- Create kyc_clients table
CREATE TABLE IF NOT EXISTS kyc_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Client Type & Identity
  client_type text NOT NULL CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'other')),
  client_name text NOT NULL,
  client_id_number text,
  date_of_birth date,
  incorporation_date date,
  nationality text,
  country_of_residence text,
  country_of_incorporation text,

  -- Business Information
  business_activity text,
  estimated_annual_turnover text,
  purpose_of_relationship text,
  legal_service_type text,
  expected_transaction_volume text,
  economic_rationale text,

  -- Source of Funds/Wealth
  source_of_funds text,
  source_of_funds_verified boolean DEFAULT false,
  source_of_wealth text,
  source_of_wealth_verified boolean DEFAULT false,

  -- Beneficial Ownership
  beneficial_owners jsonb DEFAULT '[]'::jsonb,

  -- Risk Assessment
  pep_status boolean DEFAULT false,
  sanctions_screening_result text,
  adverse_media_findings text,
  base_risk_score integer DEFAULT 0 CHECK (base_risk_score >= 0 AND base_risk_score <= 100),
  current_risk_rating text CHECK (current_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  institutional_risk_multiplier numeric DEFAULT 1.0,

  -- Due Diligence Level
  current_dd_level text DEFAULT 'standard' CHECK (current_dd_level IN ('simplified', 'standard', 'enhanced')),

  -- Senior Management Approval (EDD)
  senior_approval_status text DEFAULT 'not_required' CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approval_notes text,

  -- Simplified DD Justification
  simplified_dd_justification text,
  simplified_dd_risk_factors jsonb DEFAULT '{}'::jsonb,

  -- Continuous Monitoring
  next_review_date date,
  last_review_date date,
  review_frequency text DEFAULT 'quarterly' CHECK (review_frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  monitoring_status text DEFAULT 'active' CHECK (monitoring_status IN ('active', 'overdue', 'suspended', 'closed')),

  -- First Payment Verification (EDD)
  first_payment_verified boolean DEFAULT false,
  first_payment_details jsonb DEFAULT '{}'::jsonb,

  -- Status
  client_status text DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'suspended', 'rejected')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kyc_clients_org ON kyc_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_status ON kyc_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_risk ON kyc_clients(current_risk_rating);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_review_date ON kyc_clients(next_review_date);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_dd_level ON kyc_clients(current_dd_level);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_senior_approval ON kyc_clients(senior_approval_status) WHERE senior_approval_status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS idx_kyc_clients_monitoring_status ON kyc_clients(monitoring_status);

-- Enable RLS
ALTER TABLE kyc_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view kyc_clients in their organization"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert kyc_clients in their organization"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update kyc_clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete kyc_clients in their organization"
  ON kyc_clients FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- PART 2: DUE DILIGENCE PROFILES & RISK SCORING
-- ============================================================================

-- Client Due Diligence Profiles
CREATE TABLE IF NOT EXISTS client_due_diligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dd_level text NOT NULL DEFAULT 'standard' CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  risk_score numeric CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_category text CHECK (risk_category IN ('low', 'medium', 'high')),
  risk_justification text,
  last_assessment_date timestamptz DEFAULT now(),
  next_review_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dd_profiles_client ON client_due_diligence_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_level ON client_due_diligence_profiles(dd_level);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_risk ON client_due_diligence_profiles(risk_category);

ALTER TABLE client_due_diligence_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DD profiles for their organization"
  ON client_due_diligence_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage DD profiles for their organization"
  ON client_due_diligence_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- Risk Scoring Details
CREATE TABLE IF NOT EXISTS risk_scoring_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_profile_id uuid REFERENCES client_due_diligence_profiles(id) ON DELETE CASCADE NOT NULL,
  client_risk_score numeric DEFAULT 0,
  geographic_risk_score numeric DEFAULT 0,
  service_risk_score numeric DEFAULT 0,
  behavioural_risk_score numeric DEFAULT 0,
  institutional_risk_score numeric DEFAULT 0,
  total_risk_score numeric DEFAULT 0,
  scoring_factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_scoring_profile ON risk_scoring_details(dd_profile_id);

ALTER TABLE risk_scoring_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access risk scoring for their clients"
  ON risk_scoring_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_due_diligence_profiles cddp
      INNER JOIN kyc_clients kc ON cddp.client_id = kc.id
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE cddp.id = dd_profile_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_due_diligence_profiles cddp
      INNER JOIN kyc_clients kc ON cddp.client_id = kc.id
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE cddp.id = dd_profile_id AND up.id = auth.uid()
    )
  );

-- ============================================================================
-- PART 3: DOCUMENT MANAGEMENT SYSTEM
-- ============================================================================

-- Document Types Master Table
CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('identity', 'address', 'financial', 'corporate', 'ownership', 'regulatory', 'other')),
  description text,
  client_type text NOT NULL CHECK (client_type IN ('individual', 'legal_entity', 'both')),
  validity_months integer DEFAULT 36,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category);
CREATE INDEX IF NOT EXISTS idx_document_types_client_type ON document_types(client_type);

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active document types"
  ON document_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Document Requirements by DD Level
CREATE TABLE IF NOT EXISTS dd_level_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_level text NOT NULL CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  client_type text NOT NULL CHECK (client_type IN ('individual', 'legal_entity')),
  document_type_id uuid REFERENCES document_types(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT true,
  priority integer DEFAULT 100,
  description text,
  triggers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dd_level, client_type, document_type_id)
);

CREATE INDEX IF NOT EXISTS idx_dd_requirements_level ON dd_level_document_requirements(dd_level, client_type);

ALTER TABLE dd_level_document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view DD requirements"
  ON dd_level_document_requirements FOR SELECT
  TO authenticated
  USING (true);

-- Client Documents
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  document_type_id uuid REFERENCES document_types(id) ON DELETE RESTRICT NOT NULL,
  file_name text NOT NULL,
  file_path text,
  file_size integer,
  mime_type text,
  document_number text,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verification_notes text,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  uploaded_by uuid REFERENCES user_profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiry ON client_documents(expiry_date) WHERE expiry_date IS NOT NULL;

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's client documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents for their organization's clients"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their organization's client documents"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
  );

-- Document Verification Audit Log
CREATE TABLE IF NOT EXISTS document_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('uploaded', 'verified', 'rejected', 'expired', 'deleted', 'updated')),
  performed_by uuid REFERENCES user_profiles(id) NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_document ON document_verification_log(document_id);

ALTER TABLE document_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for their organization's documents"
  ON document_verification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_documents
      JOIN kyc_clients ON kyc_clients.id = client_documents.client_id
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE client_documents.id = document_verification_log.document_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create verification logs"
  ON document_verification_log FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- ============================================================================
-- PART 4: ESCALATION & APPROVAL SYSTEM
-- ============================================================================

-- DD Escalations
CREATE TABLE IF NOT EXISTS dd_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  previous_dd_level text NOT NULL,
  new_dd_level text NOT NULL,
  escalation_reason text NOT NULL,
  trigger_type text,
  escalated_by uuid REFERENCES user_profiles(id),
  escalated_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_escalations_client ON dd_escalations(client_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON dd_escalations(status);

ALTER TABLE dd_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access escalations for their clients"
  ON dd_escalations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- Senior Management Approvals
CREATE TABLE IF NOT EXISTS senior_management_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  approval_type text CHECK (approval_type IN ('onboarding', 'continuation', 'escalation')) NOT NULL,
  requested_by uuid REFERENCES user_profiles(id) NOT NULL,
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  justification text NOT NULL,
  decision_notes text
);

CREATE INDEX IF NOT EXISTS idx_approvals_client ON senior_management_approvals(client_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON senior_management_approvals(status);

ALTER TABLE senior_management_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals for their clients"
  ON senior_management_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert approval requests"
  ON senior_management_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Senior users can update approvals"
  ON senior_management_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
      AND up.role IN ('admin', 'compliance_officer')
    )
  );

-- ============================================================================
-- PART 5: SOURCE OF FUNDS/WEALTH VERIFICATION
-- ============================================================================

-- Source of Wealth and Funds
CREATE TABLE IF NOT EXISTS source_of_wealth_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  source_of_wealth text,
  source_of_funds text,
  wealth_description text,
  estimated_net_worth numeric,
  annual_income numeric,
  assets_description text,
  employment_details text,
  business_interests text,
  supporting_documents jsonb DEFAULT '[]',
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wealth_client ON source_of_wealth_funds(client_id);

ALTER TABLE source_of_wealth_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access wealth info for their clients"
  ON source_of_wealth_funds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- SOF/SOW Verification Records
CREATE TABLE IF NOT EXISTS sof_sow_verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('source_of_funds', 'source_of_wealth')),
  declared_source text NOT NULL,
  estimated_amount numeric,
  currency text DEFAULT 'TZS',
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'in_progress', 'verified', 'rejected', 'requires_review')),
  verification_method text,
  evidence_reviewed text,
  verification_findings text,
  concerns_identified text,
  mitigation_measures text,
  supporting_document_ids jsonb DEFAULT '[]'::jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  next_review_date date,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_client ON sof_sow_verification_records(client_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_org ON sof_sow_verification_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_status ON sof_sow_verification_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_type ON sof_sow_verification_records(verification_type);

ALTER TABLE sof_sow_verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access organization verification records"
  ON sof_sow_verification_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- SOF/SOW Verification Checklist
CREATE TABLE IF NOT EXISTS sof_sow_verification_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_type text NOT NULL CHECK (verification_type IN ('source_of_funds', 'source_of_wealth', 'both')),
  checklist_item text NOT NULL,
  item_order integer NOT NULL,
  is_mandatory boolean DEFAULT false,
  guidance_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sof_sow_verification_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view checklist"
  ON sof_sow_verification_checklist FOR SELECT
  TO authenticated
  USING (true);

-- SOF/SOW Checklist Completion
CREATE TABLE IF NOT EXISTS sof_sow_verification_checklist_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_record_id uuid NOT NULL REFERENCES sof_sow_verification_records(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES sof_sow_verification_checklist(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completion_notes text,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(verification_record_id, checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_sof_sow_checklist_completion_record ON sof_sow_verification_checklist_completion(verification_record_id);

ALTER TABLE sof_sow_verification_checklist_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage checklist completion"
  ON sof_sow_verification_checklist_completion FOR ALL
  TO authenticated
  USING (
    verification_record_id IN (
      SELECT id FROM sof_sow_verification_records
      WHERE organization_id IN (
        SELECT id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    verification_record_id IN (
      SELECT id FROM sof_sow_verification_records
      WHERE organization_id IN (
        SELECT id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- SOF/SOW Verification History
CREATE TABLE IF NOT EXISTS sof_sow_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_record_id uuid NOT NULL REFERENCES sof_sow_verification_records(id) ON DELETE CASCADE,
  action text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sof_sow_history_record ON sof_sow_verification_history(verification_record_id);

ALTER TABLE sof_sow_verification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verification history"
  ON sof_sow_verification_history FOR SELECT
  TO authenticated
  USING (
    verification_record_id IN (
      SELECT id FROM sof_sow_verification_records
      WHERE organization_id IN (
        SELECT id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert verification history"
  ON sof_sow_verification_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PART 6: ENHANCED DUE DILIGENCE (EDD) SYSTEM
-- ============================================================================

-- EDD Document Types
CREATE TABLE IF NOT EXISTS edd_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  required_for_risk_level text NOT NULL DEFAULT 'High',
  template_available boolean DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE edd_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view document types"
  ON edd_document_types FOR SELECT
  TO authenticated
  USING (true);

-- EDD Documents Tracking
CREATE TABLE IF NOT EXISTS edd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES edd_document_types(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed', 'approved')),
  completed_date date,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_date date,
  notes text,
  file_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, document_type_id)
);

ALTER TABLE edd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access EDD documents for their organization clients"
  ON edd_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = edd_documents.client_id
      AND kyc_clients.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = edd_documents.client_id
      AND kyc_clients.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PART 7: CONTINUOUS MONITORING SYSTEM
-- ============================================================================

-- KYC Monitoring Reviews
CREATE TABLE IF NOT EXISTS kyc_monitoring_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  review_date date DEFAULT CURRENT_DATE NOT NULL,
  reviewed_by uuid REFERENCES user_profiles(id) NOT NULL,
  review_type text CHECK (review_type IN ('scheduled', 'triggered', 'ad_hoc')) DEFAULT 'scheduled',
  findings text,
  actions_taken text,
  risk_change text CHECK (risk_change IN ('increased', 'decreased', 'unchanged', 'escalated')),
  next_review_date date,
  documents_updated boolean DEFAULT false,
  transaction_review_completed boolean DEFAULT false,
  screening_completed boolean DEFAULT false,
  overall_status text CHECK (overall_status IN ('satisfactory', 'concerns', 'high_concern', 'exit_recommended')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_client ON kyc_monitoring_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_date ON kyc_monitoring_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_status ON kyc_monitoring_reviews(overall_status);

ALTER TABLE kyc_monitoring_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access reviews for their organization's clients"
  ON kyc_monitoring_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = kyc_monitoring_reviews.client_id
      AND user_profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = kyc_monitoring_reviews.client_id
      AND user_profiles.id = auth.uid()
    )
    AND reviewed_by = auth.uid()
  );

-- Enhanced Monitoring Requirements
CREATE TABLE IF NOT EXISTS enhanced_monitoring_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  monitoring_frequency text CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'monthly',
  transaction_threshold numeric,
  review_requirements jsonb DEFAULT '[]',
  additional_checks jsonb DEFAULT '[]',
  assigned_to uuid REFERENCES user_profiles(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_client ON enhanced_monitoring_requirements(client_id);

ALTER TABLE enhanced_monitoring_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access monitoring requirements for their clients"
  ON enhanced_monitoring_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- ============================================================================
-- PART 8: RED FLAGS & ALERTS
-- ============================================================================

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
  str_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_red_flags_client ON red_flags(client_id);
CREATE INDEX IF NOT EXISTS idx_red_flags_status ON red_flags(status);
CREATE INDEX IF NOT EXISTS idx_red_flags_severity ON red_flags(severity);

ALTER TABLE red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access red flags in their organization"
  ON red_flags FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- System Alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('review_due', 'high_risk_client', 'transaction_threshold', 'unusual_activity', 'document_expiry', 'edd_required', 'monitoring_alert')),
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  assessment_id uuid,
  alert_title text NOT NULL,
  alert_description text,
  alert_data jsonb DEFAULT '{}'::jsonb,
  triggered_date timestamptz DEFAULT now(),
  due_date date,
  status text DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  assigned_to uuid REFERENCES auth.users(id),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_date timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_date timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org ON system_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_client ON system_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access alerts in their organization"
  ON system_alerts FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- PART 9: STR/SAR SYSTEM
-- ============================================================================

-- Suspicious Transaction Reports
CREATE TABLE IF NOT EXISTS suspicious_transaction_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  str_reference_number text,
  reporting_date date DEFAULT CURRENT_DATE,
  reporting_officer text,
  mlro_approval boolean DEFAULT false,
  mlro_name text,
  mlro_approval_date date,
  suspicious_activity_description text,
  suspicious_transactions jsonb DEFAULT '[]'::jsonb,
  indicators_of_suspicion jsonb DEFAULT '[]'::jsonb,
  investigation_summary text,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  amount_involved numeric,
  currency text DEFAULT 'USD',
  filing_status text DEFAULT 'draft' CHECK (filing_status IN ('draft', 'pending_approval', 'submitted', 'acknowledged')),
  submission_date date,
  fiu_reference_number text,
  fiu_acknowledgement_date date,
  internal_case_number text,
  follow_up_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_str_org ON suspicious_transaction_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_str_client ON suspicious_transaction_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_str_status ON suspicious_transaction_reports(filing_status);

ALTER TABLE suspicious_transaction_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access str in their organization"
  ON suspicious_transaction_reports FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- STR Trigger Rules
CREATE TABLE IF NOT EXISTS str_trigger_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_type text CHECK (rule_type IN ('Rule-Based', 'Score-Based', 'Behavioral', 'Document Integrity')) NOT NULL,
  rule_category text NOT NULL,
  description text NOT NULL,
  trigger_condition jsonb NOT NULL,
  severity text CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  is_active boolean DEFAULT true,
  auto_generate_alert boolean DEFAULT false,
  requires_manual_review boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE str_trigger_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access str trigger rules"
  ON str_trigger_rules FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- STR Typologies
CREATE TABLE IF NOT EXISTS str_typologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  typology_name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  indicators jsonb DEFAULT '[]'::jsonb,
  mitigation_measures jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE str_typologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view typologies"
  ON str_typologies FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 10: AUDIT TRAIL
-- ============================================================================

-- DD Audit Trail
CREATE TABLE IF NOT EXISTS dd_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  justification text,
  performed_by uuid REFERENCES user_profiles(id) NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_client ON dd_audit_trail(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON dd_audit_trail(performed_at);

ALTER TABLE dd_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit trail for their clients"
  ON dd_audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit trail"
  ON dd_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- System-Wide Audit Logs
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs in their organization"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PART 11: AUTOMATED FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_kyc_clients_updated_at BEFORE UPDATE ON kyc_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dd_profiles_updated_at BEFORE UPDATE ON client_due_diligence_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wealth_updated_at BEFORE UPDATE ON source_of_wealth_funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_updated_at BEFORE UPDATE ON enhanced_monitoring_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_reviews_updated_at BEFORE UPDATE ON kyc_monitoring_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edd_documents_updated_at BEFORE UPDATE ON edd_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sof_sow_verification_updated_at BEFORE UPDATE ON sof_sow_verification_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sof_sow_checklist_completion_updated_at BEFORE UPDATE ON sof_sow_verification_checklist_completion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set next review date
CREATE OR REPLACE FUNCTION set_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next review date based on DD level and risk
  IF NEW.current_dd_level = 'simplified' THEN
    NEW.review_frequency := 'annual';
    NEW.next_review_date := CURRENT_DATE + INTERVAL '12 months';
  ELSIF NEW.current_dd_level = 'standard' THEN
    NEW.review_frequency := 'quarterly';
    NEW.next_review_date := CURRENT_DATE + INTERVAL '3 months';
  ELSIF NEW.current_dd_level = 'enhanced' THEN
    IF NEW.current_risk_rating IN ('High', 'Very High') THEN
      NEW.review_frequency := 'monthly';
      NEW.next_review_date := CURRENT_DATE + INTERVAL '1 month';
    ELSE
      NEW.review_frequency := 'quarterly';
      NEW.next_review_date := CURRENT_DATE + INTERVAL '3 months';
    END IF;
  END IF;

  -- Set senior approval requirement for enhanced DD
  IF NEW.current_dd_level = 'enhanced' AND NEW.senior_approval_status = 'not_required' THEN
    NEW.senior_approval_status := 'pending';
  ELSIF NEW.current_dd_level != 'enhanced' THEN
    NEW.senior_approval_status := 'not_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_review_dates
  BEFORE INSERT OR UPDATE OF current_dd_level, current_risk_rating ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_next_review_date();

-- Function to check for overdue reviews
CREATE OR REPLACE FUNCTION check_overdue_reviews()
RETURNS void AS $$
BEGIN
  UPDATE kyc_clients
  SET monitoring_status = 'overdue'
  WHERE monitoring_status = 'active'
    AND next_review_date < CURRENT_DATE
    AND client_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for expired documents
CREATE OR REPLACE FUNCTION check_expired_documents()
RETURNS void AS $$
BEGIN
  UPDATE client_documents
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'verified'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log document changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, new_status, notes)
    VALUES (NEW.id, 'uploaded', NEW.uploaded_by, NEW.status, 'Document uploaded');
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, previous_status, new_status, notes)
    VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'verified' THEN 'verified'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'expired' THEN 'expired'
        ELSE 'updated'
      END,
      auth.uid(),
      OLD.status,
      NEW.status,
      NEW.verification_notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_document_change
  AFTER INSERT OR UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_change();

-- Function to log SOF/SOW verification changes
CREATE OR REPLACE FUNCTION log_sof_sow_verification_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO sof_sow_verification_history (
      verification_record_id, action, changed_by, change_details
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      jsonb_build_object(
        'verification_type', NEW.verification_type,
        'declared_source', NEW.declared_source,
        'status', NEW.verification_status
      )
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO sof_sow_verification_history (
      verification_record_id, action, changed_by, change_details
    ) VALUES (
      NEW.id,
      CASE
        WHEN OLD.verification_status != NEW.verification_status THEN 'status_changed'
        WHEN OLD.verified_by IS NULL AND NEW.verified_by IS NOT NULL THEN 'verified'
        WHEN OLD.approved_by IS NULL AND NEW.approved_by IS NOT NULL THEN 'approved'
        ELSE 'updated'
      END,
      auth.uid(),
      jsonb_build_object(
        'old_status', OLD.verification_status,
        'new_status', NEW.verification_status,
        'verified_by', NEW.verified_by,
        'approved_by', NEW.approved_by
      )
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sof_sow_verification_changes_trigger
  AFTER INSERT OR UPDATE ON sof_sow_verification_records
  FOR EACH ROW EXECUTE FUNCTION log_sof_sow_verification_changes();

-- ============================================================================
-- PART 12: SEED DATA - DOCUMENT TYPES
-- ============================================================================

-- Identity Documents
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('nida', 'National ID (NIDA)', 'identity', 'Tanzania National Identification Card', 'both', 120, true),
  ('passport', 'Passport', 'identity', 'Valid passport (Tanzania or foreign)', 'both', 120, true),
  ('voters_card', 'Voter Registration Card', 'identity', 'Tanzania Voter Registration Card', 'individual', 60, true),
  ('drivers_license', 'Driver License', 'identity', 'Valid Tanzania driver license', 'individual', 60, true)
ON CONFLICT (code) DO NOTHING;

-- Address Verification Documents
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('utility_bill', 'Utility Bill', 'address', 'Recent utility bill (electricity, water, gas)', 'both', 3, true),
  ('bank_statement', 'Bank Statement', 'address', 'Recent bank statement showing address', 'both', 3, true),
  ('tenancy_agreement', 'Tenancy Agreement', 'address', 'Valid tenancy or lease agreement', 'both', 12, true),
  ('tin_certificate', 'TIN Certificate', 'address', 'Tax Identification Number Certificate', 'both', 36, true)
ON CONFLICT (code) DO NOTHING;

-- Financial Documents
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('source_of_funds', 'Source of Funds Declaration', 'financial', 'Declaration of source of funds for transaction', 'both', 12, true),
  ('source_of_wealth', 'Source of Wealth Documentation', 'financial', 'Evidence of wealth accumulation', 'both', 24, true),
  ('bank_reference', 'Bank Reference Letter', 'financial', 'Reference letter from banking institution', 'both', 6, true),
  ('financial_statements', 'Financial Statements', 'financial', 'Audited or certified financial statements', 'legal_entity', 12, true),
  ('tax_returns', 'Tax Returns', 'financial', 'Recent tax returns or tax clearance', 'both', 12, true),
  ('payslips', 'Payslips/Employment Confirmation', 'financial', 'Recent payslips or employment confirmation letter', 'individual', 6, true),
  ('asset_valuation', 'Asset Valuation Report', 'financial', 'Valuation report for significant assets', 'both', 12, true)
ON CONFLICT (code) DO NOTHING;

-- Corporate Documents
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('cert_incorporation', 'Certificate of Incorporation', 'corporate', 'Certificate of Incorporation from BRELA', 'legal_entity', NULL, true),
  ('mem_articles', 'Memorandum & Articles of Association', 'corporate', 'Company constitution documents', 'legal_entity', NULL, true),
  ('business_license', 'Business License', 'corporate', 'Valid business license from TRA or local authority', 'legal_entity', 12, true),
  ('cert_compliance', 'Certificate of Compliance', 'corporate', 'Certificate of compliance from BRELA', 'legal_entity', 12, true),
  ('register_directors', 'Register of Directors', 'corporate', 'Current register of directors', 'legal_entity', 12, true),
  ('register_members', 'Register of Members', 'corporate', 'Current register of shareholders/members', 'legal_entity', 12, true),
  ('bo_declaration', 'Beneficial Ownership Declaration', 'ownership', 'Declaration of beneficial owners (25%+ ownership or control)', 'legal_entity', 12, true),
  ('board_resolution', 'Board Resolution', 'corporate', 'Board resolution authorizing transaction/relationship', 'legal_entity', 12, true),
  ('org_structure', 'Organizational Structure Chart', 'corporate', 'Visual representation of ownership and control', 'legal_entity', 12, true)
ON CONFLICT (code) DO NOTHING;

-- Enhanced DD Specific Documents
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active)
VALUES
  ('pep_declaration', 'PEP Declaration', 'regulatory', 'Declaration of Politically Exposed Person status', 'both', 12, true),
  ('pep_assessment', 'PEP Assessment Form', 'regulatory', 'Detailed assessment for PEP relationships', 'both', 12, true),
  ('edd_questionnaire', 'Enhanced DD Questionnaire', 'regulatory', 'Comprehensive enhanced due diligence questionnaire', 'both', 12, true),
  ('senior_approval', 'Senior Management Approval', 'regulatory', 'Approval from senior management/partner', 'both', 12, true),
  ('economic_rationale', 'Transaction Economic Rationale', 'regulatory', 'Statement explaining economic purpose of transaction', 'both', 12, true),
  ('country_risk_assessment', 'Country Risk Assessment', 'regulatory', 'Assessment for high-risk jurisdiction involvement', 'both', 12, true),
  ('monitoring_checklist', 'Ongoing Monitoring Checklist', 'regulatory', 'Checklist for continuous monitoring activities', 'both', 6, true),
  ('public_records_search', 'Public Records Search Results', 'regulatory', 'Results from adverse media and sanction screening', 'both', 6, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 13: SEED DATA - DD LEVEL DOCUMENT REQUIREMENTS
-- ============================================================================

-- SIMPLIFIED DD - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'simplified',
  'individual',
  id,
  CASE
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement') THEN true
    ELSE false
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement') THEN 2
    ELSE 99
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 'Primary identification document required'
    WHEN code IN ('utility_bill', 'bank_statement') THEN 'One proof of address required'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both')
  AND code IN ('nida', 'passport', 'utility_bill', 'bank_statement', 'tin_certificate')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- SIMPLIFIED DD - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'simplified',
  'legal_entity',
  id,
  CASE
    WHEN code IN ('cert_incorporation', 'business_license') THEN true
    WHEN code IN ('register_directors', 'bo_declaration') THEN true
    ELSE false
  END,
  CASE
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'business_license' THEN 2
    WHEN code IN ('register_directors', 'bo_declaration') THEN 3
    ELSE 99
  END,
  CASE
    WHEN code = 'cert_incorporation' THEN 'Certificate of incorporation required'
    WHEN code = 'business_license' THEN 'Valid business license required'
    WHEN code IN ('register_directors', 'bo_declaration') THEN 'Basic ownership information required'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both')
  AND code IN ('cert_incorporation', 'business_license', 'register_directors', 'bo_declaration', 'tin_certificate')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- STANDARD DD - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'standard',
  'individual',
  id,
  CASE
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN true
    WHEN code IN ('tin_certificate', 'source_of_funds') THEN true
    WHEN code = 'payslips' THEN true
    ELSE false
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 2
    WHEN code = 'tin_certificate' THEN 3
    WHEN code = 'source_of_funds' THEN 4
    WHEN code = 'payslips' THEN 5
    ELSE 99
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 'Primary identification required (at least one)'
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 'Proof of residential address (max 3 months old)'
    WHEN code = 'tin_certificate' THEN 'Tax identification required'
    WHEN code = 'source_of_funds' THEN 'Declaration of source of funds for transaction'
    WHEN code = 'payslips' THEN 'Evidence of occupation and income'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both')
  AND code IN ('nida', 'passport', 'voters_card', 'utility_bill', 'bank_statement', 'tenancy_agreement',
               'tin_certificate', 'source_of_funds', 'payslips', 'bank_reference')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- STANDARD DD - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'standard',
  'legal_entity',
  id,
  CASE
    WHEN code IN ('cert_incorporation', 'mem_articles', 'business_license') THEN true
    WHEN code IN ('register_directors', 'register_members', 'bo_declaration') THEN true
    WHEN code IN ('cert_compliance', 'board_resolution', 'org_structure') THEN true
    WHEN code = 'source_of_funds' THEN true
    ELSE false
  END,
  CASE
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'mem_articles' THEN 2
    WHEN code = 'business_license' THEN 3
    WHEN code = 'cert_compliance' THEN 4
    WHEN code = 'register_directors' THEN 5
    WHEN code = 'register_members' THEN 6
    WHEN code = 'bo_declaration' THEN 7
    WHEN code = 'org_structure' THEN 8
    WHEN code = 'board_resolution' THEN 9
    WHEN code = 'source_of_funds' THEN 10
    ELSE 99
  END,
  CASE
    WHEN code = 'cert_incorporation' THEN 'Certificate of incorporation from BRELA'
    WHEN code = 'mem_articles' THEN 'Company constitution documents'
    WHEN code = 'business_license' THEN 'Valid business license'
    WHEN code = 'cert_compliance' THEN 'Current certificate of compliance (BRELA)'
    WHEN code = 'register_directors' THEN 'Current register of directors with full details'
    WHEN code = 'register_members' THEN 'Current register of shareholders/members'
    WHEN code = 'bo_declaration' THEN 'Beneficial owners (25%+ ownership/control)'
    WHEN code = 'org_structure' THEN 'Clear ownership and control structure'
    WHEN code = 'board_resolution' THEN 'Authorization for business relationship'
    WHEN code = 'source_of_funds' THEN 'Source of funds for transaction'
    ELSE 'Optional supporting document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both')
  AND code IN ('cert_incorporation', 'mem_articles', 'business_license', 'cert_compliance',
               'register_directors', 'register_members', 'bo_declaration', 'board_resolution',
               'org_structure', 'source_of_funds', 'financial_statements', 'tin_certificate')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- ENHANCED DD - Individual (ALL Standard + Additional)
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'enhanced',
  'individual',
  id,
  CASE
    -- All Standard DD documents remain mandatory
    WHEN code IN ('nida', 'passport') THEN true
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN true
    WHEN code IN ('tin_certificate', 'source_of_funds') THEN true
    WHEN code = 'payslips' THEN true
    -- Additional mandatory Enhanced DD documents
    WHEN code = 'source_of_wealth' THEN true
    WHEN code = 'senior_approval' THEN true
    WHEN code = 'edd_questionnaire' THEN true
    WHEN code = 'pep_declaration' THEN true
    WHEN code = 'public_records_search' THEN true
    WHEN code = 'monitoring_checklist' THEN true
    ELSE false
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 1
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 2
    WHEN code = 'tin_certificate' THEN 3
    WHEN code = 'source_of_funds' THEN 4
    WHEN code = 'source_of_wealth' THEN 5
    WHEN code = 'payslips' THEN 6
    WHEN code = 'pep_declaration' THEN 7
    WHEN code = 'edd_questionnaire' THEN 8
    WHEN code = 'public_records_search' THEN 9
    WHEN code = 'senior_approval' THEN 10
    WHEN code = 'monitoring_checklist' THEN 11
    ELSE 99
  END,
  CASE
    WHEN code IN ('nida', 'passport') THEN 'Primary identification (both preferred for high risk)'
    WHEN code IN ('utility_bill', 'bank_statement', 'tenancy_agreement') THEN 'Multiple proofs of address required'
    WHEN code = 'tin_certificate' THEN 'Tax identification mandatory'
    WHEN code = 'source_of_funds' THEN 'Detailed source of funds with supporting evidence'
    WHEN code = 'source_of_wealth' THEN 'MANDATORY: Complete source of wealth with evidence'
    WHEN code = 'payslips' THEN 'Employment and income verification'
    WHEN code = 'pep_declaration' THEN 'MANDATORY: PEP declaration and assessment'
    WHEN code = 'edd_questionnaire' THEN 'MANDATORY: Complete enhanced DD questionnaire'
    WHEN code = 'public_records_search' THEN 'MANDATORY: Adverse media and sanction screening'
    WHEN code = 'senior_approval' THEN 'MANDATORY: Senior management approval before onboarding'
    WHEN code = 'monitoring_checklist' THEN 'MANDATORY: Enhanced monitoring framework'
    ELSE 'Additional supporting document'
  END
FROM document_types
WHERE client_type IN ('individual', 'both')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- ENHANCED DD - Legal Entity (ALL Standard + Additional)
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description)
SELECT
  'enhanced',
  'legal_entity',
  id,
  CASE
    -- All Standard DD documents remain mandatory
    WHEN code IN ('cert_incorporation', 'mem_articles', 'business_license') THEN true
    WHEN code IN ('register_directors', 'register_members', 'bo_declaration') THEN true
    WHEN code IN ('cert_compliance', 'board_resolution', 'org_structure') THEN true
    WHEN code = 'source_of_funds' THEN true
    -- Additional mandatory Enhanced DD documents
    WHEN code = 'source_of_wealth' THEN true
    WHEN code = 'senior_approval' THEN true
    WHEN code = 'edd_questionnaire' THEN true
    WHEN code = 'pep_declaration' THEN true
    WHEN code = 'public_records_search' THEN true
    WHEN code = 'monitoring_checklist' THEN true
    WHEN code = 'financial_statements' THEN true
    ELSE false
  END,
  CASE
    WHEN code = 'cert_incorporation' THEN 1
    WHEN code = 'mem_articles' THEN 2
    WHEN code = 'business_license' THEN 3
    WHEN code = 'cert_compliance' THEN 4
    WHEN code = 'register_directors' THEN 5
    WHEN code = 'register_members' THEN 6
    WHEN code = 'bo_declaration' THEN 7
    WHEN code = 'org_structure' THEN 8
    WHEN code = 'board_resolution' THEN 9
    WHEN code = 'source_of_funds' THEN 10
    WHEN code = 'source_of_wealth' THEN 11
    WHEN code = 'financial_statements' THEN 12
    WHEN code = 'pep_declaration' THEN 13
    WHEN code = 'edd_questionnaire' THEN 14
    WHEN code = 'public_records_search' THEN 15
    WHEN code = 'senior_approval' THEN 16
    WHEN code = 'monitoring_checklist' THEN 17
    ELSE 99
  END,
  CASE
    WHEN code = 'bo_declaration' THEN 'MANDATORY: Beneficial owners verified down to natural persons'
    WHEN code = 'source_of_wealth' THEN 'MANDATORY: Source of wealth for beneficial owners with evidence'
    WHEN code = 'financial_statements' THEN 'MANDATORY: Recent audited financial statements'
    WHEN code = 'pep_declaration' THEN 'MANDATORY: PEP declaration for all BOs and directors'
    WHEN code = 'edd_questionnaire' THEN 'MANDATORY: Complete enhanced DD questionnaire'
    WHEN code = 'public_records_search' THEN 'MANDATORY: Screening for entity and beneficial owners'
    WHEN code = 'senior_approval' THEN 'MANDATORY: Senior partner approval before onboarding'
    WHEN code = 'monitoring_checklist' THEN 'MANDATORY: Enhanced monitoring framework'
    ELSE 'Required document'
  END
FROM document_types
WHERE client_type IN ('legal_entity', 'both')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- ============================================================================
-- PART 14: SEED DATA - EDD DOCUMENT TYPES
-- ============================================================================

INSERT INTO edd_document_types (name, description, required_for_risk_level, display_order) VALUES
('PEP Declaration', 'Self-declaration form for Politically Exposed Persons status', 'High', 1),
('Enhanced DD Questionnaire', 'Detailed questionnaire for source of wealth and funds verification', 'High', 2),
('Public Records Search Results', 'Documentation of searches conducted in public databases and media', 'High', 3),
('Senior Management Approval', 'Written approval from senior management for client onboarding', 'High', 4),
('Ongoing Monitoring Checklist', 'Checklist and schedule for enhanced ongoing monitoring', 'High', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 15: SEED DATA - SOF/SOW VERIFICATION CHECKLISTS
-- ============================================================================

-- Source of Funds Checklist
INSERT INTO sof_sow_verification_checklist (verification_type, checklist_item, item_order, is_mandatory, guidance_text)
VALUES
  ('source_of_funds', 'Obtain declaration of source of funds from client', 1, true, 'Client must provide written or verbal declaration of where funds originate'),
  ('source_of_funds', 'Review consistency with client profile and business activity', 2, true, 'Ensure declared source aligns with occupation, business type, and expected income'),
  ('source_of_funds', 'Verify supporting evidence (if available)', 3, false, 'Review any documents provided: salary statements, business records, contracts, etc.'),
  ('source_of_funds', 'Conduct independent verification where possible', 4, false, 'Third-party checks, employer verification, bank references, etc.'),
  ('source_of_funds', 'Assess plausibility and reasonableness of declared source', 5, true, 'Use professional judgment to determine if source is credible given circumstances'),
  ('source_of_funds', 'Identify and document any concerns or red flags', 6, true, 'Note any inconsistencies, unusual patterns, or areas requiring additional scrutiny'),
  ('source_of_funds', 'Implement mitigation measures for identified risks', 7, false, 'Enhanced monitoring, additional documentation, transaction limits, etc.'),
  ('source_of_funds', 'Senior management review and approval', 8, true, 'High-risk verifications must be reviewed by senior staff')
ON CONFLICT DO NOTHING;

-- Source of Wealth Checklist
INSERT INTO sof_sow_verification_checklist (verification_type, checklist_item, item_order, is_mandatory, guidance_text)
VALUES
  ('source_of_wealth', 'Obtain declaration of source of wealth from client', 1, true, 'Client must explain how they accumulated their overall wealth'),
  ('source_of_wealth', 'Review client background and financial history', 2, true, 'Understand career progression, business ownership, inheritances, investments'),
  ('source_of_wealth', 'Verify supporting evidence (if available)', 3, false, 'Review documents: employment history, business ownership, property deeds, inheritance documents'),
  ('source_of_wealth', 'Conduct independent verification where possible', 4, false, 'Corporate registry searches, property records, credit reports, references'),
  ('source_of_wealth', 'Assess consistency and plausibility over time', 5, true, 'Determine if wealth accumulation is reasonable given age, career, and circumstances'),
  ('source_of_wealth', 'For PEPs: Enhanced scrutiny of asset accumulation', 6, false, 'Additional checks required for politically exposed persons'),
  ('source_of_wealth', 'Identify and document any concerns or red flags', 7, true, 'Note any unexplained wealth, inconsistencies, or suspicious indicators'),
  ('source_of_wealth', 'Implement mitigation measures for identified risks', 8, false, 'Enhanced due diligence, ongoing monitoring, senior approval for transactions'),
  ('source_of_wealth', 'Senior management review and approval', 9, true, 'All source of wealth verifications require senior review')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 16: SEED DATA - STR TRIGGER RULES
-- ============================================================================

-- Get first organization for system-wide rules
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM str_trigger_rules WHERE organization_id = v_org_id) THEN

    -- Geographic Risk Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'High-Risk Jurisdiction - Client', 'Rule-Based', 'Geographic Risk', 'Client located in or transacting with high-risk/sanctioned jurisdiction', '{"field": "country_of_residence", "operator": "in", "values": ["North Korea", "Iran", "Myanmar", "Syria"]}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Offshore Entity Without Clear Purpose', 'Rule-Based', 'Customer Risk', 'Client operates through offshore entities without clear business purpose', '{"field": "country_of_incorporation", "operator": "in", "values": ["BVI", "Cayman Islands", "Panama", "Seychelles"]}'::jsonb, 'Medium', true, true, true);

    -- Customer Risk Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Politically Exposed Person (PEP)', 'Rule-Based', 'Customer Risk', 'Client identified as PEP or close associate/family member', '{"field": "pep_status", "operator": "equals", "value": true}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Complex/Opaque Ownership Structure', 'Rule-Based', 'Customer Risk', 'Client has complex corporate structure with multiple layers or offshore entities', '{"field": "beneficial_owners", "operator": "array_length_gt", "value": 5}'::jsonb, 'Medium', true, true, true);

    -- Transaction Risk Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Large Cash Transaction', 'Rule-Based', 'Transaction Risk', 'Client attempting to pay with large amounts of cash (threshold: USD 10,000)', '{"field": "payment_method", "operator": "equals", "value": "cash", "threshold": 10000}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Third-Party Funding Without Explanation', 'Rule-Based', 'Transaction Risk', 'Fees paid by unknown third party without clear relationship', '{"field": "payment_source", "operator": "equals", "value": "third_party"}'::jsonb, 'Medium', true, true, true);

    -- Behavioral Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Refusal to Provide KYC Information', 'Behavioral', 'Customer Behavior', 'Client refuses or delays providing KYC documentation', '{"field": "kyc_compliance", "operator": "equals", "value": "incomplete"}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Unusual Urgency or Pressure', 'Behavioral', 'Customer Behavior', 'Client displays unusual urgency to complete transaction', '{"type": "manual_trigger", "requires_documentation": true}'::jsonb, 'Medium', true, false, true);

    -- Score-Based Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Risk Score Exceeds High Threshold', 'Score-Based', 'Risk Assessment', 'Client risk score exceeds 75/100 indicating high ML/TF risk', '{"field": "current_risk_rating", "operator": "in", "values": ["High", "Very High"]}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Significant Risk Score Increase', 'Score-Based', 'Risk Assessment', 'Client risk score increased by more than 25 points', '{"field": "risk_score_change", "operator": "gt", "value": 25}'::jsonb, 'Medium', true, true, true);

    -- Screening Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Sanctions Screening Match', 'Rule-Based', 'Sanctions', 'Client matches sanctions list or adverse media screening', '{"field": "sanctions_screening_result", "operator": "not_equals", "value": "clear"}'::jsonb, 'Critical', true, true, true);

    -- Document Integrity Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Inconsistent or Contradictory Documents', 'Document Integrity', 'Documentation', 'Provided documents contain inconsistencies or contradictions', '{"type": "manual_trigger", "requires_documentation": true}'::jsonb, 'High', true, false, true),
      (v_org_id, 'Suspected Forged or Altered Documents', 'Document Integrity', 'Documentation', 'Documents appear forged, altered, or of questionable authenticity', '{"type": "manual_trigger", "requires_documentation": true}'::jsonb, 'Critical', true, false, true),
      (v_org_id, 'Transaction Value Exceeds Declared Income', 'Document Integrity', 'Financial Profile', 'Transaction value significantly exceeds client declared income', '{"type": "manual_trigger", "requires_documentation": true}'::jsonb, 'High', true, false, true);

    -- Legal Profession Specific Triggers
    INSERT INTO str_trigger_rules (organization_id, rule_name, rule_type, rule_category, description, trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review)
    VALUES
      (v_org_id, 'Suspicious Real Estate Transaction', 'Rule-Based', 'Service-Specific', 'Real estate with unusual features: rapid buy-sell, below-market value, complex structures', '{"field": "service_type", "operator": "equals", "value": "real_estate"}'::jsonb, 'Medium', true, true, true),
      (v_org_id, 'Suspicious Trust or Company Formation', 'Rule-Based', 'Service-Specific', 'Formation of trusts/companies with no apparent legitimate purpose', '{"field": "service_type", "operator": "equals", "value": "trust_formation"}'::jsonb, 'High', true, true, true),
      (v_org_id, 'Misuse of Client Account', 'Rule-Based', 'Service-Specific', 'Client account used for rapid movement of funds unrelated to legal services', '{"field": "service_type", "operator": "equals", "value": "client_account"}'::jsonb, 'Critical', true, true, true);

  END IF;
END $$;

-- ============================================================================
-- PART 17: SEED DATA - STR TYPOLOGIES
-- ============================================================================

INSERT INTO str_typologies (typology_name, category, description, indicators, mitigation_measures)
VALUES
  ('Real Estate Money Laundering', 'Property Transactions',
   'Use of real estate transactions to launder proceeds of crime',
   '["Rapid purchase and resale", "Cash purchases", "Below market value", "Use of intermediaries", "Complex ownership structures", "Shell companies"]'::jsonb,
   '["Enhanced due diligence on source of funds", "Verification of property valuations", "Background checks", "Business rationale documentation", "Ownership chain monitoring"]'::jsonb),

  ('TCSP Misuse', 'Corporate Services',
   'Misuse of trust and company services to obscure beneficial ownership',
   '["Multiple corporate layers", "Offshore jurisdictions", "Nominee directors", "Bearer shares", "No legitimate purpose", "Rapid ownership changes"]'::jsonb,
   '["Enhanced BO verification", "Independent business verification", "Structure rationale understanding", "Regular ownership updates", "Source of wealth verification"]'::jsonb),

  ('Client Account Misuse', 'Client Funds',
   'Misuse of lawyer client accounts to move illicit funds',
   '["Large deposits unrelated to services", "Rapid in-and-out transactions", "Third-party payments", "Inconsistent with profile", "Transfers to unrelated parties"]'::jsonb,
   '["Strict client account policies", "Transaction monitoring", "Fund source verification", "Transfer documentation", "Senior approval for unusual transactions", "Regular reconciliation"]'::jsonb),

  ('Structuring Below Thresholds', 'Transaction Patterns',
   'Breaking transactions into smaller amounts to avoid reporting',
   '["Multiple transactions below limits", "Pattern of deposits/withdrawals", "Multiple accounts", "Unusual cash frequency", "No business rationale"]'::jsonb,
   '["Aggregate related transactions", "Pattern detection", "Enhanced cash scrutiny", "Business rationale documentation", "Staff training on structuring"]'::jsonb),

  ('Trade-Based Money Laundering', 'Trade Finance',
   'Use of trade transactions to disguise illicit fund transfers',
   '["Over/under-invoicing", "Phantom shipments", "Multiple invoicing", "False descriptions", "Complex payment structures", "Shell companies"]'::jsonb,
   '["Verify underlying transactions", "Independent valuation", "Enhanced DD on trading parties", "Shipping/customs review", "Trade flow understanding"]'::jsonb),

  ('PEP-Related Corruption', 'Political Exposure',
   'Movement of corruption proceeds through legal services by PEPs',
   '["PEP involvement", "Public procurement", "Assets inconsistent with income", "Family members/associates", "Offshore structures", "Lack of transparency"]'::jsonb,
   '["Enhanced PEP due diligence", "Source of wealth verification", "Adverse media screening", "Senior approval", "Continuous monitoring", "Income source understanding"]'::jsonb),

  ('Terrorist Financing', 'National Security',
   'Use of legal services to facilitate terrorist financing',
   '["Links to high-risk jurisdictions", "Unclear charitable purposes", "Unusual fund transfers", "No economic rationale", "Cash/informal transfers", "Extremist connections"]'::jsonb,
   '["Enhanced screening", "Sanctions checking", "Geographic risk assessment", "Transaction purpose verification", "News/intelligence monitoring", "Immediate escalation"]'::jsonb),

  ('Gateway Transactions', 'Cross-Border',
   'Use of legal profession to move funds between jurisdictions',
   '["Multiple cross-border transfers", "Multiple law firms", "No substantive service", "High-risk jurisdictions", "Complex routing", "Minimal legal documentation"]'::jsonb,
   '["Verify underlying legal service", "Understand all parties", "Enhanced cross-border DD", "Legal service documentation", "Question unusual routing"]'::jsonb),

  ('Loan-Back Schemes', 'Financial Structures',
   'Creating artificial loan structures to legitimize illicit funds',
   '["Back-to-back loans", "Offshore lenders", "No genuine lending relationship", "Unusual terms", "Inconsistent collateral", "No repayment schedule"]'::jsonb,
   '["Verify lending relationship", "Assess loan terms", "Lender funds verification", "Business purpose understanding", "All parties documentation", "Tax implications"]'::jsonb),

  ('Art and High-Value Goods', 'Valuables',
   'Use of art/antiques transactions to launder money',
   '["Subjective valuations", "Rapid buy-sell", "Intermediaries", "Anonymous parties", "Cash payments", "Offshore storage"]'::jsonb,
   '["Independent valuation", "Provenance verification", "Source of funds documentation", "Buyer/seller verification", "Market norms understanding", "Transaction rationale"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add helpful comments
COMMENT ON TABLE kyc_clients IS 'Core client KYC information with three-tier DD support';
COMMENT ON TABLE document_types IS 'Master list of all document types for customer due diligence';
COMMENT ON TABLE dd_level_document_requirements IS 'Maps document requirements to DD levels (simplified, standard, enhanced)';
COMMENT ON TABLE client_documents IS 'Stores uploaded documents with verification workflow';
COMMENT ON TABLE sof_sow_verification_records IS 'Tracks SOF/SOW verification instances with audit trail';
COMMENT ON TABLE kyc_monitoring_reviews IS 'Audit trail of continuous monitoring activities';
COMMENT ON TABLE edd_documents IS 'Tracks EDD document completion for high-risk clients';
COMMENT ON TABLE red_flags IS 'Tracks detected red flags and suspicious indicators';
COMMENT ON TABLE str_trigger_rules IS 'Defines automatic STR trigger rules';
COMMENT ON TABLE str_typologies IS 'ML/TF typologies for legal professionals';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'KYC/CDD System Migration Complete!';
  RAISE NOTICE 'Tables Created: 20+';
  RAISE NOTICE 'Triggers Created: 10+';
  RAISE NOTICE 'RLS Policies Enabled: ALL';
  RAISE NOTICE 'Document Types Seeded: 30+';
  RAISE NOTICE 'DD Requirements Mapped: Complete';
  RAISE NOTICE 'SOF/SOW Checklists: Complete';
  RAISE NOTICE 'STR Triggers: 15+';
  RAISE NOTICE 'Typologies: 10+';
END $$;
