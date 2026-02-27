/*
  # Fix Early Client Access - First 3 Users Only
  
  This migration updates the is_early_client function to grant automatic 
  Management access to the first 3 users (not 5) in each organization.
  
  This is specifically for organizations like Bower & Associates where the
  first 3 users should automatically get Management page access.
  
  1. Changes
    - Update is_early_client function to check for first 3 users (not 5)
    - Keep the check for 'client' or 'management' roles
    - Automatic access without requiring role upgrade requests
  
  2. Security
    - Function remains SECURITY DEFINER for proper permission handling
    - Access is organization-scoped
    - Based on creation timestamp order
*/

-- Update function to check if user is among first 3 clients OR management users in their organization
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
  early_user_count INTEGER;
BEGIN
  -- Get user's organization, role, and created_at
  SELECT organization_id, role, created_at
  INTO user_org_id, user_role, user_created_at
  FROM user_profiles
  WHERE id = user_id;
  
  -- If no organization, return false
  IF user_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Only check for client or management roles
  IF user_role NOT IN ('client', 'management') THEN
    RETURN FALSE;
  END IF;
  
  -- Count how many clients/management users were created before or at the same time as this user
  SELECT COUNT(*)
  INTO early_user_count
  FROM user_profiles
  WHERE organization_id = user_org_id
    AND role IN ('client', 'management')
    AND created_at <= user_created_at;
  
  -- Return true if this user is among the first 3 (changed from 5)
  RETURN early_user_count <= 3;
END;
$$;

-- Update the comment to reflect the change
COMMENT ON FUNCTION is_early_client IS 'Returns true if user is among first 3 client or management users in their organization. Used to grant automatic Management page access without role upgrade requests.';
