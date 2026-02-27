/*
  # Disable automatic user profile trigger

  1. Changes
    - Disable the on_auth_user_created trigger
    - Let the create-user edge function handle all profile creation
  
  2. Reason
    - Eliminates race conditions between trigger and edge function
    - Provides better control over user creation flow
    - Edge function can set correct role immediately without conflicts
*/

-- Disable the trigger (but keep the function for potential future use)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;