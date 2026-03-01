/*
  # Emergency: Recreate Sarah and Smith Legal Partners

  1. Organizations
    - Recreate Smith Legal Partners
  
  2. Users
    - Recreate Sarah with password: SmithLegal2024!
*/

-- Create organization
INSERT INTO organizations (
  id,
  name,
  business_type,
  law_firm_type,
  contact_email,
  brela_registration,
  tls_registration,
  practice_areas,
  number_of_lawyers,
  is_active,
  subscription_status,
  max_users
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Smith Legal Partners',
  'law_firm',
  'medium_firm',
  'info@smithlegal.co.tz',
  'BRELA-12345',
  'TLS-67890',
  ARRAY['Corporate Law', 'Banking Law', 'Compliance'],
  5,
  true,
  'active',
  10
) ON CONFLICT (id) DO NOTHING;

-- Create Sarah's auth user
DO $$
DECLARE
  v_user_id uuid := '9f8e7d6c-5b4a-3210-fedc-ba0987654321'::uuid;
  v_org_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
BEGIN
  -- Insert into auth.users
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
    v_user_id,
    'authenticated',
    'authenticated',
    'sarah@smithlegal.co.tz',
    crypt('SmithLegal2024!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sarah Johnson"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('SmithLegal2024!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW();

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    email,
    role,
    organization_id,
    first_name,
    last_name,
    position,
    password_change_required
  ) VALUES (
    v_user_id,
    'sarah@smithlegal.co.tz',
    'staff',
    v_org_id,
    'Sarah',
    'Johnson',
    'Compliance Officer',
    false
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'staff',
    organization_id = v_org_id,
    first_name = 'Sarah',
    last_name = 'Johnson',
    position = 'Compliance Officer',
    password_change_required = false,
    updated_at = NOW();

  -- Try to add identity (if constraint exists)
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'sarah@smithlegal.co.tz'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Identity already exists, ignore
      NULL;
    WHEN others THEN
      -- No unique constraint, also ignore
      NULL;
  END;

END $$;