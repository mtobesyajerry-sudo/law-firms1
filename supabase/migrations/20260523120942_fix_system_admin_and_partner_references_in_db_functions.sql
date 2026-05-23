/*
  # Fix system_admin and partner references in DB helper functions

  ## Changes
  1. `suspend_organization` / `activate_organization` — role check changed from
     'system_admin' (unassignable) to 'admin' (the actual admin role)
  2. `is_organization_manager` — removes 'partner' from the role set (role doesn't
     exist in the check constraint and cannot be assigned)
  3. `prevent_role_escalation` — removes 'system_admin' from the bypass list
     (can't be assigned, so no real user has it; 'admin' alone is the privileged role)
  4. `validate_user_role_configuration` — updates error message to name the actual
     valid management-tier roles (management, senior_partner) instead of partner
*/

-- 1. Fix suspend_organization
CREATE OR REPLACE FUNCTION suspend_organization(org_id uuid, admin_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can suspend organizations';
  END IF;

  UPDATE organizations
  SET
    subscription_status = 'suspended',
    suspended_at = now(),
    suspended_by = admin_id,
    suspension_reason = reason
  WHERE id = org_id;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
  VALUES (
    admin_id, 'UPDATE', 'organizations', org_id,
    jsonb_build_object('subscription_status', 'suspended', 'suspension_reason', reason),
    inet_client_addr()
  );
END;
$$;

-- 2. Fix activate_organization
CREATE OR REPLACE FUNCTION activate_organization(org_id uuid, admin_id uuid, payment_received numeric, payment_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_fee numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can activate organizations';
  END IF;

  SELECT subscription_fee INTO org_fee FROM organizations WHERE id = org_id;

  UPDATE organizations
  SET
    subscription_status = 'active',
    last_payment_date = payment_date,
    next_payment_due = payment_date + interval '1 month',
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL
  WHERE id = org_id;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
  VALUES (
    admin_id, 'UPDATE', 'organizations', org_id,
    jsonb_build_object('subscription_status', 'active', 'payment_received', payment_received, 'payment_date', payment_date),
    inet_client_addr()
  );
END;
$$;

-- 3. Fix is_organization_manager — remove 'partner' from role set
CREATE OR REPLACE FUNCTION is_organization_manager(user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_org_id UUID;
BEGIN
  SELECT role, organization_id
  INTO user_role, user_org_id
  FROM user_profiles
  WHERE id = user_id;

  RETURN (
    user_role IN ('management', 'senior_partner')
    AND user_org_id = check_org_id
    AND user_org_id IS NOT NULL
  );
END;
$$;

-- 4. Fix prevent_role_escalation — remove 'system_admin' from bypass list
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own role.';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own organization.';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change your own active status.';
  END IF;

  IF NEW.password_change_required IS DISTINCT FROM OLD.password_change_required THEN
    RAISE EXCEPTION 'Insufficient privileges: you cannot change password requirements on your own profile.';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Fix validate_user_role_configuration error message
CREATE OR REPLACE FUNCTION validate_user_role_configuration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'System administrators (role=admin) cannot be assigned to an organization. Use management or senior_partner roles for organization-level admins.';
  END IF;

  IF NEW.role != 'admin' AND NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Non-admin users must be assigned to an organization. Only system administrators (role=admin) can have NULL organization_id.';
  END IF;

  RETURN NEW;
END;
$$;
