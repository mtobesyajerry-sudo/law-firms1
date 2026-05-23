/*
  # Fix Privilege Escalation: Block Self-Role Promotion via user_profiles UPDATE

  ## Vulnerability
  The `user_profiles_update_own` RLS policy allows any authenticated user to UPDATE
  their own profile row with the only constraint being `id = auth.uid()`. There is
  no column-level restriction, meaning a staff user can set their own `role` to
  `compliance_officer`, `mlro`, `senior_partner`, `lawyer`, or even attempt `admin`
  (blocked only by the org_id trigger, not role content itself).

  The trigger `validate_user_role_configuration` only enforces the admin↔org_id
  constraint — it does NOT block role column changes.

  ## Fix
  Replace the open UPDATE policy with one that:
  1. Still allows users to update their own non-sensitive fields (full_name, position, etc.)
  2. Blocks changes to: role, organization_id, is_active, password_change_required
  3. Adds a trigger-based guard that aborts any UPDATE that changes the role column
     unless the caller is an admin/system_admin

  ## Implementation
  - Drop the open UPDATE policy
  - Add a BEFORE UPDATE trigger that raises an exception if role or organization_id
    changes and the caller is not an admin
  - Add a restricted UPDATE policy allowing only safe columns
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop the open self-update policy
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add trigger that blocks privileged column changes by non-admins
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Only applies to authenticated self-updates (not service_role)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins and system_admins may change anything
  SELECT role INTO caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF caller_role IN ('admin', 'system_admin') THEN
    RETURN NEW;
  END IF;

  -- Block role escalation
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own role.';
  END IF;

  -- Block org reassignment
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own organization.';
  END IF;

  -- Block is_active self-enable (prevent suspended users from unsuspending themselves)
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own active status.';
  END IF;

  -- Block clearing password_change_required flag on self
  IF NEW.password_change_required IS DISTINCT FROM OLD.password_change_required THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change password requirements on your own profile.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON user_profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Restore a self-update policy for safe fields only
--    (full_name, position — the only fields users legitimately self-update)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can update own safe profile fields"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Separate admin-only update policy for privileged fields
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admins can update any user profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
