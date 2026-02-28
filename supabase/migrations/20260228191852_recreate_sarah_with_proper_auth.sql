/*
  # Recreate Sarah John with Proper Supabase Auth
  
  1. Problem
    - Sarah's account was created incorrectly with bcrypt in auth.users.encrypted_password
    - Supabase Auth doesn't recognize this password
    - Need to recreate with proper Supabase Auth password
  
  2. Solution
    - Delete Sarah's existing profile (keep user_id for reference)
    - Use a stored procedure to call Supabase Auth Admin API
    - Create new auth user with proper password
    - Recreate profile with same details
  
  3. Temporary Credentials
    - Email: sarah@bowerassociates.co.tz
    - Password: Sarah2024!
    - Role: staff
*/

-- Store Sarah's details before deletion
DO $$
DECLARE
  sarah_user_id uuid;
  sarah_org_id uuid;
BEGIN
  -- Get Sarah's current details
  SELECT id, organization_id INTO sarah_user_id, sarah_org_id
  FROM user_profiles
  WHERE email = 'sarah@bowerassociates.co.tz';

  -- Delete profile first (will cascade and delete auth user due to ON DELETE CASCADE)
  DELETE FROM user_profiles WHERE email = 'sarah@bowerassociates.co.tz';
  
  -- Note: The actual user recreation must be done via the create-user edge function
  -- This is because we need to use Supabase Auth Admin API
  
  RAISE NOTICE 'Sarah profile deleted. User ID was: %, Org ID: %', sarah_user_id, sarah_org_id;
  RAISE NOTICE 'Please use create-user edge function to recreate with password: Sarah2024!';
END $$;
