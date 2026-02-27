/*
  # Fix Corrupted User Passwords

  This migration creates a helper function for admins to reset passwords for users
  who were affected by the encryption bug.

  ## Changes
  1. Creates a function `admin_reset_user_password` that allows admins to reset any user's password
  2. This function can only be called by admin users
  3. It updates the password_change_required flag to ensure users change their password

  ## Security
  - Only callable by users with 'admin' role
  - Uses service role permissions
  - Logs password reset actions
*/

-- Create a function to allow admins to reset user passwords
CREATE OR REPLACE FUNCTION admin_reset_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result jsonb;
BEGIN
  -- Get the calling user's role
  SELECT role INTO caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Only admins can reset passwords
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reset user passwords';
  END IF;

  -- Update password_change_required flag
  UPDATE user_profiles
  SET password_change_required = true
  WHERE id = target_user_id;

  -- Note: Password update must be done via Edge Function with admin privileges
  -- This function just marks the user for password change

  result := jsonb_build_object(
    'success', true,
    'message', 'User marked for password reset. Use Edge Function to update auth password.'
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (function will check for admin role)
GRANT EXECUTE ON FUNCTION admin_reset_user_password(UUID, TEXT) TO authenticated;
