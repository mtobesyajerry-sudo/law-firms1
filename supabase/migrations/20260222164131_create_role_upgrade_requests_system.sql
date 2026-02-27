/*
  # Role Upgrade Request System

  1. New Tables
    - `role_upgrade_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `organization_id` (uuid, references organizations)
      - `current_user_role` (text) - The user's current role
      - `requested_role` (text) - The role they want to upgrade to
      - `justification` (text) - Why they need this role
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `reviewed_by` (uuid, references auth.users) - Admin who reviewed
      - `reviewed_at` (timestamptz)
      - `rejection_reason` (text) - If rejected, why
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `role_upgrade_requests` table
    - Users can insert their own requests
    - Users can view their own requests
    - Admins can view all requests in their organization
    - Admins can update requests (approve/reject)

  3. Valid Role Transitions
    - client -> lawyer, staff, compliance_officer, management
    - lawyer -> senior_partner, management
    - staff -> management
    - compliance_officer -> mlro
*/

-- Create role_upgrade_requests table
CREATE TABLE IF NOT EXISTS role_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_user_role text NOT NULL,
  requested_role text NOT NULL CHECK (requested_role IN ('lawyer', 'staff', 'compliance_officer', 'mlro', 'management', 'senior_partner')),
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_user_id ON role_upgrade_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_organization_id ON role_upgrade_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_status ON role_upgrade_requests(status);

-- Enable RLS
ALTER TABLE role_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own upgrade requests
CREATE POLICY "Users can create own role upgrade requests"
  ON role_upgrade_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Users can view their own requests
CREATE POLICY "Users can view own role upgrade requests"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all requests in their organization
CREATE POLICY "Admins can view all role upgrade requests in organization"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
    )
  );

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update role upgrade requests in organization"
  ON role_upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
    )
  );

-- Create function to automatically update user role when request is approved
CREATE OR REPLACE FUNCTION handle_role_upgrade_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the user's role in user_profiles
    UPDATE user_profiles
    SET 
      role = NEW.requested_role,
      updated_at = now()
    WHERE id = NEW.user_id;
    
    -- Set review timestamp
    NEW.reviewed_at = now();
  END IF;
  
  -- Set review timestamp for rejections too
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    NEW.reviewed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update role on approval
DROP TRIGGER IF EXISTS trigger_role_upgrade_approval ON role_upgrade_requests;
CREATE TRIGGER trigger_role_upgrade_approval
  BEFORE UPDATE ON role_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_upgrade_approval();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_role_upgrade_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_role_upgrade_requests_updated_at ON role_upgrade_requests;
CREATE TRIGGER trigger_update_role_upgrade_requests_updated_at
  BEFORE UPDATE ON role_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_role_upgrade_requests_updated_at();