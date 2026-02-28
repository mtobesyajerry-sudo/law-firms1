/*
  # Add Subscription Payment Tracking

  1. Changes
    - Add subscription payment fields to organizations table
    - Add payment status tracking
    - Add subscription dates tracking
    - Allow admin to suspend/activate organizations

  2. New Fields
    - subscription_status: 'active', 'suspended', 'expired'
    - subscription_fee: Monthly subscription amount
    - last_payment_date: Date of last payment received
    - next_payment_due: Date when next payment is due
    - payment_notes: Admin notes about payment status
    - suspended_at: When organization was suspended
    - suspended_by: Admin who suspended the organization
    - suspension_reason: Reason for suspension

  3. Security
    - Only system administrators can modify subscription status
*/

-- Add subscription payment tracking fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
ADD COLUMN IF NOT EXISTS next_payment_due timestamptz,
ADD COLUMN IF NOT EXISTS payment_notes text,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Add index for quick lookup of suspended organizations
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- Create function to check if organization is active
CREATE OR REPLACE FUNCTION is_organization_active(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id
    AND subscription_status = 'active'
    AND is_active = true
  );
END;
$$;

-- Create function for admin to suspend organization
CREATE OR REPLACE FUNCTION suspend_organization(
  org_id uuid,
  reason text,
  admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_id
    AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Only system administrators can suspend organizations';
  END IF;

  -- Suspend the organization
  UPDATE organizations
  SET 
    subscription_status = 'suspended',
    suspended_at = now(),
    suspended_by = admin_id,
    suspension_reason = reason
  WHERE id = org_id;

  -- Log the action
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    ip_address
  ) VALUES (
    admin_id,
    'UPDATE',
    'organizations',
    org_id,
    jsonb_build_object(
      'subscription_status', 'suspended',
      'suspension_reason', reason
    ),
    inet_client_addr()
  );
END;
$$;

-- Create function for admin to activate organization
CREATE OR REPLACE FUNCTION activate_organization(
  org_id uuid,
  admin_id uuid,
  payment_received numeric DEFAULT NULL,
  payment_date timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_fee numeric;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_id
    AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Only system administrators can activate organizations';
  END IF;

  -- Get subscription fee
  SELECT subscription_fee INTO org_fee
  FROM organizations
  WHERE id = org_id;

  -- Activate the organization
  UPDATE organizations
  SET 
    subscription_status = 'active',
    last_payment_date = payment_date,
    next_payment_due = payment_date + interval '1 month',
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL
  WHERE id = org_id;

  -- Log the action
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    ip_address
  ) VALUES (
    admin_id,
    'UPDATE',
    'organizations',
    org_id,
    jsonb_build_object(
      'subscription_status', 'active',
      'payment_received', payment_received,
      'payment_date', payment_date
    ),
    inet_client_addr()
  );
END;
$$;

-- Create RLS policy to block suspended organizations from accessing data
CREATE POLICY "Block suspended organizations from data access"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR 
    is_organization_active(organization_id)
  );

-- Add comment
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription status: active, suspended, or expired';
COMMENT ON FUNCTION is_organization_active IS 'Checks if an organization is active and not suspended';
COMMENT ON FUNCTION suspend_organization IS 'Admin function to suspend an organization access';
COMMENT ON FUNCTION activate_organization IS 'Admin function to activate an organization after payment';
