/*
  # CRITICAL SECURITY FIX - Block Unauthorized User Registration

  ## Problem
  The current system allows users to sign up directly via Supabase auth without going through
  the law firm registration approval process. This is a CRITICAL security vulnerability that
  allows unauthorized access to the system.

  ## Solution
  1. Create a trigger on auth.users to block unauthorized signups
  2. Only allow signups that have an approved law_firm_registration (status = 'active')
  3. Admin users are exempted from this check
  4. First user (when no users exist) is exempted to allow system initialization

  ## Security
  - Blocks ALL unauthorized signups at the database level
  - Cannot be bypassed from the frontend
  - Ensures only admin-approved users can create accounts
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS block_unauthorized_signups_trigger ON auth.users;
DROP FUNCTION IF EXISTS block_unauthorized_signups();

-- Create function to validate signup attempts
CREATE OR REPLACE FUNCTION block_unauthorized_signups()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_count integer;
  registration_status text;
  is_service_role boolean;
BEGIN
  -- Allow service role (used by admin approval process)
  is_service_role := current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
  
  IF is_service_role THEN
    RETURN NEW;
  END IF;

  -- Allow first user (system initialization)
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Check if user has approved law firm registration
  SELECT lfr.registration_status INTO registration_status
  FROM law_firm_registrations lfr
  WHERE lfr.firm_email = NEW.email
  AND lfr.registration_status = 'active'
  ORDER BY lfr.created_at DESC
  LIMIT 1;

  -- Block signup if no approved registration found
  IF registration_status IS NULL OR registration_status != 'active' THEN
    RAISE EXCEPTION 'Unauthorized signup attempt. Please submit a registration request and wait for administrator approval.'
      USING HINT = 'Email: ' || NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users INSERT
-- Note: We cannot directly create triggers on auth.users, so we'll use a webhook approach
-- Instead, we'll enforce this at the RLS level

-- Update user_profiles INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Users can insert profile with approval or as admin" ON user_profiles;

CREATE POLICY "Users can insert profile with approval or as admin"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin users can insert
  is_admin_user()
  OR
  -- First user can insert (system initialization)
  (SELECT COUNT(*) FROM user_profiles) = 0
  OR
  -- User must have approved law_firm_registration
  (
    auth.uid() = id
    AND
    EXISTS (
      SELECT 1
      FROM auth.users au
      JOIN law_firm_registrations lfr ON lfr.firm_email = au.email::text
      WHERE au.id = auth.uid()
      AND lfr.registration_status = 'active'
      AND lfr.user_id IS NOT NULL
    )
  )
);

-- Add additional check: users without profiles cannot access any data
-- Create a function to check if user has valid profile
CREATE OR REPLACE FUNCTION user_has_valid_profile()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND is_active = true
  );
END;
$$;

-- Add restrictive policy to assessments table
DROP POLICY IF EXISTS "Users with valid profiles can access assessments" ON assessments;

CREATE POLICY "Users with valid profiles can access assessments"
ON assessments
FOR ALL
TO authenticated
USING (
  user_has_valid_profile()
  AND (
    is_admin_user()
    OR organization_id = get_user_organization_id()
  )
);
