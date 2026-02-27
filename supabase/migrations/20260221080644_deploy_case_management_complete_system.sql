/*
  # Case Management & Investigation System
  
  ## Overview
  Complete case management system for AML investigations including:
  - Case creation and tracking
  - Team assignments
  - Investigation notes
  - Evidence management
  - Workflow audit trail
  
  ## Tables Created
  1. `aml_cases` - Investigation cases
  2. `case_assignments` - Team member assignments
  3. `case_notes` - Investigation notes and findings
  4. `case_evidence` - Evidence attachments
  5. `case_workflow_history` - Audit trail
  
  ## Security
  - RLS enabled
  - Organization-scoped
  - Confidential investigation data protected
  
  ## Compliance
  - Tanzania AML Regulations - Investigation requirements
  - FATF Recommendation 20 - Suspicious transaction reporting
*/

-- AML Investigation Cases
CREATE TABLE IF NOT EXISTS aml_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  case_number text UNIQUE NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('alert_investigation', 'suspicious_activity', 'ongoing_monitoring', 'regulatory_request', 'internal_referral')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  case_status text DEFAULT 'open' CHECK (case_status IN ('open', 'under_investigation', 'pending_approval', 'closed', 'escalated_to_str')),
  client_id uuid REFERENCES kyc_clients(id),
  related_clients uuid[],
  opened_date timestamptz DEFAULT now(),
  opened_by_id uuid,
  assigned_to_id uuid,
  assigned_date timestamptz,
  due_date timestamptz,
  closure_date timestamptz,
  closed_by_id uuid,
  case_summary text,
  investigation_findings text,
  risk_rating text CHECK (risk_rating IN ('low', 'medium', 'high', 'critical')),
  outcome text CHECK (outcome IN ('no_action', 'enhanced_monitoring', 'account_restriction', 'account_closure', 'str_filed', 'law_enforcement_referral')),
  outcome_reason text,
  str_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aml_cases_org ON aml_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_aml_cases_status ON aml_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_aml_cases_client ON aml_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_aml_cases_assigned ON aml_cases(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_aml_cases_number ON aml_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_aml_cases_priority ON aml_cases(priority);

-- Case Assignments
CREATE TABLE IF NOT EXISTS case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES aml_cases(id) ON DELETE CASCADE,
  assigned_to_id uuid,
  assigned_by_id uuid,
  assignment_date timestamptz DEFAULT now(),
  assignment_role text CHECK (assignment_role IN ('primary_investigator', 'secondary_investigator', 'reviewer', 'approver')),
  assignment_status text DEFAULT 'active' CHECK (assignment_status IN ('active', 'completed', 'reassigned')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_user ON case_assignments(assigned_to_id);

-- Case Notes
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES aml_cases(id) ON DELETE CASCADE,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'interview', 'analysis', 'external_inquiry', 'system_generated')),
  note_text text NOT NULL,
  is_confidential boolean DEFAULT false,
  created_by_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created ON case_notes(created_at);

-- Case Evidence
CREATE TABLE IF NOT EXISTS case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES aml_cases(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('document', 'transaction_record', 'screenshot', 'communication', 'external_report', 'other')),
  file_name text,
  file_path text,
  file_size bigint,
  description text,
  uploaded_by_id uuid,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id);

-- Case Workflow History
CREATE TABLE IF NOT EXISTS case_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES aml_cases(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  performed_by_id uuid,
  action_date timestamptz DEFAULT now(),
  comments text
);

CREATE INDEX IF NOT EXISTS idx_case_workflow_case ON case_workflow_history(case_id);
CREATE INDEX IF NOT EXISTS idx_case_workflow_date ON case_workflow_history(action_date);

-- Enable RLS
ALTER TABLE aml_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_workflow_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AML Cases
CREATE POLICY "Users can view own organization cases"
  ON aml_cases FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create cases"
  ON aml_cases FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization cases"
  ON aml_cases FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies for Case Assignments
CREATE POLICY "Users can view case assignments"
  ON case_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_assignments.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage case assignments"
  ON case_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_assignments.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_assignments.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Case Notes
CREATE POLICY "Users can view case notes"
  ON case_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_notes.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create case notes"
  ON case_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_notes.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Case Evidence
CREATE POLICY "Users can view case evidence"
  ON case_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_evidence.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can upload case evidence"
  ON case_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_evidence.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Case Workflow History
CREATE POLICY "Users can view case workflow history"
  ON case_workflow_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_workflow_history.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "System can create workflow history"
  ON case_workflow_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aml_cases
      WHERE aml_cases.id = case_workflow_history.case_id
      AND aml_cases.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );