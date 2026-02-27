/*
  # Fix Client Role Access Restrictions

  ## Overview
  This migration fixes a critical security issue where users with 'client' role
  who are assigned to an organization could potentially access management, staff,
  and compliance dashboards and data.

  ## Changes

  1. **RLS Policy Updates**
     - Update matters table policies to explicitly exclude 'client' role from viewing/managing matters
     - Update kyc_clients table policies to explicitly exclude 'client' role from viewing other clients
     - Ensure client role can only view their own data

  2. **Security Principles**
     - Client role = end-user client (should only see their own assessments)
     - Staff roles (lawyer, compliance_officer, mlro, senior_partner, management, staff) = internal staff who manage clients
     - Organization assignment does NOT grant staff privileges

  ## Security Impact
  - Prevents unauthorized access to sensitive matter and client data
  - Enforces strict role-based access control at database level
  - Complements frontend routing restrictions
*/

-- Drop and recreate matters SELECT policy with client role exclusion
DROP POLICY IF EXISTS "Users can view matters in their organization" ON matters;

CREATE POLICY "Staff can view matters in their organization"
  ON matters
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );

-- Drop and recreate matters UPDATE policy with client role exclusion
DROP POLICY IF EXISTS "Users can update matters in their organization" ON matters;

CREATE POLICY "Staff can update matters in their organization"
  ON matters
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );

-- Drop and recreate kyc_clients SELECT policy with client role exclusion
DROP POLICY IF EXISTS "Users can view clients in their organization" ON kyc_clients;

CREATE POLICY "Staff can view clients in their organization"
  ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );

-- Drop and recreate kyc_clients UPDATE policy with client role exclusion
DROP POLICY IF EXISTS "Users can update clients in their organization" ON kyc_clients;

CREATE POLICY "Staff can update clients in their organization"
  ON kyc_clients
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );

-- Add policy for clients to only view their own assessments (not all assessments in organization)
DROP POLICY IF EXISTS "Clients can view own assessments" ON assessments;

CREATE POLICY "Clients can view own assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'client'
      AND assessments.created_by = auth.uid()
    )
  );

-- Ensure client_documents are restricted from client role viewing others' documents
DROP POLICY IF EXISTS "Users can view documents in their organization" ON client_documents;

CREATE POLICY "Staff can view documents in their organization"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );

-- Ensure str_drafts are strictly confidential to MLRO and compliance roles only
DROP POLICY IF EXISTS "Users can view STR drafts" ON str_drafts;

CREATE POLICY "MLRO and compliance can view STR drafts"
  ON str_drafts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('mlro', 'compliance_officer', 'senior_partner', 'management', 'admin')
    )
  );

-- Restrict conflict_checks to staff only
DROP POLICY IF EXISTS "Users can view conflict checks" ON conflict_checks;

CREATE POLICY "Staff can view conflict checks in organization"
  ON conflict_checks
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')
    )
  );
