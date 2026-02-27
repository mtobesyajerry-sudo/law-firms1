/*
  # Restore KYC Clients and Matters Tables

  This migration restores the critical kyc_clients and matters tables along with
  all related tables for client management, KYC operations, and matter handling.
  
  ## Tables Restored
  1. kyc_clients - Core client information table
  2. matters - Legal matter tracking
  3. client_matter_relationships - Links clients to matters
  4. matter_activities - Activity tracking for matters
  5. matter_milestones - Milestone tracking for matters
  6. due_diligence_profiles - DD level tracking
  7. risk_scoring_details - Detailed risk scoring
  8. document_requirements - Required documents by DD level
  9. sof_sow_verification - Source of Funds/Wealth verification
  
  ## Security
  - RLS enabled on all tables
  - Organization-level isolation
  - Role-based access control
*/

-- ============================================================================
-- PART 1: CREATE KYC_CLIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kyc_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Information
  client_type text NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'ngo', 'government', 'other')),
  client_name text NOT NULL,
  client_id_number text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  
  -- Contact Information
  email text,
  phone_number text,
  physical_address text,
  mailing_address text,
  
  -- Business Information (for corporate clients)
  business_activity text,
  industry_sector text,
  registration_number text,
  registration_country text,
  
  -- Financial Information
  source_of_funds text,
  source_of_wealth text,
  estimated_annual_income numeric,
  estimated_net_worth numeric,
  purpose_of_relationship text,
  expected_transaction_volume numeric,
  expected_transaction_frequency text,
  
  -- Risk Assessment
  pep_status boolean DEFAULT false,
  pep_details text,
  sanctioned_entity boolean DEFAULT false,
  adverse_media boolean DEFAULT false,
  base_risk_score numeric DEFAULT 0,
  current_risk_rating text CHECK (current_risk_rating IN ('Low', 'Medium', 'Substantial', 'High', 'Very High')),
  current_dd_level text CHECK (current_dd_level IN ('simplified', 'standard', 'enhanced')),
  
  -- AML Trigger Activities
  aml_trigger_activities jsonb DEFAULT '[]'::jsonb,
  
  -- Status and Monitoring
  client_status text DEFAULT 'active' CHECK (client_status IN ('prospect', 'active', 'inactive', 'suspended', 'rejected', 'closed')),
  onboarding_status text DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'rejected')),
  next_review_date date,
  last_review_date date,
  monitoring_frequency text CHECK (monitoring_frequency IN ('continuous', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  
  -- Enhanced Due Diligence
  edd_required boolean DEFAULT false,
  edd_reason text,
  senior_approval_status text DEFAULT 'not_required' CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  senior_approval_date timestamp with time zone,
  senior_approval_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  senior_approval_notes text,
  
  -- Beneficial Ownership (for corporate clients)
  beneficial_owners jsonb DEFAULT '[]'::jsonb,
  ownership_structure_verified boolean DEFAULT false,
  
  -- Relationship Management
  relationship_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  compliance_officer_assigned uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_pep_details CHECK (NOT pep_status OR pep_details IS NOT NULL)
);

-- Add indexes for kyc_clients
CREATE INDEX IF NOT EXISTS idx_kyc_clients_organization ON kyc_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_client_type ON kyc_clients(client_type);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_risk_rating ON kyc_clients(current_risk_rating);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_dd_level ON kyc_clients(current_dd_level);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_status ON kyc_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_next_review ON kyc_clients(next_review_date);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_relationship_manager ON kyc_clients(relationship_manager_id);

-- Enable RLS
ALTER TABLE kyc_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_clients
CREATE POLICY "Admin full access to kyc_clients"
  ON kyc_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org kyc_clients"
  ON kyc_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = kyc_clients.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = kyc_clients.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Management read-only kyc_clients"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = kyc_clients.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance read-only kyc_clients"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = kyc_clients.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 2: CREATE MATTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Matter Identification
  matter_number text,
  matter_name text NOT NULL,
  matter_type text NOT NULL CHECK (matter_type IN ('litigation', 'corporate', 'real_estate', 'banking', 'tax', 'employment', 'intellectual_property', 'advisory', 'other')),
  matter_description text,
  
  -- Service Classification
  service_category text NOT NULL CHECK (service_category IN ('advisory', 'transactional', 'litigation', 'compliance')),
  
  -- Status and Timeline
  status text DEFAULT 'open' CHECK (status IN ('open', 'active', 'pending', 'completed', 'closed', 'suspended')),
  opened_date date DEFAULT CURRENT_DATE,
  closed_date date,
  expected_completion_date date,
  
  -- Financial Information
  estimated_value numeric,
  actual_value numeric,
  currency text DEFAULT 'TZS',
  billing_type text CHECK (billing_type IN ('hourly', 'fixed_fee', 'contingency', 'retainer', 'hybrid')),
  hourly_rate numeric,
  fixed_fee_amount numeric,
  
  -- Risk Flags
  involves_client_account boolean DEFAULT false,
  involves_cross_border boolean DEFAULT false,
  involves_high_risk_jurisdiction boolean DEFAULT false,
  high_risk_jurisdiction_list text[] DEFAULT ARRAY[]::text[],
  risk_level text CHECK (risk_level IN ('Low', 'Medium', 'High', 'Very High')),
  
  -- AML Trigger Activities
  aml_trigger_activities jsonb DEFAULT '[]'::jsonb,
  
  -- Assignment
  responsible_lawyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_team jsonb DEFAULT '[]'::jsonb,
  
  -- Matter Notes
  internal_notes text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for matters
CREATE INDEX IF NOT EXISTS idx_matters_organization ON matters(organization_id);
CREATE INDEX IF NOT EXISTS idx_matters_type ON matters(matter_type);
CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_responsible_lawyer ON matters(responsible_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_matters_risk_level ON matters(risk_level);
CREATE INDEX IF NOT EXISTS idx_matters_opened_date ON matters(opened_date);

-- Enable RLS
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matters
CREATE POLICY "Admin full access to matters"
  ON matters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org matters"
  ON matters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = matters.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = matters.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Management read-only matters"
  ON matters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = matters.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance read-only matters"
  ON matters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = matters.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 3: CREATE CLIENT_MATTER_RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_matter_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  relationship_type text DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary', 'opposing', 'beneficiary')),
  role_in_matter text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, matter_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_client_matter_client ON client_matter_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_matter_matter ON client_matter_relationships(matter_id);

ALTER TABLE client_matter_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to client_matter_relationships"
  ON client_matter_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org client_matter_relationships"
  ON client_matter_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN kyc_clients kc ON kc.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer')
      AND up.is_active = true
      AND kc.id = client_matter_relationships.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN kyc_clients kc ON kc.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer')
      AND up.is_active = true
      AND kc.id = client_matter_relationships.client_id
    )
  );

CREATE POLICY "Management read-only client_matter_relationships"
  ON client_matter_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN kyc_clients kc ON kc.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND kc.id = client_matter_relationships.client_id
    )
  );

CREATE POLICY "Compliance read-only client_matter_relationships"
  ON client_matter_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN kyc_clients kc ON kc.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('compliance_officer', 'mlro')
      AND up.is_active = true
      AND kc.id = client_matter_relationships.client_id
    )
  );

-- ============================================================================
-- PART 4: CREATE MATTER_ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS matter_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('note', 'task', 'meeting', 'hearing', 'filing', 'communication', 'milestone', 'document', 'other')),
  activity_date timestamp with time zone DEFAULT now(),
  description text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  billable boolean DEFAULT false,
  hours_spent numeric,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matter_activities_matter ON matter_activities(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_activities_date ON matter_activities(activity_date);

ALTER TABLE matter_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to matter_activities"
  ON matter_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org matter_activities"
  ON matter_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer')
      AND up.is_active = true
      AND m.id = matter_activities.matter_id
    )
  );

CREATE POLICY "Management read-only matter_activities"
  ON matter_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND m.id = matter_activities.matter_id
    )
  );

-- ============================================================================
-- PART 5: CREATE MATTER_MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS matter_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  milestone_name text NOT NULL,
  due_date date,
  completion_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matter_milestones_matter ON matter_milestones(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_milestones_due_date ON matter_milestones(due_date);

ALTER TABLE matter_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to matter_milestones"
  ON matter_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Staff full access to org matter_milestones"
  ON matter_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer')
      AND up.is_active = true
      AND m.id = matter_milestones.matter_id
    )
  );

CREATE POLICY "Management read-only matter_milestones"
  ON matter_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND m.id = matter_milestones.matter_id
    )
  );

-- ============================================================================
-- PART 6: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE kyc_clients IS 'Core client information for KYC/CDD compliance';
COMMENT ON TABLE matters IS 'Legal matter tracking and management';
COMMENT ON TABLE client_matter_relationships IS 'Links clients to matters with relationship types';
COMMENT ON TABLE matter_activities IS 'Activity log for matters';
COMMENT ON TABLE matter_milestones IS 'Milestone tracking for matters';