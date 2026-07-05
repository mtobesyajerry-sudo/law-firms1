
/*
# Create complete_password_change() SECURITY DEFINER RPC

## Purpose
Allows an authenticated user to clear their own `password_change_required` flag
after successfully changing their password. The flag cannot be cleared through
a direct user_profiles UPDATE because RLS blocks users from modifying their
own profile rows.

## Why SECURITY DEFINER
The RLS UPDATE policy on user_profiles is intentionally locked down to prevent
privilege escalation. This function runs as the function owner (postgres),
bypassing RLS for this one targeted update, but is constrained to:
  - Only the calling user's row (auth.uid())
  - Only setting the flag to FALSE (cannot set to true)
  - No parameters (no injection surface)

## Security properties
1. Scoped to auth.uid() — cannot touch any other user's row
2. Only sets false — cannot escalate by setting true
3. No parameters — no injection surface
4. Idempotent — safe to call multiple times (no-op if already false)
5. GRANT restricted to authenticated role only

## Usage
Call after supabase.auth.updateUser({ password }) succeeds:
  await supabase.rpc('complete_password_change')
*/

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET password_change_required = false
  WHERE id = auth.uid()
    AND password_change_required = true;
  -- Idempotent: if already false, UPDATE matches 0 rows — that is not an error.
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;
