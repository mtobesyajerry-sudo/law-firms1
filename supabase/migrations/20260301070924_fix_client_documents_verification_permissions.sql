/*
  # Fix Client Documents Verification Permissions
  
  ## Changes
  - Update check_client_document_modify function to allow verification by staff, management, and compliance_officer roles
  - This fixes the "Failed to update verification status" error
  
  ## Security
  - Maintains organization-level isolation
  - Only allows authorized roles to verify documents
  - Admin retains full access
*/

-- Update helper function to allow verification by multiple roles
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
  -- Get user role and organization
  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM user_profiles
  WHERE user_id = p_user_id;
  
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
$$;
