/*
  # Add Management Role Approval Permissions

  This migration adds RLS policies to allow management-level users (management, senior_partner, partner)
  to approve role upgrade requests and update user roles within their organization.

  1. Security Changes
    - Add SELECT policy for management roles to view role upgrade requests in their organization
    - Add UPDATE policy for management roles to approve/reject role upgrade requests in their organization
    - Add UPDATE policy for management roles to update user profiles in their organization
  
  2. Notes
    - Management users can only manage users within their own organization
    - Management users cannot update admin users
    - All changes are organization-scoped for security
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all role upgrade requests in organization" ON role_upgrade_requests;
DROP POLICY IF EXISTS "Admins can update role upgrade requests in organization" ON role_upgrade_requests;

-- Create new policies that include management roles

-- Allow management roles to view role upgrade requests in their organization
CREATE POLICY "Management can view role upgrade requests in organization"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );

-- Allow management roles to update role upgrade requests in their organization
CREATE POLICY "Management can update role upgrade requests in organization"
  ON role_upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );

-- Allow management roles to update user profiles in their organization (excluding admins)
CREATE POLICY "Management can update user profiles in organization"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS manager
      WHERE manager.id = auth.uid()
      AND manager.organization_id = user_profiles.organization_id
      AND manager.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
    -- Cannot update admin users unless you are an admin
    AND (
      user_profiles.role != 'admin'
      OR EXISTS (
        SELECT 1 FROM user_profiles AS updater
        WHERE updater.id = auth.uid()
        AND updater.role = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS manager
      WHERE manager.id = auth.uid()
      AND manager.organization_id = user_profiles.organization_id
      AND manager.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
    -- Cannot update to admin role unless you are an admin
    AND (
      user_profiles.role != 'admin'
      OR EXISTS (
        SELECT 1 FROM user_profiles AS updater
        WHERE updater.id = auth.uid()
        AND updater.role = 'admin'
      )
    )
  );
