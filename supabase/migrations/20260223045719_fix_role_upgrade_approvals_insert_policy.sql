/*
  # Fix Role Upgrade Approvals INSERT Policy

  Update the INSERT policy on role_upgrade_approvals to allow users with
  management roles to insert approvals, not just users with org access entries.

  ## Changes
  1. Drop existing INSERT policy
  2. Create new policy that checks both role and organization_user_access

  ## Security
  - Users with admin/management/senior_partner roles can insert approvals
  - Users with organization_user_access entries can insert approvals
  - Approver must be the current user
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Management users can insert approvals" ON role_upgrade_approvals;

-- Create new policy that checks both role AND org access
CREATE POLICY "management_can_insert_approvals"
  ON role_upgrade_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_user_id = auth.uid()
    AND (
      -- Check if user has management role
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = role_upgrade_approvals.organization_id
        AND user_profiles.role IN ('admin', 'management', 'senior_partner')
      )
      OR
      -- Check if user has organization access
      EXISTS (
        SELECT 1 FROM organization_user_access
        WHERE organization_user_access.user_id = auth.uid()
        AND organization_user_access.organization_id = role_upgrade_approvals.organization_id
        AND organization_user_access.is_active = true
      )
    )
  );
