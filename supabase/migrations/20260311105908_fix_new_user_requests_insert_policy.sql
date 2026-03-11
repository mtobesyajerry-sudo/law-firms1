/*
  # Fix new_user_requests Insert Policy
  
  1. Changes
    - Add admin access to create new_user_requests for any organization
    - Keep existing management user restrictions
  
  2. Security
    - Admins can create requests for any organization (for system administration)
    - Management users can only create requests for their own organization
    - All requests must have an organization_id (data isolation maintained)
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Allow management to create org user requests" ON new_user_requests;

-- Create new policy with admin access
CREATE POLICY "Allow management and admin to create org user requests"
  ON new_user_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must have organization_id (data isolation requirement)
    organization_id IS NOT NULL
    AND
    (
      -- Admin can create for any organization
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      )
      OR
      -- Management users can create for their organization
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('management', 'senior_partner', 'partner')
        AND user_profiles.organization_id = new_user_requests.organization_id
      )
    )
  );
