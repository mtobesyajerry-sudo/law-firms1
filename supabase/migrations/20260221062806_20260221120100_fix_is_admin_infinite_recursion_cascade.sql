/*
  # Fix Infinite Recursion in is_admin Function with CASCADE

  1. Problem
    - The is_admin() function queries user_profiles table
    - user_profiles RLS policies call is_admin()
    - This creates infinite recursion preventing profile access

  2. Solution
    - Drop function with CASCADE to remove dependent policies
    - Recreate function with SECURITY DEFINER to bypass RLS
    - Recreate all dependent policies

  3. Changes
    - Drop is_admin function with CASCADE
    - Recreate with SECURITY DEFINER
    - Recreate admin policies for user_profiles and transaction_monitoring_rules
*/

-- Drop the existing function and all dependent policies
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Recreate user_profiles admin policies
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Recreate transaction_monitoring_rules admin policy if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transaction_monitoring_rules'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins manage TM rules"
      ON transaction_monitoring_rules
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
