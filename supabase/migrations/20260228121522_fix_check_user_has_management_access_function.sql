/*
  # Fix check_user_has_management_access Function

  1. Problem
    - The check_user_has_management_access function ONLY checks organization_user_access table
    - Users with management roles (management, senior_partner, partner) are NOT recognized
    - This causes "You do not have management access" error for legitimate management users

  2. Solution
    - Update function to check BOTH organization_user_access AND user role
    - Allow users with management/senior_partner/partner roles in the organization
    - Allow users with entries in organization_user_access table
    - Allow admin users (they can access any organization)

  3. Security
    - Management users must be in the same organization
    - Admin users can access any organization
    - Regular users without management role or access entry are denied
*/

-- Drop the old function with CASCADE (will drop dependent policies)
DROP FUNCTION IF EXISTS check_user_has_management_access(uuid, uuid) CASCADE;

-- Create updated function that checks BOTH role AND organization_user_access
CREATE OR REPLACE FUNCTION check_user_has_management_access(
  check_user_id uuid,
  org_id uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_has_access boolean;
BEGIN
  -- Check if user has management access through role OR organization_user_access
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = check_user_id
      AND (
        -- Admin users have access to all organizations
        role = 'admin'
        OR
        -- Management roles in the same organization
        (
          role IN ('management', 'senior_partner', 'partner')
          AND organization_id = org_id
        )
      )
  ) OR EXISTS (
    -- OR has explicit access through organization_user_access table
    SELECT 1 FROM organization_user_access
    WHERE user_id = check_user_id
      AND organization_id = org_id
      AND is_active = true
  ) INTO user_has_access;

  RETURN user_has_access;
END;
$$;

-- Recreate the policy that was dropped
CREATE POLICY "Management users can view org approvals"
  ON role_upgrade_approvals
  FOR SELECT
  TO authenticated
  USING (
    check_user_has_management_access(auth.uid(), organization_id)
  );

-- Add comment explaining the function
COMMENT ON FUNCTION check_user_has_management_access(uuid, uuid) IS
'Checks if a user has management access to an organization. Returns true if:
1. User is an admin (can access any org)
2. User has management/senior_partner/partner role in the organization
3. User has an active entry in organization_user_access for the organization';