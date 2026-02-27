/*
  # Due Diligence Workflow and Monitoring Enhancement
  
  ## Summary
  Adds comprehensive tracking for Tanzania-specific DD requirements:
  
  1. **Senior Management Approval** (Enhanced DD requirement)
     - Approval status and details
     - Approver information
     - Approval date and notes
  
  2. **Simplified DD Justification** (Mandatory documentation)
     - Risk assessment justification
     - Supporting rationale
     - Reviewer approval
  
  3. **Continuous Monitoring Tracking**
     - Next review date based on risk level
     - Last review date
     - Review frequency
     - Monitoring status
  
  4. **Source of Funds and Wealth** (Enhanced DD mandatory)
     - Source of funds details
     - Source of wealth documentation
     - Verification status
  
  5. **Relationship Purpose Tracking**
     - Legal service type
     - Expected transaction volume
     - Economic rationale
  
  ## Changes
  - Add new columns to kyc_clients table
  - Add indexes for monitoring and review queries
  - Add check constraints for data integrity
  
  ## Compliance Features
  - Automated review date calculation
  - Audit trail for all changes
  - Status tracking for workflow
*/

-- ============================================================================
-- ADD SENIOR MANAGEMENT APPROVAL FIELDS (Enhanced DD)
-- ============================================================================

DO $$
BEGIN
  -- Senior management approval status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'senior_approval_status'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN senior_approval_status text DEFAULT 'not_required' 
    CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));
  END IF;

  -- Who approved (partner/senior management)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- When approved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN approved_at timestamptz;
  END IF;

  -- Approval notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN approval_notes text;
  END IF;

  -- ============================================================================
  -- ADD SIMPLIFIED DD JUSTIFICATION FIELDS
  -- ============================================================================

  -- Justification for applying simplified DD
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'simplified_dd_justification'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN simplified_dd_justification text;
  END IF;

  -- Risk factors considered for simplified DD
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'simplified_dd_risk_factors'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN simplified_dd_risk_factors jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- ============================================================================
  -- ADD CONTINUOUS MONITORING FIELDS
  -- ============================================================================

  -- Next scheduled review date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN next_review_date date;
  END IF;

  -- Last review date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'last_review_date'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN last_review_date date;
  END IF;

  -- Review frequency based on risk
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'review_frequency'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN review_frequency text DEFAULT 'quarterly' 
    CHECK (review_frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));
  END IF;

  -- Monitoring status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'monitoring_status'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN monitoring_status text DEFAULT 'active' 
    CHECK (monitoring_status IN ('active', 'overdue', 'suspended', 'closed'));
  END IF;

  -- ============================================================================
  -- ADD SOURCE OF FUNDS AND WEALTH FIELDS (Enhanced DD)
  -- ============================================================================

  -- Source of funds details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_funds'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_funds text;
  END IF;

  -- Source of funds verification status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_funds_verified'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_funds_verified boolean DEFAULT false;
  END IF;

  -- Source of wealth details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_wealth'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_wealth text;
  END IF;

  -- Source of wealth verification status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_wealth_verified'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_wealth_verified boolean DEFAULT false;
  END IF;

  -- ============================================================================
  -- ADD RELATIONSHIP PURPOSE FIELDS
  -- ============================================================================

  -- Type of legal service
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'legal_service_type'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN legal_service_type text;
  END IF;

  -- Expected transaction volume
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'expected_transaction_volume'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN expected_transaction_volume text;
  END IF;

  -- Economic rationale for relationship
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'economic_rationale'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN economic_rationale text;
  END IF;

  -- ============================================================================
  -- ADD FIRST PAYMENT VERIFICATION (Enhanced DD)
  -- ============================================================================

  -- First payment received through regulated institution
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'first_payment_verified'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN first_payment_verified boolean DEFAULT false;
  END IF;

  -- First payment details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'first_payment_details'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN first_payment_details jsonb DEFAULT '{}'::jsonb;
  END IF;

END $$;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kyc_clients_next_review_date 
  ON kyc_clients(next_review_date) 
  WHERE monitoring_status = 'active';

CREATE INDEX IF NOT EXISTS idx_kyc_clients_monitoring_status 
  ON kyc_clients(monitoring_status);

CREATE INDEX IF NOT EXISTS idx_kyc_clients_senior_approval 
  ON kyc_clients(senior_approval_status) 
  WHERE senior_approval_status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_kyc_clients_dd_level 
  ON kyc_clients(current_dd_level);

-- ============================================================================
-- CREATE FUNCTION TO AUTO-SET REVIEW DATES
-- ============================================================================

CREATE OR REPLACE FUNCTION set_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next review date based on risk level and DD level
  IF NEW.current_dd_level = 'simplified' THEN
    NEW.review_frequency := 'annual';
    NEW.next_review_date := CURRENT_DATE + INTERVAL '12 months';
  ELSIF NEW.current_dd_level = 'standard' THEN
    NEW.review_frequency := 'quarterly';
    NEW.next_review_date := CURRENT_DATE + INTERVAL '3 months';
  ELSIF NEW.current_dd_level = 'enhanced' THEN
    -- Enhanced DD requires more frequent monitoring
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

-- ============================================================================
-- CREATE TRIGGER FOR AUTO-SETTING REVIEW DATES
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_set_review_dates ON kyc_clients;
CREATE TRIGGER trigger_set_review_dates
  BEFORE INSERT OR UPDATE OF current_dd_level, current_risk_rating ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION set_next_review_date();

-- ============================================================================
-- CREATE FUNCTION TO CHECK OVERDUE REVIEWS
-- ============================================================================

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

-- ============================================================================
-- CREATE MONITORING REVIEW LOG TABLE
-- ============================================================================

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

-- Enable RLS
ALTER TABLE kyc_monitoring_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reviews for their organization's clients"
  ON kyc_monitoring_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = kyc_monitoring_reviews.client_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create reviews for their organization's clients"
  ON kyc_monitoring_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = kyc_monitoring_reviews.client_id
      AND user_profiles.id = auth.uid()
    )
    AND reviewed_by = auth.uid()
  );

CREATE POLICY "Admins can manage all monitoring reviews"
  ON kyc_monitoring_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_client ON kyc_monitoring_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_date ON kyc_monitoring_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_monitoring_reviews_status ON kyc_monitoring_reviews(overall_status);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN kyc_clients.senior_approval_status IS 'Enhanced DD requires senior management approval before onboarding';
COMMENT ON COLUMN kyc_clients.simplified_dd_justification IS 'Mandatory documentation explaining why simplified DD was applied';
COMMENT ON COLUMN kyc_clients.next_review_date IS 'Next scheduled review date based on risk level and DD level';
COMMENT ON COLUMN kyc_clients.review_frequency IS 'Review frequency: Enhanced DD (monthly/quarterly), Standard (quarterly), Simplified (annual)';
COMMENT ON COLUMN kyc_clients.source_of_funds IS 'Required for Enhanced DD: Origin of funds for this transaction';
COMMENT ON COLUMN kyc_clients.source_of_wealth IS 'Required for Enhanced DD: Evidence of wealth accumulation';
COMMENT ON COLUMN kyc_clients.first_payment_verified IS 'Enhanced DD requirement: First payment must be through regulated financial institution';
COMMENT ON TABLE kyc_monitoring_reviews IS 'Audit trail of continuous monitoring activities as required by Tanzania AML law';
