/*
  # Remove Insecure User Profile Insert Policy

  1. Security Issue
    - Policy "user_profiles_insert_own" allows ANY authenticated user to create their own profile
    - This bypasses the registration approval system
    - Users can self-register and gain immediate access

  2. Fix
    - DROP the insecure policy
    - Keep only the approved registration policy and admin policy
    - Users must have approved law_firm_registration to create profile
    - Or must be created by an admin

  3. Remaining Policies
    - "Users can insert profile only with approved registration" - Requires active registration
    - "user_profiles_insert_admin" - Admins can create profiles
*/

-- Remove the insecure self-insert policy
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;

-- Verify the secure policies remain
COMMENT ON POLICY "Users can insert profile only with approved registration" ON user_profiles 
IS 'Users can only create their profile if they have an approved law_firm_registration with status=active';

COMMENT ON POLICY "user_profiles_insert_admin" ON user_profiles 
IS 'Admins can create user profiles for approved registrations';
