/*
  # Disable Automatic Profile Creation Trigger

  1. Problem
    - The on_auth_user_created trigger automatically creates user profiles WITHOUT organization_id
    - This causes users to see "No organization assigned" error
    - The edge function create-user then tries to update the profile, but the damage is done
  
  2. Solution
    - Drop the on_auth_user_created trigger
    - User profiles will be created manually by the edge functions with proper organization_id
  
  3. Impact
    - All user creation now happens through edge functions (create-user)
    - This ensures organization_id is always set correctly for non-admin users
    - Admin users continue to work as expected (organization_id = null by design)
*/

-- Drop the automatic profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add comment to explain why it's disabled
COMMENT ON FUNCTION handle_new_user() IS 'DISABLED: User profiles are now created manually via edge functions to ensure organization_id is set correctly';
