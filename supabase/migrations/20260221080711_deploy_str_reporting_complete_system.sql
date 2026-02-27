/*
  # Suspicious Transaction Reporting (STR) System
  
  ## Overview
  Complete STR/SAR system for reporting to Tanzania FIU including:
  - STR creation and management
  - Multi-level approval workflow
  - FIU submission tracking
  - Detailed narratives
  
  ## Tables Created
  1. `suspicious_activity_reports` - Main STR records
  2. `str_submissions` - FIU submission tracking
  3. `str_narratives` - Detailed investigation narratives
  
  ## Security
  - RLS enabled
  - Highly confidential data
  - Restricted access
  - Tipping-off prevention
  
  ## Compliance
  - Tanzania AML Act - STR requirements
  - FIU Guidelines - Reporting obligations
  - FATF Recommendation 20 - Suspicious transaction reporting
  - 10-year retention requirement
*/

-- Suspicious Activity Reports
CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  str_number text UNIQUE NOT NULL,
  report_type text DEFAULT 'suspicious_transaction' CHECK (report_type IN ('suspicious_transaction', 'terrorist_financing', 'threshold_report')),
  client_id uuid REFERENCES kyc_clients(id),
  related_case_id uuid REFERENCES aml_cases(id),
  reporting_institution_name text NOT NULL,
  reporting_institution_code text,
  report_date timestamptz DEFAULT now(),
  incident_date_from date,
  incident_date_to date,
  total_amount numeric,
  currency text DEFAULT 'TZS',
  transaction_count integer DEFAULT 0,
  related_transactions uuid[],
  suspicion_indicators text[] NOT NULL,
  narrative text NOT NULL,
  additional_information jsonb,
  prepared_by_id uuid,
  prepared_date timestamptz DEFAULT now(),
  reviewed_by_id uuid,
  review_date timestamptz,
  approved_by_id uuid,
  approval_date timestamptz,
  str_status text DEFAULT 'draft' CHECK (str_status IN ('draft', 'pending_review', 'pending_approval', 'approved', 'submitted', 'acknowledged')),
  submission_date timestamptz,
  submission_method text CHECK (submission_method IN ('goaml', 'online_portal', 'email', 'physical')),
  fiu_reference_number text,
  fiu_acknowledgment_date timestamptz,
  is_confidential boolean DEFAULT true,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_org ON suspicious_activity_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_str_client ON suspicious_activity_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_str_status ON suspicious_activity_reports(str_status);
CREATE INDEX IF NOT EXISTS idx_str_number ON suspicious_activity_reports(str_number);
CREATE INDEX IF NOT EXISTS idx_str_case ON suspicious_activity_reports(related_case_id);
CREATE INDEX IF NOT EXISTS idx_str_report_date ON suspicious_activity_reports(report_date);

-- STR Submissions to FIU
CREATE TABLE IF NOT EXISTS str_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  str_id uuid REFERENCES suspicious_activity_reports(id) ON DELETE CASCADE,
  submission_date timestamptz DEFAULT now(),
  submission_channel text CHECK (submission_channel IN ('goaml', 'online_portal', 'email', 'physical')),
  submission_format text CHECK (submission_format IN ('xml', 'pdf', 'web_form', 'paper')),
  submission_file_path text,
  submission_status text DEFAULT 'pending' CHECK (submission_status IN ('pending', 'sent', 'acknowledged', 'rejected', 'queried')),
  fiu_response jsonb,
  fiu_response_date timestamptz,
  resubmitted boolean DEFAULT false,
  resubmission_reason text,
  submitted_by_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_submissions_str ON str_submissions(str_id);
CREATE INDEX IF NOT EXISTS idx_str_submissions_status ON str_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_str_submissions_date ON str_submissions(submission_date);

-- STR Detailed Narratives
CREATE TABLE IF NOT EXISTS str_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  str_id uuid REFERENCES suspicious_activity_reports(id) ON DELETE CASCADE,
  section_title text NOT NULL,
  section_order integer DEFAULT 1,
  narrative_text text NOT NULL,
  created_by_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_str_narratives_str ON str_narratives(str_id);
CREATE INDEX IF NOT EXISTS idx_str_narratives_order ON str_narratives(section_order);

-- Enable RLS
ALTER TABLE suspicious_activity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE str_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE str_narratives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for STR Reports (Highly Restricted)
CREATE POLICY "Users can view own organization STRs"
  ON suspicious_activity_reports FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create STRs"
  ON suspicious_activity_reports FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization STRs"
  ON suspicious_activity_reports FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies for STR Submissions
CREATE POLICY "Users can view STR submissions"
  ON str_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_submissions.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create STR submissions"
  ON str_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_submissions.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update STR submissions"
  ON str_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_submissions.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for STR Narratives
CREATE POLICY "Users can view STR narratives"
  ON str_narratives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_narratives.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create STR narratives"
  ON str_narratives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_narratives.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update STR narratives"
  ON str_narratives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suspicious_activity_reports
      WHERE suspicious_activity_reports.id = str_narratives.str_id
      AND suspicious_activity_reports.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );