/*
  # Fix Dashboard Query Issues
  
  1. Add foreign key relationship from role_upgrade_requests to user_profiles
     - This fixes the PostgREST query error when selecting user_profiles data
  
  2. Handle missing transaction_alerts table gracefully
     - The component queries this table but it doesn't exist yet
     - We'll add a comment for future implementation
*/

-- Add foreign key constraint from role_upgrade_requests.user_id to user_profiles.id
-- This allows PostgREST to understand the relationship for embedded queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'role_upgrade_requests_user_id_fkey'
  ) THEN
    ALTER TABLE role_upgrade_requests
    ADD CONSTRAINT role_upgrade_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for requested_by as well
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'role_upgrade_requests_requested_by_fkey'
  ) THEN
    ALTER TABLE role_upgrade_requests
    ADD CONSTRAINT role_upgrade_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Note: transaction_alerts table will be created in a future migration
-- For now, the frontend should handle the 404 error gracefully
