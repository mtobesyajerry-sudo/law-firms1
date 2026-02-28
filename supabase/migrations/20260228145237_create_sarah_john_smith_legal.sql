/*
  # Create Sarah John User for Smith Legal Services

  1. Changes
    - Create Sarah John user with email sarah.john@smithlegal.co.tz
    - Assign her to Smith Legal Services organization
    - Set her role as Staff
    - Password: Password123!
    
  2. Security
    - User will be able to login immediately
    - Password follows strong password requirements
*/

-- Create Sarah John in auth.users
DO $$
DECLARE
  sarah_user_id uuid;
  smithlegal_org_id uuid := '819209af-5d86-4148-bb94-b88e7f4ab9b8';
BEGIN
  -- Check if Sarah already exists
  SELECT id INTO sarah_user_id
  FROM auth.users
  WHERE email = 'sarah.john@smithlegal.co.tz';

  -- If Sarah doesn't exist, create her
  IF sarah_user_id IS NULL THEN
    -- Generate a new UUID for Sarah
    sarah_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      sarah_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sarah.john@smithlegal.co.tz',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sarah John"}',
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Insert into user_profiles
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      first_name,
      last_name,
      role,
      position,
      organization_id,
      is_active,
      password_change_required
    ) VALUES (
      sarah_user_id,
      'sarah.john@smithlegal.co.tz',
      'Sarah John',
      'Sarah',
      'John',
      'staff',
      'Legal Associate',
      smithlegal_org_id,
      true,
      false
    );

    RAISE NOTICE 'Sarah John created successfully with ID: %', sarah_user_id;
  ELSE
    RAISE NOTICE 'Sarah John already exists with ID: %', sarah_user_id;
  END IF;
END $$;
