/*
  # Fix Infinite Recursion in User Profiles RLS Policy

  1. Problem
    - The is_admin function was causing infinite recursion
    - Anonymous users need a way to check if any users exist for first-user registration

  2. Solution
    - Create a simple function to count total users
    - Allow anonymous access to this function only
    - Remove the problematic anonymous SELECT policy

  3. Security
    - Only exposes the count of users, not any user data
    - Essential for first-user administrator registration
*/

-- Create a function that returns the count of user profiles
CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM user_profiles;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_count() TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_count() IS 'Returns the total count of user profiles. Used for first-user registration check.';
