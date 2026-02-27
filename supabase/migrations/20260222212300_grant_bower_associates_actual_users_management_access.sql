/*
  # Grant Management Access to Bower & Associates Actual Users

  ## Overview
  Grants organization_user_access to the three actual users in the system:
  - Jack Bower (jb@gmail.com) - already management
  - Anna Schmitz (as@gmail.com) - currently client
  - John D. Doe (jdd@gmail.com) - currently client

  ## Changes
  1. Finds the Bower & Associates organization
  2. Finds the three actual user profiles
  3. Grants management access to all three users
  4. Updates Anna and John's roles to 'staff' for testing

  ## Security
  - Only affects Bower & Associates organization
  - Requires 2 of 3 approvals for role upgrade requests
*/

DO $$
DECLARE
  v_org_id uuid;
  v_jack_id uuid;
  v_anna_id uuid;
  v_john_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get the Bower & Associates organization ID (with trailing space)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name LIKE 'Bower & Associates%'
  LIMIT 1;

  -- Get the admin user who will grant access (first admin)
  SELECT id INTO v_admin_id
  FROM user_profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  -- Get the three actual user IDs
  SELECT id INTO v_jack_id
  FROM user_profiles
  WHERE email = 'jb@gmail.com'
  LIMIT 1;

  SELECT id INTO v_anna_id
  FROM user_profiles
  WHERE email = 'as@gmail.com'
  LIMIT 1;

  SELECT id INTO v_john_id
  FROM user_profiles
  WHERE email = 'jdd@gmail.com'
  LIMIT 1;

  -- Only proceed if we found the organization and users
  IF v_org_id IS NOT NULL AND v_jack_id IS NOT NULL AND v_anna_id IS NOT NULL AND v_john_id IS NOT NULL THEN

    -- Update Anna and John's roles to staff so they can participate in dual approval
    UPDATE user_profiles SET role = 'staff' WHERE id = v_anna_id;
    UPDATE user_profiles SET role = 'staff' WHERE id = v_john_id;

    -- Grant management access to Jack
    INSERT INTO organization_user_access (organization_id, user_id, granted_by, is_active)
    VALUES (v_org_id, v_jack_id, COALESCE(v_admin_id, v_jack_id), true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET is_active = true, granted_at = now();

    -- Grant management access to Anna
    INSERT INTO organization_user_access (organization_id, user_id, granted_by, is_active)
    VALUES (v_org_id, v_anna_id, COALESCE(v_admin_id, v_jack_id), true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET is_active = true, granted_at = now();

    -- Grant management access to John
    INSERT INTO organization_user_access (organization_id, user_id, granted_by, is_active)
    VALUES (v_org_id, v_john_id, COALESCE(v_admin_id, v_jack_id), true)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET is_active = true, granted_at = now();

    RAISE NOTICE 'Successfully granted management access to Jack, Anna, and John for Bower & Associates';
  ELSE
    RAISE NOTICE 'Could not find required users or organization. Skipping management access grants.';
    RAISE NOTICE 'Org ID: %, Jack: %, Anna: %, John: %', v_org_id, v_jack_id, v_anna_id, v_john_id;
  END IF;
END $$;
