/*
  # Fix Missing get_user_count Function

  ## Overview
  Creates the get_user_count function which is critical for first user registration.
  This function allows the registration form to determine if the registering user
  is the first user in the system (who should become admin automatically).

  ## Changes
  1. Create get_user_count() function that returns the count of users in auth.users
  2. Grant execute permission to anon role (for unauthenticated registration check)
  3. Grant execute permission to authenticated role

  ## Security
  - Function uses SECURITY DEFINER to allow counting users without direct auth.users access
  - Returns only a count number, no sensitive user data exposed
  - Safe for anonymous users to call during registration
*/

-- Drop function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS get_user_count();

-- Create function to get user count from auth.users
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;

-- Grant execute permission to anon (for registration page) and authenticated users
GRANT EXECUTE ON FUNCTION get_user_count() TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_count() IS 'Returns the total count of users in the system. Used to determine if a registering user is the first user (who becomes admin).';
