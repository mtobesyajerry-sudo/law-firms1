/*
  # Enforce Registration Approval System

  1. Problem
    - Users can bypass the registration approval system by directly signing up via Supabase Auth
    - The policy "Users can insert own profile during registration" allows unauthorized profile creation
    - This violates the requirement that ALL users must be approved by admin before access

  2. Solution
    - Remove the self-profile creation policy
    - Add policy to check law_firm_registrations status before allowing login
    - Only users with approved registrations (status = 'active') can access the system

  3. Security
    - All profile creation now requires admin approval
    - Users must go through law_firm_registrations table
    - Registration status must be 'active' for system access
*/

-- Remove the policy that allows users to create their own profiles
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON user_profiles;

-- Add function to check if user has approved registration
CREATE OR REPLACE FUNCTION has_approved_registration(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM law_firm_registrations 
    WHERE firm_email = user_email 
    AND registration_status = 'active'
  );
END;
$$;

-- Add policy: Users can only insert profile if they have approved registration
CREATE POLICY "Users can insert profile only with approved registration"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN law_firm_registrations lfr ON lfr.firm_email = au.email
      WHERE au.id = auth.uid()
      AND lfr.registration_status = 'active'
      AND user_profiles.id = auth.uid()
    )
  );

-- Add comment
COMMENT ON POLICY "Users can insert profile only with approved registration" ON user_profiles IS 'Enforces that users can only create profiles after their law firm registration has been approved by an administrator.';

-- Add function to check registration status during login
CREATE OR REPLACE FUNCTION check_registration_status(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_status text;
BEGIN
  SELECT registration_status INTO reg_status
  FROM law_firm_registrations
  WHERE firm_email = user_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(reg_status, 'not_found');
END;
$$;
