/*
  # Create Sarah John User Account

  This migration creates the auth user and profile for Sarah John who was approved but the edge function failed.
  
  User Details:
  - Email: sarah@smithlegal.co.tz
  - Role: staff
  - Organization: Smith Legal Services
  - Temporary Password: TempSarah!2026
*/

DO $$
DECLARE
  new_user_id uuid;
  org_id uuid := '819209af-5d86-4148-bb94-b88e7f4ab9b8';
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_user_meta_data
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'sarah@smithlegal.co.tz',
    crypt('TempSarah!2026', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"full_name": "Sarah John"}'::jsonb
  );

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    email,
    role,
    full_name,
    organization_id,
    password_change_required
  ) VALUES (
    new_user_id,
    'sarah@smithlegal.co.tz',
    'staff',
    'Sarah John',
    org_id,
    true
  );

  -- Update the new_user_request with the created user ID (keep status as approved)
  UPDATE new_user_requests
  SET created_user_id = new_user_id
  WHERE id = '37dab4c0-ac7d-4374-b6e6-52ca2e3f07da';

  RAISE NOTICE 'Successfully created user Sarah John with ID: %', new_user_id;
END $$;
