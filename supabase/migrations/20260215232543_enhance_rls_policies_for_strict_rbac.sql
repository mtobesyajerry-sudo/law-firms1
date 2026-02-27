-- Enhanced RLS Policies for Strict Role-Based Access Control
--
-- Overview: Implement strict RBAC with separation of duties
--
-- Enhancements:
-- 1. Add role-specific helper functions
-- 2. Add compliance officer and MLRO role support
-- 3. Add role permissions matrix

-- Drop existing helper functions with specific signatures
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_compliance_officer() CASCADE;
DROP FUNCTION IF EXISTS can_access_organization(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_permission(uuid, text, text) CASCADE;

-- Helper function to check if user is admin (no parameters, uses auth.uid() directly)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- Helper function to check if user is compliance officer
CREATE OR REPLACE FUNCTION is_compliance_officer()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('compliance_officer', 'mlro')
    AND is_active = true
  );
END;
$$;

-- Helper function to check if user can access organization
CREATE OR REPLACE FUNCTION can_access_organization(org_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND is_active = true
  );
END;
$$;

-- Add new roles to user_profiles
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('client', 'admin', 'lawyer', 'compliance_officer', 'mlro'));
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Add table for role permissions matrix
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'execute')),
  allowed boolean DEFAULT true,
  conditions jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Insert default role permissions
INSERT INTO role_permissions (role, resource, action, allowed, description)
SELECT * FROM (VALUES
  ('client', 'assessments', 'create', true, 'Clients can create their own assessments'),
  ('client', 'assessments', 'read', true, 'Clients can view their own assessments'),
  ('client', 'assessments', 'update', true, 'Clients can update their own assessments'),
  ('client', 'assessments', 'delete', true, 'Clients can delete their own assessments'),
  ('client', 'organizations', 'read', true, 'Clients can view their own organization'),
  ('client', 'documents', 'create', true, 'Clients can upload documents'),
  ('client', 'documents', 'read', true, 'Clients can view their documents'),
  
  ('lawyer', 'assessments', 'create', true, 'Lawyers can create client assessments'),
  ('lawyer', 'assessments', 'read', true, 'Lawyers can view their client assessments'),
  ('lawyer', 'assessments', 'update', true, 'Lawyers can update client assessments'),
  ('lawyer', 'clients', 'read', true, 'Lawyers can view their clients'),
  ('lawyer', 'documents', 'create', true, 'Lawyers can upload documents'),
  
  ('compliance_officer', 'assessments', 'read', true, 'Compliance officers can review all assessments'),
  ('compliance_officer', 'alerts', 'read', true, 'Compliance officers can view alerts'),
  ('compliance_officer', 'alerts', 'update', true, 'Compliance officers can update alert status'),
  ('compliance_officer', 'audit_logs', 'read', true, 'Compliance officers can view audit logs'),
  
  ('mlro', 'assessments', 'read', true, 'MLRO can access all assessments'),
  ('mlro', 'suspicious_activity', 'create', true, 'MLRO can file STRs'),
  ('mlro', 'audit_logs', 'read', true, 'MLRO can access audit logs'),
  ('mlro', 'alerts', 'read', true, 'MLRO can view all security alerts'),
  
  ('admin', 'users', 'create', true, 'Admins can create users'),
  ('admin', 'users', 'read', true, 'Admins can view all users'),
  ('admin', 'users', 'update', true, 'Admins can update users'),
  ('admin', 'users', 'delete', true, 'Admins can deactivate users'),
  ('admin', 'organizations', 'create', true, 'Admins can create organizations'),
  ('admin', 'organizations', 'read', true, 'Admins can view all organizations'),
  ('admin', 'organizations', 'update', true, 'Admins can update organizations'),
  ('admin', 'assessments', 'read', true, 'Admins can view assessments for oversight'),
  ('admin', 'audit_logs', 'read', true, 'Admins can access audit logs'),
  ('admin', 'security', 'execute', true, 'Admins can manage security settings')
) AS v(role, resource, action, allowed, description)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions
  WHERE role_permissions.role = v.role
  AND role_permissions.resource = v.resource
  AND role_permissions.action = v.action
);

-- Function to check permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_resource text,
  p_action text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  user_role text;
  has_perm boolean;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = p_user_id
  AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT allowed INTO has_perm
  FROM role_permissions
  WHERE role = user_role
  AND resource = p_resource
  AND action = p_action;
  
  RETURN COALESCE(has_perm, false);
END;
$$;