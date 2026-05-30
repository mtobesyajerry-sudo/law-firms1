/*
  # Create TEST users for insurance and accounting org verification

  Creates two test staff users (one per test org) for Part B verification.
  These are explicitly labeled TEST accounts to be deleted before go-live.
*/

DO $$
DECLARE
  v_ins_org_id uuid := '29a7b48a-6aa2-4903-ac79-9dae51315709';
  v_acc_org_id uuid := '7fa55cd7-d891-49fb-860a-a4a97146c41a';
  v_ins_user_id uuid;
  v_acc_user_id uuid;
BEGIN
  -- Create insurance test user if not exists
  SELECT id INTO v_ins_user_id FROM auth.users WHERE email = 'test-insurer@test-verification.local';
  IF v_ins_user_id IS NULL THEN
    v_ins_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role
    ) VALUES (
      v_ins_user_id, '00000000-0000-0000-0000-000000000000',
      'test-insurer@test-verification.local',
      crypt('TestInsurer2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"TEST Insurance User"}',
      'authenticated', 'authenticated'
    );
  END IF;

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, password_change_required)
  VALUES (v_ins_user_id, 'test-insurer@test-verification.local', 'TEST Insurance User', 'staff', v_ins_org_id, true, false)
  ON CONFLICT (id) DO UPDATE SET organization_id = v_ins_org_id, role = 'staff', is_active = true;

  -- Create accounting test user if not exists
  SELECT id INTO v_acc_user_id FROM auth.users WHERE email = 'test-accountant@test-verification.local';
  IF v_acc_user_id IS NULL THEN
    v_acc_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role
    ) VALUES (
      v_acc_user_id, '00000000-0000-0000-0000-000000000000',
      'test-accountant@test-verification.local',
      crypt('TestAccountant2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"TEST Accounting User"}',
      'authenticated', 'authenticated'
    );
  END IF;

  INSERT INTO user_profiles (id, email, full_name, role, organization_id, is_active, password_change_required)
  VALUES (v_acc_user_id, 'test-accountant@test-verification.local', 'TEST Accounting User', 'staff', v_acc_org_id, true, false)
  ON CONFLICT (id) DO UPDATE SET organization_id = v_acc_org_id, role = 'staff', is_active = true;

END $$;
