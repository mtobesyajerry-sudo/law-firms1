/*
  # Add Management Read-Only Access to Matters

  1. Grants Management users read-only access to:
     - matters table (SELECT only)
     - client_matter_relationships (SELECT only)
     - matter_activities (SELECT only)
     - matter_milestones (SELECT only)
  
  2. Security
     - Management users can view all data in their organization
     - Management users CANNOT insert, update, or delete
*/

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Management users can view all matters in organization" ON matters;
DROP POLICY IF EXISTS "Management users can view client_matter_relationships" ON client_matter_relationships;
DROP POLICY IF EXISTS "Management users can view matter_activities" ON matter_activities;
DROP POLICY IF EXISTS "Management users can view matter_milestones" ON matter_milestones;

-- Add read-only SELECT policy for matters
CREATE POLICY "Management users can view all matters in organization"
  ON matters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.organization_id = matters.organization_id
    )
  );

-- Add read-only SELECT policy for client_matter_relationships
CREATE POLICY "Management users can view client_matter_relationships"
  ON client_matter_relationships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND m.id = client_matter_relationships.matter_id
    )
  );

-- Add read-only SELECT policy for matter_activities
CREATE POLICY "Management users can view matter_activities"
  ON matter_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND m.id = matter_activities.matter_id
    )
  );

-- Add read-only SELECT policy for matter_milestones
CREATE POLICY "Management users can view matter_milestones"
  ON matter_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN matters m ON m.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND m.id = matter_milestones.matter_id
    )
  );
