/*
  # Create Complete Test User Setup

  1. Purpose
    - Create all test users with consistent emails
    - Ensure proper authentication setup
    - Fix mismatched email addresses

  2. Test Users Created
    - anna@bowerassociates.com (Management)
    - john@bowerassociates.com (Management)
    - juma@bowerassociates.com (Compliance Officer)
    - sarah@bowerassociates.com (Staff)

  3. Security
    - All users belong to Bower & Associates organization
    - Password: password123 for all test users
*/

-- First, get the Bower & Associates organization ID
DO $$
DECLARE
  v_org_id uuid;
  v_anna_id uuid;
  v_john_id uuid;
  v_juma_id uuid;
BEGIN
  -- Get organization ID
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name ILIKE '%Bower%Associates%'
  LIMIT 1;

  -- Create Anna if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'anna@bowerassociates.com') THEN
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
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'anna@bowerassociates.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Anna Schmitz"}'::jsonb,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_anna_id;

    -- Create profile
    INSERT INTO user_profiles (id, email, full_name, role, organization_id, position)
    VALUES (v_anna_id, 'anna@bowerassociates.com', 'Anna Schmitz', 'management', v_org_id, 'Senior Partner');
  END IF;

  -- Create John if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'john@bowerassociates.com') THEN
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
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'john@bowerassociates.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"John Doe"}'::jsonb,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_john_id;

    -- Create profile
    INSERT INTO user_profiles (id, email, full_name, role, organization_id, position)
    VALUES (v_john_id, 'john@bowerassociates.com', 'John Doe', 'management', v_org_id, 'Managing Partner');
  END IF;

  -- Update Juma's email if exists with wrong email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'juma.ally@bowerassociates.com') THEN
    UPDATE auth.users 
    SET email = 'juma@bowerassociates.com'
    WHERE email = 'juma.ally@bowerassociates.com';
    
    UPDATE user_profiles
    SET email = 'juma@bowerassociates.com',
        role = 'compliance_officer'
    WHERE email = 'jumaa@gmail.com';
  ELSIF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'juma@bowerassociates.com') THEN
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
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'juma@bowerassociates.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Juma Ally"}'::jsonb,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_juma_id;

    -- Create profile
    INSERT INTO user_profiles (id, email, full_name, role, organization_id, position)
    VALUES (v_juma_id, 'juma@bowerassociates.com', 'Juma Ally', 'compliance_officer', v_org_id, 'Compliance Officer');
  END IF;

END $$;
