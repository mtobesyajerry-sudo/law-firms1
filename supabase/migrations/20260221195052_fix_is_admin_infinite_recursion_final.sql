/*
  # Fix is_admin() Infinite Recursion - Final Solution
  
  1. Problem
    - is_admin() queries user_profiles table
    - user_profiles RLS policies call is_admin()
    - Creates infinite recursion loop causing blank/flashing screen
    
  2. Solution
    - Recreate is_admin() with SECURITY DEFINER to bypass RLS
    - This allows the function to read user_profiles without triggering policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
