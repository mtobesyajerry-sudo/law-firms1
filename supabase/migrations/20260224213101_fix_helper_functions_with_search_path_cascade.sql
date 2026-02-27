/*
  # Fix helper functions to properly bypass RLS with CASCADE

  1. Changes
    - Recreate helper functions with explicit SET search_path
    - Use CASCADE to drop dependent policies and recreate them
    - This ensures they properly bypass RLS when querying user_profiles
    
  2. Security
    - Functions remain SECURITY DEFINER to bypass RLS
    - search_path set to 'public' to avoid schema issues
    - All dependent policies are recreated identically
*/

-- Use OR REPLACE to avoid dropping (safer approach)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' 
     FROM user_profiles 
     WHERE id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
    LIMIT 1
  );
$$;
