/*
  # Fix Final RLS Recursion Issues

  1. Remaining Tables
    - matter_milestones, matter_billing_milestones
    - client_matter_relationships, matter_risk_assessments
    - dd_workflow_states, client_red_flag_incidents
    - conflict_checks, str_drafts
*/

-- Fix matter_milestones
DROP POLICY IF EXISTS "Staff can insert matter milestones in their organization" ON matter_milestones;
DROP POLICY IF EXISTS "Staff can view matter milestones in their organization" ON matter_milestones;
DROP POLICY IF EXISTS "Staff can update matter milestones in their organization" ON matter_milestones;
DROP POLICY IF EXISTS "Admins can delete matter milestones" ON matter_milestones;

CREATE POLICY "Staff can insert matter milestones in their organization"
  ON matter_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org()
    AND matter_id IN (SELECT id FROM matters WHERE organization_id = get_user_org())
  );

CREATE POLICY "Staff can view matter milestones in their organization"
  ON matter_milestones FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Staff can update matter milestones in their organization"
  ON matter_milestones FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Admins can delete matter milestones"
  ON matter_milestones FOR DELETE
  TO authenticated
  USING (organization_id = get_user_org() AND is_admin());

-- Fix matter_billing_milestones
DROP POLICY IF EXISTS "Staff can insert matter billing milestones in their organizatio" ON matter_billing_milestones;
DROP POLICY IF EXISTS "Staff can view matter billing milestones in their organization" ON matter_billing_milestones;
DROP POLICY IF EXISTS "Staff can update matter billing milestones in their organizatio" ON matter_billing_milestones;
DROP POLICY IF EXISTS "Admins can delete matter billing milestones" ON matter_billing_milestones;

CREATE POLICY "Staff can insert matter billing milestones"
  ON matter_billing_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org()
    AND matter_id IN (SELECT id FROM matters WHERE organization_id = get_user_org())
  );

CREATE POLICY "Staff can view matter billing milestones"
  ON matter_billing_milestones FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Staff can update matter billing milestones"
  ON matter_billing_milestones FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Admins can delete matter billing milestones"
  ON matter_billing_milestones FOR DELETE
  TO authenticated
  USING (organization_id = get_user_org() AND is_admin());

-- Fix client_matter_relationships
DROP POLICY IF EXISTS "Authorized users can create relationships" ON client_matter_relationships;
DROP POLICY IF EXISTS "Users can view relationships in their organization" ON client_matter_relationships;
DROP POLICY IF EXISTS "Users can update relationships in their organization" ON client_matter_relationships;

CREATE POLICY "Authorized users can create relationships"
  ON client_matter_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = client_matter_relationships.matter_id
      AND m.organization_id = get_user_org()
    )
    AND user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin'])
  );

CREATE POLICY "Users can view relationships in their organization"
  ON client_matter_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = client_matter_relationships.matter_id
      AND m.organization_id = get_user_org()
    )
  );

CREATE POLICY "Users can update relationships in their organization"
  ON client_matter_relationships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = client_matter_relationships.matter_id
      AND m.organization_id = get_user_org()
    )
  );

-- Fix matter_risk_assessments
DROP POLICY IF EXISTS "Authorized users can create risk assessments" ON matter_risk_assessments;
DROP POLICY IF EXISTS "Users can view risk assessments in their organization" ON matter_risk_assessments;
DROP POLICY IF EXISTS "Users can update risk assessments in their organization" ON matter_risk_assessments;

CREATE POLICY "Authorized users can create risk assessments"
  ON matter_risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org());

CREATE POLICY "Users can view risk assessments in their organization"
  ON matter_risk_assessments FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Users can update risk assessments in their organization"
  ON matter_risk_assessments FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

-- Fix dd_workflow_states
DROP POLICY IF EXISTS "Authorized users can create DD workflows" ON dd_workflow_states;
DROP POLICY IF EXISTS "Users can view DD workflows in their organization" ON dd_workflow_states;
DROP POLICY IF EXISTS "Users can update DD workflows in their organization" ON dd_workflow_states;

CREATE POLICY "Authorized users can create DD workflows"
  ON dd_workflow_states FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org());

CREATE POLICY "Users can view DD workflows in their organization"
  ON dd_workflow_states FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Users can update DD workflows in their organization"
  ON dd_workflow_states FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

-- Fix client_red_flag_incidents
DROP POLICY IF EXISTS "Authorized users can create incidents" ON client_red_flag_incidents;
DROP POLICY IF EXISTS "Users can view incidents in their organization" ON client_red_flag_incidents;
DROP POLICY IF EXISTS "Users can update incidents in their organization" ON client_red_flag_incidents;

CREATE POLICY "Authorized users can create incidents"
  ON client_red_flag_incidents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org());

CREATE POLICY "Users can view incidents in their organization"
  ON client_red_flag_incidents FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org());

CREATE POLICY "Users can update incidents in their organization"
  ON client_red_flag_incidents FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

-- Fix conflict_checks
DROP POLICY IF EXISTS "Authorized users can create conflict checks" ON conflict_checks;
DROP POLICY IF EXISTS "Staff can view conflict checks in organization" ON conflict_checks;
DROP POLICY IF EXISTS "Users can view conflict checks in their organization" ON conflict_checks;
DROP POLICY IF EXISTS "Users can update conflict checks in their organization" ON conflict_checks;

CREATE POLICY "Authorized users can create conflict checks"
  ON conflict_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org()
    AND user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin'])
  );

CREATE POLICY "Staff can view conflict checks in organization"
  ON conflict_checks FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org()
    AND user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer'])
  );

CREATE POLICY "Users can update conflict checks in their organization"
  ON conflict_checks FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org());

-- Fix str_drafts
DROP POLICY IF EXISTS "Authorized users can create STR drafts" ON str_drafts;
DROP POLICY IF EXISTS "MLRO and compliance can view STR drafts" ON str_drafts;
DROP POLICY IF EXISTS "MLRO can view all STR drafts in organization" ON str_drafts;
DROP POLICY IF EXISTS "MLRO and preparers can update STR drafts" ON str_drafts;

CREATE POLICY "Authorized users can create STR drafts"
  ON str_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org()
    AND user_has_role(ARRAY['lawyer', 'compliance_officer', 'mlro', 'admin'])
  );

CREATE POLICY "MLRO and compliance can view STR drafts"
  ON str_drafts FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org()
    AND user_has_role(ARRAY['mlro', 'compliance_officer', 'senior_partner', 'management', 'admin'])
  );

CREATE POLICY "MLRO and preparers can update STR drafts"
  ON str_drafts FOR UPDATE
  TO authenticated
  USING (
    prepared_by = auth.uid()
    OR (organization_id = get_user_org() AND user_has_role(ARRAY['mlro', 'admin']))
  );

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Fixed all remaining RLS recursion issues';
  RAISE NOTICE 'All tables now use helper functions';
END $$;
