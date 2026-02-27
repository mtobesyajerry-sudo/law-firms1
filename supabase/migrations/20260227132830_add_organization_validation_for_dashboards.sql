/*
  # Add Organization Validation for Dashboard Access

  1. Purpose
    - Create database functions to validate dashboard access based on organization assignment
    - Ensure non-admin users cannot access dashboards without an organization
    - Provide clear error messages for organization-related access issues

  2. Functions Created
    - can_access_dashboard(): Validates if current user can access non-admin dashboards
    - get_user_dashboard_info(): Returns user's dashboard access information
    - must_have_organization(): Validates organization requirement for specific operations

  3. Security
    - All functions use SECURITY DEFINER to bypass RLS when checking user status
    - Returns boolean/status values only, no sensitive data exposure
*/

-- Function to check if user can access organization-specific dashboards
CREATE OR REPLACE FUNCTION can_access_dashboard()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- If no user found, deny access
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admins can always access (they use admin dashboard)
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Non-admins MUST have an organization to access dashboards
  IF user_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to get comprehensive user dashboard information
CREATE OR REPLACE FUNCTION get_user_dashboard_info()
RETURNS TABLE (
  user_id UUID,
  user_role TEXT,
  organization_id UUID,
  organization_name TEXT,
  can_access BOOLEAN,
  access_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.role as user_role,
    up.organization_id,
    o.name as organization_name,
    CASE 
      -- Admins always have access (to admin dashboard)
      WHEN up.role = 'admin' THEN TRUE
      -- Non-admins need an organization
      WHEN up.role != 'admin' AND up.organization_id IS NOT NULL THEN TRUE
      ELSE FALSE
    END as can_access,
    CASE 
      WHEN up.role = 'admin' THEN 'Access granted to System Administration Dashboard'
      WHEN up.role != 'admin' AND up.organization_id IS NOT NULL THEN 'Access granted to organization dashboard: ' || COALESCE(o.name, 'Unknown')
      WHEN up.role != 'admin' AND up.organization_id IS NULL THEN 'Access denied: No organization assigned. Please contact your system administrator.'
      ELSE 'Access denied: Unknown reason'
    END as access_message
  FROM user_profiles up
  LEFT JOIN organizations o ON o.id = up.organization_id
  WHERE up.id = auth.uid()
  LIMIT 1;
END;
$$;

-- Function to validate organization requirement for specific operations
-- Returns TRUE if user meets organization requirements, FALSE otherwise
CREATE OR REPLACE FUNCTION must_have_organization()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- If no user found, requirement not met
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admins don't need an organization (they're global)
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Non-admins MUST have an organization
  RETURN user_org_id IS NOT NULL;
END;
$$;

-- Function to get organization requirement status message
CREATE OR REPLACE FUNCTION get_organization_requirement_message()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
  org_name TEXT;
BEGIN
  -- Get user details
  SELECT up.role, up.organization_id, o.name 
  INTO user_role, user_org_id, org_name
  FROM user_profiles up
  LEFT JOIN organizations o ON o.id = up.organization_id
  WHERE up.id = auth.uid()
  LIMIT 1;

  -- If no user found
  IF user_role IS NULL THEN
    RETURN 'User not found. Please sign in again.';
  END IF;

  -- Admins
  IF user_role = 'admin' THEN
    RETURN 'System Administrator - Global access to all organizations';
  END IF;

  -- Non-admins with organization
  IF user_org_id IS NOT NULL THEN
    RETURN 'Organization: ' || COALESCE(org_name, 'Unknown Organization');
  END IF;

  -- Non-admins without organization (ERROR STATE)
  RETURN 'ERROR: No organization assigned. You cannot access organization-specific features. Please contact your system administrator to assign you to an organization.';
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION can_access_dashboard IS 
'Validates if the current user can access dashboards. Admins always return TRUE. Non-admins must have an organization_id assigned.';

COMMENT ON FUNCTION get_user_dashboard_info IS 
'Returns comprehensive dashboard access information including user role, organization, and access status with message.';

COMMENT ON FUNCTION must_have_organization IS 
'Validates organization requirement. Returns TRUE for admins (no org needed) and non-admins with organization_id. Returns FALSE for non-admins without organization_id.';

COMMENT ON FUNCTION get_organization_requirement_message IS 
'Returns a human-readable message about the user''s organization status and access level.';
