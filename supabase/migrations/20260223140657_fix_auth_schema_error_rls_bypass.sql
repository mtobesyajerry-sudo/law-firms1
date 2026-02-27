/*
  # Fix Authentication Schema Error
  
  1. Problem
    - "Database error querying schema" occurs during authentication
    - RLS policies with is_admin() function cause issues during auth
    - The function queries user_profiles while auth is in progress
    
  2. Solution
    - Simplify is_admin() to avoid recursion during auth
    - Add a simpler check that doesn't cause schema queries during login
    - Keep security definer but make it more lightweight
*/

-- Drop and recreate is_admin with simpler logic
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' 
     FROM public.user_profiles 
     WHERE id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

-- Similarly update user_can_view_org_users to be more lightweight
DROP FUNCTION IF EXISTS user_can_view_org_users(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION user_can_view_org_users(viewer_id UUID, target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE
        -- Admins can view all
        WHEN role = 'admin' THEN true
        -- Must be in same organization
        WHEN organization_id IS NULL OR organization_id != target_org_id THEN false
        -- Management and compliance can view org users
        WHEN role IN ('management', 'senior_partner', 'partner', 'compliance_officer') THEN true
        -- Early clients (first 3) can view org users
        WHEN role IN ('client', 'management') THEN (
          SELECT COUNT(*) <= 3
          FROM user_profiles up2
          WHERE up2.organization_id = up.organization_id
          AND up2.role IN ('client', 'management')
          AND up2.created_at <= up.created_at
        )
        ELSE false
      END
     FROM user_profiles up
     WHERE up.id = viewer_id
     LIMIT 1),
    false
  );
$$;

-- Update is_early_client to be sql function instead of plpgsql
DROP FUNCTION IF EXISTS is_early_client(UUID) CASCADE;

CREATE OR REPLACE FUNCTION is_early_client(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE
        WHEN organization_id IS NULL THEN false
        WHEN role NOT IN ('client', 'management') THEN false
        ELSE (
          SELECT COUNT(*) <= 3
          FROM user_profiles up2
          WHERE up2.organization_id = up.organization_id
          AND up2.role IN ('client', 'management')
          AND up2.created_at <= up.created_at
        )
      END
     FROM user_profiles up
     WHERE up.id = user_id
     LIMIT 1),
    false
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_view_org_users(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_early_client(UUID) TO authenticated;
