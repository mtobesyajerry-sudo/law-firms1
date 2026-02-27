/*
  # Fix Missing Relationship Manager ID
  
  ## Overview
  Updates existing kyc_clients records that have a created_by value but no relationship_manager_id.
  This ensures staff members can see the clients they created on their dashboard.
  
  ## Changes
  - Sets relationship_manager_id = created_by for all clients where relationship_manager_id is NULL
  
  ## Impact
  - Fixes visibility issue where staff cannot see clients they created
  - Ensures proper data ownership for staff members
*/

-- Update existing clients to set relationship_manager_id from created_by
UPDATE kyc_clients
SET relationship_manager_id = created_by
WHERE relationship_manager_id IS NULL 
  AND created_by IS NOT NULL;