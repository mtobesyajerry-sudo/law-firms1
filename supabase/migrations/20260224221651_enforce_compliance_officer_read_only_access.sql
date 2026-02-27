/*
  # Enforce Compliance Officer Read-Only Access

  ## Security Critical Changes
  
  This migration enforces strict read-only access for compliance_officer role on:
  - kyc_clients table
  - assessments table
  - assessment_responses table
  - assessment_attachments table
  - section_scores table
  - client_documents table
  
  ## Changes Made
  
  1. **Remove Write Permissions for Compliance Officers**
     - Drop all INSERT policies allowing compliance_officer
     - Drop all UPDATE policies allowing compliance_officer
     - Drop all DELETE policies allowing compliance_officer
  
  2. **Maintain Read-Only Access**
     - Keep SELECT policies for compliance_officer
     - Ensure they can view all data within their organization
  
  3. **Security Rationale**
     - Compliance officers should only review and monitor data
     - No ability to modify client records or assessments
     - Prevents data manipulation and maintains audit integrity
     - Aligns with Management role (read-only access pattern)
  
  ## Tables Affected
  - kyc_clients
  - assessments
  - assessment_responses
  - assessment_attachments
  - section_scores
  - client_documents
*/

-- =====================================================
-- KYC CLIENTS: Remove Write Access for Compliance Officer
-- =====================================================

-- Drop INSERT policy that allows compliance_officer
DROP POLICY IF EXISTS "Authorized users can create clients" ON kyc_clients;

-- Recreate without compliance_officer
CREATE POLICY "Authorized users can create clients"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin', 'management', 'staff'])
    AND organization_id = get_user_org()
  );

-- Drop UPDATE policy that allows compliance_officer
DROP POLICY IF EXISTS "Staff can update clients in their organization" ON kyc_clients;

-- Recreate without compliance_officer
CREATE POLICY "Staff can update clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff'])
    AND organization_id = get_user_org()
  );

-- Note: No DELETE policy exists for compliance_officer on kyc_clients

-- =====================================================
-- ASSESSMENTS: Remove Write Access for Compliance Officer
-- =====================================================

-- Drop INSERT policy for compliance_officer
DROP POLICY IF EXISTS "Compliance officers can create assessments" ON assessments;

-- Drop UPDATE policy for compliance_officer
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;

-- Drop DELETE policy for compliance_officer
DROP POLICY IF EXISTS "Compliance officers can delete org assessments" ON assessments;

-- =====================================================
-- ASSESSMENT RESPONSES: Remove Write Access
-- =====================================================

-- Check and drop compliance_officer INSERT policy if exists
DROP POLICY IF EXISTS "Compliance officers can insert responses" ON assessment_responses;

-- Check and drop compliance_officer UPDATE policy if exists
DROP POLICY IF EXISTS "Compliance officers can update responses" ON assessment_responses;

-- Check and drop compliance_officer DELETE policy if exists
DROP POLICY IF EXISTS "Compliance officers can delete responses" ON assessment_responses;

-- =====================================================
-- ASSESSMENT ATTACHMENTS: Remove Write Access
-- =====================================================

-- Check and drop compliance_officer INSERT policy if exists
DROP POLICY IF EXISTS "Compliance officers can insert attachments" ON assessment_attachments;

-- Check and drop compliance_officer UPDATE policy if exists
DROP POLICY IF EXISTS "Compliance officers can update attachments" ON assessment_attachments;

-- Check and drop compliance_officer DELETE policy if exists
DROP POLICY IF EXISTS "Compliance officers can delete attachments" ON assessment_attachments;

-- =====================================================
-- SECTION SCORES: Remove Write Access
-- =====================================================

-- Check and drop compliance_officer INSERT policy if exists
DROP POLICY IF EXISTS "Compliance officers can insert section scores" ON section_scores;

-- Check and drop compliance_officer UPDATE policy if exists
DROP POLICY IF EXISTS "Compliance officers can update section scores" ON section_scores;

-- Check and drop compliance_officer DELETE policy if exists
DROP POLICY IF EXISTS "Compliance officers can delete section scores" ON section_scores;

-- =====================================================
-- CLIENT DOCUMENTS: Remove Write Access
-- =====================================================

-- Check and drop compliance_officer INSERT policy if exists
DROP POLICY IF EXISTS "Compliance officers can insert client documents" ON client_documents;

-- Check and drop compliance_officer UPDATE policy if exists
DROP POLICY IF EXISTS "Compliance officers can update client documents" ON client_documents;

-- Check and drop compliance_officer DELETE policy if exists
DROP POLICY IF EXISTS "Compliance officers can delete client documents" ON client_documents;

-- =====================================================
-- VERIFICATION: Check Current Policies
-- =====================================================

-- This comment documents expected policies for compliance_officer:
-- SELECT ONLY policies should remain:
-- - "Compliance Officer can view all org clients read-only" ON kyc_clients
-- - "Compliance officers can view org assessments" ON assessments
-- - Any similar read-only SELECT policies on related tables
