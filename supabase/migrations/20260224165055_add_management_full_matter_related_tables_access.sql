/*
  # Grant Management Users Full Access to Matter-Related Tables

  1. Changes
    - Add INSERT/UPDATE/DELETE policies for matter_activities
    - Add INSERT/UPDATE/DELETE policies for matter_milestones
    - Add INSERT/UPDATE/DELETE policies for matter_billing_milestones
    - Add INSERT/UPDATE/DELETE policies for client_matter_relationships
  
  2. Security
    - All policies scoped to organization via matter relationship
    - Only authenticated Management users
*/

-- ============================================
-- MATTER ACTIVITIES
-- ============================================

CREATE POLICY "Management can insert matter_activities"
  ON matter_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_activities.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can update matter_activities"
  ON matter_activities
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_activities.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_activities.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can delete matter_activities"
  ON matter_activities
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_activities.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

-- ============================================
-- MATTER MILESTONES
-- ============================================

CREATE POLICY "Management can insert matter_milestones"
  ON matter_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can update matter_milestones"
  ON matter_milestones
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can delete matter_milestones"
  ON matter_milestones
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

-- ============================================
-- MATTER BILLING MILESTONES
-- ============================================

CREATE POLICY "Management can insert matter_billing_milestones"
  ON matter_billing_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_billing_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can update matter_billing_milestones"
  ON matter_billing_milestones
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_billing_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_billing_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can delete matter_billing_milestones"
  ON matter_billing_milestones
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = matter_billing_milestones.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

-- ============================================
-- CLIENT MATTER RELATIONSHIPS
-- ============================================

CREATE POLICY "Management can insert client_matter_relationships"
  ON client_matter_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = client_matter_relationships.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can update client_matter_relationships"
  ON client_matter_relationships
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = client_matter_relationships.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = client_matter_relationships.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management can delete client_matter_relationships"
  ON client_matter_relationships
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND EXISTS (
      SELECT 1 FROM matters m 
      WHERE m.id = client_matter_relationships.matter_id 
      AND m.organization_id = get_user_organization_id()
    )
  );
