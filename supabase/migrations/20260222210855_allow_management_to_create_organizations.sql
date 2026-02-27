/*
  # Allow Management Users to Create Organizations
  
  Currently only admin users can create organizations, but management-level
  users (management, senior_partner, partner) also need this ability when
  approving access requests.
  
  1. Changes
    - Drop restrictive admin-only INSERT policy
    - Create new policy allowing admin and management roles to create orgs
  
  2. Security
    - Only admin, management, senior_partner, and partner roles can create
    - All other roles are still blocked from creating organizations
*/

-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;

-- Create new policy allowing management roles
CREATE POLICY "Admins and management can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );

COMMENT ON POLICY "Admins and management can create organizations" ON organizations IS 
  'Allows admin and management-level users to create organizations.';
