/*
  # Add RLS Policies for Client Documents

  1. Helper Functions
    - Create security definer functions to avoid RLS recursion
    
  2. Security
    - Add comprehensive RLS policies for client_documents table
    - Staff users can insert, select, update, and delete documents for clients in their organization
    - Admins have full access to all documents
    - Management and Compliance Officer roles have read-only access
*/

-- Helper function to check if user can access client documents
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

-- Helper function to check if user can modify client documents
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
  
  -- Only staff can modify (in same organization)
  IF v_user_role = 'staff' AND v_user_org_id = v_client_org_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can select client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can insert client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can update client documents" ON client_documents;
DROP POLICY IF EXISTS "Users can delete client documents" ON client_documents;

-- Create new policies using helper functions
CREATE POLICY "Users can select client documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (check_client_document_access(client_id, auth.uid()));

CREATE POLICY "Users can insert client documents"
  ON client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (check_client_document_modify(client_id, auth.uid()));

CREATE POLICY "Users can update client documents"
  ON client_documents
  FOR UPDATE
  TO authenticated
  USING (check_client_document_access(client_id, auth.uid()))
  WITH CHECK (check_client_document_modify(client_id, auth.uid()));

CREATE POLICY "Users can delete client documents"
  ON client_documents
  FOR DELETE
  TO authenticated
  USING (check_client_document_modify(client_id, auth.uid()));