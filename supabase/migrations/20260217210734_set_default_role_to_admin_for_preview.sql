/*
  # Set Default Role to Admin for Preview Dashboard

  1. Purpose
    - Configure the system to show the admin dashboard by default
    - Set all new user registrations to admin role automatically
    - Update existing profiles to admin for preview purposes

  2. Changes
    - Update the default value for role column to 'admin'
    - Update any existing client users to admin role
    - Ensure all future registrations default to admin

  3. Security
    - This configuration is intended for preview/demo environments
    - In production, role assignment should be controlled by administrators
*/

-- Update the default role to 'admin' in user_profiles table
ALTER TABLE user_profiles 
  ALTER COLUMN role SET DEFAULT 'admin';

-- Update all existing users to admin role
UPDATE user_profiles 
  SET role = 'admin' 
  WHERE role != 'admin';

-- Recreate the trigger function to always create admin profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin',
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
