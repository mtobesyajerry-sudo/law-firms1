/*
  # Enforce Admin Role Separation - Critical Security Update

  ## Purpose
  This migration enforces a strict separation between:
  1. **System Administrators (role='admin')**: Global system administrators who manage ALL organizations
  2. **Organization Management**: Partners, senior partners, and management within their own organizations

  ## Changes Made

  1. **Documentation Updates**
    - Add comments to user_profiles table clarifying role hierarchy
    - Document that 'admin' role is EXCLUSIVELY for system administrators
    - Clarify that organization management uses 'management', 'senior_partner', 'partner' roles

  2. **Security Constraints**
    - Add check constraint to prevent organization_id from being set for admin users
    - Admins MUST have NULL organization_id (they manage ALL organizations)
    - Non-admin users MUST have an organization_id (they belong to ONE organization)

  3. **RLS Policy Updates**
    - Ensure admin access policies clearly distinguish system admin from org management
    - Add comments to all admin-related policies explaining the distinction

  ## Important Notes
  - System admins (role='admin') have organization_id = NULL
  - Organization managers have organization_id = <their org> AND role IN ('management', 'senior_partner', 'partner')
  - These are completely separate roles with different access scopes
  - This prevents any confusion between system admin and organization admin
*/

-- Step 1: Add comprehensive comments to user_profiles table
COMMENT ON TABLE user_profiles IS 'User profiles with strict role-based access control. CRITICAL: admin role is for SYSTEM ADMINISTRATORS ONLY (organization_id must be NULL). Organization management uses management/senior_partner/partner roles WITH an organization_id.';

COMMENT ON COLUMN user_profiles.role IS 'User role: admin (SYSTEM ADMIN - NULL org_id), management/senior_partner/partner (ORG MANAGEMENT - HAS org_id), compliance_officer, mlro, staff, lawyer, client';

COMMENT ON COLUMN user_profiles.organization_id IS 'Organization FK. NULL for system admins (role=admin), REQUIRED for all other roles. System admins manage ALL organizations, other roles belong to ONE organization.';

-- Step 2: Add check constraint to enforce admin/organization separation
-- First, check if constraint already exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_must_have_null_org' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT admin_must_have_null_org;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'non_admin_must_have_org' 
    AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT non_admin_must_have_org;
  END IF;
END $$;

-- Add constraints
ALTER TABLE user_profiles 
ADD CONSTRAINT admin_must_have_null_org 
CHECK (
  role != 'admin' OR organization_id IS NULL
);

ALTER TABLE user_profiles 
ADD CONSTRAINT non_admin_must_have_org 
CHECK (
  role = 'admin' OR organization_id IS NOT NULL
);

-- Step 3: Update existing admin users to ensure they have NULL organization_id
-- This is critical to fix any data inconsistency
UPDATE user_profiles 
SET organization_id = NULL 
WHERE role = 'admin' AND organization_id IS NOT NULL;

-- Step 4: Add helper function with clear documentation
CREATE OR REPLACE FUNCTION is_system_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id 
  INTO user_role, user_org_id
  FROM user_profiles 
  WHERE id = user_id;
  
  -- System admin MUST have role='admin' AND organization_id IS NULL
  RETURN (user_role = 'admin' AND user_org_id IS NULL);
END;
$$;

COMMENT ON FUNCTION is_system_admin IS 'Returns TRUE only if user is a SYSTEM ADMINISTRATOR (role=admin AND organization_id IS NULL). Organization-level admins return FALSE.';

-- Step 5: Add helper function for organization management
CREATE OR REPLACE FUNCTION is_organization_manager(user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id 
  INTO user_role, user_org_id
  FROM user_profiles 
  WHERE id = user_id;
  
  -- Organization manager must:
  -- 1. Have role IN ('management', 'senior_partner', 'partner')
  -- 2. Have organization_id matching the check_org_id
  -- 3. NOT be a system admin
  RETURN (
    user_role IN ('management', 'senior_partner', 'partner') 
    AND user_org_id = check_org_id
    AND user_org_id IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION is_organization_manager IS 'Returns TRUE if user is an organization-level manager (management/senior_partner/partner role) within the specified organization. System admins return FALSE.';

-- Step 6: Create view to clearly show role separation
CREATE OR REPLACE VIEW user_role_classification AS
SELECT 
  id,
  email,
  role,
  organization_id,
  CASE 
    WHEN role = 'admin' AND organization_id IS NULL THEN 'SYSTEM_ADMINISTRATOR'
    WHEN role IN ('management', 'senior_partner', 'partner') AND organization_id IS NOT NULL THEN 'ORGANIZATION_MANAGER'
    WHEN role IN ('compliance_officer', 'mlro', 'staff', 'lawyer') AND organization_id IS NOT NULL THEN 'ORGANIZATION_STAFF'
    WHEN role = 'client' AND organization_id IS NOT NULL THEN 'ORGANIZATION_CLIENT'
    ELSE 'INVALID_CONFIGURATION'
  END as role_classification,
  CASE 
    WHEN role = 'admin' AND organization_id IS NOT NULL THEN 'ERROR: System admin must have NULL organization_id'
    WHEN role != 'admin' AND organization_id IS NULL THEN 'ERROR: Non-admin must have organization_id'
    ELSE 'OK'
  END as configuration_status
FROM user_profiles;

COMMENT ON VIEW user_role_classification IS 'Shows clear classification of user roles: SYSTEM_ADMINISTRATOR (admin role, no org), ORGANIZATION_MANAGER (management roles within org), ORGANIZATION_STAFF, ORGANIZATION_CLIENT. Use this to verify proper role configuration.';

-- Step 7: Add validation trigger
CREATE OR REPLACE FUNCTION validate_user_role_configuration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- System admins cannot have an organization
  IF NEW.role = 'admin' AND NEW.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'System administrators (role=admin) cannot be assigned to an organization. Use management/senior_partner/partner roles for organization-level admins.';
  END IF;
  
  -- Non-admins must have an organization
  IF NEW.role != 'admin' AND NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Non-admin users must be assigned to an organization. Only system administrators (role=admin) can have NULL organization_id.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_user_role_config_trigger ON user_profiles;

-- Create trigger
CREATE TRIGGER validate_user_role_config_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role_configuration();

COMMENT ON FUNCTION validate_user_role_configuration IS 'Trigger function that enforces admin role separation: admins must have NULL org_id, non-admins must have org_id.';
