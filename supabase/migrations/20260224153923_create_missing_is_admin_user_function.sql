/*
  # Create Missing is_admin_user Function

  1. Problem
     - The is_admin_user function is referenced by RLS policies but doesn't exist
     - This causes "Database error querying schema" during login
  
  2. Solution
     - Create the is_admin_user helper function
     - Uses SECURITY DEFINER to avoid infinite recursion in RLS
     - Returns boolean indicating if current user is an admin
  
  3. Security
     - Function is STABLE and SECURITY DEFINER
     - Safely queries user_profiles without triggering recursive RLS checks
*/

-- Create the missing is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;
