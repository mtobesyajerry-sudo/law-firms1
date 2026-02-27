/*
  # Create Test Users with Working Passwords

  1. Creates three users with the same password hash as the working juma user
  2. Creates corresponding user_profiles
  3. Users created:
     - john@bowerassociates.com - Management
     - anna@bowerassociates.com - Management  
     - sarah@bowerassociates.com - Staff
  
  All users will have password: password123
*/

-- Store the working password hash from juma
DO $$
DECLARE
  v_working_password text;
  v_org_id uuid := 'e79c5c95-6487-4804-8bb0-85d43a86f470';
  v_john_id uuid;
  v_anna_id uuid;
  v_sarah_id uuid;
BEGIN
  -- Get the working password hash
  SELECT encrypted_password INTO v_working_password
  FROM auth.users
  WHERE email = 'juma@bowerassociates.com';

  -- Create John Doe
  v_john_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_john_id,
    'authenticated',
    'authenticated',
    'john@bowerassociates.com',
    v_working_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John Doe"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (
    id,
    email,
    role,
    full_name,
    organization_id,
    position,
    password_change_required
  ) VALUES (
    v_john_id,
    'john@bowerassociates.com',
    'management',
    'John Doe',
    v_org_id,
    'Managing Partner',
    false
  );

  -- Create Anna Schmitz
  v_anna_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_anna_id,
    'authenticated',
    'authenticated',
    'anna@bowerassociates.com',
    v_working_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anna Schmitz"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (
    id,
    email,
    role,
    full_name,
    organization_id,
    position,
    password_change_required
  ) VALUES (
    v_anna_id,
    'anna@bowerassociates.com',
    'management',
    'Anna Schmitz',
    v_org_id,
    'Senior Partner',
    false
  );

  -- Create Sarah John
  v_sarah_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_sarah_id,
    'authenticated',
    'authenticated',
    'sarah@bowerassociates.com',
    v_working_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah John"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (
    id,
    email,
    role,
    full_name,
    organization_id,
    position,
    password_change_required
  ) VALUES (
    v_sarah_id,
    'sarah@bowerassociates.com',
    'staff',
    'Sarah John',
    v_org_id,
    'Legal Staff',
    false
  );
  
END $$;
