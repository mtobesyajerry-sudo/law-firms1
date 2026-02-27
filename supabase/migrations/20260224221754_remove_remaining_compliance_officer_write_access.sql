/*
  # Remove Remaining Compliance Officer Write Access
  
  ## Critical Security Fix
  
  This migration removes all remaining write permissions for compliance_officer role:
  - assessment_attachments (INSERT, UPDATE, DELETE)
  - assessment_responses (INSERT, UPDATE, DELETE)
  - section_scores (INSERT)
  - str_drafts (INSERT - recreate without compliance_officer)
  
  ## Security Principle
  Compliance officers must have READ-ONLY access to maintain audit integrity
  and prevent data manipulation.
*/

-- =====================================================
-- ASSESSMENT ATTACHMENTS: Remove All Write Access
-- =====================================================

DROP POLICY IF EXISTS "Compliance officers can create assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can update assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can delete assessment attachments" ON assessment_attachments;

-- =====================================================
-- ASSESSMENT RESPONSES: Remove All Write Access
-- =====================================================

DROP POLICY IF EXISTS "Compliance officers can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can update assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can delete assessment responses" ON assessment_responses;

-- =====================================================
-- SECTION SCORES: Remove Write Access
-- =====================================================

DROP POLICY IF EXISTS "Compliance officers can create section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can update section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can delete section scores" ON section_scores;

-- =====================================================
-- STR DRAFTS: Remove compliance_officer from INSERT
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Authorized users can create STR drafts" ON str_drafts;

-- Recreate without compliance_officer (only MLRO and admin should create STRs)
CREATE POLICY "Authorized users can create STR drafts"
  ON str_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['mlro', 'admin'])
    AND organization_id = get_user_org()
  );

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================

-- After this migration, compliance_officer should ONLY have SELECT policies
-- No INSERT, UPDATE, or DELETE permissions on any table
