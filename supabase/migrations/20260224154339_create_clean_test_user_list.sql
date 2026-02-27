/*
  # Create Clean Test User List

  1. Changes
     - Delete all existing test users except the main admin (mtobesyaj@gmail.com)
     - Create new test users with specific roles:
       * Management: Jack Bower, Anna Schmitz, John D. Doe
       * Compliance Officer: John Doe
       * Staff: Sarah John, Juma Ally, John Deep
  
  2. Users Created
     - jb@gmail.com - Jack Bower (Management)
     - as@gmail.com - Anna Schmitz (Management)
     - jdd@gmail.com - John D. Doe (Management)
     - jd@gmail.com - John Doe (Compliance Officer)
     - sj@gmail.com - Sarah John (Staff)
     - ja@gmail.com - Juma Ally (Staff)
     - johndeep@gmail.com - John Deep (Staff)
  
  3. Security
     - All users in Bower & Associates organization
     - All passwords: Test123!
     - All users active by default
*/

-- Delete all test users except the main admin
DELETE FROM auth.users 
WHERE email IN (
  'anna@bowerassociates.com',
  'john@bowerassociates.com',
  'jdeep@bowerassociates.com',
  'juma@bowerassociates.com',
  'sarah@bowerassociates.com'
);

-- Get Bower & Associates organization ID
DO $$
DECLARE
  bower_org_id uuid;
BEGIN
  SELECT id INTO bower_org_id FROM organizations WHERE name = 'Bower & Associates ' LIMIT 1;
  
  -- If organization doesn't exist, create it
  IF bower_org_id IS NULL THEN
    INSERT INTO organizations (name, is_active, subscription_expiry_date)
    VALUES ('Bower & Associates', true, NULL)
    RETURNING id INTO bower_org_id;
  END IF;

  -- Delete existing test users (keep admin mtobesyaj@gmail.com)
  DELETE FROM auth.users WHERE email IN (
    'jb@gmail.com', 
    'as@gmail.com', 
    'jdd@gmail.com', 
    'jd@gmail.com', 
    'sj@gmail.com',
    'ja@gmail.com',
    'johndeep@gmail.com'
  );

  -- Create Management Users
  -- Jack Bower
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jb@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jack Bower"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'jb@gmail.com',
    'Jack Bower',
    'management',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'jb@gmail.com';

  -- Anna Schmitz
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'as@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anna Schmitz"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'as@gmail.com',
    'Anna Schmitz',
    'management',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'as@gmail.com';

  -- John D. Doe
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jdd@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John D. Doe"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'jdd@gmail.com',
    'John D. Doe',
    'management',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'jdd@gmail.com';

  -- Compliance Officer - John Doe
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jd@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John Doe"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'jd@gmail.com',
    'John Doe',
    'compliance_officer',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'jd@gmail.com';

  -- Staff Users
  -- Sarah John
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'sj@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah John"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'sj@gmail.com',
    'Sarah John',
    'staff',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'sj@gmail.com';

  -- Juma Ally
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ja@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Juma Ally"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'ja@gmail.com',
    'Juma Ally',
    'staff',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'ja@gmail.com';

  -- John Deep
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'johndeep@gmail.com',
    crypt('Test123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"John Deep"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, created_at)
  SELECT 
    id,
    'johndeep@gmail.com',
    'John Deep',
    'staff',
    bower_org_id,
    true,
    now()
  FROM auth.users WHERE email = 'johndeep@gmail.com';

END $$;
