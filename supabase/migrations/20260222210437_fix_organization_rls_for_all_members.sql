/*
  # Fix Organization RLS to Allow All Members to View Their Organization
  
  The current "Clients can view assigned organization" policy only checks
  assigned_user_id or created_by, which doesn't work for most users.
  
  This migration updates the policy to allow ANY user who is a member of
  the organization (via user_profiles.organization_id) to view it.
  
  1. Changes
    - Drop the old restrictive policy
    - Create new policy that checks organization membership via user_profiles
    - Allows all users (client, management, staff, etc.) to view their org
  
  2. Security
    - Users can only see organizations they are members of
    - Admin can still see all organizations (separate policy)
    - No data leakage between organizations
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Clients can view assigned organization" ON organizations;

-- Create new policy for organization members
CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = organizations.id
    )
  );

COMMENT ON POLICY "Users can view their organization" ON organizations IS 
  'Allows any user to view their organization. Checks membership via user_profiles.organization_id.';
