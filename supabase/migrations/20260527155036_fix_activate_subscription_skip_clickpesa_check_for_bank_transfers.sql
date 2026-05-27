/*
  # Fix activate_subscription_after_payment for CRDB bank transfers

  ## Problem
  The function checked `clickpesa_status != 'SUCCESS'` unconditionally.
  CRDB bank transfers correctly set clickpesa_status = 'N/A' (they don't use
  ClickPesa at all), so the guard always fired with "Cannot activate; payment
  status is N/A" when the admin tried to match a deposit to a bank transfer claim.

  ## Fix
  Skip the clickpesa_status guard for bank_transfer_crdb payments.
  For all other payment methods (ClickPesa mobile), the guard is retained.

  ## Unchanged behaviour
  - Idempotency guard (completed_at IS NOT NULL → return TRUE) is preserved.
  - period_end NULL guard is preserved.
  - organizations UPDATE and subscription_payments stamp are unchanged.
*/

CREATE OR REPLACE FUNCTION public.activate_subscription_after_payment(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment subscription_payments%ROWTYPE;
BEGIN
  -- Acquire a row-level lock so concurrent webhook + status-poll calls serialise here
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Idempotency guard: if already processed, return without touching organizations
  IF v_payment.completed_at IS NOT NULL THEN
    RETURN TRUE;
  END IF;

  -- For ClickPesa mobile payments, require a SUCCESS status from the gateway.
  -- Bank transfers (bank_transfer_crdb) do not use ClickPesa; their
  -- clickpesa_status is 'N/A' by design — skip this check for them.
  IF v_payment.payment_method != 'bank_transfer_crdb'
     AND v_payment.clickpesa_status != 'SUCCESS' THEN
    RAISE EXCEPTION 'Cannot activate; payment status is %', v_payment.clickpesa_status;
  END IF;

  -- period_end must be set by the initiation flow; if missing that is a data bug
  IF v_payment.period_end IS NULL THEN
    RAISE EXCEPTION
      'payment % has NULL period_end — cannot determine subscription expiry; fix the initiation flow',
      p_payment_id;
  END IF;

  -- Use the absolute period_end from the payment row — never add intervals to current state
  UPDATE organizations
  SET
    subscription_tier        = v_payment.tier,
    subscription_expiry_date = v_payment.period_end::timestamptz,
    is_trialing              = FALSE,
    trial_ends_at            = NULL,
    payment_state            = 'paid_active',
    is_active                = TRUE
  WHERE id = v_payment.organization_id;

  -- Stamp completed_at exactly once
  UPDATE subscription_payments
  SET completed_at = NOW(),
      status       = 'completed'
  WHERE id = p_payment_id;

  RETURN TRUE;
END;
$$;
