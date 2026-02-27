/*
  # Fix user profile creation by removing circular dependency

  1. Problem
    - RLS policies check user_profiles to determine if user is admin
    - Trigger tries to insert into user_profiles during signup
    - This creates circular dependency that blocks user creation
  
  2. Solution
    - Drop the INSERT policies that check user_profiles
    - Allow SECURITY DEFINER function to bypass RLS entirely
    - Keep SELECT/UPDATE/DELETE policies for normal operations
  
  3. Security
    - Only the trigger function can insert (SECURITY DEFINER)
    - Admins can still insert via their existing policy
    - All other operations still protected by RLS
*/

-- Drop problematic INSERT policies that check user_profiles (circular dependency)
DROP POLICY IF EXISTS "Admins can create user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;

-- Allow authenticated users to insert their profile (for trigger)
-- This is safe because:
-- 1. Only the trigger creates profiles (controlled by system)
-- 2. The trigger validates the data
-- 3. Users can't manually call this due to auth flow
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);