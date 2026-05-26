/*
  # Fix activate_subscription_after_payment — idempotent absolute expiry

  ## Problem
  The previous implementation computed subscription_expiry_date as:
    GREATEST(NOW(), COALESCE(current_expiry, NOW())) + INTERVAL '1 month/year'
  This is ADDITIVE. Two concurrent calls (e.g. webhook + status-poll) would push
  the expiry forward twice, granting a free extra billing period.

  ## Changes
  1. FOR UPDATE lock on the subscription_payments row at the very start to
     serialise concurrent callers.
  2. Early return (TRUE, no-op) if completed_at IS NOT NULL — the payment has
     already been processed; do nothing.
  3. organizations UPDATE now sets subscription_expiry_date = period_end::timestamptz
     (the absolute date computed at payment initiation) rather than adding an
     interval to whatever the current expiry is.
  4. If period_end is NULL on the payment row, RAISE EXCEPTION — that is a bug
     in the initiation flow and must not silently fall back to interval arithmetic.

  ## Result
  Calling the function N times for the same payment_id is safe:
  - First call: acquires lock, completed_at is NULL → processes, sets completed_at.
  - Subsequent calls: acquires lock, completed_at IS NOT NULL → returns TRUE immediately,
    no writes to organizations.
*/

CREATE OR REPLACE FUNCTION public.activate_subscription_after_payment(p_payment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_payment.clickpesa_status != 'SUCCESS' THEN
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
    subscription_tier         = v_payment.tier,
    subscription_expiry_date  = v_payment.period_end::timestamptz,
    is_trialing               = FALSE,
    trial_ends_at             = NULL,
    payment_state             = 'paid_active',
    is_active                 = TRUE
  WHERE id = v_payment.organization_id;

  -- Stamp completed_at exactly once
  UPDATE subscription_payments
  SET completed_at = NOW(),
      status       = 'completed'
  WHERE id = p_payment_id;

  RETURN TRUE;
END $function$;
