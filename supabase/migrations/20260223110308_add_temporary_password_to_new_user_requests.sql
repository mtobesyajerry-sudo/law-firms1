/*
  # Add Temporary Password Field to New User Requests

  1. Changes
    - Add temporary_password field to store the plain password during approval process
    - Keep password_hash for security audit trail
    - The plain password will be used when creating the user account
    - After user is created, this field can be cleared

  2. Security
    - Password is only visible to Management users who can approve
    - Password is cleared after user account is created
    - RLS policies already restrict access to Management users only
*/

-- Add temporary password field
ALTER TABLE new_user_requests 
ADD COLUMN IF NOT EXISTS temporary_password text;

-- Update the process_new_user_approval function to not overwrite password_hash
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
  IF v_approver_org_id IS NULL OR v_creator_org_id IS NULL OR v_approver_org_id != v_creator_org_id THEN
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
  
  -- If we have 2 approvals, mark as ready for user creation
  IF v_approval_count >= 2 THEN
    -- Mark as approved - password is already stored in temporary_password field
    UPDATE new_user_requests
    SET 
      status = 'approved',
      reviewed_by = p_approver_id,
      reviewed_at = now()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Request fully approved - ready to create user',
      'approval_count', v_approval_count,
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
