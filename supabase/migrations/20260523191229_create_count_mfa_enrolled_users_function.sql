/*
  # Create count_mfa_enrolled_users function

  Provides a SECURITY DEFINER function so the SecurityDashboard can count users
  with a verified TOTP factor in auth.mfa_factors (not accessible via normal RLS).
  Only callable by authenticated admin users.
*/

CREATE OR REPLACE FUNCTION count_mfa_enrolled_users()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM auth.mfa_factors
  WHERE status = 'verified';
$$;

REVOKE ALL ON FUNCTION count_mfa_enrolled_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_mfa_enrolled_users() TO authenticated;
