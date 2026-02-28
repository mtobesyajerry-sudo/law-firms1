/*
  # Create System Admin Account - Jeremiah Mtobesya

  1. Purpose
    - Create system administrator account for Jeremiah Mtobesya
    - Email: mtobesyaj@gmail.com
    - Role: admin
    - Full system access

  2. Actions
    - Create auth user with specified email and password
    - Create user profile with admin role
    - Create organization for admin user
    - Set password_change_required to false (admin can change later)

  3. Security
    - Admin role grants full system access
    - Password provided by authorized user
    - Account active immediately
*/

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'mtobesyaj@gmail.com';

  -- Only create if user doesn't exist
  IF v_user_id IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'mtobesyaj@gmail.com',
      crypt('Admin321', gen_salt('bf')),
      now(),
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jeremiah Mtobesya"}',
      FALSE,
      now(),
      now(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      FALSE,
      NULL
    )
    RETURNING id INTO v_user_id;

    -- Create organization for admin
    INSERT INTO organizations (
      id,
      name,
      type,
      country,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      'System Administration',
      'internal',
      'Tanzania',
      now()
    )
    RETURNING id INTO v_org_id;

    -- Create user profile with admin role
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      role,
      position,
      organization_id,
      organization_name,
      is_active,
      password_change_required,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      'mtobesyaj@gmail.com',
      'Jeremiah Mtobesya',
      'admin',
      'System Administrator',
      v_org_id,
      'System Administration',
      true,
      false,
      now(),
      now()
    );

    RAISE NOTICE 'Admin account created successfully for Jeremiah Mtobesya';
  ELSE
    -- Update existing user to admin if they exist
    UPDATE user_profiles
    SET 
      role = 'admin',
      position = 'System Administrator',
      is_active = true,
      password_change_required = false,
      updated_at = now()
    WHERE id = v_user_id;

    -- Update password in auth.users
    UPDATE auth.users
    SET encrypted_password = crypt('Admin321', gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;

    RAISE NOTICE 'Existing account updated to admin role for Jeremiah Mtobesya';
  END IF;
END $$;
