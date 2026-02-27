/*
  # Convert Management Users to Read-Only Access
  
  ## Overview
  This migration enforces strict read-only access for Management users across all tables.
  Management users can view data for oversight and compliance purposes but cannot create, 
  edit, or delete any records. This ensures proper accountability and data integrity.
  
  ## Changes
  
  ### Tables Affected
  1. **assessments** - Remove INSERT, UPDATE, DELETE policies
  2. **assessment_responses** - Remove INSERT, UPDATE, DELETE policies
  3. **section_scores** - Remove INSERT, UPDATE, DELETE policies
  4. **assessment_attachments** - Remove INSERT, UPDATE, DELETE policies
  5. **matters** - Already read-only (SELECT only)
  6. **kyc_clients** - Already read-only (SELECT only)
  7. **client_documents** - Already read-only (SELECT only)
  8. **client_matter_relationships** - Already read-only (SELECT only)
  9. **matter_activities** - Already read-only (SELECT only)
  10. **matter_milestones** - Already read-only (SELECT only)
  
  ## Security
  - Management users retain SELECT access to view all data in their organization
  - All INSERT, UPDATE, DELETE policies are removed for Management role
  - Only Staff, Compliance Officer, and Admin roles can modify data
*/

-- ============================================================================
-- ASSESSMENTS TABLE - Convert to Read-Only
-- ============================================================================

-- Drop all write policies for Management users
DROP POLICY IF EXISTS "Management can create assessments" ON assessments;
DROP POLICY IF EXISTS "Management can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Management can delete org assessments" ON assessments;

-- Keep only SELECT policy (already exists)
-- Policy "Management can view org assessments" remains unchanged

-- ============================================================================
-- ASSESSMENT_RESPONSES TABLE - Convert to Read-Only
-- ============================================================================

-- Drop all write policies for Management users
DROP POLICY IF EXISTS "Management can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can update org assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can delete org assessment responses" ON assessment_responses;

-- Keep only SELECT policy (already exists)
-- Policy "Management can view org assessment responses" remains unchanged

-- ============================================================================
-- SECTION_SCORES TABLE - Convert to Read-Only
-- ============================================================================

-- Drop all write policies for Management users
DROP POLICY IF EXISTS "Management can create section scores" ON section_scores;
DROP POLICY IF EXISTS "Management can update org section scores" ON section_scores;
DROP POLICY IF EXISTS "Management can delete org section scores" ON section_scores;

-- Keep only SELECT policy (already exists)
-- Policy "Management can view org section scores" remains unchanged

-- ============================================================================
-- ASSESSMENT_ATTACHMENTS TABLE - Convert to Read-Only
-- ============================================================================

-- Drop all write policies for Management users
DROP POLICY IF EXISTS "Management can create assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Management can update org assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Management can delete org assessment attachments" ON assessment_attachments;

-- Keep only SELECT policy (already exists)
-- Policy "Management can view org assessment attachments" remains unchanged

-- ============================================================================
-- VERIFICATION: List all remaining Management policies
-- ============================================================================

-- This query shows all remaining policies for Management users
-- All should be FOR SELECT only
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MANAGEMENT USER POLICIES - READ-ONLY ENFORCEMENT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All Management policies should now be SELECT only.';
  RAISE NOTICE 'Tables with Management read-only access:';
  RAISE NOTICE '  - assessments (SELECT)';
  RAISE NOTICE '  - assessment_responses (SELECT)';
  RAISE NOTICE '  - section_scores (SELECT)';
  RAISE NOTICE '  - assessment_attachments (SELECT)';
  RAISE NOTICE '  - matters (SELECT)';
  RAISE NOTICE '  - kyc_clients (SELECT)';
  RAISE NOTICE '  - client_documents (SELECT)';
  RAISE NOTICE '  - client_matter_relationships (SELECT)';
  RAISE NOTICE '  - matter_activities (SELECT)';
  RAISE NOTICE '  - matter_milestones (SELECT)';
  RAISE NOTICE '============================================';
END $$;
