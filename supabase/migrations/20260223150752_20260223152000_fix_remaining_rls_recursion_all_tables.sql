/*
  # Fix Remaining RLS Recursion for All Tables

  1. Problem
    - Many more tables still have policies with user_profiles subqueries
    - These cause recursion during authentication
    
  2. Solution
    - Replace all remaining policies with helper functions
    - Tables: assessment_attachments, section_scores, matters, client_documents, etc.
*/

-- Fix assessment_attachments policies
DROP POLICY IF EXISTS "Admins can view all attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can view assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can create assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can update assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can delete assessment attachments" ON assessment_attachments;

CREATE POLICY "Admins can view all attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Compliance officers can view assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can update assessment attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can delete assessment attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

-- Fix section_scores policies
DROP POLICY IF EXISTS "Admins can manage all section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can view section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can create section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can update section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can delete section scores" ON section_scores;

CREATE POLICY "Admins can manage all section scores"
  ON section_scores FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Compliance officers can view section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can create section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can update section scores"
  ON section_scores FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

CREATE POLICY "Compliance officers can delete section scores"
  ON section_scores FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro'])
    AND assessment_id IN (SELECT id FROM assessments WHERE organization_id = get_user_org())
  );

-- Fix matters policies
DROP POLICY IF EXISTS "Lawyers can create matters in their organization" ON matters;
DROP POLICY IF EXISTS "Staff can view matters in their organization" ON matters;
DROP POLICY IF EXISTS "Staff can update matters in their organization" ON matters;

CREATE POLICY "Lawyers can create matters in their organization"
  ON matters FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Staff can view matters in their organization"
  ON matters FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Staff can update matters in their organization"
  ON matters FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
    AND organization_id = get_user_org()
  );

-- Fix client_documents policies
DROP POLICY IF EXISTS "Users can upload documents" ON client_documents;
DROP POLICY IF EXISTS "Staff can view documents in their organization" ON client_documents;
DROP POLICY IF EXISTS "Users can update documents in their organization" ON client_documents;

CREATE POLICY "Users can upload documents"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org());

CREATE POLICY "Staff can view documents in their organization"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org()
    AND user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
  );

CREATE POLICY "Users can update documents in their organization"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

-- Fix organization_user_access policies
DROP POLICY IF EXISTS "Admins can select organization_user_access" ON organization_user_access;
DROP POLICY IF EXISTS "Admins can insert organization_user_access" ON organization_user_access;
DROP POLICY IF EXISTS "Admins can update organization_user_access" ON organization_user_access;
DROP POLICY IF EXISTS "Admins can delete organization_user_access" ON organization_user_access;

CREATE POLICY "Admins can select organization_user_access"
  ON organization_user_access FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert organization_user_access"
  ON organization_user_access FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update organization_user_access"
  ON organization_user_access FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete organization_user_access"
  ON organization_user_access FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix role_upgrade_approvals policies
DROP POLICY IF EXISTS "Admins can select role_upgrade_approvals" ON role_upgrade_approvals;
DROP POLICY IF EXISTS "management_can_insert_approvals" ON role_upgrade_approvals;

CREATE POLICY "Admins can select role_upgrade_approvals"
  ON role_upgrade_approvals FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "management_can_insert_approvals"
  ON role_upgrade_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_user_id = auth.uid()
    AND (
      (user_has_role(ARRAY['admin', 'management', 'senior_partner']) AND organization_id = get_user_org())
      OR EXISTS (
        SELECT 1 FROM organization_user_access
        WHERE user_id = auth.uid()
        AND organization_user_access.organization_id = role_upgrade_approvals.organization_id
        AND is_active = true
      )
    )
  );

-- Fix role_upgrade_requests policies
DROP POLICY IF EXISTS "view_org_requests_by_role" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Users can create own role upgrade requests" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Management can update role upgrade requests in organization" ON role_upgrade_requests;

CREATE POLICY "view_org_requests_by_role"
  ON role_upgrade_requests FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'management', 'senior_partner'])
    AND organization_id = get_user_org()
  );

CREATE POLICY "Users can create own role upgrade requests"
  ON role_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org()
  );

CREATE POLICY "Management can update role upgrade requests in organization"
  ON role_upgrade_requests FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
    AND organization_id = get_user_org()
  )
  WITH CHECK (
    user_has_role(ARRAY['admin', 'management', 'senior_partner', 'partner'])
    AND organization_id = get_user_org()
  );

-- Fix new_user_request_approvals policies
DROP POLICY IF EXISTS "Management users can view approvals" ON new_user_request_approvals;
DROP POLICY IF EXISTS "Management users can insert approvals" ON new_user_request_approvals;

CREATE POLICY "Management users can view approvals"
  ON new_user_request_approvals FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['management', 'senior_partner', 'partner'])
    AND get_user_org() IS NOT NULL
  );

CREATE POLICY "Management users can insert approvals"
  ON new_user_request_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['management', 'senior_partner', 'partner'])
    AND get_user_org() IS NOT NULL
    AND approver_id = auth.uid()
  );

-- Fix compliance_audit_trail policy
DROP POLICY IF EXISTS "Compliance officers can view audit trail" ON compliance_audit_trail;

CREATE POLICY "Compliance officers can view audit trail"
  ON compliance_audit_trail FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['admin', 'management', 'compliance_officer', 'mlro'])
  );

-- Fix remediation_actions policy
DROP POLICY IF EXISTS "Admins can manage all remediation actions" ON remediation_actions;

CREATE POLICY "Admins can manage all remediation actions"
  ON remediation_actions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix remaining matter-related tables
DROP POLICY IF EXISTS "Staff can insert matter activities in their organization" ON matter_activities;
DROP POLICY IF EXISTS "Staff can view matter activities in their organization" ON matter_activities;
DROP POLICY IF EXISTS "Staff can update their own matter activities" ON matter_activities;
DROP POLICY IF EXISTS "Admins can delete matter activities" ON matter_activities;

CREATE POLICY "Staff can insert matter activities in their organization"
  ON matter_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org()
    AND matter_id IN (SELECT id FROM matters WHERE organization_id = get_user_org())
  );

CREATE POLICY "Staff can view matter activities in their organization"
  ON matter_activities FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Staff can update their own matter activities"
  ON matter_activities FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id = get_user_org() AND user_has_role(ARRAY['admin', 'management']))
  );

CREATE POLICY "Admins can delete matter activities"
  ON matter_activities FOR DELETE
  TO authenticated
  USING (organization_id = get_user_org() AND is_admin());

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS recursion for remaining tables';
  RAISE NOTICE 'All policies now use helper functions instead of direct user_profiles queries';
END $$;
