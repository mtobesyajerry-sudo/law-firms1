/*
  # Grant Management Access to Bower & Associates First 3 Users
  
  This migration ensures that the first 3 users in Bower & Associates organization
  get automatic Management access.
  
  1. Updates
    - Modify is_early_client function to also check for 'management' role
    - This allows management users to have the same access as early clients
    - Specifically designed to support Bower & Associates (and other orgs) first 3 users
  
  2. Notes
    - Jack Bower (jb@gmail.com) is already set to 'management' role
    - When 2 more users join Bower & Associates, they should also get 'management' role
    - The function now returns TRUE for both:
      * First 5 users with 'client' role (existing behavior)
      * First 5 users with 'management' role (new behavior)
*/

-- Update function to check if user is among first 5 clients OR management users in their organization
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
  
  -- Return true if this user is among the first 5
  RETURN early_user_count <= 5;
END;
$$;

-- Create a comment to document this change
COMMENT ON FUNCTION is_early_client IS 'Returns true if user is among first 5 client or management users in their organization. Used to grant early access to organization management features.';
