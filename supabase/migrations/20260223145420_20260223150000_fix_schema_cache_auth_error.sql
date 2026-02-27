/*
  # Fix Schema Cache Auth Error

  1. Purpose
    - Fix "Database error querying schema" during authentication
    - Update all helper functions with explicit search paths
    - Simplify RLS policy execution

  2. Changes
    - Add explicit search_path to all security definer functions
    - Optimize is_admin() function to reduce query overhead
    - Add database statistics update

  3. Security
    - No RLS changes
    - Maintains all existing security policies
*/

-- Update all helper functions with explicit search paths
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' 
     FROM public.user_profiles 
     WHERE id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_and_org()
RETURNS TABLE(user_role text, org_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT role, organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT COUNT(*)
  FROM auth.users;
$$;

-- Update table statistics for better query planning
ANALYZE user_profiles;
ANALYZE organizations;

-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_uid ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
