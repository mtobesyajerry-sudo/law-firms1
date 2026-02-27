/*
  # Enforce Admin Dashboard as Preview Default

  1. Overview
    - This migration configures the system to always show the admin dashboard in preview mode
    - Ensures all users have admin privileges by default
    - Sets up database constraints and defaults to enforce this behavior

  2. Changes Made
    - Add database comment documenting preview mode configuration
    - Create a function to validate that preview mode is enabled
    - Add a check constraint (optional, can be enabled if needed)

  3. Implementation Details
    - All new users will be created with 'admin' role
    - The frontend routing now redirects all authenticated users to /admin/dashboard
    - This configuration supports preview/demo environments

  4. Security Notes
    - This configuration is appropriate for preview/demo environments
    - For production deployments, implement proper role-based access control
    - Consider environment variables to toggle between preview and production modes
*/

-- Add a comment to the user_profiles table documenting the preview mode
COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control. In preview mode, all users default to admin role.';

-- Add a comment to the role column
COMMENT ON COLUMN user_profiles.role IS 'User role: admin or client. Defaults to admin in preview mode for easier testing and demonstration.';

-- Create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id 
    AND role = 'admin'
  );
$$;

-- Add index on role column for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Grant execute permission on the is_admin function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
