/*
  # Fix Secure Documents RLS Without Helper Functions

  1. Problem
    - get_user_role() and get_user_organization_id() helper functions cause infinite recursion
    - They query user_profiles which has RLS enabled
    - The user_profiles RLS policies call these same helper functions

  2. Solution
    - Remove dependency on helper functions for secure_documents policies
    - Use direct auth.uid() checks and EXISTS clauses
    - Simplify policies to avoid recursion

  3. Changes
    - Drop ALL existing secure_documents policies (including DELETE policies)
    - Create new simpler policies that work correctly
    - Staff can access documents they own OR documents for clients they manage
    - Management/Compliance can view all org documents
    - Admin can do everything
*/

-- Drop ALL existing policies on secure_documents
DROP POLICY IF EXISTS "admin_select_all_secure_documents" ON secure_documents;
DROP POLICY IF EXISTS "admin_update_secure_documents" ON secure_documents;
DROP POLICY IF EXISTS "admin_update_all_secure_documents" ON secure_documents;
DROP POLICY IF EXISTS "admin_delete_secure_documents" ON secure_documents;
DROP POLICY IF EXISTS "admin_delete_all_secure_documents" ON secure_documents;
DROP POLICY IF EXISTS "management_compliance_select_org_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_select_own_client_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_select_own_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_select_client_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_update_own_client_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_update_own_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_update_client_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_delete_own_documents" ON secure_documents;
DROP POLICY IF EXISTS "staff_delete_client_documents" ON secure_documents;
DROP POLICY IF EXISTS "users_select_own_documents" ON secure_documents;
DROP POLICY IF EXISTS "users_update_own_documents" ON secure_documents;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Admin can select all documents
CREATE POLICY "admin_select_all_secure_documents"
ON secure_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Management and Compliance Officers can view all org documents
CREATE POLICY "management_compliance_select_org_documents"
ON secure_documents
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('management', 'compliance_officer')
    AND user_profiles.organization_id = secure_documents.organization_id
  )
);

-- Staff can select documents they own
CREATE POLICY "staff_select_own_documents"
ON secure_documents
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
);

-- Staff can select documents for clients they manage
CREATE POLICY "staff_select_client_documents"
ON secure_documents
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
  AND EXISTS (
    SELECT 1 FROM kyc_clients
    WHERE kyc_clients.id = secure_documents.client_id
    AND kyc_clients.relationship_manager_id = auth.uid()
  )
);

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Admin can update all documents
CREATE POLICY "admin_update_all_secure_documents"
ON secure_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Staff can update documents they own
CREATE POLICY "staff_update_own_documents"
ON secure_documents
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
)
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
);

-- Staff can update documents for clients they manage
CREATE POLICY "staff_update_client_documents"
ON secure_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
  AND EXISTS (
    SELECT 1 FROM kyc_clients
    WHERE kyc_clients.id = secure_documents.client_id
    AND kyc_clients.relationship_manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
  AND EXISTS (
    SELECT 1 FROM kyc_clients
    WHERE kyc_clients.id = secure_documents.client_id
    AND kyc_clients.relationship_manager_id = auth.uid()
  )
);

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Admin can delete all documents
CREATE POLICY "admin_delete_all_secure_documents"
ON secure_documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Staff can delete their own documents
CREATE POLICY "staff_delete_own_documents"
ON secure_documents
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
);

-- Staff can delete documents for clients they manage
CREATE POLICY "staff_delete_client_documents"
ON secure_documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'staff'
  )
  AND EXISTS (
    SELECT 1 FROM kyc_clients
    WHERE kyc_clients.id = secure_documents.client_id
    AND kyc_clients.relationship_manager_id = auth.uid()
  )
);
