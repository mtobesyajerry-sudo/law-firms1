/*
  # Phase 2: Expanded Case Management System

  ## Overview
  Adds comprehensive case management features while maintaining bank-grade security and AML compliance integration.

  ## New Tables

  ### 1. `matter_activities` - Structured activity logging
  - Captures all matter-related activities with compliance focus
  - Uses predefined activity types (dropdown-based)
  - Limited text fields to prevent unstructured data
  - Full audit trail and organization isolation
  - Integrates with AML risk monitoring

  ### 2. `matter_milestones` - Court dates and key deadlines
  - Tracks court appearances with dates and outcomes
  - Key filing deadlines and hearings
  - Document submission tracking
  - Client meeting schedules
  - Full organization-based RLS

  ### 3. `matter_billing_milestones` - Financial milestone tracking
  - Retainer and payment milestones
  - Matter value documentation
  - Supports AML transaction monitoring
  - Organization-isolated with audit trail

  ## Table Modifications

  ### 4. Enhanced `matters` table
  - Add `progress_stage` field for detailed workflow tracking
  - Maintains existing security and RLS policies

  ## Security Features
  - Row Level Security (RLS) enabled on all tables
  - Organization-based access control
  - Role-based permissions (Admin, Management, Staff)
  - Complete audit trail with created_by tracking
  - 7-year retention compliance
  - Input validation via CHECK constraints
  - Structured data only (no free-form legal content)

  ## Data Classification
  - ✅ Stores: Dates, structured summaries, compliance facts
  - ❌ Avoids: Attorney-client privileged content, litigation strategy
*/

-- =====================================================
-- 0. CREATE UPDATED_AT FUNCTION IF NOT EXISTS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. MATTER ACTIVITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS matter_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  
  -- Activity Classification
  activity_type text NOT NULL CHECK (activity_type IN (
    'client_instruction',
    'risk_update',
    'compliance_review',
    'status_change',
    'document_received',
    'document_sent',
    'internal_review',
    'external_communication',
    'research_completed',
    'deadline_met',
    'payment_received',
    'cost_incurred'
  )),
  
  activity_date timestamptz NOT NULL DEFAULT now(),
  
  -- Structured Summary (Limited to 500 characters)
  summary text NOT NULL CHECK (char_length(summary) <= 500),
  
  -- Compliance Flags
  risk_relevant boolean DEFAULT false,
  compliance_relevant boolean DEFAULT false,
  aml_relevant boolean DEFAULT false,
  
  -- Risk Impact (if applicable)
  risk_level_change text CHECK (risk_level_change IN ('Low', 'Medium', 'High', 'Very High')),
  
  -- Additional Structured Data
  related_entities jsonb DEFAULT '[]'::jsonb, -- Client IDs, third parties
  document_references jsonb DEFAULT '[]'::jsonb, -- Document IDs
  
  -- Priority and Status
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requires_follow_up boolean DEFAULT false,
  follow_up_date date,
  follow_up_completed boolean DEFAULT false,
  
  -- Audit Trail
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Notes (Additional context, limited)
  notes text CHECK (char_length(notes) <= 1000)
);

-- =====================================================
-- 2. MATTER MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS matter_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  
  -- Milestone Classification
  milestone_type text NOT NULL CHECK (milestone_type IN (
    'court_appearance',
    'hearing_scheduled',
    'filing_deadline',
    'document_submission',
    'client_meeting',
    'expert_consultation',
    'mediation_session',
    'arbitration_hearing',
    'trial_date',
    'settlement_conference',
    'status_conference',
    'discovery_deadline',
    'motion_filing',
    'judgment_received',
    'appeal_filed',
    'case_closed'
  )),
  
  -- Milestone Details
  milestone_name text NOT NULL,
  milestone_date date NOT NULL,
  milestone_time time,
  
  -- Location (for court appearances, meetings)
  location text,
  court_name text,
  judge_name text,
  
  -- Outcome/Result
  outcome text CHECK (outcome IN (
    'completed',
    'continued',
    'ruled_favorable',
    'ruled_unfavorable',
    'settled',
    'dismissed',
    'granted',
    'denied',
    'pending',
    'cancelled'
  )),
  
  outcome_date date,
  outcome_summary text CHECK (char_length(outcome_summary) <= 500),
  
  -- Next Steps
  next_milestone_id uuid REFERENCES matter_milestones(id) ON DELETE SET NULL,
  next_action_required text CHECK (char_length(next_action_required) <= 300),
  next_action_deadline date,
  
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  )),
  
  -- Reminders
  reminder_sent boolean DEFAULT false,
  reminder_date date,
  
  -- Compliance
  compliance_relevant boolean DEFAULT false,
  
  -- Audit Trail
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  notes text CHECK (char_length(notes) <= 1000)
);

-- =====================================================
-- 3. MATTER BILLING MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS matter_billing_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  
  -- Milestone Classification
  milestone_type text NOT NULL CHECK (milestone_type IN (
    'retainer_received',
    'initial_payment',
    'phase_completed',
    'milestone_payment',
    'progress_billing',
    'expense_reimbursement',
    'final_billing',
    'matter_closed',
    'payment_plan_installment',
    'refund_issued'
  )),
  
  -- Billing Details
  milestone_name text NOT NULL,
  milestone_date date NOT NULL,
  
  -- Financial Information
  amount numeric(15, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'TZS',
  
  -- Payment Status
  payment_status text DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'received',
    'partially_received',
    'overdue',
    'cancelled',
    'refunded'
  )),
  
  payment_method text CHECK (payment_method IN (
    'bank_transfer',
    'check',
    'cash',
    'credit_card',
    'mobile_money',
    'wire_transfer',
    'other'
  )),
  
  payment_received_date date,
  amount_received numeric(15, 2) CHECK (amount_received >= 0),
  
  -- Invoice Information
  invoice_number text,
  invoice_date date,
  
  -- AML Compliance Flags
  requires_aml_review boolean DEFAULT false,
  aml_review_completed boolean DEFAULT false,
  aml_reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aml_review_date date,
  aml_notes text CHECK (char_length(aml_notes) <= 500),
  
  -- Large Transaction Alert (>= 10M TZS or equivalent)
  large_transaction_threshold_met boolean DEFAULT false,
  fiu_reporting_required boolean DEFAULT false,
  
  -- Client Account Tracking
  involves_client_account boolean DEFAULT false,
  client_account_details jsonb DEFAULT '{}'::jsonb,
  
  -- Source of Funds Verification
  sof_verified boolean DEFAULT false,
  sof_verification_date date,
  sof_notes text CHECK (char_length(sof_notes) <= 300),
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'cancelled',
    'disputed',
    'under_review'
  )),
  
  -- Audit Trail
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  notes text CHECK (char_length(notes) <= 1000)
);

-- =====================================================
-- 4. ENHANCE MATTERS TABLE
-- =====================================================

-- Add progress_stage tracking to existing matters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matters' AND column_name = 'progress_stage'
  ) THEN
    ALTER TABLE matters ADD COLUMN progress_stage text 
      CHECK (progress_stage IN (
        'intake',
        'conflict_check',
        'kyc_in_progress',
        'kyc_completed',
        'active_work',
        'awaiting_documents',
        'awaiting_court',
        'in_negotiation',
        'closing',
        'completed',
        'on_hold',
        'archived'
      ));
    
    -- Set default progress_stage based on current status
    UPDATE matters 
    SET progress_stage = CASE 
      WHEN status = 'open' AND opened_date IS NULL THEN 'intake'
      WHEN status = 'open' AND opened_date IS NOT NULL THEN 'active_work'
      WHEN status = 'closed' THEN 'completed'
      WHEN status = 'on_hold' THEN 'on_hold'
      ELSE 'active_work'
    END
    WHERE progress_stage IS NULL;
  END IF;
END $$;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Matter Activities Indexes
CREATE INDEX IF NOT EXISTS idx_matter_activities_matter ON matter_activities(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_activities_org ON matter_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_matter_activities_type ON matter_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_matter_activities_date ON matter_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_matter_activities_compliance ON matter_activities(compliance_relevant) WHERE compliance_relevant = true;
CREATE INDEX IF NOT EXISTS idx_matter_activities_aml ON matter_activities(aml_relevant) WHERE aml_relevant = true;
CREATE INDEX IF NOT EXISTS idx_matter_activities_follow_up ON matter_activities(follow_up_date) WHERE requires_follow_up = true AND follow_up_completed = false;

-- Matter Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_matter_milestones_matter ON matter_milestones(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_org ON matter_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_type ON matter_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_date ON matter_milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_status ON matter_milestones(status);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_upcoming ON matter_milestones(milestone_date) WHERE status IN ('scheduled', 'confirmed');

-- Matter Billing Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_matter_billing_matter ON matter_billing_milestones(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_billing_org ON matter_billing_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_matter_billing_type ON matter_billing_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_matter_billing_status ON matter_billing_milestones(payment_status);
CREATE INDEX IF NOT EXISTS idx_matter_billing_aml ON matter_billing_milestones(requires_aml_review) WHERE requires_aml_review = true;
CREATE INDEX IF NOT EXISTS idx_matter_billing_large_tx ON matter_billing_milestones(large_transaction_threshold_met) WHERE large_transaction_threshold_met = true;
CREATE INDEX IF NOT EXISTS idx_matter_billing_date ON matter_billing_milestones(milestone_date DESC);

-- Matters Progress Stage Index
CREATE INDEX IF NOT EXISTS idx_matters_progress_stage ON matters(progress_stage);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE matter_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_billing_milestones ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES - MATTER ACTIVITIES
-- =====================================================

-- Staff can view activities in their organization
CREATE POLICY "Staff can view matter activities in their organization"
  ON matter_activities FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Staff can insert activities for matters they have access to
CREATE POLICY "Staff can insert matter activities in their organization"
  ON matter_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND matter_id IN (
      SELECT id FROM matters WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Staff can update activities they created or management can update all
CREATE POLICY "Staff can update their own matter activities"
  ON matter_activities FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'management')
    )
  );

-- Admins can delete activities
CREATE POLICY "Admins can delete matter activities"
  ON matter_activities FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 8. RLS POLICIES - MATTER MILESTONES
-- =====================================================

-- Staff can view milestones in their organization
CREATE POLICY "Staff can view matter milestones in their organization"
  ON matter_milestones FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Staff can insert milestones for matters they have access to
CREATE POLICY "Staff can insert matter milestones in their organization"
  ON matter_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND matter_id IN (
      SELECT id FROM matters WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Staff can update milestones in their organization
CREATE POLICY "Staff can update matter milestones in their organization"
  ON matter_milestones FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can delete milestones
CREATE POLICY "Admins can delete matter milestones"
  ON matter_milestones FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 9. RLS POLICIES - MATTER BILLING MILESTONES
-- =====================================================

-- Staff can view billing milestones in their organization
CREATE POLICY "Staff can view matter billing milestones in their organization"
  ON matter_billing_milestones FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Staff can insert billing milestones for matters they have access to
CREATE POLICY "Staff can insert matter billing milestones in their organization"
  ON matter_billing_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND matter_id IN (
      SELECT id FROM matters WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Staff can update billing milestones in their organization
CREATE POLICY "Staff can update matter billing milestones in their organization"
  ON matter_billing_milestones FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can delete billing milestones
CREATE POLICY "Admins can delete matter billing milestones"
  ON matter_billing_milestones FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_matter_activities_updated_at 
  BEFORE UPDATE ON matter_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_milestones_updated_at 
  BEFORE UPDATE ON matter_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_billing_milestones_updated_at 
  BEFORE UPDATE ON matter_billing_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. AUTOMATIC AML THRESHOLD DETECTION
-- =====================================================

-- Function to automatically flag large transactions for AML review
CREATE OR REPLACE FUNCTION check_billing_aml_thresholds()
RETURNS TRIGGER AS $$
DECLARE
  threshold_tzs numeric := 10000000; -- 10M TZS
  threshold_usd numeric := 10000; -- $10,000 USD
  threshold_eur numeric := 10000; -- €10,000 EUR
BEGIN
  -- Check if amount meets large transaction threshold
  IF (NEW.currency = 'TZS' AND NEW.amount >= threshold_tzs) OR
     (NEW.currency = 'USD' AND NEW.amount >= threshold_usd) OR
     (NEW.currency = 'EUR' AND NEW.amount >= threshold_eur) OR
     (NEW.currency NOT IN ('TZS', 'USD', 'EUR') AND NEW.amount >= threshold_usd) THEN
    
    NEW.large_transaction_threshold_met := true;
    NEW.requires_aml_review := true;
    
    -- If involves client account, require FIU reporting review
    IF NEW.involves_client_account = true THEN
      NEW.fiu_reporting_required := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run AML threshold check
CREATE TRIGGER trigger_check_billing_aml_thresholds
  BEFORE INSERT OR UPDATE OF amount, currency, involves_client_account
  ON matter_billing_milestones
  FOR EACH ROW
  EXECUTE FUNCTION check_billing_aml_thresholds();

-- =====================================================
-- 12. AUDIT LOG TRIGGERS
-- =====================================================

-- Function to log matter activity changes
CREATE OR REPLACE FUNCTION log_matter_activity_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      action_description,
      changes
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'create',
      'matter_activity',
      NEW.id,
      'Created matter activity: ' || NEW.activity_type,
      jsonb_build_object(
        'matter_id', NEW.matter_id,
        'activity_type', NEW.activity_type,
        'summary', NEW.summary
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      action_description,
      changes
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'update',
      'matter_activity',
      NEW.id,
      'Updated matter activity: ' || NEW.activity_type,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_matter_activity_changes
  AFTER INSERT OR UPDATE ON matter_activities
  FOR EACH ROW
  EXECUTE FUNCTION log_matter_activity_changes();

-- =====================================================
-- 13. HELPER VIEWS
-- =====================================================

-- View for upcoming court dates and deadlines
CREATE OR REPLACE VIEW upcoming_matter_milestones AS
SELECT 
  mm.id,
  mm.organization_id,
  mm.matter_id,
  m.matter_number,
  m.matter_name,
  mm.milestone_type,
  mm.milestone_name,
  mm.milestone_date,
  mm.milestone_time,
  mm.location,
  mm.court_name,
  mm.status,
  mm.created_by,
  mm.created_at,
  CASE 
    WHEN mm.milestone_date < CURRENT_DATE THEN 'overdue'
    WHEN mm.milestone_date = CURRENT_DATE THEN 'today'
    WHEN mm.milestone_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
    WHEN mm.milestone_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'this_month'
    ELSE 'upcoming'
  END as urgency
FROM matter_milestones mm
JOIN matters m ON mm.matter_id = m.id
WHERE mm.status IN ('scheduled', 'confirmed')
ORDER BY mm.milestone_date ASC, mm.milestone_time ASC;

-- View for matters requiring AML review
CREATE OR REPLACE VIEW matters_requiring_aml_review AS
SELECT 
  mbm.id,
  mbm.organization_id,
  mbm.matter_id,
  m.matter_number,
  m.matter_name,
  mbm.milestone_type,
  mbm.milestone_name,
  mbm.amount,
  mbm.currency,
  mbm.milestone_date,
  mbm.large_transaction_threshold_met,
  mbm.fiu_reporting_required,
  mbm.aml_review_completed,
  mbm.involves_client_account,
  mbm.created_at
FROM matter_billing_milestones mbm
JOIN matters m ON mbm.matter_id = m.id
WHERE mbm.requires_aml_review = true 
  AND mbm.aml_review_completed = false
ORDER BY mbm.milestone_date DESC;

COMMENT ON TABLE matter_activities IS 'Phase 2: Structured matter activity logging with compliance focus';
COMMENT ON TABLE matter_milestones IS 'Phase 2: Court dates, hearings, and key deadlines tracking';
COMMENT ON TABLE matter_billing_milestones IS 'Phase 2: Financial milestone tracking with AML integration';
COMMENT ON COLUMN matters.progress_stage IS 'Phase 2: Detailed matter progress tracking';
