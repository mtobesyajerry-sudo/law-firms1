/*
  # Complete Automated KYC/AML Onboarding System

  ## Overview
  This migration completes the automated KYC and AML onboarding system with:
  1. Onboarding application workflow management
  2. Screening results tracking (sanctions, PEP, adverse media)
  3. Beneficial ownership verification
  4. Transaction monitoring rules and alerts
  5. Compliance case management
  6. Document verification with OCR support
  7. Regulatory reporting to Tanzania FIU

  ## New Tables

  ### 1. `onboarding_applications` - Application workflow tracking
  ### 2. `screening_results` - Sanctions, PEP, adverse media screening
  ### 3. `beneficial_owners` - UBO identification and verification
  ### 4. `transaction_monitoring_rules` - Monitoring rule configuration
  ### 5. `transaction_alerts` - Real-time transaction alerts
  ### 6. `compliance_cases` - Case management for investigations
  ### 7. `document_verification_results` - OCR and document verification
  ### 8. `regulatory_reports` - FIU reporting and submissions

  ## Security
  - RLS enabled on all tables
  - Organization-level data isolation
  - Role-based access control
*/

-- ============================================
-- 1. ONBOARDING APPLICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS onboarding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  application_number text UNIQUE NOT NULL,
  application_type text NOT NULL CHECK (application_type IN ('individual', 'corporate', 'trust', 'partnership')),
  application_source text CHECK (application_source IN ('online', 'branch', 'mobile_app', 'referral', 'other')),
  
  applicant_name text NOT NULL,
  applicant_email text,
  applicant_phone text,
  applicant_id_type text,
  applicant_id_number text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  
  registration_number text,
  incorporation_date date,
  country_of_incorporation text,
  business_activity text,
  annual_turnover_estimate numeric,
  
  purpose_of_relationship text,
  expected_transaction_volume text,
  source_of_funds text,
  source_of_wealth text,
  
  current_stage text NOT NULL DEFAULT 'initiated' CHECK (current_stage IN (
    'initiated', 'document_upload', 'screening_in_progress', 'screening_completed',
    'risk_assessment', 'bo_verification', 'manual_review', 'edd_required',
    'senior_approval', 'approved', 'rejected', 'withdrawn'
  )),
  
  customer_risk_score integer DEFAULT 0 CHECK (customer_risk_score >= 0 AND customer_risk_score <= 100),
  geographic_risk_score integer DEFAULT 0 CHECK (geographic_risk_score >= 0 AND geographic_risk_score <= 100),
  product_risk_score integer DEFAULT 0 CHECK (product_risk_score >= 0 AND product_risk_score <= 100),
  overall_risk_score integer DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_rating text CHECK (risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  
  dd_level text CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  edd_triggers jsonb DEFAULT '[]'::jsonb,
  edd_required boolean DEFAULT false,
  
  sanctions_screening_status text DEFAULT 'pending' CHECK (sanctions_screening_status IN ('pending', 'in_progress', 'cleared', 'matched', 'failed')),
  pep_screening_status text DEFAULT 'pending' CHECK (pep_screening_status IN ('pending', 'in_progress', 'cleared', 'matched', 'failed')),
  adverse_media_status text DEFAULT 'pending' CHECK (adverse_media_status IN ('pending', 'in_progress', 'cleared', 'matched', 'failed')),
  screening_completed_at timestamp with time zone,
  
  bo_identification_complete boolean DEFAULT false,
  bo_verification_complete boolean DEFAULT false,
  bo_structure jsonb DEFAULT '[]'::jsonb,
  
  documents_uploaded boolean DEFAULT false,
  documents_verified boolean DEFAULT false,
  document_verification_notes text,
  
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'escalated')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date timestamp with time zone,
  approval_notes text,
  rejection_reason text,
  
  senior_approval_required boolean DEFAULT false,
  senior_approval_status text DEFAULT 'not_required' CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  senior_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  senior_approval_date timestamp with time zone,
  senior_approval_notes text,
  
  client_id uuid REFERENCES kyc_clients(id) ON DELETE SET NULL,
  
  submitted_at timestamp with time zone,
  target_completion_date timestamp with time zone,
  completed_at timestamp with time zone,
  sla_breached boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_applications_org ON onboarding_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_applications_stage ON onboarding_applications(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_applications_status ON onboarding_applications(approval_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_applications_risk ON onboarding_applications(risk_rating);

-- ============================================
-- 2. SCREENING RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS screening_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  onboarding_application_id uuid REFERENCES onboarding_applications(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  
  screening_type text NOT NULL CHECK (screening_type IN ('sanctions', 'pep', 'adverse_media', 'watchlist')),
  screening_provider text CHECK (screening_provider IN ('dow_jones', 'refinitiv', 'complyadvantage', 'lexisnexis', 'internal', 'manual')),
  
  screened_name text NOT NULL,
  screening_date timestamp with time zone DEFAULT now(),
  screening_status text NOT NULL CHECK (screening_status IN ('pending', 'in_progress', 'completed', 'failed', 'error')),
  
  match_found boolean DEFAULT false,
  match_count integer DEFAULT 0,
  matches jsonb DEFAULT '[]'::jsonb,
  highest_confidence_score numeric,
  
  risk_level text CHECK (risk_level IN ('None', 'Low', 'Medium', 'High', 'Critical')),
  requires_manual_review boolean DEFAULT false,
  
  false_positive boolean DEFAULT false,
  false_positive_reason text,
  false_positive_determined_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  false_positive_date timestamp with time zone,
  
  cleared boolean DEFAULT false,
  cleared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cleared_date timestamp with time zone,
  clearance_notes text,
  
  is_periodic_rescreen boolean DEFAULT false,
  previous_screening_id uuid REFERENCES screening_results(id) ON DELETE SET NULL,
  next_rescreen_date date,
  
  raw_response jsonb,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_screening_results_org ON screening_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_application ON screening_results(onboarding_application_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_client ON screening_results(client_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_type ON screening_results(screening_type);
CREATE INDEX IF NOT EXISTS idx_screening_results_match ON screening_results(match_found);
CREATE INDEX IF NOT EXISTS idx_screening_results_review ON screening_results(requires_manual_review);

-- ============================================
-- 3. BENEFICIAL OWNERS
-- ============================================

CREATE TABLE IF NOT EXISTS beneficial_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  onboarding_application_id uuid REFERENCES onboarding_applications(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  
  owner_name text NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('individual', 'corporate')),
  id_type text CHECK (id_type IN ('national_id', 'passport', 'driving_license', 'tin', 'other')),
  id_number text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  
  ownership_percentage numeric CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  control_type text[] DEFAULT ARRAY[]::text[],
  is_ubo boolean DEFAULT false,
  
  corporate_registration_number text,
  corporate_country text,
  
  ownership_structure_level integer DEFAULT 1,
  parent_owner_id uuid REFERENCES beneficial_owners(id) ON DELETE SET NULL,
  
  is_pep boolean DEFAULT false,
  pep_category text CHECK (pep_category IN ('domestic', 'foreign', 'international_organization', 'family_member', 'close_associate', 'not_applicable')),
  pep_position text,
  
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_progress', 'verified', 'failed', 'not_required')),
  verification_method text CHECK (verification_method IN ('documentary', 'electronic', 'biometric', 'third_party', 'other')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_date timestamp with time zone,
  verification_notes text,
  
  sanctions_cleared boolean DEFAULT false,
  pep_screening_completed boolean DEFAULT false,
  adverse_media_cleared boolean DEFAULT false,
  
  required_documents jsonb DEFAULT '[]'::jsonb,
  documents_uploaded boolean DEFAULT false,
  documents_verified boolean DEFAULT false,
  
  individual_risk_score integer CHECK (individual_risk_score >= 0 AND individual_risk_score <= 100),
  risk_rating text CHECK (risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed', 'replaced')),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_beneficial_owners_org ON beneficial_owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_application ON beneficial_owners(onboarding_application_id);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_client ON beneficial_owners(client_id);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_ubo ON beneficial_owners(is_ubo);
CREATE INDEX IF NOT EXISTS idx_beneficial_owners_pep ON beneficial_owners(is_pep);

-- ============================================
-- 4. TRANSACTION MONITORING RULES
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_monitoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  rule_code text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  rule_description text,
  rule_category text NOT NULL CHECK (rule_category IN ('amount_threshold', 'velocity', 'pattern', 'geographic', 'behavioral', 'typology')),
  
  is_active boolean DEFAULT true,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  threshold_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  large_transaction_threshold numeric DEFAULT 10000000,
  cash_transaction_threshold numeric DEFAULT 5000000,
  suspicious_pattern_indicators text[],
  
  base_alert_score integer DEFAULT 50 CHECK (base_alert_score >= 0 AND base_alert_score <= 100),
  
  applies_to_client_types text[] DEFAULT ARRAY['individual', 'corporate']::text[],
  applies_to_transaction_types text[],
  applies_to_risk_levels text[] DEFAULT ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  
  auto_escalate boolean DEFAULT false,
  auto_block boolean DEFAULT false,
  requires_immediate_review boolean DEFAULT false,
  
  regulatory_reference text,
  fiu_reporting_required boolean DEFAULT false,
  
  alerts_generated integer DEFAULT 0,
  true_positives integer DEFAULT 0,
  false_positives integer DEFAULT 0,
  effectiveness_rate numeric,
  
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tm_rules_org ON transaction_monitoring_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_tm_rules_active ON transaction_monitoring_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_tm_rules_category ON transaction_monitoring_rules(rule_category);

-- ============================================
-- 5. TRANSACTION ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  alert_number text UNIQUE NOT NULL,
  alert_date timestamp with time zone DEFAULT now(),
  
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  triggered_by_rule_id uuid REFERENCES transaction_monitoring_rules(id) ON DELETE SET NULL,
  
  alert_type text NOT NULL CHECK (alert_type IN ('amount_threshold', 'velocity', 'pattern', 'geographic', 'behavioral', 'typology', 'manual')),
  alert_severity text NOT NULL CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),
  alert_priority integer DEFAULT 5 CHECK (alert_priority >= 1 AND alert_priority <= 10),
  
  transaction_reference text,
  transaction_date timestamp with time zone,
  transaction_amount numeric,
  transaction_currency text DEFAULT 'TZS',
  transaction_type text,
  transaction_description text,
  related_transactions jsonb DEFAULT '[]'::jsonb,
  
  alert_description text NOT NULL,
  suspicious_indicators text[],
  risk_factors jsonb DEFAULT '{}'::jsonb,
  
  alert_score integer CHECK (alert_score >= 0 AND alert_score <= 100),
  client_risk_rating text,
  
  investigation_status text DEFAULT 'new' CHECK (investigation_status IN (
    'new', 'assigned', 'under_investigation', 'escalated',
    'resolved_no_action', 'resolved_str_filed', 'resolved_client_exited', 'false_positive'
  )),
  
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date timestamp with time zone,
  investigation_started_date timestamp with time zone,
  investigation_completed_date timestamp with time zone,
  
  investigation_notes text,
  additional_evidence jsonb DEFAULT '[]'::jsonb,
  investigator_conclusion text,
  
  resolution_type text CHECK (resolution_type IN ('no_action', 'str_filed', 'client_exited', 'false_positive', 'escalated', 'pending')),
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_date timestamp with time zone,
  
  str_filed boolean DEFAULT false,
  compliance_case_id uuid,
  
  is_false_positive boolean DEFAULT false,
  false_positive_reason text,
  
  target_resolution_date timestamp with time zone,
  sla_breached boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_alerts_org ON transaction_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_client ON transaction_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_status ON transaction_alerts(investigation_status);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_severity ON transaction_alerts(alert_severity);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_assigned ON transaction_alerts(assigned_to);

-- ============================================
-- 6. COMPLIANCE CASES
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  case_number text UNIQUE NOT NULL,
  case_title text NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('suspicious_activity', 'kyc_review', 'enhanced_monitoring', 'regulatory_inquiry', 'internal_audit', 'other')),
  
  client_id uuid REFERENCES kyc_clients(id) ON DELETE SET NULL,
  related_alert_ids uuid[],
  
  case_description text,
  case_priority text DEFAULT 'medium' CHECK (case_priority IN ('low', 'medium', 'high', 'critical')),
  case_severity text DEFAULT 'medium' CHECK (case_severity IN ('low', 'medium', 'high', 'critical')),
  
  case_status text DEFAULT 'open' CHECK (case_status IN (
    'open', 'under_investigation', 'pending_review', 'escalated',
    'str_preparation', 'str_submitted', 'closed_no_action', 'closed_action_taken', 'archived'
  )),
  
  case_owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date timestamp with time zone,
  investigation_team uuid[],
  
  opened_date timestamp with time zone DEFAULT now(),
  investigation_start_date timestamp with time zone,
  target_completion_date timestamp with time zone,
  closed_date timestamp with time zone,
  
  investigation_summary text,
  evidence_collected jsonb DEFAULT '[]'::jsonb,
  witness_statements jsonb DEFAULT '[]'::jsonb,
  external_inquiries jsonb DEFAULT '[]'::jsonb,
  
  initial_risk_assessment text,
  final_risk_assessment text,
  risk_score integer CHECK (risk_score >= 0 AND risk_score <= 100),
  
  findings_summary text,
  suspicious_indicators text[],
  regulations_breached text[],
  typologies_identified text[],
  
  actions_taken text[],
  preventive_measures text,
  client_relationship_status text CHECK (client_relationship_status IN ('maintained', 'enhanced_monitoring', 'restricted', 'exited', 'unchanged')),
  
  str_required boolean DEFAULT false,
  str_filed boolean DEFAULT false,
  str_filing_date timestamp with time zone,
  
  reported_to_fiu boolean DEFAULT false,
  fiu_report_date timestamp with time zone,
  fiu_reference_number text,
  fiu_feedback text,
  
  reported_to_board boolean DEFAULT false,
  board_report_date timestamp with time zone,
  mlro_notified boolean DEFAULT false,
  mlro_notification_date timestamp with time zone,
  
  resolution_summary text,
  lessons_learned text,
  policy_updates_required text,
  
  confidentiality_level text DEFAULT 'high' CHECK (confidentiality_level IN ('low', 'medium', 'high', 'critical')),
  access_restricted boolean DEFAULT true,
  authorized_viewers uuid[],
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_cases_org ON compliance_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_client ON compliance_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_status ON compliance_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_owner ON compliance_cases(case_owner);

-- ============================================
-- 7. DOCUMENT VERIFICATION RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_verification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  onboarding_application_id uuid REFERENCES onboarding_applications(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  document_id uuid,
  
  document_type text NOT NULL CHECK (document_type IN (
    'national_id', 'passport', 'driving_license', 'voter_id',
    'tin_certificate', 'business_license', 'incorporation_certificate',
    'memorandum', 'articles', 'resolution', 'ownership_structure',
    'proof_of_address', 'bank_statement', 'utility_bill',
    'source_of_funds', 'source_of_wealth', 'other'
  )),
  document_number text,
  issuing_country text,
  issue_date date,
  expiry_date date,
  
  verification_method text NOT NULL CHECK (verification_method IN (
    'manual', 'ocr', 'api_verification', 'biometric', 'third_party', 'hybrid'
  )),
  verification_provider text,
  
  ocr_performed boolean DEFAULT false,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  extraction_confidence numeric,
  
  authenticity_check_performed boolean DEFAULT false,
  authenticity_result text CHECK (authenticity_result IN ('pass', 'fail', 'inconclusive', 'not_performed')),
  authenticity_score numeric,
  security_features_detected text[],
  
  data_validation_performed boolean DEFAULT false,
  validation_results jsonb DEFAULT '{}'::jsonb,
  cross_reference_matches jsonb DEFAULT '{}'::jsonb,
  
  facial_recognition_performed boolean DEFAULT false,
  facial_match_score numeric,
  liveness_check_passed boolean,
  
  is_expired boolean DEFAULT false,
  days_until_expiry integer,
  
  image_quality text CHECK (image_quality IN ('excellent', 'good', 'acceptable', 'poor', 'rejected')),
  image_quality_score numeric,
  quality_issues text[],
  
  verification_status text DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'in_progress', 'verified', 'failed', 'manual_review_required', 'rejected'
  )),
  verification_date timestamp with time zone,
  
  requires_manual_review boolean DEFAULT false,
  manual_review_reason text,
  manual_review_status text CHECK (manual_review_status IN ('pending', 'in_progress', 'approved', 'rejected', 'not_required')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_date timestamp with time zone,
  review_notes text,
  
  alerts_raised text[],
  fraud_indicators text[],
  risk_flags text[],
  
  raw_verification_response jsonb,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_verification_org ON document_verification_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_verification_application ON document_verification_results(onboarding_application_id);
CREATE INDEX IF NOT EXISTS idx_doc_verification_client ON document_verification_results(client_id);
CREATE INDEX IF NOT EXISTS idx_doc_verification_status ON document_verification_results(verification_status);

-- ============================================
-- 8. REGULATORY REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS regulatory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  report_type text NOT NULL CHECK (report_type IN (
    'str', 'ltr', 'ctr', 'quarterly_compliance',
    'annual_compliance', 'kyc_statistics', 'edd_summary', 'custom'
  )),
  report_number text UNIQUE NOT NULL,
  report_title text NOT NULL,
  
  reporting_period_start date,
  reporting_period_end date,
  report_date date DEFAULT CURRENT_DATE,
  
  fiu_submission_required boolean DEFAULT false,
  fiu_report_format text CHECK (fiu_report_format IN ('goaml', 'excel', 'pdf', 'xml', 'other')),
  
  report_summary text,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  statistics jsonb DEFAULT '{}'::jsonb,
  
  related_client_ids uuid[],
  related_case_ids uuid[],
  related_alert_ids uuid[],
  
  large_transactions_count integer DEFAULT 0,
  large_transactions_total_amount numeric DEFAULT 0,
  cash_transactions_count integer DEFAULT 0,
  cash_transactions_total_amount numeric DEFAULT 0,
  suspicious_transactions_count integer DEFAULT 0,
  strs_filed_count integer DEFAULT 0,
  new_clients_count integer DEFAULT 0,
  high_risk_clients_count integer DEFAULT 0,
  edd_cases_count integer DEFAULT 0,
  pep_clients_count integer DEFAULT 0,
  
  submission_status text DEFAULT 'draft' CHECK (submission_status IN (
    'draft', 'pending_review', 'approved', 'submitted', 'acknowledged', 'rejected'
  )),
  
  prepared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preparation_date timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_date timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date timestamp with time zone,
  approval_notes text,
  
  submitted_to_fiu boolean DEFAULT false,
  fiu_submission_date timestamp with time zone,
  fiu_submission_method text CHECK (fiu_submission_method IN ('online_portal', 'email', 'physical', 'api', 'other')),
  fiu_reference_number text,
  fiu_acknowledgement_received boolean DEFAULT false,
  fiu_acknowledgement_date timestamp with time zone,
  fiu_feedback text,
  
  report_file_path text,
  report_file_format text,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  
  confidentiality_level text DEFAULT 'high' CHECK (confidentiality_level IN ('medium', 'high', 'critical')),
  access_restricted boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_regulatory_reports_org ON regulatory_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_type ON regulatory_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_status ON regulatory_reports(submission_status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE onboarding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficial_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_reports ENABLE ROW LEVEL SECURITY;

-- Helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- RLS Policies for all tables
CREATE POLICY "Users view own org onboarding apps" ON onboarding_applications FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org onboarding apps" ON onboarding_applications FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org screening" ON screening_results FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org screening" ON screening_results FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org beneficial owners" ON beneficial_owners FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org beneficial owners" ON beneficial_owners FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org TM rules" ON transaction_monitoring_rules FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage TM rules" ON transaction_monitoring_rules FOR ALL TO authenticated
  USING (is_admin());

CREATE POLICY "Users view own org alerts" ON transaction_alerts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org alerts" ON transaction_alerts FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org cases" ON compliance_cases FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org cases" ON compliance_cases FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org doc verification" ON document_verification_results FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org doc verification" ON document_verification_results FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own org reports" ON regulatory_reports FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org reports" ON regulatory_reports FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================
-- AUTOMATED TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_num text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::text, 6, '0') INTO sequence_num
  FROM onboarding_applications
  WHERE organization_id = NEW.organization_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.application_number := 'APP-' || year_part || '-' || sequence_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_application_number
  BEFORE INSERT ON onboarding_applications
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL)
  EXECUTE FUNCTION generate_application_number();

CREATE OR REPLACE FUNCTION generate_alert_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_num text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::text, 6, '0') INTO sequence_num
  FROM transaction_alerts
  WHERE organization_id = NEW.organization_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.alert_number := 'ALERT-' || year_part || '-' || sequence_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_alert_number
  BEFORE INSERT ON transaction_alerts
  FOR EACH ROW
  WHEN (NEW.alert_number IS NULL)
  EXECUTE FUNCTION generate_alert_number();

CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_num text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::text, 6, '0') INTO sequence_num
  FROM compliance_cases
  WHERE organization_id = NEW.organization_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.case_number := 'CASE-' || year_part || '-' || sequence_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_case_number
  BEFORE INSERT ON compliance_cases
  FOR EACH ROW
  WHEN (NEW.case_number IS NULL)
  EXECUTE FUNCTION generate_case_number();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_applications_updated_at BEFORE UPDATE ON onboarding_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screening_results_updated_at BEFORE UPDATE ON screening_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficial_owners_updated_at BEFORE UPDATE ON beneficial_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_monitoring_rules_updated_at BEFORE UPDATE ON transaction_monitoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_alerts_updated_at BEFORE UPDATE ON transaction_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_cases_updated_at BEFORE UPDATE ON compliance_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_verification_results_updated_at BEFORE UPDATE ON document_verification_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_reports_updated_at BEFORE UPDATE ON regulatory_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();