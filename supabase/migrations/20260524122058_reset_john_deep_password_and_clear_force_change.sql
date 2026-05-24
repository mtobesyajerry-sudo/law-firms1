
/*
  # Reset John Deep credentials

  John Deep (jd@bowerassociates.co.tz, compliance_officer) cannot log in
  because password_change_required = true forces a change screen on every
  login. This migration:

  1. Resets his auth password to JohnDeep@2026!
  2. Clears the password_change_required flag so login proceeds normally
*/

-- Reset password
UPDATE auth.users
SET
  encrypted_password = crypt('JohnDeep@2026!', gen_salt('bf')),
  updated_at = now()
WHERE email = 'jd@bowerassociates.co.tz';

-- Clear the forced-change flag
UPDATE user_profiles
SET password_change_required = false
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jd@bowerassociates.co.tz'
);
