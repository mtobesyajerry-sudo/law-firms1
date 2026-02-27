/*
  # Add get_user_count Function

  ## Overview
  This migration creates the get_user_count function which is used to determine
  if a user registering is the first user in the system (who becomes admin automatically).

  ## Changes
  1. Create get_user_count() function that returns the count of users in auth.users
  2. Grant execute permission to anon and authenticated roles

  ## Security
  - Function is SECURITY DEFINER to allow counting users without direct auth.users access
  - Returns only a count, no sensitive user data
*/

-- Create function to get user count
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_user_count() TO anon, authenticated;
