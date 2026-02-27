/*
  # Enable automatic profile creation for new users

  1. Changes
    - Re-enable the trigger to automatically create user profiles
    - First user gets admin role, all others get client role
  
  2. Security
    - Uses existing handle_new_user() function with SECURITY DEFINER
    - Ensures proper RLS bypass for profile creation
    - First user check happens automatically
*/

-- Re-enable the trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
