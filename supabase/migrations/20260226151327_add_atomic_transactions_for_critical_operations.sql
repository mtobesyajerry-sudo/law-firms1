/*
  # Add Atomic Transactions for Critical Operations

  This migration creates database functions that wrap critical multi-step operations
  in atomic transactions to prevent race conditions and ensure data consistency.
  
  ## Problem
  - Race conditions in operations that involve multiple table updates
  - Partial updates leaving database in inconsistent state
  - No rollback on failure in multi-step workflows
  
  ## Solution
  - Create atomic functions for critical workflows
  - Use BEGIN/COMMIT/ROLLBACK for transaction control
  - Add proper error handling with EXCEPTION blocks
  - Lock rows where necessary to prevent concurrent modifications
  
  ## Security
  - Functions are SECURITY DEFINER with proper permission checks
  - All operations validate user authorization before proceeding
  - Audit logs created for all state changes
*/

-- ============================================================================
-- PART 1: ATOMIC ASSESSMENT SUBMISSION
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_assessment_atomic(
  p_assessment_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_current_status TEXT;
  v_result JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Lock the assessment row to prevent concurrent updates
  SELECT organization_id, status
  INTO v_organization_id, v_current_status
  FROM assessments
  WHERE id = p_assessment_id
  FOR UPDATE;
  
  -- Check if assessment exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;
  
  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id
    AND organization_id = v_organization_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User not authorized for this assessment';
  END IF;
  
  -- Check current status
  IF v_current_status = 'completed' THEN
    RAISE EXCEPTION 'Assessment already completed';
  END IF;
  
  -- Update assessment status
  UPDATE assessments
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_assessment_id;
  
  -- Create audit log entry
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    organization_id
  ) VALUES (
    'assessments',
    p_assessment_id,
    'submit',
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', 'completed', 'completed_at', NOW()),
    p_user_id,
    v_organization_id
  );
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'assessment_id', p_assessment_id,
    'status', 'completed',
    'completed_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_assessment_atomic(UUID, UUID) TO authenticated;

-- ============================================================================
-- PART 2: ATOMIC USER ROLE CHANGE WITH APPROVAL
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_role_change_atomic(
  p_request_id UUID,
  p_approver_id UUID,
  p_approved BOOLEAN,
  p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_requested_role TEXT;
  v_organization_id UUID;
  v_current_status TEXT;
  v_approvals_required INTEGER;
  v_approvals_count INTEGER;
  v_result JSONB;
BEGIN
  -- Lock the role upgrade request
  SELECT user_id, requested_role, organization_id, status
  INTO v_user_id, v_requested_role, v_organization_id, v_current_status
  FROM role_upgrade_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role upgrade request not found';
  END IF;
  
  -- Verify approver has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_approver_id
    AND organization_id = v_organization_id
    AND role IN ('admin', 'management', 'senior_partner')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User not authorized to approve role changes';
  END IF;
  
  -- Check if already processed
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;
  
  -- Insert approval record
  INSERT INTO role_upgrade_approvals (
    request_id,
    approver_id,
    approved,
    comments,
    created_at
  ) VALUES (
    p_request_id,
    p_approver_id,
    p_approved,
    p_comments,
    NOW()
  );
  
  -- If rejected, update request status
  IF NOT p_approved THEN
    UPDATE role_upgrade_requests
    SET 
      status = 'rejected',
      updated_at = NOW()
    WHERE id = p_request_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'message', 'Role upgrade request rejected'
    );
    
    RETURN v_result;
  END IF;
  
  -- Count approvals (including this one)
  SELECT COUNT(*)
  INTO v_approvals_count
  FROM role_upgrade_approvals
  WHERE request_id = p_request_id
  AND approved = true;
  
  -- Determine required approvals (2 for dual approval)
  v_approvals_required := 2;
  
  -- If sufficient approvals, grant role change
  IF v_approvals_count >= v_approvals_required THEN
    -- Update user role atomically
    UPDATE user_profiles
    SET 
      role = v_requested_role,
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Update request status
    UPDATE role_upgrade_requests
    SET 
      status = 'approved',
      updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Create audit log
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      user_id,
      organization_id
    ) VALUES (
      'user_profiles',
      v_user_id,
      'role_change',
      jsonb_build_object('new_role', v_requested_role),
      p_approver_id,
      v_organization_id
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'approved',
      'new_role', v_requested_role,
      'message', 'Role upgrade granted'
    );
  ELSE
    -- Still needs more approvals
    v_result := jsonb_build_object(
      'success', true,
      'status', 'pending',
      'approvals_count', v_approvals_count,
      'approvals_required', v_approvals_required,
      'message', 'Additional approval required'
    );
  END IF;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_role_change_atomic(UUID, UUID, BOOLEAN, TEXT) TO authenticated;

-- ============================================================================
-- PART 3: ATOMIC STR DRAFT SUBMISSION
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_str_draft_atomic(
  p_str_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_current_status TEXT;
  v_result JSONB;
BEGIN
  -- Lock STR draft
  SELECT organization_id, draft_status
  INTO v_organization_id, v_current_status
  FROM str_drafts
  WHERE id = p_str_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STR draft not found';
  END IF;
  
  -- Verify user is compliance officer
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id
    AND organization_id = v_organization_id
    AND role IN ('compliance_officer', 'mlro')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only compliance officers can submit STRs';
  END IF;
  
  -- Check current status
  IF v_current_status IN ('submitted', 'filed') THEN
    RAISE EXCEPTION 'STR already submitted';
  END IF;
  
  -- Update STR status
  UPDATE str_drafts
  SET 
    draft_status = 'submitted',
    submitted_at = NOW(),
    submitted_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_str_id;
  
  -- Create audit log
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    organization_id
  ) VALUES (
    'str_drafts',
    p_str_id,
    'submit',
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', 'submitted'),
    p_user_id,
    v_organization_id
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'str_id', p_str_id,
    'status', 'submitted',
    'submitted_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_str_draft_atomic(UUID, UUID) TO authenticated;

-- ============================================================================
-- PART 4: ATOMIC SCREENING MATCH REVIEW
-- ============================================================================

CREATE OR REPLACE FUNCTION review_screening_match_atomic(
  p_screening_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_current_status TEXT;
  v_result JSONB;
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('true_match', 'false_positive', 'requires_investigation') THEN
    RAISE EXCEPTION 'Invalid decision. Must be: true_match, false_positive, or requires_investigation';
  END IF;
  
  -- Lock screening result
  SELECT organization_id, review_status
  INTO v_organization_id, v_current_status
  FROM screening_results
  WHERE id = p_screening_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Screening result not found';
  END IF;
  
  -- Verify user is compliance officer
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id
    AND organization_id = v_organization_id
    AND role IN ('compliance_officer', 'mlro')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only compliance officers can review screening matches';
  END IF;
  
  -- Update screening result
  UPDATE screening_results
  SET 
    review_status = 'reviewed',
    match_decision = p_decision,
    review_notes = p_review_notes,
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_screening_id;
  
  -- Create audit log
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    organization_id
  ) VALUES (
    'screening_results',
    p_screening_id,
    'review',
    jsonb_build_object('status', v_current_status),
    jsonb_build_object(
      'status', 'reviewed',
      'decision', p_decision
    ),
    p_user_id,
    v_organization_id
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'screening_id', p_screening_id,
    'decision', p_decision,
    'reviewed_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION review_screening_match_atomic(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- PART 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION submit_assessment_atomic(UUID, UUID) IS
'Atomically submits an assessment with proper locking and audit logging';

COMMENT ON FUNCTION approve_role_change_atomic(UUID, UUID, BOOLEAN, TEXT) IS
'Atomically processes role upgrade approval with dual-approval support';

COMMENT ON FUNCTION submit_str_draft_atomic(UUID, UUID) IS
'Atomically submits an STR draft with status validation and audit logging';

COMMENT ON FUNCTION review_screening_match_atomic(UUID, UUID, TEXT, TEXT) IS
'Atomically reviews a screening match with decision recording and audit logging';