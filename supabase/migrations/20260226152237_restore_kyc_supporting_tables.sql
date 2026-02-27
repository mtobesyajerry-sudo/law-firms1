/*
  # Restore KYC Supporting Tables

  This migration restores the supporting tables needed for complete KYC/CDD operations:
  - due_diligence_profiles: Tracks DD level assignments and requirements
  - risk_scoring_details: Detailed risk factor scoring
  - document_requirements: Required documents per DD level
  - sof_sow_verification: Source of Funds/Wealth verification tracking
  
  ## Security
  - RLS enabled on all tables
  - Organization-level isolation
  - Role-based access control
*/

-- ============================================================================
-- PART 1: CREATE DUE_DILIGENCE_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS due_diligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- DD Level Assignment
  dd_level text NOT NULL CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  assignment_date date DEFAULT CURRENT_DATE,
  assignment_reason text,
  
  -- Requirements Checklist
  requirements_checklist jsonb DEFAULT '[]'::jsonb,
  completion_percentage numeric DEFAULT 0,
  all_requirements_met boolean DEFAULT false,
  
  -- Status
  profile_status text DEFAULT 'active' CHECK (profile_status IN ('active', 'completed', 'expired', 'superseded')),
  
  -- Review Information
  next_review_date date,
  last_review_date date,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dd_profiles_client ON due_diligence_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_organization ON due_diligence_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_level ON due_diligence_profiles(dd_level);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_status ON due_diligence_profiles(profile_status);

ALTER TABLE due_diligence_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to dd_profiles"
  ON due_diligence_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org dd_profiles"
  ON due_diligence_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = due_diligence_profiles.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Management read-only dd_profiles"
  ON due_diligence_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = due_diligence_profiles.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance read-only dd_profiles"
  ON due_diligence_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = due_diligence_profiles.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 2: CREATE RISK_SCORING_DETAILS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_scoring_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Risk Factor Scores (1-5 scale)
  customer_risk_score numeric CHECK (customer_risk_score >= 1 AND customer_risk_score <= 5),
  geographic_risk_score numeric CHECK (geographic_risk_score >= 1 AND geographic_risk_score <= 5),
  product_service_risk_score numeric CHECK (product_service_risk_score >= 1 AND product_service_risk_score <= 5),
  delivery_channel_risk_score numeric CHECK (delivery_channel_risk_score >= 1 AND delivery_channel_risk_score <= 5),
  
  -- Detailed Risk Factors
  customer_risk_factors jsonb DEFAULT '{}'::jsonb,
  geographic_risk_factors jsonb DEFAULT '{}'::jsonb,
  product_service_risk_factors jsonb DEFAULT '{}'::jsonb,
  delivery_channel_risk_factors jsonb DEFAULT '{}'::jsonb,
  
  -- Overall Risk Calculation
  inherent_risk_score numeric,
  residual_risk_score numeric,
  risk_rating text CHECK (risk_rating IN ('Low', 'Medium', 'Substantial', 'High', 'Very High')),
  
  -- Assessment Information
  assessment_date date DEFAULT CURRENT_DATE,
  assessed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_scoring_client ON risk_scoring_details(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_scoring_organization ON risk_scoring_details(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_scoring_rating ON risk_scoring_details(risk_rating);

ALTER TABLE risk_scoring_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to risk_scoring_details"
  ON risk_scoring_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org risk_scoring_details"
  ON risk_scoring_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = risk_scoring_details.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Management read-only risk_scoring_details"
  ON risk_scoring_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = risk_scoring_details.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance read-only risk_scoring_details"
  ON risk_scoring_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = risk_scoring_details.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 3: CREATE DOCUMENT_REQUIREMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_level text NOT NULL CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  client_type text NOT NULL CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'ngo', 'government', 'other')),
  document_type_id uuid REFERENCES document_types(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_requirements_dd_level ON document_requirements(dd_level);
CREATE INDEX IF NOT EXISTS idx_document_requirements_client_type ON document_requirements(client_type);
CREATE INDEX IF NOT EXISTS idx_document_requirements_document_type ON document_requirements(document_type_id);

ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

-- Document requirements are reference data, readable by all authenticated users
CREATE POLICY "All authenticated can view document_requirements"
  ON document_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage document_requirements"
  ON document_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 4: CREATE SOF_SOW_VERIFICATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sof_sow_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Source of Funds
  sof_declared text,
  sof_category text CHECK (sof_category IN ('employment', 'business', 'investment', 'inheritance', 'gift', 'loan', 'savings', 'other')),
  sof_description text,
  sof_amount numeric,
  sof_currency text DEFAULT 'TZS',
  sof_verified boolean DEFAULT false,
  sof_verification_date date,
  sof_verification_method text,
  sof_supporting_documents jsonb DEFAULT '[]'::jsonb,
  
  -- Source of Wealth
  sow_declared text,
  sow_category text CHECK (sow_category IN ('employment', 'business_ownership', 'investments', 'inheritance', 'real_estate', 'family_wealth', 'other')),
  sow_description text,
  sow_estimated_value numeric,
  sow_currency text DEFAULT 'TZS',
  sow_verified boolean DEFAULT false,
  sow_verification_date date,
  sow_verification_method text,
  sow_supporting_documents jsonb DEFAULT '[]'::jsonb,
  
  -- Verification Status
  overall_verification_status text DEFAULT 'pending' CHECK (overall_verification_status IN ('pending', 'in_progress', 'verified', 'rejected', 'requires_edd')),
  verification_notes text,
  
  -- Red Flags
  inconsistencies_found boolean DEFAULT false,
  inconsistency_details text,
  requires_further_investigation boolean DEFAULT false,
  investigation_notes text,
  
  -- Verified By
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sof_sow_client ON sof_sow_verification(client_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_organization ON sof_sow_verification(organization_id);
CREATE INDEX IF NOT EXISTS idx_sof_sow_status ON sof_sow_verification(overall_verification_status);

ALTER TABLE sof_sow_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to sof_sow_verification"
  ON sof_sow_verification FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org sof_sow_verification"
  ON sof_sow_verification FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = sof_sow_verification.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Management read-only sof_sow_verification"
  ON sof_sow_verification FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = sof_sow_verification.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance full access to org sof_sow_verification"
  ON sof_sow_verification FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = sof_sow_verification.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = sof_sow_verification.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 5: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE due_diligence_profiles IS 'Tracks DD level assignments and completion status for clients';
COMMENT ON TABLE risk_scoring_details IS 'Detailed risk factor scoring for clients following FATF methodology';
COMMENT ON TABLE document_requirements IS 'Required documents by DD level and client type';
COMMENT ON TABLE sof_sow_verification IS 'Source of Funds and Source of Wealth verification tracking';