/*
  # Implement Staff-Owned Data Access Model

  ## Overview
  This migration implements a staff-owned data access model where:
  - Staff users can only see and edit their own assigned matters and clients
  - Management and Compliance Officers can see all matters and clients but cannot edit them (read-only)
  - Admin retains full access (read and write)

  ## Changes Made
  
  ### 1. RLS Policy Updates for matters table
  - Staff: Can only SELECT, INSERT, UPDATE, DELETE their own matters (where responsible_lawyer_id = auth.uid())
  - Management: Can SELECT all matters in their organization (read-only)
  - Compliance Officer: Can SELECT all matters in their organization (read-only)
  - Admin: Full access to all matters
  
  ### 2. RLS Policy Updates for kyc_clients table
  - Staff: Can only SELECT, INSERT, UPDATE, DELETE their own clients (where relationship_manager_id = auth.uid())
  - Management: Can SELECT all clients in their organization (read-only)
  - Compliance Officer: Can SELECT all clients in their organization (read-only)
  - Admin: Full access to all clients

  ### 3. Related Tables
  - Updates RLS policies for related tables (client_documents) to follow the same pattern
*/

-- ================================================
-- PART 1: DROP EXISTING POLICIES FOR matters TABLE
-- ================================================

DROP POLICY IF EXISTS "Admin full access to matters" ON matters;
DROP POLICY IF EXISTS "Users can view own organization matters" ON matters;
DROP POLICY IF EXISTS "Users can insert matters in own organization" ON matters;
DROP POLICY IF EXISTS "Users can update own organization matters" ON matters;
DROP POLICY IF EXISTS "Users can delete own organization matters" ON matters;
DROP POLICY IF EXISTS "Staff can view own organization matters" ON matters;
DROP POLICY IF EXISTS "Staff can insert own organization matters" ON matters;
DROP POLICY IF EXISTS "Staff can update own organization matters" ON matters;
DROP POLICY IF EXISTS "Staff can delete own organization matters" ON matters;
DROP POLICY IF EXISTS "Management can view all org matters" ON matters;
DROP POLICY IF EXISTS "Compliance can view all org matters" ON matters;
DROP POLICY IF EXISTS "Admin can select all matters" ON matters;
DROP POLICY IF EXISTS "Admin can insert matters" ON matters;
DROP POLICY IF EXISTS "Admin can update matters" ON matters;
DROP POLICY IF EXISTS "Admin can delete matters" ON matters;
DROP POLICY IF EXISTS "Staff can select own assigned matters" ON matters;
DROP POLICY IF EXISTS "Staff can insert matters assigned to them" ON matters;
DROP POLICY IF EXISTS "Staff can update own assigned matters" ON matters;
DROP POLICY IF EXISTS "Staff can delete own assigned matters" ON matters;
DROP POLICY IF EXISTS "Management can view all org matters read-only" ON matters;
DROP POLICY IF EXISTS "Compliance Officer can view all org matters read-only" ON matters;

-- ================================================
-- PART 2: CREATE NEW POLICIES FOR matters TABLE
-- ================================================

-- Admin: Full access
CREATE POLICY "Admin can select all matters"
  ON matters FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can insert matters"
  ON matters FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update matters"
  ON matters FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete matters"
  ON matters FOR DELETE
  TO authenticated
  USING (is_admin());

-- Staff: Can only access their own assigned matters
CREATE POLICY "Staff can select own assigned matters"
  ON matters FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND responsible_lawyer_id = auth.uid()
  );

CREATE POLICY "Staff can insert matters assigned to them"
  ON matters FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'staff' 
    AND responsible_lawyer_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Staff can update own assigned matters"
  ON matters FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND responsible_lawyer_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'staff' 
    AND responsible_lawyer_id = auth.uid()
  );

CREATE POLICY "Staff can delete own assigned matters"
  ON matters FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND responsible_lawyer_id = auth.uid()
  );

-- Management: Read-only access to all org matters
CREATE POLICY "Management can view all org matters read-only"
  ON matters FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  );

-- Compliance Officer: Read-only access to all org matters
CREATE POLICY "Compliance Officer can view all org matters read-only"
  ON matters FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'compliance_officer' 
    AND organization_id = get_user_organization_id()
  );

-- ================================================
-- PART 3: DROP EXISTING POLICIES FOR kyc_clients TABLE
-- ================================================

DROP POLICY IF EXISTS "Admin full access to kyc_clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can view own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can insert clients in own organization" ON kyc_clients;
DROP POLICY IF EXISTS "Users can update own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can delete own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can view own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can insert clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can update own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can delete own organization clients" ON kyc_clients;
DROP POLICY IF EXISTS "Management can view all org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Compliance can view all org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admin can select all kyc_clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admin can insert kyc_clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admin can update kyc_clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admin can delete kyc_clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can select own assigned clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can insert clients assigned to them" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can update own assigned clients" ON kyc_clients;
DROP POLICY IF EXISTS "Staff can delete own assigned clients" ON kyc_clients;
DROP POLICY IF EXISTS "Management can view all org clients read-only" ON kyc_clients;
DROP POLICY IF EXISTS "Compliance Officer can view all org clients read-only" ON kyc_clients;

-- ================================================
-- PART 4: CREATE NEW POLICIES FOR kyc_clients TABLE
-- ================================================

-- Admin: Full access
CREATE POLICY "Admin can select all kyc_clients"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can insert kyc_clients"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update kyc_clients"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete kyc_clients"
  ON kyc_clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- Staff: Can only access their own assigned clients
CREATE POLICY "Staff can select own assigned clients"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND relationship_manager_id = auth.uid()
  );

CREATE POLICY "Staff can insert clients assigned to them"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'staff' 
    AND relationship_manager_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Staff can update own assigned clients"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND relationship_manager_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'staff' 
    AND relationship_manager_id = auth.uid()
  );

CREATE POLICY "Staff can delete own assigned clients"
  ON kyc_clients FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND relationship_manager_id = auth.uid()
  );

-- Management: Read-only access to all org clients
CREATE POLICY "Management can view all org clients read-only"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  );

-- Compliance Officer: Read-only access to all org clients
CREATE POLICY "Compliance Officer can view all org clients read-only"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'compliance_officer' 
    AND organization_id = get_user_organization_id()
  );

-- ================================================
-- PART 5: UPDATE POLICIES FOR client_documents TABLE
-- ================================================

DROP POLICY IF EXISTS "Users can view documents for own org clients" ON client_documents;
DROP POLICY IF EXISTS "Users can insert documents for own org clients" ON client_documents;
DROP POLICY IF EXISTS "Users can update documents for own org clients" ON client_documents;
DROP POLICY IF EXISTS "Users can delete documents for own org clients" ON client_documents;
DROP POLICY IF EXISTS "Admin can select all client_documents" ON client_documents;
DROP POLICY IF EXISTS "Admin can insert client_documents" ON client_documents;
DROP POLICY IF EXISTS "Admin can update client_documents" ON client_documents;
DROP POLICY IF EXISTS "Admin can delete client_documents" ON client_documents;
DROP POLICY IF EXISTS "Staff can select documents for own clients" ON client_documents;
DROP POLICY IF EXISTS "Staff can insert documents for own clients" ON client_documents;
DROP POLICY IF EXISTS "Staff can update documents for own clients" ON client_documents;
DROP POLICY IF EXISTS "Staff can delete documents for own clients" ON client_documents;
DROP POLICY IF EXISTS "Management can view all org client documents read-only" ON client_documents;
DROP POLICY IF EXISTS "Compliance Officer can view all org client documents read-only" ON client_documents;

-- Admin: Full access
CREATE POLICY "Admin can select all client_documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can insert client_documents"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update client_documents"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete client_documents"
  ON client_documents FOR DELETE
  TO authenticated
  USING (is_admin());

-- Staff: Can only access documents for their assigned clients
CREATE POLICY "Staff can select documents for own clients"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert documents for own clients"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'staff' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update documents for own clients"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'staff' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete documents for own clients"
  ON client_documents FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'staff' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
  );

-- Management: Read-only access to all org client documents
CREATE POLICY "Management can view all org client documents read-only"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.organization_id = get_user_organization_id()
    )
  );

-- Compliance Officer: Read-only access to all org client documents
CREATE POLICY "Compliance Officer can view all org client documents read-only"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'compliance_officer' 
    AND EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_documents.client_id
      AND kyc_clients.organization_id = get_user_organization_id()
    )
  );
