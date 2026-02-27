/*
  # Create KYC/CDD System for Banks & Financial Institutions

  ## Overview
  Comprehensive KYC (Know Your Customer) and CDD (Customer Due Diligence) system 
  specifically designed for banks and financial institutions in Tanzania.

  ## New Tables Created

  ### 1. kyc_clients
  Core client information table storing all customer data for KYC purposes
  - Client identification and profile
  - Risk ratings and DD levels
  - PEP status and monitoring requirements
  - Review schedules and approval status

  ### 2. kyc_assessments
  Individual risk assessment records for each client
  - Links to client records
  - Risk factor analysis
  - DD level determination
  - Approval workflows

  ### 3. kyc_documents
  Document management for KYC verification
  - Identity documents
  - Proof of address
  - Financial documents
  - Beneficial ownership documents

  ### 4. kyc_reviews
  Periodic review tracking
  - Scheduled reviews based on risk level
  - Review completion status
  - Updated risk assessments

  ### 5. dd_profiles
  Due diligence profile assignments
  - Simplified/Standard/Enhanced DD tracking
  - Requirements checklist
  - Completion status

  ## Security
  - RLS enabled on all tables
  - Organization-level isolation
  - Admin override capabilities
  - Audit trail for all changes
*/

-- Create kyc_clients table
CREATE TABLE IF NOT EXISTS kyc_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  client_type text NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'other')),
  client_name text NOT NULL,
  client_id_number text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  
  -- Business Information
  business_activity text,
  source_of_funds text,
  source_of_wealth text,
  purpose_of_relationship text,
  
  -- Risk Assessment
  pep_status boolean DEFAULT false,
  base_risk_score numeric DEFAULT 0,
  current_risk_rating text CHECK (current_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  current_dd_level text CHECK (current_dd_level IN ('simplified', 'standard', 'enhanced')),
  
  -- Status and Monitoring
  client_status text DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'suspended', 'rejected')),
  next_review_date date,
  last_review_date date,
  
  -- Senior Management Approval (for EDD)
  senior_approval_status text DEFAULT 'not_required' CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  senior_approval_date timestamp with time zone,
  senior_approval_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  senior_approval_notes text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create kyc_assessments table
CREATE TABLE IF NOT EXISTS kyc_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  
  -- Assessment Details
  assessment_type text NOT NULL CHECK (assessment_type IN ('initial', 'periodic', 'event_driven', 'enhanced')),
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  assessor_name text,
  assessor_position text,
  
  -- Risk Factors (using Tanzania banking-specific factors)
  client_risk_factors jsonb DEFAULT '{}'::jsonb,
  
  -- Risk Results
  base_risk_rating text CHECK (base_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  adjusted_risk_rating text CHECK (adjusted_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  risk_adjustment_reason text,
  
  -- DD Requirements
  edd_required boolean DEFAULT false,
  edd_justification text,
  monitoring_frequency text CHECK (monitoring_frequency IN ('annual', 'quarterly', 'monthly', 'weekly')),
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create kyc_documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  
  -- Document Details
  document_category text NOT NULL CHECK (document_category IN (
    'identification', 'proof_of_address', 'financial', 'corporate', 
    'legal', 'screening', 'correspondence', 'other'
  )),
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_number text,
  
  -- File Information
  file_path text,
  file_size bigint,
  file_type text,
  
  -- Verification
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamp with time zone,
  verification_notes text,
  
  -- Expiry
  issue_date date,
  expiry_date date,
  
  -- Metadata
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create kyc_reviews table
CREATE TABLE IF NOT EXISTS kyc_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  
  -- Review Details
  review_type text NOT NULL CHECK (review_type IN ('scheduled', 'event_driven', 'enhanced')),
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  reviewer_name text,
  reviewer_position text,
  
  -- Review Results
  previous_risk_rating text,
  new_risk_rating text CHECK (new_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  risk_rating_changed boolean DEFAULT false,
  
  previous_dd_level text,
  new_dd_level text CHECK (new_dd_level IN ('simplified', 'standard', 'enhanced')),
  dd_level_changed boolean DEFAULT false,
  
  -- Findings
  findings text,
  action_required text,
  next_review_date date,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create dd_profiles table (auto-created for each client)
CREATE TABLE IF NOT EXISTS dd_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE UNIQUE,
  
  -- DD Level Assignment
  assigned_dd_level text NOT NULL CHECK (assigned_dd_level IN ('simplified', 'standard', 'enhanced')),
  assignment_date date DEFAULT CURRENT_DATE,
  assignment_reason text,
  
  -- Requirements Checklist (Tanzania-specific)
  requirements_completed jsonb DEFAULT '{}'::jsonb,
  
  -- Source of Wealth/Funds (Mandatory for EDD)
  sow_verified boolean DEFAULT false,
  sow_verification_date date,
  sow_documentation text,
  
  sof_verified boolean DEFAULT false,
  sof_verification_date date,
  sof_documentation text,
  
  -- Senior Approval (Mandatory for EDD)
  senior_approval_obtained boolean DEFAULT false,
  senior_approval_date date,
  
  -- First Payment Verification (EDD Requirement)
  first_payment_verified boolean DEFAULT false,
  first_payment_date date,
  first_payment_method text,
  
  -- Completion Status
  dd_completed boolean DEFAULT false,
  dd_completion_date date,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE kyc_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- RLS Policies for kyc_clients
CREATE POLICY "Users can view clients in their organization"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can insert clients in their organization"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can update clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can delete clients in their organization"
  ON kyc_clients FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

-- RLS Policies for kyc_assessments
CREATE POLICY "Users can view assessments in their organization"
  ON kyc_assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can insert assessments in their organization"
  ON kyc_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can update assessments in their organization"
  ON kyc_assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can delete assessments in their organization"
  ON kyc_assessments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

-- RLS Policies for kyc_documents
CREATE POLICY "Users can view documents in their organization"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can insert documents in their organization"
  ON kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can update documents in their organization"
  ON kyc_documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can delete documents in their organization"
  ON kyc_documents FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

-- RLS Policies for kyc_reviews
CREATE POLICY "Users can view reviews in their organization"
  ON kyc_reviews FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can insert reviews in their organization"
  ON kyc_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can update reviews in their organization"
  ON kyc_reviews FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can delete reviews in their organization"
  ON kyc_reviews FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

-- RLS Policies for dd_profiles
CREATE POLICY "Users can view DD profiles in their organization"
  ON dd_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can insert DD profiles in their organization"
  ON dd_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can update DD profiles in their organization"
  ON dd_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

CREATE POLICY "Users can delete DD profiles in their organization"
  ON dd_profiles FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR is_admin_user()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kyc_clients_organization ON kyc_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_status ON kyc_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_risk ON kyc_clients(current_risk_rating);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_dd_level ON kyc_clients(current_dd_level);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_next_review ON kyc_clients(next_review_date);

CREATE INDEX IF NOT EXISTS idx_kyc_assessments_organization ON kyc_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_assessments_client ON kyc_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_assessments_status ON kyc_assessments(status);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_organization ON kyc_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_client ON kyc_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_category ON kyc_documents(document_category);

CREATE INDEX IF NOT EXISTS idx_kyc_reviews_organization ON kyc_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_reviews_client ON kyc_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_reviews_due_date ON kyc_reviews(due_date);
CREATE INDEX IF NOT EXISTS idx_kyc_reviews_status ON kyc_reviews(status);

CREATE INDEX IF NOT EXISTS idx_dd_profiles_organization ON dd_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_client ON dd_profiles(client_id);

-- Create trigger to automatically create DD profile when client is created
CREATE OR REPLACE FUNCTION create_dd_profile_for_client()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dd_profiles (
    organization_id,
    client_id,
    assigned_dd_level,
    assignment_reason,
    created_by
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    COALESCE(NEW.current_dd_level, 'standard'),
    'Automatically created on client onboarding',
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_dd_profile
  AFTER INSERT ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION create_dd_profile_for_client();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_clients_updated_at
  BEFORE UPDATE ON kyc_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_assessments_updated_at
  BEFORE UPDATE ON kyc_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_reviews_updated_at
  BEFORE UPDATE ON kyc_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dd_profiles_updated_at
  BEFORE UPDATE ON dd_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
