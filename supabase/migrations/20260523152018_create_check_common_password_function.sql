/*
  # Create check_common_password RPC function

  Exposes an exact-match common-password lookup for Edge Functions.
  Returns true if md5(lower(candidate)) is in the common_passwords table.
  Callable by service_role only (Edge Functions use the service role key).
*/

CREATE OR REPLACE FUNCTION check_common_password(candidate text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM common_passwords
    WHERE password_hash = md5(lower(candidate))
  );
$$;

REVOKE EXECUTE ON FUNCTION check_common_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_common_password(text) TO service_role;
