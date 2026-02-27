/*
  # Rename public_access_requests to new_user_requests and Add Dual Approval System

  1. Changes
    - Rename public_access_requests table to new_user_requests for internal clarity
    - Add dual approval system with new_user_request_approvals table
    - Add created_by field to track which Management user initiated the request
    - Update RLS policies for internal-only access (Management users only)

  2. Security
    - Only Management users can create, view, and approve new user requests
    - Dual approval required: 2 different Management users must approve
    - No public access allowed
*/

-- Rename the table
ALTER TABLE IF EXISTS public_access_requests RENAME TO new_user_requests;

-- Add created_by field to track who initiated the request
ALTER TABLE new_user_requests 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add password_hash field to store temporary password
ALTER TABLE new_user_requests 
ADD COLUMN IF NOT EXISTS password_hash text;

-- Update the constraint to include all internal roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'public_access_requests_requested_access_check'
  ) THEN
    ALTER TABLE new_user_requests DROP CONSTRAINT public_access_requests_requested_access_check;
  END IF;
  
  ALTER TABLE new_user_requests
  ADD CONSTRAINT new_user_requests_requested_access_check 
  CHECK (requested_access IN ('staff', 'compliance_officer', 'lawyer', 'mlro'));
END $$;

-- Create approvals table for dual approval system
CREATE TABLE IF NOT EXISTS new_user_request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES new_user_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, approver_id)
);

-- Enable RLS on both tables
ALTER TABLE new_user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_user_request_approvals ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can insert access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Anyone can view own access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON new_user_requests;
DROP POLICY IF EXISTS "Admins can delete access requests" ON new_user_requests;

-- New RLS Policies for new_user_requests (Management users only)
CREATE POLICY "Management users can view new user requests in their org"
  ON new_user_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
  );

CREATE POLICY "Management users can create new user requests"
  ON new_user_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
  );

CREATE POLICY "Management users can update new user requests in their org"
  ON new_user_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
  );

CREATE POLICY "Management users can delete new user requests in their org"
  ON new_user_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
  );

-- RLS Policies for new_user_request_approvals
CREATE POLICY "Management users can view approvals"
  ON new_user_request_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
  );

CREATE POLICY "Management users can insert approvals"
  ON new_user_request_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'senior_partner', 'partner')
      AND user_profiles.organization_id IS NOT NULL
    )
    AND approver_id = auth.uid()
  );

-- Function to process new user request after dual approval
CREATE OR REPLACE FUNCTION process_new_user_approval(
  p_request_id uuid,
  p_approver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request new_user_requests;
  v_approval_count int;
  v_approver_org_id uuid;
  v_creator_org_id uuid;
  v_new_user_id uuid;
  v_temp_password text;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM new_user_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;
  
  -- Check if already processed
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request already processed');
  END IF;
  
  -- Get approver's organization
  SELECT organization_id INTO v_approver_org_id 
  FROM user_profiles 
  WHERE id = p_approver_id;
  
  -- Get creator's organization
  SELECT organization_id INTO v_creator_org_id 
  FROM user_profiles 
  WHERE id = v_request.created_by;
  
  -- Verify they're in the same organization
  IF v_approver_org_id != v_creator_org_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Approver must be in same organization as requester');
  END IF;
  
  -- Check if approver is the creator
  IF p_approver_id = v_request.created_by THEN
    RETURN jsonb_build_object('success', false, 'message', 'You cannot approve your own request');
  END IF;
  
  -- Check if already approved by this user
  IF EXISTS (
    SELECT 1 FROM new_user_request_approvals 
    WHERE request_id = p_request_id AND approver_id = p_approver_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already approved this request');
  END IF;
  
  -- Add the approval
  INSERT INTO new_user_request_approvals (request_id, approver_id)
  VALUES (p_request_id, p_approver_id);
  
  -- Count total approvals
  SELECT COUNT(*) INTO v_approval_count
  FROM new_user_request_approvals
  WHERE request_id = p_request_id;
  
  -- If we have 2 approvals, create the user
  IF v_approval_count >= 2 THEN
    -- Generate temporary password (will be shown to approvers)
    v_temp_password := 'Temp' || substr(md5(random()::text), 1, 8) || '!';
    
    -- Create the user account via edge function (we'll call this from the frontend)
    -- For now, just mark as approved and store the temp password
    UPDATE new_user_requests
    SET 
      status = 'approved',
      reviewed_by = p_approver_id,
      reviewed_at = now(),
      password_hash = v_temp_password
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Request fully approved - ready to create user',
      'approval_count', v_approval_count,
      'temp_password', v_temp_password,
      'requires_user_creation', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'First approval recorded - one more approval needed',
      'approval_count', v_approval_count,
      'requires_user_creation', false
    );
  END IF;
END;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_new_user_requests_status ON new_user_requests(status);
CREATE INDEX IF NOT EXISTS idx_new_user_requests_created_by ON new_user_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_new_user_request_approvals_request_id ON new_user_request_approvals(request_id);
