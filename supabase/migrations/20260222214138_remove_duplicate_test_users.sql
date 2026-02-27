/*
  # Remove Duplicate Test Users

  ## Overview
  Removes duplicate test users that have @bowerassociates.com emails.
  We keep only the gmail versions to avoid confusion and duplication.

  ## Changes
  1. Delete john.doe@bowerassociates.com (compliance_officer) - duplicate of jd@gmail.com
  2. Delete juma.ally@bowerassociates.com (staff) - duplicate of jumaa@gmail.com
  3. Update jumaa@gmail.com role to 'staff' (currently compliance_officer)
  4. Keep jd@gmail.com as staff (John Doe)

  ## Final Test Users
  - Jack Bower (jb@gmail.com) - management
  - Anna Schmitz (as@gmail.com) - management  
  - John D. Doe (jdd@gmail.com) - management
  - Juma Ally (jumaa@gmail.com) - staff
  - John Doe (jd@gmail.com) - compliance_officer
*/

-- First, update Juma Ally gmail to staff role
UPDATE user_profiles
SET role = 'staff'
WHERE email = 'jumaa@gmail.com';

-- Update John Doe gmail to compliance_officer role
UPDATE user_profiles
SET role = 'compliance_officer'
WHERE email = 'jd@gmail.com';

-- Delete the bowerassociates.com duplicates
DELETE FROM user_profiles
WHERE email IN (
  'john.doe@bowerassociates.com',
  'juma.ally@bowerassociates.com'
);

-- Verify final user list
DO $$
DECLARE
  v_user_count integer;
BEGIN
  SELECT COUNT(*) INTO v_user_count
  FROM user_profiles
  WHERE organization_id = (
    SELECT id FROM organizations WHERE name LIKE 'Bower & Associates%'
  );
  
  RAISE NOTICE 'Final test user count: %', v_user_count;
  
  IF v_user_count = 5 THEN
    RAISE NOTICE 'Successfully cleaned up duplicate users. 5 unique test users remain.';
  ELSE
    RAISE WARNING 'Expected 5 users but found %', v_user_count;
  END IF;
END $$;
