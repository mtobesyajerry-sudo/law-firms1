/*
  # Create Two-Tier User Approval System

  ## Overview
  This migration implements a secure two-tier approval system:
  
  **TIER 1: System Administrator Approval**
  - For management-level users (management, senior_partner, partner)
  - Requests submitted via public "Request Access" form at login page
  - Stored in `admin_user_requests` table
  - Approved by System Administrators (role='admin')
  
  **TIER 2: Management Approval**  
  - For institutional users (staff, compliance_officer, client)
  - Requests submitted from within Management Dashboard
  - Stored in `new_user_requests` table with organization_id
  - Approved by Management users within their organization
  
  ## Security Model
  1. Only System Admins can approve management-level users
  2. Only Management users can approve institutional users within their org
  3. Clear separation prevents privilege escalation
  
  ## Changes
  1. Create `admin_user_requests` table for Tier 1 (System Admin approval)
  2. Add `organization_id` to `new_user_requests` for Tier 2 (Management approval)
  3. Add constraints to ensure proper request routing
  4. Set up RLS policies for secure access control
*/

-- Drop existing new_user_requests structure if needed
ALTER TABLE IF EXISTS new_user_requests 
  DROP CONSTRAINT IF EXISTS new_user_requests_requested_access_check;

-- Create admin_user_requests table for TIER 1 (System Admin Approval)
CREATE TABLE IF NOT EXISTS admin_user_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text NOT NULL,
  organization_name text NOT NULL,
  requested_access text NOT NULL CHECK (requested_access IN ('management', 'senior_partner', 'partner')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization_id to new_user_requests for TIER 2 (Management Approval)
ALTER TABLE new_user_requests 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Update constraint to only allow institutional roles in new_user_requests
ALTER TABLE new_user_requests 
  ADD CONSTRAINT new_user_requests_requested_access_check 
  CHECK (requested_access IN ('staff', 'compliance_officer', 'client'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_user_requests_status ON admin_user_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_user_requests_email ON admin_user_requests(email);
CREATE INDEX IF NOT EXISTS idx_new_user_requests_organization_id ON new_user_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_new_user_requests_status ON new_user_requests(status);

-- Enable RLS
ALTER TABLE admin_user_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_user_requests

-- Allow anonymous users to insert (public registration from login page)
CREATE POLICY "Allow anonymous to submit admin user requests"
  ON admin_user_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow System Admins to view all requests
CREATE POLICY "Allow admins to view all admin user requests"
  ON admin_user_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow System Admins to update requests (approve/reject)
CREATE POLICY "Allow admins to update admin user requests"
  ON admin_user_requests
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

-- Allow System Admins to delete requests
CREATE POLICY "Allow admins to delete admin user requests"
  ON admin_user_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Update RLS policies for new_user_requests to require organization_id

-- Drop old policies that don't consider organization
DROP POLICY IF EXISTS "Allow authenticated users to view new user requests" ON new_user_requests;
DROP POLICY IF EXISTS "Allow management to view new user requests" ON new_user_requests;

-- Allow Management users to view requests for THEIR organization only
CREATE POLICY "Allow management to view org user requests"
  ON new_user_requests
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND (
      -- Management within the same organization
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('management', 'senior_partner', 'partner')
        AND user_profiles.organization_id = new_user_requests.organization_id
      )
      -- OR System Admin can see all
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      )
    )
  );

-- Allow Management users to insert requests for THEIR organization
CREATE POLICY "Allow management to create org user requests"
  ON new_user_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id = new_user_requests.organization_id
    )
  );

-- Allow Management users to update requests for THEIR organization
CREATE POLICY "Allow management to update org user requests"
  ON new_user_requests
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id = new_user_requests.organization_id
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id = new_user_requests.organization_id
    )
  );

-- Allow Management users to delete requests for THEIR organization
CREATE POLICY "Allow management to delete org user requests"
  ON new_user_requests
  FOR DELETE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id = new_user_requests.organization_id
    )
  );

-- Create audit trigger
CREATE OR REPLACE FUNCTION update_admin_user_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER admin_user_requests_updated_at
  BEFORE UPDATE ON admin_user_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_user_requests_updated_at();

-- Add helpful comments
COMMENT ON TABLE admin_user_requests IS 'TIER 1: Management-level user requests approved by System Administrators';
COMMENT ON TABLE new_user_requests IS 'TIER 2: Institutional user requests approved by Management within their organization';
COMMENT ON COLUMN admin_user_requests.requested_access IS 'Must be management, senior_partner, or partner';
COMMENT ON COLUMN new_user_requests.requested_access IS 'Must be staff, compliance_officer, or client';
COMMENT ON COLUMN new_user_requests.organization_id IS 'Required - ties request to specific organization for management approval';
