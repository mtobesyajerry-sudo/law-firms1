/*
  # Fix John Deep Role to Staff

  1. Updates John Deep's role from management to staff
     - Email: johndeep@gmail.com
     - Role: staff (corrected from management)
  
  2. Access Changes
     - Staff can only see data they create/own
     - Staff cannot see all organizational data like management can
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get John Deep's user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'johndeep@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'John Deep user not found';
  END IF;

  -- Update role to staff
  UPDATE user_profiles 
  SET role = 'staff',
      updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'John Deep role updated to staff successfully';
END $$;
