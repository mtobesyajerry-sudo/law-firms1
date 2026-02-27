/*
  # Fix Anna Schmitz and John D. Doe Roles to Management

  ## Overview
  Updates the roles for Anna Schmitz and John D. Doe from 'staff' to 'management'
  to accurately reflect their permissions and access level. These users have
  management access and role approval rights, so their role should be 'management'.

  ## Changes
  1. Update Anna Schmitz (as@gmail.com) role to 'management'
  2. Update John D. Doe (jdd@gmail.com) role to 'management'

  ## Rationale
  Both users have organization_user_access records indicating management permissions
  and can approve role upgrade requests. Their role should match their actual
  access level for clarity and consistency.
*/

-- Update Anna Schmitz to management role
UPDATE user_profiles
SET role = 'management'
WHERE email = 'as@gmail.com'
  AND role = 'staff';

-- Update John D. Doe to management role
UPDATE user_profiles
SET role = 'management'
WHERE email = 'jdd@gmail.com'
  AND role = 'staff';

-- Verify the updates
DO $$
DECLARE
  v_anna_role text;
  v_john_role text;
BEGIN
  SELECT role INTO v_anna_role FROM user_profiles WHERE email = 'as@gmail.com';
  SELECT role INTO v_john_role FROM user_profiles WHERE email = 'jdd@gmail.com';
  
  IF v_anna_role = 'management' AND v_john_role = 'management' THEN
    RAISE NOTICE 'Successfully updated roles: Anna Schmitz and John D. Doe are now management';
  ELSE
    RAISE WARNING 'Role update may have failed - Anna: %, John: %', v_anna_role, v_john_role;
  END IF;
END $$;
