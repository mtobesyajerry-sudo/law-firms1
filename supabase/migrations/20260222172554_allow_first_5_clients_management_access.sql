/*
  # Allow First 5 Client Users Management Access

  This migration allows the first 5 client users in each organization to:
  - View role upgrade requests in their organization
  - Approve/reject role upgrade requests
  - Update user profiles (excluding admins)

  1. New Functions
    - `is_early_client(user_id UUID)` - Returns true if user is among first 5 clients in their org
  
  2. Security Changes
    - Add SELECT policy for early clients to view role upgrade requests
    - Add UPDATE policy for early clients to approve role upgrade requests
    - Add UPDATE policy for early clients to update user profiles in their organization
  
  3. Notes
    - "First 5" is determined by created_at timestamp
    - Only applies to users with 'client' role
    - All changes are organization-scoped for security
*/

-- Create function to check if user is among first 5 clients in their organization
CREATE OR REPLACE FUNCTION is_early_client(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_org_id UUID;
  user_role TEXT;
  user_created_at TIMESTAMPTZ;
  early_client_count INTEGER;
BEGIN
  -- Get user's organization, role, and created_at
  SELECT organization_id, role, created_at
  INTO user_org_id, user_role, user_created_at
  FROM user_profiles
  WHERE id = user_id;
  
  -- If no organization or not a client, return false
  IF user_org_id IS NULL OR user_role != 'client' THEN
    RETURN FALSE;
  END IF;
  
  -- Count how many clients were created before or at the same time as this user
  SELECT COUNT(*)
  INTO early_client_count
  FROM user_profiles
  WHERE organization_id = user_org_id
    AND role = 'client'
    AND created_at <= user_created_at;
  
  -- Return true if this user is among the first 5
  RETURN early_client_count <= 5;
END;
$$;

-- Allow early clients to view role upgrade requests in their organization
CREATE POLICY "Early clients can view role upgrade requests in organization"
  ON role_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND is_early_client(auth.uid())
    )
  );

-- Allow early clients to update role upgrade requests in their organization
CREATE POLICY "Early clients can update role upgrade requests in organization"
  ON role_upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND is_early_client(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = role_upgrade_requests.organization_id
      AND is_early_client(auth.uid())
    )
  );

-- Allow early clients to update user profiles in their organization (excluding admins)
CREATE POLICY "Early clients can update user profiles in organization"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS early_client
      WHERE early_client.id = auth.uid()
      AND early_client.organization_id = user_profiles.organization_id
      AND is_early_client(auth.uid())
    )
    -- Cannot update admin users
    AND user_profiles.role != 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS early_client
      WHERE early_client.id = auth.uid()
      AND early_client.organization_id = user_profiles.organization_id
      AND is_early_client(auth.uid())
    )
    -- Cannot promote to admin role
    AND user_profiles.role != 'admin'
  );
