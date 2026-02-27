/*
  # Add Role Upgrade Approvals Insert Policies (Fixed)

  1. Problem
    - role_upgrade_approvals table has no INSERT policies
    - Management users cannot create approval records
    - Dual approval workflow is blocked
  
  2. Solution
    - Add INSERT policy for management users in their organization
    - Add INSERT policy for admins
  
  3. Security
    - Management users can only create approvals for requests in THEIR organization
    - Approver must match auth.uid()
    - Admin users can create approvals for any organization
*/

-- Allow management users to insert approvals for their organization
CREATE POLICY "Management can insert approvals for their organization"
  ON role_upgrade_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Approver must be the current user
    approver_user_id = auth.uid()
    AND
    -- Current user must be management in the organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('management', 'senior_partner', 'partner', 'mlro')
        AND organization_id = role_upgrade_approvals.organization_id
    )
  );

-- Allow admins to insert approvals for any organization
CREATE POLICY "Admins can insert approvals for any organization"
  ON role_upgrade_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Add comments
COMMENT ON POLICY "Management can insert approvals for their organization" ON role_upgrade_approvals IS 'Allows management users to create approval records for role upgrade requests in their organization';
COMMENT ON POLICY "Admins can insert approvals for any organization" ON role_upgrade_approvals IS 'Allows admin users to create approval records for any role upgrade request';
