/*
  # Revert Management Users to Read-Only for Matter Related Tables

  1. Changes
    - Remove INSERT/UPDATE/DELETE policies for Management on:
      - client_matter_relationships
      - matter_activities  
      - matter_milestones
    - Keep SELECT policies (read-only access)
  
  2. Security
    - Management retains visibility for oversight
    - Only Staff (assigned) and Admin can modify data
*/

-- client_matter_relationships
DROP POLICY IF EXISTS "Management can insert client_matter_relationships" ON client_matter_relationships;
DROP POLICY IF EXISTS "Management can update client_matter_relationships" ON client_matter_relationships;
DROP POLICY IF EXISTS "Management can delete client_matter_relationships" ON client_matter_relationships;

-- matter_activities
DROP POLICY IF EXISTS "Management can insert matter_activities" ON matter_activities;
DROP POLICY IF EXISTS "Management can update matter_activities" ON matter_activities;
DROP POLICY IF EXISTS "Management can delete matter_activities" ON matter_activities;

-- matter_milestones
DROP POLICY IF EXISTS "Management can insert matter_milestones" ON matter_milestones;
DROP POLICY IF EXISTS "Management can update matter_milestones" ON matter_milestones;
DROP POLICY IF EXISTS "Management can delete matter_milestones" ON matter_milestones;

-- Management SELECT policies remain active for read-only access