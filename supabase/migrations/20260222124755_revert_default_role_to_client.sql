/*
  # Revert Default Role to Client for Proper Access Control

  1. Purpose
    - Fix the issue where all new users are created as admins
    - Restore proper role-based access control
    - Set default role back to 'client' for standard users
    - Admin users should be explicitly promoted by existing admins

  2. Changes
    - Update default role in user_profiles table from 'admin' to 'client'
    - Update handle_new_user() trigger function to create client profiles by default
    - Keep existing admin users as admins (do not downgrade)

  3. Security Impact
    - NEW USERS: Will be created with 'client' role and directed to client dashboard
    - EXISTING ADMINS: Will remain as admins (no changes to existing users)
    - ADMIN ACCESS: Only users with role='admin' can access admin dashboard
    - This prevents unauthorized admin access

  4. Important Notes
    - The first user created in the system should be manually promoted to admin
    - Or use the registration requests system for proper user approval
    - This ensures proper security and access control
*/

-- Update the default role back to 'client' in user_profiles table
ALTER TABLE user_profiles 
  ALTER COLUMN role SET DEFAULT 'client';

-- Recreate the trigger function to create CLIENT profiles by default
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
    'client',  -- Changed from 'admin' to 'client'
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Update table comments to reflect proper access control
COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control. New users default to client role. Admins must be explicitly promoted.';

COMMENT ON COLUMN user_profiles.role IS 'User role: admin or client. Defaults to client. Admins have full system access and can manage users.';
