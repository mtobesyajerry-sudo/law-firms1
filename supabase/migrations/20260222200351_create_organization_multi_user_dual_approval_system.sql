/*
  # Multi-User Organization Access with Dual Approval System

  ## Overview
  Implements a secure multi-user organization system where:
  - Each organization can have up to 3 users with Management page access
  - Role upgrade requests (Staff/Compliance) require approval from 2 of the 3 users
  - Strong security controls to prevent unauthorized access

  ## New Tables
  
  ### `organization_user_access`
  Tracks the authorized users who can access the Management page for each organization.
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `user_id` (uuid, references user_profiles)
  - `granted_by` (uuid, references user_profiles) - Admin who granted access
  - `granted_at` (timestamptz)
  - `is_active` (boolean) - Can be revoked
  - Constraint: Maximum 3 active users per organization

  ### `role_upgrade_approvals`
  Tracks individual approvals for role upgrade requests (dual approval workflow).
  - `id` (uuid, primary key)
  - `request_id` (uuid, references role_upgrade_requests)
  - `approver_user_id` (uuid, references user_profiles)
  - `organization_id` (uuid, references organizations)
  - `approved_at` (timestamptz)
  - `comments` (text)
  - Constraint: One approval per user per request

  ## Modified Tables
  
  ### `role_upgrade_requests`
  - Add `approvals_count` (integer, default 0)
  - Add `approvals_required` (integer, default 2)
  - Add `approved_by_user_ids` (uuid[]) - Array of approver IDs

  ## Functions
  
  - `get_organization_management_users(org_id)` - Returns active management users
  - `check_user_has_management_access(user_id, org_id)` - Validates management access
  - `can_add_management_user(org_id)` - Checks if org has room for another user
  - `process_role_upgrade_approval(request_id, approver_id)` - Handles approval logic

  ## Security
  - RLS enabled on all tables
  - Only admins can grant organization_user_access
  - Only authorized org users can approve role upgrades
  - Users cannot approve their own requests
*/

-- Create organization_user_access table
CREATE TABLE IF NOT EXISTS organization_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_org_user_access_org_id ON organization_user_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_user_access_user_id ON organization_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_org_user_access_active ON organization_user_access(organization_id, is_active) WHERE is_active = true;

-- Add constraint: Maximum 3 active users per organization
CREATE OR REPLACE FUNCTION check_max_org_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    IF (SELECT COUNT(*) 
        FROM organization_user_access 
        WHERE organization_id = NEW.organization_id 
        AND is_active = true 
        AND id != COALESCE(NEW.id, gen_random_uuid())) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active users per organization allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_org_users ON organization_user_access;
CREATE TRIGGER enforce_max_org_users
  BEFORE INSERT OR UPDATE ON organization_user_access
  FOR EACH ROW
  EXECUTE FUNCTION check_max_org_users();

-- Create role_upgrade_approvals table
CREATE TABLE IF NOT EXISTS role_upgrade_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES role_upgrade_requests(id) ON DELETE CASCADE,
  approver_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approved_at timestamptz DEFAULT now(),
  comments text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, approver_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_upgrade_approvals_request ON role_upgrade_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_approvals_approver ON role_upgrade_approvals(approver_user_id);

-- Add columns to role_upgrade_requests if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_upgrade_requests' AND column_name = 'approvals_count'
  ) THEN
    ALTER TABLE role_upgrade_requests ADD COLUMN approvals_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_upgrade_requests' AND column_name = 'approvals_required'
  ) THEN
    ALTER TABLE role_upgrade_requests ADD COLUMN approvals_required integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_upgrade_requests' AND column_name = 'approved_by_user_ids'
  ) THEN
    ALTER TABLE role_upgrade_requests ADD COLUMN approved_by_user_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Helper function: Get organization management users
CREATE OR REPLACE FUNCTION get_organization_management_users(org_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name
  FROM organization_user_access oua
  JOIN user_profiles up ON up.id = oua.user_id
  WHERE oua.organization_id = org_id
  AND oua.is_active = true
  ORDER BY oua.granted_at;
END;
$$;

-- Helper function: Check if user has management access
CREATE OR REPLACE FUNCTION check_user_has_management_access(check_user_id uuid, org_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_user_access 
    WHERE user_id = check_user_id 
    AND organization_id = org_id 
    AND is_active = true
  );
END;
$$;

-- Helper function: Check if organization can add more management users
CREATE OR REPLACE FUNCTION can_add_management_user(org_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM organization_user_access 
    WHERE organization_id = org_id 
    AND is_active = true
  ) < 3;
END;
$$;

-- Function: Process role upgrade approval
CREATE OR REPLACE FUNCTION process_role_upgrade_approval(
  p_request_id uuid,
  p_approver_id uuid
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_request role_upgrade_requests;
  v_approval_record role_upgrade_approvals;
  v_new_approval_count integer;
  v_result jsonb;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM role_upgrade_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Check if already approved
  IF v_request.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request already approved');
  END IF;

  -- Check if approver has management access
  IF NOT check_user_has_management_access(p_approver_id, v_request.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approver does not have management access');
  END IF;

  -- Check if approver is not the requester
  IF v_request.user_id = p_approver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve your own request');
  END IF;

  -- Check if already approved by this user
  IF p_approver_id = ANY(v_request.approved_by_user_ids) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already approved this request');
  END IF;

  -- Insert approval record
  INSERT INTO role_upgrade_approvals (request_id, approver_user_id, organization_id)
  VALUES (p_request_id, p_approver_id, v_request.organization_id)
  RETURNING * INTO v_approval_record;

  -- Update request with new approval
  UPDATE role_upgrade_requests
  SET 
    approvals_count = approvals_count + 1,
    approved_by_user_ids = array_append(approved_by_user_ids, p_approver_id),
    status = CASE 
      WHEN approvals_count + 1 >= approvals_required THEN 'approved'
      ELSE status
    END,
    approved_at = CASE 
      WHEN approvals_count + 1 >= approvals_required THEN now()
      ELSE approved_at
    END
  WHERE id = p_request_id
  RETURNING approvals_count INTO v_new_approval_count;

  -- If fully approved, update user role
  IF v_new_approval_count >= v_request.approvals_required THEN
    UPDATE user_profiles
    SET role = v_request.requested_role
    WHERE id = v_request.user_id;

    v_result := jsonb_build_object(
      'success', true,
      'fully_approved', true,
      'approvals_count', v_new_approval_count,
      'message', 'Request fully approved and role updated'
    );
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'fully_approved', false,
      'approvals_count', v_new_approval_count,
      'approvals_required', v_request.approvals_required,
      'message', format('Approval recorded. %s of %s approvals received', v_new_approval_count, v_request.approvals_required)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Enable RLS
ALTER TABLE organization_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_upgrade_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_user_access

-- Admins can do everything
CREATE POLICY "Admins can select organization_user_access"
  ON organization_user_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert organization_user_access"
  ON organization_user_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update organization_user_access"
  ON organization_user_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete organization_user_access"
  ON organization_user_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own access
CREATE POLICY "Users can view own organization_user_access"
  ON organization_user_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for role_upgrade_approvals

-- Admins can view all approvals
CREATE POLICY "Admins can select role_upgrade_approvals"
  ON role_upgrade_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Management users can view approvals for their organization
CREATE POLICY "Management users can view org approvals"
  ON role_upgrade_approvals FOR SELECT
  TO authenticated
  USING (
    check_user_has_management_access(auth.uid(), organization_id)
  );

-- Management users can insert approvals
CREATE POLICY "Management users can insert approvals"
  ON role_upgrade_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_has_management_access(auth.uid(), organization_id)
    AND approver_user_id = auth.uid()
  );

-- Update role_upgrade_requests policies to allow management users to view
DROP POLICY IF EXISTS "Management users can view org role upgrade requests" ON role_upgrade_requests;
CREATE POLICY "Management users can view org role upgrade requests"
  ON role_upgrade_requests FOR SELECT
  TO authenticated
  USING (
    check_user_has_management_access(auth.uid(), organization_id)
  );
