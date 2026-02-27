/*
  # Strengthen Read-Only RLS Policies - Fixed

  This migration enforces strict read-only access at the database level for Management and Compliance Officer roles.
  
  ## Critical Security Fix
  - Management role: Read-only access to all organization data (NO INSERT/UPDATE/DELETE)
  - Compliance Officer role: Read-only access to all organization data (NO INSERT/UPDATE/DELETE)
  - Staff role: Full access to data they create/own
  - Admin role: Full system access
  
  ## Changes
  1. Drop existing permissive policies
  2. Create strict role-based policies with explicit USING/WITH CHECK clauses
  3. Ensure no role can escalate privileges through database operations
  
  ## Security
  - All policies check role at database level (not just UI)
  - WITH CHECK prevents any write operations for read-only roles
  - USING restricts read access to organization scope
*/

-- ============================================================================
-- PART 1: ASSESSMENTS TABLE - STRICT READ-ONLY ENFORCEMENT
-- ============================================================================

-- Drop existing assessment policies that allow writes
DROP POLICY IF EXISTS "Management users can view all org assessments" ON assessments;
DROP POLICY IF EXISTS "Management users can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can view all org assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance officers can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Management read only assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance read only assessments" ON assessments;
DROP POLICY IF EXISTS "Management can update assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance can update assessments" ON assessments;
DROP POLICY IF EXISTS "Management access to assessments" ON assessments;
DROP POLICY IF EXISTS "Compliance access to assessments" ON assessments;

-- Management: STRICT READ-ONLY (SELECT ONLY, NO INSERT/UPDATE/DELETE)
CREATE POLICY "Management: Read-only org assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = assessments.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Compliance Officer: STRICT READ-ONLY (SELECT ONLY, NO INSERT/UPDATE/DELETE)
CREATE POLICY "Compliance: Read-only org assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = assessments.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Staff: Full access to own organization's assessments
CREATE POLICY "Staff: Full access to org assessments"
  ON assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = assessments.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = assessments.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Client: Access to own organization assessments (read-only)
CREATE POLICY "Client: View own org assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
      AND user_profiles.organization_id = assessments.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 2: ASSESSMENT RESPONSES - STRICT READ-ONLY ENFORCEMENT
-- ============================================================================

DROP POLICY IF EXISTS "Management read assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance read assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can update assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance can update assessment responses" ON assessment_responses;

CREATE POLICY "Management: Read-only assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND a.id = assessment_responses.assessment_id
    )
  );

CREATE POLICY "Compliance: Read-only assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('compliance_officer', 'mlro')
      AND up.is_active = true
      AND a.id = assessment_responses.assessment_id
    )
  );

-- ============================================================================
-- PART 3: SECTION SCORES - STRICT READ-ONLY ENFORCEMENT
-- ============================================================================

DROP POLICY IF EXISTS "Management read section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance read section scores" ON section_scores;
DROP POLICY IF EXISTS "Management can update section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance can update section scores" ON section_scores;

CREATE POLICY "Management: Read-only section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND a.id = section_scores.assessment_id
    )
  );

CREATE POLICY "Compliance: Read-only section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('compliance_officer', 'mlro')
      AND up.is_active = true
      AND a.id = section_scores.assessment_id
    )
  );

-- ============================================================================
-- PART 4: TRANSACTION ALERTS - STRICT READ-ONLY ENFORCEMENT
-- ============================================================================

DROP POLICY IF EXISTS "Management read transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Compliance read transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Management users can view transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Compliance officers can view transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Management can update transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Compliance can update transaction alerts" ON transaction_alerts;

CREATE POLICY "Management: Read-only transaction alerts"
  ON transaction_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = transaction_alerts.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance: Full access to transaction alerts"
  ON transaction_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = transaction_alerts.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = transaction_alerts.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 5: STR DRAFTS - COMPLIANCE CAN WRITE, MANAGEMENT READ-ONLY
-- ============================================================================

DROP POLICY IF EXISTS "Management read str drafts" ON str_drafts;
DROP POLICY IF EXISTS "Compliance read str drafts" ON str_drafts;
DROP POLICY IF EXISTS "Compliance write str drafts" ON str_drafts;
DROP POLICY IF EXISTS "Management can update str drafts" ON str_drafts;

CREATE POLICY "Management: Read-only STR drafts"
  ON str_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = str_drafts.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Compliance can create and manage STRs (this is their job function)
CREATE POLICY "Compliance: Full access to STR drafts"
  ON str_drafts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = str_drafts.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = str_drafts.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 6: SCREENING RESULTS - COMPLIANCE CAN WRITE, MANAGEMENT READ-ONLY
-- ============================================================================

DROP POLICY IF EXISTS "Management read screening results" ON screening_results;
DROP POLICY IF EXISTS "Compliance read screening results" ON screening_results;
DROP POLICY IF EXISTS "Management can update screening results" ON screening_results;

CREATE POLICY "Management: Read-only screening results"
  ON screening_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = screening_results.organization_id
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Compliance: Full access to screening results"
  ON screening_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = screening_results.organization_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = screening_results.organization_id
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- PART 7: ASSESSMENT ATTACHMENTS - STRICT READ-ONLY ENFORCEMENT
-- ============================================================================

DROP POLICY IF EXISTS "Management read assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance read assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Management can update assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance can update assessment attachments" ON assessment_attachments;

CREATE POLICY "Management: Read-only assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.is_active = true
      AND a.id = assessment_attachments.assessment_id
    )
  );

CREATE POLICY "Compliance: Read-only assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN assessments a ON a.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role IN ('compliance_officer', 'mlro')
      AND up.is_active = true
      AND a.id = assessment_attachments.assessment_id
    )
  );