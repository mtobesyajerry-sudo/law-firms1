/*
  # Fix Role Upgrade Requests Management Access

  1. Problem
    - role_upgrade_requests only allows viewing by users in organization_user_access table
    - Management users with management/senior_partner roles can't see requests
    - This blocks the dual approval workflow
  
  2. Solution
    - Add policy for management users to view requests in their organization
    - Add policy for management users to update requests in their organization
    - Add policy for admins to view all requests
  
  3. Security
    - Management users can only see requests for THEIR organization
    - Admin users can see all requests
    - Regular users can only see their own requests
*/

-- Allow management users to view requests in their organization
CREATE POLICY "Management can view requests in their organization"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('management', 'senior_partner', 'partner', 'mlro')
        AND organization_id = role_upgrade_requests.organization_id
    )
  );

-- Allow admins to view all requests
CREATE POLICY "Admins can view all role upgrade requests"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Allow management users to update requests in their organization
CREATE POLICY "Management can update requests in their organization"
  ON role_upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('management', 'senior_partner', 'partner', 'mlro')
        AND organization_id = role_upgrade_requests.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('management', 'senior_partner', 'partner', 'mlro')
        AND organization_id = role_upgrade_requests.organization_id
    )
  );

-- Add comments
COMMENT ON POLICY "Management can view requests in their organization" ON role_upgrade_requests IS 'Allows management users to view role upgrade requests for their organization';
COMMENT ON POLICY "Admins can view all role upgrade requests" ON role_upgrade_requests IS 'Allows admin users to view all role upgrade requests across all organizations';
COMMENT ON POLICY "Management can update requests in their organization" ON role_upgrade_requests IS 'Allows management users to update role upgrade requests for their organization';
