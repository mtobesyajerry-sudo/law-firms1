/*
  # Create Matter Billing Milestones Table
  
  1. Problem
    - Table was created in Phase 2 migration but removed during restoration
    - Frontend component exists and expects this table
    - Users cannot track billing milestones for matters
  
  2. Table Structure
    - Organization and matter references
    - Milestone type and financial details
    - Payment status tracking
    - AML compliance flags for large transactions
    - Source of funds verification
    - Client account involvement tracking
  
  3. Security
    - Enable RLS
    - Admin: Full access
    - Staff: Full access to org billing
    - Management: Read-only access to org billing
    - Compliance Officers: Read-only access for AML review
*/

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
  notes text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matter_billing_matter ON matter_billing_milestones(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_billing_org ON matter_billing_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_matter_billing_date ON matter_billing_milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_matter_billing_payment_status ON matter_billing_milestones(payment_status) WHERE payment_status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_matter_billing_aml_review ON matter_billing_milestones(requires_aml_review) WHERE requires_aml_review = true;
CREATE INDEX IF NOT EXISTS idx_matter_billing_large_transaction ON matter_billing_milestones(large_transaction_threshold_met) WHERE large_transaction_threshold_met = true;

-- Enable RLS
ALTER TABLE matter_billing_milestones ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to matter_billing_milestones"
  ON matter_billing_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Staff full access to org billing
CREATE POLICY "Staff full access to org matter_billing_milestones"
  ON matter_billing_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = matter_billing_milestones.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Management read-only access
CREATE POLICY "Management read-only access to org matter_billing_milestones"
  ON matter_billing_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = matter_billing_milestones.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Compliance officer read-only access for AML review
CREATE POLICY "Compliance read-only access to org matter_billing_milestones"
  ON matter_billing_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = matter_billing_milestones.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_matter_billing_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_matter_billing_milestones_updated_at ON matter_billing_milestones;

CREATE TRIGGER trigger_update_matter_billing_milestones_updated_at
  BEFORE UPDATE ON matter_billing_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_matter_billing_milestones_updated_at();

-- Create trigger to automatically flag large transactions
CREATE OR REPLACE FUNCTION flag_large_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag if amount is >= 10,000,000 TZS or equivalent
  IF NEW.amount >= 10000000 AND NEW.currency = 'TZS' THEN
    NEW.large_transaction_threshold_met := true;
    NEW.requires_aml_review := true;
  ELSIF NEW.amount >= 5000 AND NEW.currency = 'USD' THEN
    NEW.large_transaction_threshold_met := true;
    NEW.requires_aml_review := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_flag_large_transactions ON matter_billing_milestones;

CREATE TRIGGER trigger_flag_large_transactions
  BEFORE INSERT OR UPDATE ON matter_billing_milestones
  FOR EACH ROW
  EXECUTE FUNCTION flag_large_transactions();
