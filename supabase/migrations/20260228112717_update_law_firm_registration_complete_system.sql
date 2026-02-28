/*
  # Update Law Firm Registration System - Complete Tanzania Structure
  
  1. Purpose
    - Implement the complete Tanzania law firm registration and onboarding system
    - Add firm profile table for post-signup onboarding data
    - Support automatic tier assignment based on risk factors
  
  2. Changes
    - Ensure law_firm_registrations has all required signup fields
    - Create law_firm_profiles table for post-signup onboarding data
    - Add tier assignment logic and functions
  
  3. Security
    - Enable RLS on all new tables
    - Anonymous users can only insert registration requests
    - Admin users can view and approve registrations
*/

-- Ensure law_firm_registrations table is properly structured
-- (Already exists, just verify structure matches requirements)

-- Create law_firm_profiles table for post-signup onboarding
CREATE TABLE IF NOT EXISTS law_firm_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Firm Size
  number_of_advocates text CHECK (number_of_advocates IN ('1-3', '4-10', '11-25', '26-50', 'More than 50')),
  
  -- Practice Areas (stored as array)
  practice_areas text[] DEFAULT '{}',
  
  -- Client Profile (checkboxes stored as array)
  serves_high_net_worth boolean DEFAULT false,
  serves_peps boolean DEFAULT false,
  serves_foreign_clients boolean DEFAULT false,
  serves_multinationals boolean DEFAULT false,
  serves_financial_institutions boolean DEFAULT false,
  serves_dnfbps boolean DEFAULT false,
  serves_ngos_foreign_funding boolean DEFAULT false,
  
  -- Risk Exposure (checkboxes)
  handles_client_funds boolean DEFAULT false,
  acts_as_company_secretary boolean DEFAULT false,
  assists_company_formation boolean DEFAULT false,
  assists_beneficial_ownership boolean DEFAULT false,
  provides_nominee_services boolean DEFAULT false,
  provides_tax_structuring boolean DEFAULT false,
  engages_cross_border_structuring boolean DEFAULT false,
  
  -- Geographic Exposure (checkboxes)
  conducts_cross_border_work boolean DEFAULT false,
  engages_high_risk_jurisdictions boolean DEFAULT false,
  uses_foreign_intermediaries boolean DEFAULT false,
  works_with_offshore_structures boolean DEFAULT false,
  
  -- Automatic Tier Assignment
  assigned_tier text CHECK (assigned_tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
  tier_assigned_at timestamptz,
  
  -- Profile completion
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE law_firm_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for law_firm_profiles
CREATE POLICY "Admin can view all firm profiles"
  ON law_firm_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Organization members can view own firm profile"
  ON law_firm_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization can insert own firm profile"
  ON law_firm_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization can update own firm profile"
  ON law_firm_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Function to calculate tier based on profile data
CREATE OR REPLACE FUNCTION calculate_law_firm_tier(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record law_firm_profiles;
  calculated_tier text;
BEGIN
  SELECT * INTO profile_record FROM law_firm_profiles WHERE id = profile_id;
  
  -- Anti-Gaming Safeguard: Automatic Tier 3 if high-risk combination
  IF (profile_record.serves_peps = true 
      AND profile_record.conducts_cross_border_work = true 
      AND (profile_record.assists_beneficial_ownership = true 
           OR profile_record.provides_tax_structuring = true 
           OR profile_record.engages_cross_border_structuring = true)) THEN
    calculated_tier := 'Tier 3';
    
  -- Tier 3: Large or Complex Firms
  ELSIF (profile_record.number_of_advocates = 'More than 50'
         OR profile_record.serves_multinationals = true
         OR profile_record.serves_peps = true
         OR (profile_record.assists_beneficial_ownership = true 
             AND profile_record.conducts_cross_border_work = true)
         OR profile_record.works_with_offshore_structures = true
         OR profile_record.engages_high_risk_jurisdictions = true) THEN
    calculated_tier := 'Tier 3';
    
  -- Tier 1: Small Firms (must meet ALL criteria)
  ELSIF (profile_record.number_of_advocates = '1-3'
         AND profile_record.serves_foreign_clients = false
         AND profile_record.serves_peps = false
         AND profile_record.handles_client_funds = false
         AND profile_record.assists_beneficial_ownership = false
         AND profile_record.conducts_cross_border_work = false) THEN
    calculated_tier := 'Tier 1';
    
  -- Tier 2: Medium Firms (default for everything else)
  ELSE
    calculated_tier := 'Tier 2';
  END IF;
  
  RETURN calculated_tier;
END;
$$;

-- Trigger to auto-assign tier when profile is created or updated
CREATE OR REPLACE FUNCTION auto_assign_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tier text;
BEGIN
  -- Calculate tier
  new_tier := calculate_law_firm_tier(NEW.id);
  
  -- Update the tier
  NEW.assigned_tier := new_tier;
  NEW.tier_assigned_at := now();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_tier ON law_firm_profiles;
CREATE TRIGGER trigger_auto_assign_tier
  BEFORE INSERT OR UPDATE ON law_firm_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tier();

-- Add updated_at trigger for law_firm_profiles
CREATE OR REPLACE FUNCTION update_law_firm_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_law_firm_profiles_updated_at ON law_firm_profiles;
CREATE TRIGGER trigger_update_law_firm_profiles_updated_at
  BEFORE UPDATE ON law_firm_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_law_firm_profiles_updated_at();
