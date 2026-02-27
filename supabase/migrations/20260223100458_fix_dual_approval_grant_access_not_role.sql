/*
  # Fix Dual Approval System - Grant Access Instead of Changing Role

  ## Problem
  The current approval system changes the user's role (e.g., management -> staff)
  which removes their management access. This is incorrect.

  ## Solution
  Instead of changing the user's role, grant them ACCESS to the requested role's
  dashboard via the organization_user_access table.

  ## How It Works
  - Management users keep their role = 'management'
  - When approved for Staff access, they get an entry in organization_user_access
  - The routing system checks BOTH role AND organization_user_access
  - This allows Management users to access both Management AND Staff dashboards

  ## Security
  - Management role is preserved (only 3 management users)
  - Access is granted through organization_user_access with proper audit trail
  - Two approvals still required
  - Users cannot approve their own requests
*/

-- Drop and recreate the function to grant access instead of changing role
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
    reviewed_at = CASE 
      WHEN approvals_count + 1 >= approvals_required THEN now()
      ELSE reviewed_at
    END,
    reviewed_by = CASE 
      WHEN approvals_count + 1 >= approvals_required THEN p_approver_id
      ELSE reviewed_by
    END,
    updated_at = now()
  WHERE id = p_request_id
  RETURNING approvals_count INTO v_new_approval_count;

  -- If fully approved, grant access to the requested role via organization_user_access
  -- DO NOT CHANGE THE USER'S ROLE
  IF v_new_approval_count >= v_request.approvals_required THEN
    -- Grant access by adding entry to organization_user_access
    INSERT INTO organization_user_access (
      user_id,
      organization_id,
      access_role,
      granted_by,
      is_active
    )
    VALUES (
      v_request.user_id,
      v_request.organization_id,
      v_request.requested_role,
      p_approver_id,
      true
    )
    ON CONFLICT (user_id, organization_id, access_role) 
    DO UPDATE SET
      is_active = true,
      granted_by = p_approver_id,
      granted_at = now();

    v_result := jsonb_build_object(
      'success', true,
      'fully_approved', true,
      'approvals_count', v_new_approval_count,
      'message', format('Request fully approved. User granted access to %s dashboard while keeping their %s role', v_request.requested_role, v_request.current_user_role)
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
