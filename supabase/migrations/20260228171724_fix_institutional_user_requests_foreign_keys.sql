/*
  # Fix Foreign Key Relationships for institutional_user_requests

  1. Problem
    - Frontend is trying to join institutional_user_requests with user_profiles
    - Missing foreign key constraints causing schema cache errors

  2. Solution
    - Add proper foreign key constraints for:
      - requested_by -> user_profiles
      - first_approver -> user_profiles
      - second_approver -> user_profiles
*/

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Add foreign key for requested_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'institutional_user_requests_requested_by_fkey'
    AND table_name = 'institutional_user_requests'
  ) THEN
    ALTER TABLE institutional_user_requests
    ADD CONSTRAINT institutional_user_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for first_approver
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'institutional_user_requests_first_approver_fkey'
    AND table_name = 'institutional_user_requests'
  ) THEN
    ALTER TABLE institutional_user_requests
    ADD CONSTRAINT institutional_user_requests_first_approver_fkey
    FOREIGN KEY (first_approver) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for second_approver
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'institutional_user_requests_second_approver_fkey'
    AND table_name = 'institutional_user_requests'
  ) THEN
    ALTER TABLE institutional_user_requests
    ADD CONSTRAINT institutional_user_requests_second_approver_fkey
    FOREIGN KEY (second_approver) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for organization_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'institutional_user_requests_organization_id_fkey'
    AND table_name = 'institutional_user_requests'
  ) THEN
    ALTER TABLE institutional_user_requests
    ADD CONSTRAINT institutional_user_requests_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
