/*
  # Fix Management Access to Matters Using Helper Functions
  
  1. Problem
     - Current policies use subqueries on user_profiles which cause infinite recursion
     - Management users cannot view matter details due to RLS blocking queries
  
  2. Solution
     - Replace subqueries with helper functions (get_user_role, get_user_organization_id)
     - These functions use SECURITY DEFINER to bypass RLS
  
  3. Security
     - Management users get read-only SELECT access to matters and related tables
     - No INSERT, UPDATE, or DELETE permissions granted
*/

-- Drop existing policies that use subqueries
DROP POLICY IF EXISTS "Management users can view all matters in organization" ON matters;
DROP POLICY IF EXISTS "Management users can view client_matter_relationships" ON client_matter_relationships;
DROP POLICY IF EXISTS "Management users can view matter_activities" ON matter_activities;
DROP POLICY IF EXISTS "Management users can view matter_milestones" ON matter_milestones;

-- Recreate with helper functions to avoid RLS recursion
CREATE POLICY "Management users can view all matters in organization"
  ON matters
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management'
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Management users can view client_matter_relationships"
  ON client_matter_relationships
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management'
    AND EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = client_matter_relationships.matter_id
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management users can view matter_activities"
  ON matter_activities
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management'
    AND EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_activities.matter_id
      AND m.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Management users can view matter_milestones"
  ON matter_milestones
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'management'
    AND EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_milestones.matter_id
      AND m.organization_id = get_user_organization_id()
    )
  );
