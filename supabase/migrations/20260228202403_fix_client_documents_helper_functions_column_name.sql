/*
  # Fix Client Documents Helper Functions Column Name

  1. Changes
    - Update helper functions to use 'id' instead of 'user_id' for user_profiles table
    - The user_profiles table primary key is 'id', not 'user_id'
*/

-- Drop and recreate helper function to check if user can access client documents
CREATE OR REPLACE FUNCTION check_client_document_access(p_client_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_org_id uuid;
  v_client_org_id uuid;
BEGIN
  -- Get user role and organization (using 'id' not 'user_id')
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
  
  -- Check if user is in same organization
  IF v_user_org_id = v_client_org_id THEN
    -- Staff, Management, and Compliance Officer can access
    IF v_user_role IN ('staff', 'management', 'compliance_officer') THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Drop and recreate helper function to check if user can modify client documents
CREATE OR REPLACE FUNCTION check_client_document_modify(p_client_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_org_id uuid;
  v_client_org_id uuid;
BEGIN
  -- Get user role and organization (using 'id' not 'user_id')
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
  
  -- Only staff can modify (in same organization)
  IF v_user_role = 'staff' AND v_user_org_id = v_client_org_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;