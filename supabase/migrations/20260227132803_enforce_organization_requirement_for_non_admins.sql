/*
  # Enforce Organization Requirement for Non-Admin Users

  1. Business Rules
    - System Administrators (role='admin') MUST have organization_id = NULL (they are global, not tied to any org)
    - ALL other roles MUST have an organization_id (they belong to a specific organization)
    - This ensures proper data isolation and access control

  2. Changes
    - Add CHECK constraint to enforce organization requirements based on role
    - Update RLS policies to ensure non-admin users can only access data from their organization
    - Ensure admin users can access all data across all organizations

  3. Security
    - Prevents non-admin users from operating without an organization
    - Enforces proper data isolation between organizations
    - Maintains admin's global access to all organizations

  4. Important Notes
    - This migration does NOT modify existing user data
    - Any existing non-admin users without organization_id will need to be assigned one manually
    - The constraint will prevent future invalid assignments
*/

-- Drop the existing constraint if it exists
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_organization_requirement;

-- Add a CHECK constraint to enforce organization requirements
-- Admins MUST have NULL organization_id
-- Non-admins MUST have a valid organization_id
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_organization_requirement 
CHECK (
  (role = 'admin' AND organization_id IS NULL) OR
  (role != 'admin' AND organization_id IS NOT NULL)
);

-- Create or replace a function to validate organization assignment
CREATE OR REPLACE FUNCTION validate_organization_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin users must NOT have an organization
  IF NEW.role = 'admin' AND NEW.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Admin users cannot be assigned to an organization. They have global system access.';
  END IF;

  -- Non-admin users MUST have an organization
  IF NEW.role != 'admin' AND NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Non-admin users must be assigned to an organization. Role: %', NEW.role;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS enforce_organization_assignment ON user_profiles;

-- Create trigger to enforce organization assignment on INSERT and UPDATE
CREATE TRIGGER enforce_organization_assignment
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_assignment();

-- Update RLS policies to enforce organization-based access
-- These policies ensure that non-admin users can ONLY see/modify data from their own organization

-- Drop existing policies that we'll recreate with proper organization checks
DROP POLICY IF EXISTS "Non-admins can view users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Non-admins can view assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Non-admins can view clients in their organization" ON kyc_clients;
DROP POLICY IF EXISTS "Non-admins can view matters in their organization" ON matters;

-- User Profiles: Non-admins can only see users in their organization
CREATE POLICY "Non-admins can view users in their organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all users
    is_admin_user() OR
    -- Non-admins can only see users in their own organization (both must have an org)
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- Assessments: Non-admins can only see assessments in their organization
CREATE POLICY "Non-admins can view assessments in their organization"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all assessments
    is_admin_user() OR
    -- Non-admins can only see assessments from their organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- KYC Clients: Non-admins can only see clients in their organization
CREATE POLICY "Non-admins can view clients in their organization"
  ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all clients
    is_admin_user() OR
    -- Non-admins can only see clients from their organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- Matters: Non-admins can only see matters in their organization
CREATE POLICY "Non-admins can view matters in their organization"
  ON matters
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all matters
    is_admin_user() OR
    -- Non-admins can only see matters from their organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- Add similar policies for INSERT operations to ensure data is created within proper organization
-- Assessments INSERT
DROP POLICY IF EXISTS "Non-admins can insert assessments in their organization" ON assessments;
CREATE POLICY "Non-admins can insert assessments in their organization"
  ON assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    is_admin_user() OR
    -- Non-admins can only insert for their own organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- KYC Clients INSERT
DROP POLICY IF EXISTS "Non-admins can insert clients in their organization" ON kyc_clients;
CREATE POLICY "Non-admins can insert clients in their organization"
  ON kyc_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    is_admin_user() OR
    -- Non-admins can only insert for their own organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- Matters INSERT
DROP POLICY IF EXISTS "Non-admins can insert matters in their organization" ON matters;
CREATE POLICY "Non-admins can insert matters in their organization"
  ON matters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert for any organization
    is_admin_user() OR
    -- Non-admins can only insert for their own organization
    (organization_id = get_user_organization_id() AND organization_id IS NOT NULL)
  );

-- Create a helper function to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION user_belongs_to_organization(check_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = check_user_id
    AND organization_id IS NOT NULL
  );
END;
$$;

-- Add comments for documentation
COMMENT ON CONSTRAINT user_profiles_organization_requirement ON user_profiles IS 
'Enforces that admin users have NULL organization_id (global access) and non-admin users have a valid organization_id (organization-scoped access)';

COMMENT ON FUNCTION validate_organization_assignment IS 
'Trigger function that validates organization assignment rules: admins must have NULL organization_id, non-admins must have a valid organization_id';

COMMENT ON FUNCTION user_belongs_to_organization IS 
'Helper function to check if a user is assigned to an organization (returns false for admins with NULL organization_id)';
