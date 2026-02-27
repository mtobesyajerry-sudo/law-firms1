/*
  # Update User Roles for New Dashboard Structure

  1. Purpose
    - Add new roles to support the redesigned dashboard structure
    - Roles: management, staff, compliance_officer (in addition to admin, client)
    - Update role constraints to include all valid roles

  2. New Role Structure
    - `admin` - System administrators (full access to everything)
    - `client` - Basic client users (organization view only)
    - `management` - Management team (strategic oversight, analytics)
    - `staff` - Staff members (operational work, KYC management)
    - `compliance_officer` - Compliance officers (compliance, STR alerts, risk assessment)

  3. Changes
    - Update role constraint to include new roles
    - Keep existing roles (lawyer, mlro, senior_partner) for backward compatibility
    - Add role descriptions as comments

  4. Access Control
    - Admin: Full system access (remains unchanged)
    - Client: Organization info only
    - Management: Strategic dashboards and analytics
    - Staff: KYC management and operational tasks
    - Compliance Officer: Risk assessment, STR alerts, compliance intelligence

  5. Important Notes
    - Existing users keep their current roles
    - New registration system will assign appropriate roles
    - Role-based routing will be handled in the frontend
*/

-- Drop the old constraint
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add updated constraint with new roles
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN (
    'admin',
    'client', 
    'management',
    'staff',
    'compliance_officer',
    -- Legacy roles for backward compatibility
    'lawyer',
    'mlro',
    'senior_partner'
  ));

-- Update role column comment
COMMENT ON COLUMN user_profiles.role IS 'User role: admin (system admin), client (basic access), management (strategic oversight), staff (operations), compliance_officer (compliance tasks). Legacy roles: lawyer, mlro, senior_partner.';

-- Create a function to check if user has management access
CREATE OR REPLACE FUNCTION public.has_management_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'management')
  );
$$;

-- Create a function to check if user has staff access
CREATE OR REPLACE FUNCTION public.has_staff_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'staff', 'lawyer')
  );
$$;

-- Create a function to check if user has compliance access
CREATE OR REPLACE FUNCTION public.has_compliance_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'compliance_officer', 'mlro')
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_management_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_compliance_access(uuid) TO authenticated;

-- Create index for better performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_access ON user_profiles(role) 
  WHERE role IN ('management', 'staff', 'compliance_officer');
