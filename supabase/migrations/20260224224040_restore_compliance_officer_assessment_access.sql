/*
  # Restore Compliance Officer Assessment Access
  
  ## Purpose
  Compliance Officers are responsible for conducting institutional risk assessments.
  They need full CRUD access to assessments and related tables to perform their duties.
  
  ## Changes
  
  1. **Assessments Table**
     - Restore INSERT, UPDATE, DELETE permissions
     - Compliance officers can create, modify, and manage assessments
  
  2. **Assessment Responses Table**
     - Restore INSERT, UPDATE, DELETE permissions
     - Need to record assessment answers
  
  3. **Assessment Attachments Table**
     - Restore INSERT, UPDATE, DELETE permissions
     - Need to attach supporting documents
  
  4. **Section Scores Table**
     - Restore INSERT, UPDATE permissions
     - System needs to calculate and store scores
  
  ## Security Considerations
  - All policies still limited to organization_id scope
  - Cannot access assessments from other organizations
  - Maintains data isolation between organizations
  
  ## Read-Only Restrictions Remain On
  - KYC Clients (read-only)
  - Client Documents (read-only)
  - Matters (read-only)
*/

-- =====================================================
-- ASSESSMENTS: Restore Full Access for Compliance Officer
-- =====================================================

-- INSERT: Allow compliance officers to create assessments
CREATE POLICY "Compliance officers can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

-- UPDATE: Allow compliance officers to update assessments
CREATE POLICY "Compliance officers can update org assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

-- DELETE: Allow compliance officers to delete assessments
CREATE POLICY "Compliance officers can delete org assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND organization_id = get_user_org()
  );

-- =====================================================
-- ASSESSMENT RESPONSES: Restore Full Access
-- =====================================================

-- INSERT: Allow compliance officers to create assessment responses
CREATE POLICY "Compliance officers can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- UPDATE: Allow compliance officers to update assessment responses
CREATE POLICY "Compliance officers can update assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- DELETE: Allow compliance officers to delete assessment responses
CREATE POLICY "Compliance officers can delete assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- =====================================================
-- ASSESSMENT ATTACHMENTS: Restore Full Access
-- =====================================================

-- INSERT: Allow compliance officers to create assessment attachments
CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- UPDATE: Allow compliance officers to update assessment attachments
CREATE POLICY "Compliance officers can update assessment attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- DELETE: Allow compliance officers to delete assessment attachments
CREATE POLICY "Compliance officers can delete assessment attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- =====================================================
-- SECTION SCORES: Restore Insert/Update Access
-- =====================================================

-- INSERT: Allow compliance officers to create section scores
CREATE POLICY "Compliance officers can create section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- UPDATE: Allow compliance officers to update section scores
CREATE POLICY "Compliance officers can update section scores"
  ON section_scores FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = get_user_org()
      AND user_has_role(ARRAY['compliance_officer', 'mlro'])
    )
  );

-- =====================================================
-- VERIFICATION SUMMARY
-- =====================================================

-- After this migration, compliance_officer role will have:
-- 
-- ASSESSMENTS:
--   SELECT ✓ (existing)
--   INSERT ✓ (restored)
--   UPDATE ✓ (restored)
--   DELETE ✓ (restored)
--
-- ASSESSMENT_RESPONSES:
--   SELECT ✓ (existing)
--   INSERT ✓ (restored)
--   UPDATE ✓ (restored)
--   DELETE ✓ (restored)
--
-- ASSESSMENT_ATTACHMENTS:
--   SELECT ✓ (existing)
--   INSERT ✓ (restored)
--   UPDATE ✓ (restored)
--   DELETE ✓ (restored)
--
-- SECTION_SCORES:
--   SELECT ✓ (existing)
--   INSERT ✓ (restored)
--   UPDATE ✓ (restored)
--
-- CLIENT DATA (REMAINS READ-ONLY):
--   KYC_CLIENTS: SELECT only ✓
--   CLIENT_DOCUMENTS: SELECT only ✓
--   MATTERS: SELECT only ✓
