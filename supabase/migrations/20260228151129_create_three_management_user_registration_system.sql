/*
  # Three Management Users Per Law Firm Registration System

  ## Overview
  This migration implements a system where:
  1. Law firms register with up to 3 management users
  2. The first user to apply becomes the contact person (is_primary_contact = true)
  3. All 3 management users get access to Client Dashboard and Client Management Dashboard
  4. Management users can create and approve new institutional users (staff, compliance_officer)
  5. New approved users log in through the main login page

  ## New Tables
  - `management_user_registrations`: Tracks each management user application for a law firm
  - `institutional_user_requests`: Tracks requests by management users to add staff/compliance officers

  ## Changes
  1. Creates management_user_registrations table for tracking 3 management users per firm
  2. Creates institutional_user_requests table for management users to create new users
  3. Adds helper functions to manage the 3-user limit
  4. Updates RLS policies for proper access control
  5. Ensures management users get 'management' role with proper dashboard access

  ## Security
  - Anonymous users can submit management user registrations
  - System admin can approve/reject registrations
  - Management users can create institutional user requests
  - Management users can approve institutional user requests (dual approval system)
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_organization_by_brela(TEXT);

-- =====================================================
-- TABLE: management_user_registrations
-- =====================================================
CREATE TABLE IF NOT EXISTS management_user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Details
  law_firm_name TEXT NOT NULL,
  brela_registration_number TEXT NOT NULL,
  tls_registration_number TEXT,
  firm_email TEXT NOT NULL,
  
  -- User Details
  user_full_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_position TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  
  -- Registration Type
  is_primary_contact BOOLEAN DEFAULT false,
  existing_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  registration_sequence INTEGER,
  
  -- Legal Consents
  sector_confirmed BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN DEFAULT false,
  privacy_policy_accepted BOOLEAN DEFAULT false,
  data_processing_consent BOOLEAN DEFAULT false,
  aml_cft_consent BOOLEAN DEFAULT false,
  
  -- Status Tracking
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Created User Reference
  created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_user_registrations_status ON management_user_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_management_user_registrations_brela ON management_user_registrations(brela_registration_number);
CREATE INDEX IF NOT EXISTS idx_management_user_registrations_org ON management_user_registrations(existing_organization_id);

-- =====================================================
-- TABLE: institutional_user_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS institutional_user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- User Details
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('staff', 'compliance_officer')),
  encrypted_password TEXT NOT NULL,
  
  -- Request Tracking
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected')),
  
  -- Dual Approval System
  requires_dual_approval BOOLEAN DEFAULT false,
  first_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_approved_at TIMESTAMPTZ,
  second_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  second_approved_at TIMESTAMPTZ,
  
  rejection_reason TEXT,
  
  -- Created User Reference
  created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institutional_user_requests_org ON institutional_user_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_institutional_user_requests_status ON institutional_user_requests(request_status);

-- =====================================================
-- HELPER FUNCTION: Get Management User Count by BRELA
-- =====================================================
CREATE OR REPLACE FUNCTION get_management_user_count_by_brela(brela_number TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO user_count
  FROM management_user_registrations
  WHERE brela_registration_number = brela_number
    AND registration_status IN ('approved', 'pending');
    
  RETURN COALESCE(user_count, 0);
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Check if organization exists by BRELA
-- =====================================================
CREATE OR REPLACE FUNCTION get_organization_by_brela(brela_number TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  contact_email TEXT,
  management_user_count INTEGER,
  can_accept_users BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.contact_email,
    (
      SELECT COUNT(*)::INTEGER
      FROM user_profiles up
      WHERE up.organization_id = o.id
        AND up.role = 'management'
    ) as management_user_count,
    (
      SELECT COUNT(*) < 3
      FROM user_profiles up
      WHERE up.organization_id = o.id
        AND up.role = 'management'
    ) as can_accept_users
  FROM organizations o
  WHERE o.brela_registration_number = brela_number
  LIMIT 1;
END;
$$;

-- =====================================================
-- RLS POLICIES: management_user_registrations
-- =====================================================
ALTER TABLE management_user_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous to insert management user registrations"
  ON management_user_registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "System admins can view all management user registrations"
  ON management_user_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System admins can update management user registrations"
  ON management_user_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES: institutional_user_requests
-- =====================================================
ALTER TABLE institutional_user_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management users can create institutional user requests"
  ON institutional_user_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'management'
        AND user_profiles.organization_id = institutional_user_requests.organization_id
    )
  );

CREATE POLICY "Management users can view institutional user requests"
  ON institutional_user_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'management'
        AND user_profiles.organization_id = institutional_user_requests.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Management users can update institutional user requests"
  ON institutional_user_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'management'
        AND user_profiles.organization_id = institutional_user_requests.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'management'
        AND user_profiles.organization_id = institutional_user_requests.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System admins can delete institutional user requests"
  ON institutional_user_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
