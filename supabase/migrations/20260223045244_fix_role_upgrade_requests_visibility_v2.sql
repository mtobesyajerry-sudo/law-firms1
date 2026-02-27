/*
  # Fix Role Upgrade Requests Visibility

  This migration ensures that management users can properly view role upgrade requests
  in their organization by simplifying and strengthening the RLS policies.

  ## Changes
  1. Drop ALL existing SELECT policies on role_upgrade_requests
  2. Add clear, simple policies for role upgrade requests visibility
  3. Ensure management users in organization_user_access can view all requests

  ## Security
  - Users can view their own requests
  - Management users (via role) can view all requests in their organization
  - Users with management access (via organization_user_access) can view all requests in their organization
*/

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view own role upgrade requests" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Management users can view org role upgrade requests" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Early clients can view role upgrade requests in organization" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Management can view role upgrade requests in organization" ON role_upgrade_requests;

-- Create simplified, clear policies for viewing role upgrade requests
CREATE POLICY "view_own_requests"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "view_org_requests_by_role"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND user_profiles.role IN ('admin', 'management', 'senior_partner')
    )
  );

CREATE POLICY "view_org_requests_by_access"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_user_access
      WHERE organization_user_access.user_id = auth.uid()
      AND organization_user_access.organization_id = role_upgrade_requests.organization_id
      AND organization_user_access.is_active = true
    )
  );
