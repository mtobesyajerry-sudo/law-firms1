/*
  # Fix Smith Legal Password

  This migration resets the password for info@smithlegal.co.tz to allow login.
  
  The password will be set to: Tempd47saroh!0767
*/

-- Create a function to reset the password using the auth admin functions
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Get the user ID
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'info@smithlegal.co.tz';

  IF user_uuid IS NOT NULL THEN
    -- Update the user's password using Supabase auth
    -- Note: This uses the crypt function which Supabase uses internally
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Tempd47saroh!0767', gen_salt('bf')),
      updated_at = now()
    WHERE id = user_uuid;

    RAISE NOTICE 'Password updated for user: %', user_uuid;
  ELSE
    RAISE NOTICE 'User not found with email: info@smithlegal.co.tz';
  END IF;
END $$;
