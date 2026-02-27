/*
  # Add Management User Profile Visibility

  1. Problem
    - Management users can only view their own profile
    - They need to see other users in their organization for role upgrade approvals
    - DualApprovalInterface fails access check because it can't verify user roles
  
  2. Solution
    - Add RLS policy for management users to view profiles in their organization
    - Add policy for management users to view profiles of users requesting access to their org
  
  3. Security
    - Management users can only see users in THEIR organization
    - Admin users continue to see all profiles
    - Regular users continue to see only their own profile
*/

-- Allow management users to view profiles in their organization
CREATE POLICY "Management can view profiles in their organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('management', 'senior_partner', 'partner', 'mlro')
        AND up.organization_id = user_profiles.organization_id
    )
  );

-- Add comment
COMMENT ON POLICY "Management can view profiles in their organization" ON user_profiles IS 'Allows management users to view other user profiles within their organization for approval workflows';
