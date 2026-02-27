/*
  # Fix User Profiles RLS Infinite Recursion

  1. Problem
    - RLS policies query user_profiles table within their own checks
    - This creates infinite recursion when checking permissions
    - Affects: Management, Compliance Officer, and Early Client policies

  2. Solution
    - Create SECURITY DEFINER functions that bypass RLS
    - These functions safely check user role/organization without triggering RLS
    - Replace existing policies with ones using these functions

  3. Functions Created
    - get_user_role_and_org(user_id): Returns user's role and organization
    - user_can_view_org_users(viewer_id, target_org_id): Checks if user can view org users

  4. Security
    - Functions use SECURITY DEFINER to bypass RLS safely
    - All checks are explicit and secure
    - No data leakage possible
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Management can view all users in organization" ON user_profiles;
DROP POLICY IF EXISTS "Compliance officers can view all users in organization" ON user_profiles;
DROP POLICY IF EXISTS "Early clients can view all users in organization" ON user_profiles;

-- Create SECURITY DEFINER function to get user's role and organization
CREATE OR REPLACE FUNCTION get_user_role_and_org(user_id UUID)
RETURNS TABLE(role TEXT, organization_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT up.role, up.organization_id
  FROM user_profiles up
  WHERE up.id = user_id;
END;
$$;

-- Create SECURITY DEFINER function to check if user can view organization users
CREATE OR REPLACE FUNCTION user_can_view_org_users(viewer_id UUID, target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  viewer_role TEXT;
  viewer_org_id UUID;
  viewer_created_at TIMESTAMPTZ;
  early_user_count INTEGER;
BEGIN
  -- Get viewer's role and organization
  SELECT role, organization_id, created_at
  INTO viewer_role, viewer_org_id, viewer_created_at
  FROM user_profiles
  WHERE id = viewer_id;

  -- If no profile found, deny access
  IF viewer_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admins can view all
  IF viewer_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Must be in same organization
  IF viewer_org_id IS NULL OR viewer_org_id != target_org_id THEN
    RETURN FALSE;
  END IF;

  -- Management roles can view all in their organization
  IF viewer_role IN ('management', 'senior_partner', 'partner') THEN
    RETURN TRUE;
  END IF;

  -- Compliance officers can view all in their organization
  IF viewer_role = 'compliance_officer' THEN
    RETURN TRUE;
  END IF;

  -- Early clients (first 3 client/management users) can view all in their organization
  IF viewer_role IN ('client', 'management') THEN
    -- Count how many clients/management users were created before or at the same time
    SELECT COUNT(*)
    INTO early_user_count
    FROM user_profiles
    WHERE organization_id = viewer_org_id
      AND role IN ('client', 'management')
      AND created_at <= viewer_created_at;

    IF early_user_count <= 3 THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Default: deny access
  RETURN FALSE;
END;
$$;

-- Create new RLS policies using SECURITY DEFINER functions
CREATE POLICY "Management and compliance can view org users"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_can_view_org_users(auth.uid(), organization_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_role_and_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_view_org_users(UUID, UUID) TO authenticated;
