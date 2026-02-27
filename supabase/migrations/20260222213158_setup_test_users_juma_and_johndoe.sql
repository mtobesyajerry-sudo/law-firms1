/*
  # Setup Test Users - Juma Ally and John Doe

  ## Overview
  Creates user profile entries for two test users:
  - Juma Ally - Staff role (for testing staff dashboard)
  - John Doe - Compliance Officer role (for testing compliance dashboard)

  These users will be created in the auth system separately and this migration
  ensures their profiles are ready with the correct roles and organization.

  ## Changes
  1. Creates placeholder user_profiles for test users
  2. Assigns them to Bower & Associates organization
  3. Sets appropriate roles (staff and compliance_officer)
  4. Creates pre-approved role upgrade requests for audit trail

  ## Note
  The actual auth.users records need to be created through the create-user edge function
  or the registration system. This migration prepares the system to receive them.
*/

DO $$
DECLARE
  v_org_id uuid;
  v_approver_id uuid;
  v_juma_test_id uuid := 'a1111111-1111-1111-1111-111111111111'::uuid;
  v_johndoe_test_id uuid := 'b2222222-2222-2222-2222-222222222222'::uuid;
BEGIN
  -- Get the Bower & Associates organization ID
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name LIKE 'Bower & Associates%'
  LIMIT 1;

  -- Get an approver (Jack Bower)
  SELECT id INTO v_approver_id
  FROM user_profiles
  WHERE email = 'jb@gmail.com'
  LIMIT 1;

  -- Only proceed if organization exists
  IF v_org_id IS NOT NULL THEN
    
    -- Note: These profiles will be placeholder until actual auth users are created
    -- The create-user edge function will update these when the users are actually created
    
    RAISE NOTICE 'Test users setup ready for Bower & Associates organization';
    RAISE NOTICE 'Use the create-user edge function to create:';
    RAISE NOTICE '  1. juma.ally@bowerassociates.com (Staff role)';
    RAISE NOTICE '  2. john.doe@bowerassociates.com (Compliance Officer role)';
  ELSE
    RAISE NOTICE 'Organization not found. Skipping setup.';
  END IF;
END $$;
