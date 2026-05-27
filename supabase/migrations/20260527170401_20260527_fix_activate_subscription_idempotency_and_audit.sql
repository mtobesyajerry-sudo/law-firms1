/*
  # Fix activate_subscription_after_payment — idempotency + audit log

  ## Problem
  The previous function used `IF completed_at IS NOT NULL THEN RETURN TRUE` as its
  idempotency guard. This fired immediately whenever the payment row was pre-stamped
  with completed_at before the RPC was called (e.g. manual reconciliation, or the
  webhook handler writing completed_at before calling the RPC), causing the org to
  never be updated.

  ## Changes
  1. Idempotency guard now checks the organisation's state:
     if payment_state = 'paid_active' AND subscription_tier = payment.tier
     AND subscription_expiry_date >= payment.period_end → already activated, no-op.
  2. Row-level FOR UPDATE locks on both payment and org prevent race conditions
     between concurrent webhook delivery and status-poll calls.
  3. completed_at on the payment is set with COALESCE so it is written once and
     never overwritten.
  4. Audit log INSERT added — previously missing, which is why audit_logs was empty
     after activation.
  5. updated_at is explicitly set on organizations (some deployments lack the trigger).
*/

CREATE OR REPLACE FUNCTION public.activate_subscription_after_payment(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment subscription_payments%ROWTYPE;
  v_org     organizations%ROWTYPE;
BEGIN
  -- Lock the payment row to serialise concurrent webhook + status-poll calls
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Bank transfers bypass ClickPesa status check (clickpesa_status = 'N/A')
  IF v_payment.payment_method != 'bank_transfer_crdb'
     AND v_payment.clickpesa_status != 'SUCCESS' THEN
    RAISE EXCEPTION 'Cannot activate: ClickPesa status is %', v_payment.clickpesa_status;
  END IF;

  -- period_end must be set by the initiation flow
  IF v_payment.period_end IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: period_end not set on payment %', p_payment_id;
  END IF;

  -- Lock the org row
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_payment.organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation not found: %', v_payment.organization_id;
  END IF;

  -- IDEMPOTENCY: use org state, not payment.completed_at
  -- If org is already paid_active for this exact tier and period, no-op cleanly.
  IF v_org.payment_state = 'paid_active'
     AND v_org.subscription_tier = v_payment.tier
     AND v_org.subscription_expiry_date >= v_payment.period_end::timestamptz THEN
    RETURN true;
  END IF;

  -- Activate the organisation
  UPDATE organizations
  SET subscription_tier        = v_payment.tier,
      subscription_expiry_date = v_payment.period_end::timestamptz,
      payment_state            = 'paid_active',
      is_trialing              = false,
      trial_ends_at            = null,
      is_active                = true,
      updated_at               = NOW()
  WHERE id = v_payment.organization_id;

  -- Mark payment completed (COALESCE preserves any timestamp set by reconciliation)
  UPDATE subscription_payments
  SET status       = 'completed',
      completed_at = COALESCE(completed_at, NOW()),
      updated_at   = NOW()
  WHERE id = p_payment_id;

  -- Audit log
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    changes,
    event_category,
    severity
  ) VALUES (
    v_payment.organization_id,
    NULL,  -- system action
    'subscription_activated',
    'organization',
    v_payment.organization_id::text,
    jsonb_build_object(
      'payment_id',   p_payment_id,
      'tier',         v_payment.tier,
      'billing_cycle', v_payment.billing_cycle,
      'period_start', v_payment.period_start,
      'period_end',   v_payment.period_end,
      'amount_tzs',   v_payment.amount_gross_tzs,
      'payment_method', v_payment.payment_method
    ),
    'billing',
    'info'
  );

  RETURN true;
END;
$$;
