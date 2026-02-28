/*
  # Fix Admin Bypass Registration Requirement

  1. Problem
    - The INSERT policy "Users can insert profile only with approved registration" blocks ALL users
    - This includes the system administrator who was created directly via migration
    - Admin doesn't have a law_firm_registrations entry and shouldn't need one
    - This is causing authentication failures and redirects to login

  2. Solution
    - Update INSERT policy to allow admin users to create profiles WITHOUT registration
    - Keep registration requirement for non-admin users
    - Admin role is identified by checking if there are zero users in the system (first user = admin)
    - Or by checking if user_profiles already exists with role='admin'

  3. Security
    - Admins can create profiles without registration approval
    - All other users must have approved law_firm_registrations
    - Maintains approval workflow for regular users
    - Allows system administrator to function
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert profile only with approved registration" ON user_profiles;

-- Create new policy that allows admin OR approved registration users
CREATE POLICY "Users can insert profile with approval or as admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin (first user or existing admin profile)
    is_admin_user()
    OR
    -- Allow if user has zero existing users (becomes first admin)
    (SELECT COUNT(*) FROM user_profiles) = 0
    OR
    -- Allow if user has approved law firm registration
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN law_firm_registrations lfr ON lfr.firm_email = au.email
      WHERE au.id = auth.uid()
      AND lfr.registration_status = 'active'
      AND user_profiles.id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can insert profile with approval or as admin" ON user_profiles IS 
'Allows admin users to create profiles directly, or users with approved law firm registrations. First user automatically becomes admin.';
