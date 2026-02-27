/*
  # Add John Deep as Management Test User

  1. Creates John Deep test user in Bower & Associates
     - Email: johndeep@gmail.com
     - Password: Test@1234
     - Role: management
     - Organization: Bower & Associates
  
  2. Security
     - User has management role with read-only access
     - Password change not required for testing
*/

-- First, ensure we have the Bower & Associates org ID
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Get Bower & Associates organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name ILIKE '%bower%' LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Bower & Associates organization not found';
  END IF;

  -- Generate user ID
  v_user_id := gen_random_uuid();
  
  -- Create encrypted password using crypt
  v_encrypted_password := crypt('Test@1234', gen_salt('bf'));

  -- Insert into auth.users (service role can do this)
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'johndeep@gmail.com',
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"John Deep"}'::jsonb,
      false,
      'authenticated',
      'authenticated'
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- User already exists, get their ID
      SELECT id INTO v_user_id FROM auth.users WHERE email = 'johndeep@gmail.com';
      
      -- Update their password
      UPDATE auth.users 
      SET encrypted_password = v_encrypted_password,
          updated_at = now()
      WHERE id = v_user_id;
  END;

  -- Insert or update user profile
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    organization_id,
    password_change_required,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'johndeep@gmail.com',
    'John Deep',
    'management',
    v_org_id,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'management',
    organization_id = v_org_id,
    full_name = 'John Deep',
    password_change_required = false,
    updated_at = now();

  RAISE NOTICE 'John Deep user created successfully with ID: % in organization: %', v_user_id, v_org_id;
END $$;
