/*
  # Tanzania Law Firm Registration and Onboarding System

  1. New Tables
    - `law_firm_registrations`
      - Registration details for Tanzania law firms
      - TLS and BRELA registration numbers
      - Contact information
      - Sector confirmation

    - `law_firm_profiles`
      - Post-registration firm profile
      - Practice areas, client profile, risk exposure
      - Automatic tier assignment (1, 2, or 3)
      - Geographic exposure data

    - `onboarding_progress`
      - Tracks onboarding completion status
      - Step-by-step progress tracking

  2. Security
    - Enable RLS on all tables
    - Users can only access their own firm data
    - Admin can view all registrations

  3. Features
    - Automatic tier classification based on risk factors
    - Anti-gaming safeguards
    - Privacy and compliance consent tracking
    - Support for Tanzania legal sector specifics
*/

-- Law firm registrations table (during sign-up)
CREATE TABLE IF NOT EXISTS law_firm_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  law_firm_name text NOT NULL,
  tls_registration_number text,
  brela_registration_number text NOT NULL,
  firm_email text NOT NULL,
  
  -- Contact Person
  contact_person_name text NOT NULL,
  contact_person_designation text NOT NULL,
  mobile_number text NOT NULL,
  
  -- Confirmations
  sector_confirmed boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  privacy_policy_accepted boolean DEFAULT false,
  data_processing_consent boolean DEFAULT false,
  aml_cft_consent boolean DEFAULT false,
  
  -- Status
  registration_status text DEFAULT 'pending' CHECK (registration_status IN ('pending', 'active', 'suspended')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Law firm profiles (post-onboarding)
CREATE TABLE IF NOT EXISTS law_firm_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  registration_id uuid REFERENCES law_firm_registrations(id) ON DELETE CASCADE,
  
  -- Step 1: Firm Size
  firm_size text CHECK (firm_size IN ('1-3', '4-10', '11-25', '26-50', '50+')),
  number_of_advocates integer,
  
  -- Step 2: Practice Areas (array)
  practice_areas text[] DEFAULT '{}',
  
  -- Step 3: Client Profile
  serves_hnwi boolean DEFAULT false,
  serves_peps boolean DEFAULT false,
  serves_foreign_clients boolean DEFAULT false,
  serves_multinationals boolean DEFAULT false,
  serves_financial_institutions boolean DEFAULT false,
  serves_dnfbps boolean DEFAULT false,
  serves_ngos_foreign_funding boolean DEFAULT false,
  
  -- Step 4: Risk Exposure
  handles_client_funds boolean DEFAULT false,
  acts_as_company_secretary boolean DEFAULT false,
  assists_company_formation boolean DEFAULT false,
  assists_beneficial_ownership boolean DEFAULT false,
  provides_nominee_services boolean DEFAULT false,
  provides_tax_structuring boolean DEFAULT false,
  engages_cross_border_structuring boolean DEFAULT false,
  
  -- Step 5: Geographic Exposure
  conducts_cross_border_work boolean DEFAULT false,
  engages_high_risk_jurisdictions boolean DEFAULT false,
  uses_foreign_intermediaries boolean DEFAULT false,
  works_with_offshore_structures boolean DEFAULT false,
  
  -- Automatic Tier Assignment
  assigned_tier integer CHECK (assigned_tier IN (1, 2, 3)),
  tier_assignment_reason text,
  tier_locked boolean DEFAULT false,
  
  -- Onboarding
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  step_1_completed boolean DEFAULT false,
  step_2_completed boolean DEFAULT false,
  step_3_completed boolean DEFAULT false,
  step_4_completed boolean DEFAULT false,
  step_5_completed boolean DEFAULT false,
  
  all_steps_completed boolean DEFAULT false,
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE law_firm_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_firm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for law_firm_registrations
CREATE POLICY "Users can view own registration"
  ON law_firm_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own registration"
  ON law_firm_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own registration"
  ON law_firm_registrations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all registrations"
  ON law_firm_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for law_firm_profiles
CREATE POLICY "Users can view own firm profile"
  ON law_firm_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own firm profile"
  ON law_firm_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own firm profile"
  ON law_firm_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all firm profiles"
  ON law_firm_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to calculate and assign tier based on risk factors
CREATE OR REPLACE FUNCTION calculate_firm_tier(profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data law_firm_profiles;
  calculated_tier integer;
  tier_reason text;
BEGIN
  -- Get profile data
  SELECT * INTO profile_data
  FROM law_firm_profiles
  WHERE id = profile_id;

  -- Anti-Gaming Safeguard: Automatic Tier 3
  IF (
    profile_data.serves_peps = true AND
    profile_data.conducts_cross_border_work = true AND
    (profile_data.assists_beneficial_ownership = true OR profile_data.provides_tax_structuring = true)
  ) THEN
    calculated_tier := 3;
    tier_reason := 'Anti-gaming safeguard: PEP exposure + cross-border work + structuring services';
    
  -- Tier 3: Large or Complex Firms
  ELSIF (
    profile_data.firm_size IN ('26-50', '50+') OR
    profile_data.serves_multinationals = true OR
    profile_data.serves_peps = true OR
    profile_data.assists_beneficial_ownership = true OR
    profile_data.provides_tax_structuring = true OR
    profile_data.works_with_offshore_structures = true OR
    profile_data.engages_high_risk_jurisdictions = true
  ) THEN
    calculated_tier := 3;
    tier_reason := 'Large firm or complex risk exposure (multinationals, PEPs, offshore, high-risk jurisdictions)';
    
  -- Tier 2: Medium Firms
  ELSIF (
    profile_data.firm_size IN ('4-10', '11-25') OR
    profile_data.serves_foreign_clients = true OR
    profile_data.serves_financial_institutions = true OR
    profile_data.handles_client_funds = true OR
    profile_data.acts_as_company_secretary = true OR
    profile_data.serves_ngos_foreign_funding = true OR
    profile_data.conducts_cross_border_work = true
  ) THEN
    calculated_tier := 2;
    tier_reason := 'Medium firm with moderate risk exposure (foreign clients, escrow, corporate work)';
    
  -- Tier 1: Small Firms (default)
  ELSE
    calculated_tier := 1;
    tier_reason := 'Small firm with low risk exposure (domestic clients only, no complex services)';
  END IF;

  -- Update the profile with calculated tier
  UPDATE law_firm_profiles
  SET 
    assigned_tier = calculated_tier,
    tier_assignment_reason = tier_reason,
    tier_locked = true,
    updated_at = now()
  WHERE id = profile_id;

  RETURN calculated_tier;
END;
$$;

-- Trigger to auto-calculate tier when onboarding is completed
CREATE OR REPLACE FUNCTION auto_assign_tier_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.onboarding_completed = true AND OLD.onboarding_completed = false THEN
    PERFORM calculate_firm_tier(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_assign_tier
  AFTER UPDATE ON law_firm_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tier_on_completion();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_registrations_user_id ON law_firm_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_registrations_organization_id ON law_firm_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_profiles_organization_id ON law_firm_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_profiles_assigned_tier ON law_firm_profiles(assigned_tier);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
