-- suspicious_activity_reports: GN No. 397 (AML Regulations 2022) Reg 14 STR table
-- Includes all base fields and all 28 Tier 1 fields required for a legally complete filing.

CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  -- Identifiers
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 uuid NOT NULL,
  str_number                      text UNIQUE NOT NULL,

  -- Report classification
  report_type                     text DEFAULT 'suspicious_transaction'
                                    CHECK (report_type IN ('suspicious_transaction', 'terrorist_financing', 'threshold_report')),

  -- Linked records
  client_id                       uuid REFERENCES kyc_clients(id),
  alert_id                        uuid REFERENCES transaction_alerts(id),

  -- -----------------------------------------------------------------------
  -- Reg 14 Part A — Reporting entity / officer details
  -- -----------------------------------------------------------------------
  reporting_institution_name      text NOT NULL,
  reporting_institution_code      text,
  reporting_person_address        text,          -- Part A: reporting person address
  reporting_person_business_type  text,          -- Part A: nature/type of business
  reporting_person_branch         text,          -- Part A: branch name
  reporting_officer_name          text,          -- Part A: officer completing report — full name
  reporting_officer_title         text,          -- Part A: officer title/position
  reporting_officer_id_number     text,          -- Part A: officer identification number
  reporting_officer_id_type       text,          -- Part A: officer ID type (national_id, passport, …)
  action_taken                    text,          -- Part A: action taken by the institution
  report_indicator_codes          text[],        -- Part A: indicator codes for type of suspicious activity

  -- -----------------------------------------------------------------------
  -- Reg 14 Part B — Transaction details
  -- -----------------------------------------------------------------------
  report_date                     timestamptz DEFAULT now(),
  incident_date_from              date,
  incident_date_to                date,
  total_amount                    numeric,
  currency                        text DEFAULT 'TZS',
  transaction_count               integer DEFAULT 0,
  related_transactions            uuid[],
  transaction_value_date          date,          -- Part B: value date of transaction
  transaction_mode                text,          -- Part B: mode (cash, wire, mobile money, …)
  teller_initiator_name           text,          -- Part B: teller/initiator name
  transaction_authorizer_name     text,          -- Part B: authorizer/approver name
  transaction_location            text,          -- Part B: branch / ATM / online / agent
  source_fund_type                text,          -- Part B: source of funds type
  destination_fund_type           text,          -- Part B: destination of funds type
  source_subject_type             text,          -- Part B: source subject (person / entity)
  destination_subject_type        text,          -- Part B: destination subject (person / entity)

  -- -----------------------------------------------------------------------
  -- Reg 14 Part C — Individual subject — snapshot at filing time
  -- -----------------------------------------------------------------------
  subject_title                   text,          -- Part C: Mr / Mrs / Dr / …
  subject_gender                  text,          -- Part C: gender
  subject_first_name              text,          -- Part C: first name
  subject_middle_name             text,          -- Part C: middle name
  subject_last_name               text,          -- Part C: last name / surname
  subject_place_of_birth          text,          -- Part C: place of birth
  subject_occupation              text,          -- Part C: occupation
  conductor_full_details          jsonb,         -- Part C: conductor details (if ≠ account holder)

  -- -----------------------------------------------------------------------
  -- Reg 14 Part D — Entity subject — snapshot at filing time
  -- -----------------------------------------------------------------------
  entity_legal_form               text,          -- Part D: LLC / trust / NGO / …
  entity_directors_summary        text,          -- Part D: directors / beneficial owners summary

  -- -----------------------------------------------------------------------
  -- Narrative and indicators
  -- -----------------------------------------------------------------------
  suspicion_indicators            text[] NOT NULL DEFAULT '{}',
  narrative                       text NOT NULL DEFAULT '',
  additional_information          jsonb,

  -- -----------------------------------------------------------------------
  -- Workflow
  -- -----------------------------------------------------------------------
  str_status                      text DEFAULT 'draft'
                                    CHECK (str_status IN ('draft', 'pending_review', 'pending_approval', 'approved', 'submitted', 'acknowledged')),
  prepared_by_id                  uuid,
  prepared_date                   timestamptz DEFAULT now(),
  reviewed_by_id                  uuid,
  review_date                     timestamptz,
  approved_by_id                  uuid,
  approval_date                   timestamptz,
  submission_date                 timestamptz,
  submission_method               text CHECK (submission_method IN ('goaml', 'online_portal', 'email', 'physical')),
  fiu_reference_number            text,
  fiu_acknowledgment_date         timestamptz,
  is_confidential                 boolean DEFAULT true,
  internal_notes                  text,

  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sar_org          ON suspicious_activity_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_sar_client       ON suspicious_activity_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_sar_alert        ON suspicious_activity_reports(alert_id);
CREATE INDEX IF NOT EXISTS idx_sar_status       ON suspicious_activity_reports(str_status);
CREATE INDEX IF NOT EXISTS idx_sar_str_number   ON suspicious_activity_reports(str_number);
CREATE INDEX IF NOT EXISTS idx_sar_report_date  ON suspicious_activity_reports(report_date);

-- RLS
ALTER TABLE suspicious_activity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sar_select_own_org" ON suspicious_activity_reports FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "sar_insert_own_org" ON suspicious_activity_reports FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "sar_update_own_org" ON suspicious_activity_reports FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "sar_delete_own_org" ON suspicious_activity_reports FOR DELETE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
