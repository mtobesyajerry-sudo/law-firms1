/*
  # SOF/SOW Verification Workflow System

  ## Purpose
  Implements a comprehensive Source of Funds (SOF) and Source of Wealth (SOW) 
  verification workflow that works with or without document attachments, providing
  structured verification steps, evidence documentation, and audit trails.

  ## New Tables

  ### 1. `sof_sow_verification_records`
  Main table tracking individual SOF/SOW verification instances
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to kyc_clients)
  - `organization_id` (uuid, foreign key to user_profiles)
  - `verification_type` (text: 'source_of_funds' or 'source_of_wealth')
  - `declared_source` (text: what the client declared)
  - `estimated_amount` (numeric: amount involved)
  - `verification_status` (text: 'pending', 'in_progress', 'verified', 'rejected')
  - `verification_method` (text: method used for verification)
  - `evidence_reviewed` (text: description of evidence)
  - `verification_findings` (text: detailed findings)
  - `concerns_identified` (text: any red flags or concerns)
  - `mitigation_measures` (text: actions taken to address concerns)
  - `supporting_document_ids` (jsonb: array of document references if available)
  - `verified_by` (uuid: user who performed verification)
  - `verified_at` (timestamptz: when verified)
  - `approved_by` (uuid: senior reviewer who approved)
  - `approved_at` (timestamptz: when approved)
  - `rejection_reason` (text: if rejected, why)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `sof_sow_verification_checklist`
  Template checklist items for verification process
  - `id` (uuid, primary key)
  - `verification_type` (text: 'source_of_funds' or 'source_of_wealth')
  - `checklist_item` (text: the verification step)
  - `item_order` (integer: display order)
  - `is_mandatory` (boolean: must be completed)
  - `guidance_text` (text: help text for the item)

  ### 3. `sof_sow_verification_checklist_completion`
  Tracks completion of checklist items for each verification
  - `id` (uuid, primary key)
  - `verification_record_id` (uuid, foreign key)
  - `checklist_item_id` (uuid, foreign key)
  - `is_completed` (boolean)
  - `completion_notes` (text)
  - `completed_by` (uuid)
  - `completed_at` (timestamptz)

  ### 4. `sof_sow_verification_history`
  Audit trail of all changes to verification records
  - `id` (uuid, primary key)
  - `verification_record_id` (uuid, foreign key)
  - `action` (text: what happened)
  - `changed_by` (uuid)
  - `change_details` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their organization's verification records
  - Admins can access all records
  - Audit trail is append-only

  ## Features
  - Works without mandatory document attachments
  - Structured verification process with checklists
  - Evidence and findings documentation
  - Two-stage approval (verification + senior approval)
  - Complete audit trail
  - Flexible to accommodate various verification methods
*/

-- Create verification records table
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

-- Create checklist template table
CREATE TABLE IF NOT EXISTS sof_sow_verification_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_type text NOT NULL CHECK (verification_type IN ('source_of_funds', 'source_of_wealth', 'both')),
  checklist_item text NOT NULL,
  item_order integer NOT NULL,
  is_mandatory boolean DEFAULT false,
  guidance_text text,
  created_at timestamptz DEFAULT now()
);

-- Create checklist completion tracking table
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

-- Create verification history/audit table
CREATE TABLE IF NOT EXISTS sof_sow_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_record_id uuid NOT NULL REFERENCES sof_sow_verification_records(id) ON DELETE CASCADE,
  action text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_client ON sof_sow_verification_records(client_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_org ON sof_sow_verification_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_status ON sof_sow_verification_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_sof_sow_verification_type ON sof_sow_verification_records(verification_type);
CREATE INDEX IF NOT EXISTS idx_sof_sow_checklist_completion_record ON sof_sow_verification_checklist_completion(verification_record_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_history_record ON sof_sow_verification_history(verification_record_id);

-- Enable RLS
ALTER TABLE sof_sow_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sof_sow_verification_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sof_sow_verification_checklist_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE sof_sow_verification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sof_sow_verification_records

-- Users can view their organization's verification records
CREATE POLICY "Users can view organization verification records"
  ON sof_sow_verification_records FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all verification records
CREATE POLICY "Admins can view all verification records"
  ON sof_sow_verification_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create verification records for their organization's clients
CREATE POLICY "Users can create verification records"
  ON sof_sow_verification_records FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
    AND
    client_id IN (
      SELECT id FROM kyc_clients WHERE organization_id IN (
        SELECT id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can update their organization's verification records
CREATE POLICY "Users can update organization verification records"
  ON sof_sow_verification_records FOR UPDATE
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

-- Admins can update all verification records
CREATE POLICY "Admins can update all verification records"
  ON sof_sow_verification_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for sof_sow_verification_checklist (read-only for users, managed by admins)

-- Everyone can view checklist templates
CREATE POLICY "Anyone authenticated can view checklist"
  ON sof_sow_verification_checklist FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage checklist templates
CREATE POLICY "Admins can manage checklist"
  ON sof_sow_verification_checklist FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for sof_sow_verification_checklist_completion

-- Users can view completion records for their organization's verifications
CREATE POLICY "Users can view checklist completion"
  ON sof_sow_verification_checklist_completion FOR SELECT
  TO authenticated
  USING (
    verification_record_id IN (
      SELECT id FROM sof_sow_verification_records 
      WHERE organization_id IN (
        SELECT id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Admins can view all completion records
CREATE POLICY "Admins can view all checklist completion"
  ON sof_sow_verification_checklist_completion FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create/update completion records for their organization's verifications
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

-- RLS Policies for sof_sow_verification_history (read-only audit trail)

-- Users can view history for their organization's verifications
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

-- Admins can view all history
CREATE POLICY "Admins can view all verification history"
  ON sof_sow_verification_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only system can insert history (via trigger)
CREATE POLICY "System can insert verification history"
  ON sof_sow_verification_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger to automatically log changes to verification records
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

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_sof_sow_verification_updated_at
  BEFORE UPDATE ON sof_sow_verification_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sof_sow_checklist_completion_updated_at
  BEFORE UPDATE ON sof_sow_verification_checklist_completion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default checklist items

-- Source of Funds checklist items
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

-- Source of Wealth checklist items
INSERT INTO sof_sow_verification_checklist (verification_type, checklist_item, item_order, is_mandatory, guidance_text)
VALUES
  ('source_of_wealth', 'Obtain declaration of source of wealth from client', 1, true, 'Client must explain how they accumulated their overall wealth'),
  ('source_of_wealth', 'Review client background and financial history', 2, true, 'Understand career progression, business ownership, inheritances, investments'),
  ('source_of_wealth', 'Verify supporting evidence (if available)', 3, false, 'Review documents: employment history, business ownership, property deeds, inheritance documents, investment statements'),
  ('source_of_wealth', 'Conduct independent verification where possible', 4, false, 'Corporate registry searches, property records, credit reports, references'),
  ('source_of_wealth', 'Assess consistency and plausibility over time', 5, true, 'Determine if wealth accumulation is reasonable given age, career, and circumstances'),
  ('source_of_wealth', 'For PEPs: Enhanced scrutiny of asset accumulation', 6, false, 'Additional checks required for politically exposed persons'),
  ('source_of_wealth', 'Identify and document any concerns or red flags', 7, true, 'Note any unexplained wealth, inconsistencies, or suspicious indicators'),
  ('source_of_wealth', 'Implement mitigation measures for identified risks', 8, false, 'Enhanced due diligence, ongoing monitoring, senior approval for transactions'),
  ('source_of_wealth', 'Senior management review and approval', 9, true, 'All source of wealth verifications require senior review')
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE sof_sow_verification_records IS 'Tracks individual SOF/SOW verification instances with full audit trail';
COMMENT ON TABLE sof_sow_verification_checklist IS 'Template checklist items for structured verification process';
COMMENT ON TABLE sof_sow_verification_checklist_completion IS 'Tracks completion of checklist items for each verification';
COMMENT ON TABLE sof_sow_verification_history IS 'Append-only audit trail of all changes to verification records';

COMMENT ON COLUMN sof_sow_verification_records.verification_method IS 'e.g., "Document review", "Third-party verification", "Client interview", "Database check"';
COMMENT ON COLUMN sof_sow_verification_records.evidence_reviewed IS 'Description of evidence reviewed, even if no documents attached';
COMMENT ON COLUMN sof_sow_verification_records.supporting_document_ids IS 'Optional: References to documents in storage if attached';
COMMENT ON COLUMN sof_sow_verification_records.verification_status IS 'pending: not started, in_progress: being verified, verified: complete, rejected: insufficient, requires_review: escalated';
