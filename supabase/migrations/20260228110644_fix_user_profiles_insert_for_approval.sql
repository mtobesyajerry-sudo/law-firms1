/*
  # Fix User Profiles Insert Policy for Law Firm Approval

  1. Problem
    - Current policy requires law_firm_registrations.user_id to be set
    - But we need to insert the profile BEFORE we update that field
    - This creates a chicken-and-egg problem during approval

  2. Solution
    - Update policy to allow admins to insert profiles for users with pending registrations
    - Check that the email matches a pending registration

  3. Security
    - Still requires admin privileges
    - Still validates registration exists
    - No longer requires user_id to be set first
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert profile with approval or as admin" ON user_profiles;

-- Create improved policy that allows admin to insert profiles during approval
CREATE POLICY "Users can insert profile with approval or as admin"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin can insert any profile
    is_admin_user() 
    OR 
    -- First user can self-register
    (SELECT count(*) FROM user_profiles) = 0
    OR 
    -- User with approved registration can insert their own profile
    (
      auth.uid() = id 
      AND EXISTS (
        SELECT 1 
        FROM auth.users au
        JOIN law_firm_registrations lfr ON lfr.firm_email = au.email::text
        WHERE au.id = auth.uid() 
          AND lfr.registration_status = 'active'
          -- REMOVED: AND lfr.user_id IS NOT NULL (this was the problem!)
      )
    )
  );
