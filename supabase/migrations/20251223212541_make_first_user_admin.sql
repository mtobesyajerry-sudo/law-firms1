/*
  # Auto-assign admin role to first user

  1. Changes
    - Create function to check if user is first user and assign admin role
    - Create trigger to automatically call function on profile creation
  
  2. Security
    - Ensures only the first user in the system gets admin role
    - All subsequent users get 'client' role by default
*/

-- Function to make the first user an admin
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Count existing profiles (excluding the one being inserted)
  IF (SELECT COUNT(*) FROM user_profiles WHERE id != NEW.id) = 0 THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function before inserting a profile
DROP TRIGGER IF EXISTS set_first_user_admin ON user_profiles;
CREATE TRIGGER set_first_user_admin
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();