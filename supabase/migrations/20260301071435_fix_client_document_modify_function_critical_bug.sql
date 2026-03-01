/*
  # Fix Critical Bug in check_client_document_modify Function
  
  ## Problem
  - The check_client_document_modify() function uses WHERE user_id = p_user_id
  - However, the user_profiles table uses 'id' not 'user_id' as the primary key
  - This causes the function to always return NULL for v_user_role and v_user_org_id
  - Result: ALL document verification updates fail with "Failed to update verification status"
  
  ## Solution
  - Fix the function to use WHERE id = p_user_id (matching check_client_document_access)
  
  ## Impact
  - This will immediately fix document verification for all users
*/

-- Drop and recreate the function with the correct column name
CREATE OR REPLACE FUNCTION public.check_client_document_modify(p_client_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role text;
  v_user_org_id uuid;
  v_client_org_id uuid;
BEGIN
  -- Get user role and organization (FIXED: use 'id' not 'user_id')
  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM user_profiles
  WHERE id = p_user_id;

  -- Admin has access to everything
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get client organization
  SELECT organization_id INTO v_client_org_id
  FROM kyc_clients
  WHERE id = p_client_id;

  -- Staff, Management, and Compliance Officer can modify documents in their organization
  IF v_user_role IN ('staff', 'management', 'compliance_officer') AND v_user_org_id = v_client_org_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
