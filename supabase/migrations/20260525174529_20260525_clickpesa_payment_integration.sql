/*
  # ClickPesa Payment Gateway Integration

  ## Summary
  Extends the subscription payment system to support ClickPesa — a licensed Bank of Tanzania
  Payment System Provider — enabling automated USSD-Push payments via M-Pesa, Mixx by Yas,
  Airtel Money, HaloPesa, and CRDB Bank Transfer.

  ## Changes

  ### subscription_payments — new ClickPesa tracking columns
  - clickpesa_transaction_id: ID returned by ClickPesa after USSD-Push initiation
  - clickpesa_order_reference: our unique reference (format: IUC-{org_short}-{ts})
  - clickpesa_status: PROCESSING | PENDING | SUCCESS | FAILED | CANCELLED | EXPIRED
  - clickpesa_channel: actual network used (MPESA, MIXX_BY_YAS, etc.)
  - payer_phone_number: phone that received the USSD push
  - payer_name: optional name for receipt
  - tier: subscription tier being purchased
  - billing_cycle: monthly or annual
  - amount_tzs: total amount (VAT-inclusive)
  - vat_tzs: VAT component
  - subtotal_tzs: net amount
  - initiated_at, completed_at, failed_at, failure_reason: lifecycle timestamps
  - webhook_received_at, webhook_raw_payload: raw webhook data for audit
  - retry_count, last_status_check_at: polling support
  - created_by: user who initiated

  ### organizations — new payment_state column
  Tracks the org's current payment lifecycle state for fast access gating.

  ### clickpesa_webhook_log — new table
  Idempotent webhook event log with UNIQUE(transaction_id, status) to prevent
  duplicate processing. RLS: admins read-only; only service role writes.

  ### New DB functions
  - calculate_payment_amount(tier, billing_cycle): server-side amount computation
  - activate_subscription_after_payment(payment_id): atomically extends subscription on success

  ## Security
  - RLS enabled on clickpesa_webhook_log
  - Only admin role can read webhook logs
  - No INSERT policy for authenticated users on webhook log (service role only)
  - calculate_payment_amount and activate_subscription_after_payment are SECURITY DEFINER
*/

-- ============================================================================
-- SECTION 1: Extend subscription_payments with ClickPesa columns
-- ============================================================================

ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS clickpesa_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS clickpesa_order_reference TEXT,
  ADD COLUMN IF NOT EXISTS clickpesa_status TEXT,
  ADD COLUMN IF NOT EXISTS clickpesa_channel TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS payer_name TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS amount_tzs INTEGER,
  ADD COLUMN IF NOT EXISTS vat_tzs INTEGER,
  ADD COLUMN IF NOT EXISTS subtotal_tzs INTEGER,
  ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_raw_payload JSONB,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_status_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Backfill completed_at and failed_at from existing columns where null
-- (these columns already existed but may need the new ones too - add IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE subscription_payments ADD COLUMN failure_reason TEXT;
  END IF;
END $$;

COMMENT ON COLUMN subscription_payments.clickpesa_transaction_id IS
  'Transaction ID returned by ClickPesa after USSD-Push initiation';
COMMENT ON COLUMN subscription_payments.clickpesa_order_reference IS
  'Our generated unique reference sent to ClickPesa; format: IUC-{org_short_id}-{timestamp}';
COMMENT ON COLUMN subscription_payments.clickpesa_status IS
  'INITIATING, PROCESSING, PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED';
COMMENT ON COLUMN subscription_payments.tier IS
  'Subscription tier being purchased (small_firm, medium_firm)';
COMMENT ON COLUMN subscription_payments.billing_cycle IS
  'monthly or annual billing cycle for this payment';
COMMENT ON COLUMN subscription_payments.amount_tzs IS
  'Total VAT-inclusive amount charged (TZS). Always computed server-side.';

-- Unique index on order reference (prevent duplicate submissions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_order_ref
  ON subscription_payments(clickpesa_order_reference)
  WHERE clickpesa_order_reference IS NOT NULL;

-- Index for status polling queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_clickpesa_status
  ON subscription_payments(clickpesa_status, initiated_at DESC)
  WHERE clickpesa_status IN ('PROCESSING', 'PENDING', 'INITIATING');

-- Index for org payment history
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org_created
  ON subscription_payments(organization_id, created_at DESC);


-- ============================================================================
-- SECTION 2: Add payment_state to organizations
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'payment_state'
  ) THEN
    ALTER TABLE organizations
      ADD COLUMN payment_state TEXT NOT NULL DEFAULT 'trialing'
        CHECK (payment_state IN (
          'trialing',
          'trial_expired',
          'payment_pending',
          'paid_active',
          'payment_failed',
          'cancelled',
          'grace_period'
        ));
  END IF;
END $$;

-- Back-fill based on existing subscription state
UPDATE organizations
SET payment_state = CASE
  WHEN is_trialing = TRUE THEN 'trialing'
  WHEN is_active = TRUE AND subscription_expiry_date > NOW() THEN 'paid_active'
  WHEN is_active = FALSE THEN 'trial_expired'
  ELSE 'trialing'
END
WHERE payment_state = 'trialing';

CREATE INDEX IF NOT EXISTS idx_organizations_payment_state
  ON organizations(payment_state) WHERE payment_state != 'paid_active';


-- ============================================================================
-- SECTION 3: Webhook deduplication log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS clickpesa_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  order_reference TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (transaction_id, status)
);

COMMENT ON TABLE clickpesa_webhook_log IS
  'Idempotent log of all ClickPesa webhook events. UNIQUE(transaction_id, status) prevents duplicate processing.';

CREATE INDEX IF NOT EXISTS idx_clickpesa_webhook_log_unprocessed
  ON clickpesa_webhook_log(received_at DESC) WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_clickpesa_webhook_log_order_ref
  ON clickpesa_webhook_log(order_reference);

ALTER TABLE clickpesa_webhook_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read webhook logs" ON clickpesa_webhook_log;
CREATE POLICY "Admins read webhook logs"
  ON clickpesa_webhook_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================================
-- SECTION 4: calculate_payment_amount — server-side price computation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payment_amount(
  p_tier TEXT,
  p_billing_cycle TEXT
)
RETURNS TABLE (
  total_tzs INTEGER,
  vat_tzs INTEGER,
  subtotal_tzs INTEGER,
  plan_name TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
  v_total INTEGER;
BEGIN
  SELECT * INTO v_plan FROM subscription_plans WHERE tier = p_tier;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found for tier: %', p_tier;
  END IF;
  IF v_plan.contact_sales THEN
    RAISE EXCEPTION 'Tier % requires sales contact; not self-serve payable', p_tier;
  END IF;

  IF p_billing_cycle = 'monthly' THEN
    v_total := v_plan.price_monthly_tzs;
  ELSIF p_billing_cycle = 'annual' THEN
    v_total := v_plan.price_annual_tzs;
  ELSE
    RAISE EXCEPTION 'Invalid billing_cycle: % (must be monthly or annual)', p_billing_cycle;
  END IF;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'No price defined for tier % billing cycle %', p_tier, p_billing_cycle;
  END IF;

  RETURN QUERY SELECT
    v_total AS total_tzs,
    (v_total - ROUND(v_total / 1.18))::INTEGER AS vat_tzs,
    ROUND(v_total / 1.18)::INTEGER AS subtotal_tzs,
    v_plan.name AS plan_name;
END $$;

COMMENT ON FUNCTION calculate_payment_amount IS
  'Server-side VAT-inclusive price lookup. Always call this before charging — never trust client-provided amounts.';


-- ============================================================================
-- SECTION 5: activate_subscription_after_payment — atomic subscription activation
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_subscription_after_payment(
  p_payment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment subscription_payments%ROWTYPE;
  v_new_expiry TIMESTAMPTZ;
  v_current_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_payment FROM subscription_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  IF v_payment.clickpesa_status != 'SUCCESS' THEN
    RAISE EXCEPTION 'Cannot activate; payment status is %', v_payment.clickpesa_status;
  END IF;

  -- Get current expiry to extend from (rather than overwrite)
  SELECT subscription_expiry_date INTO v_current_expiry
  FROM organizations WHERE id = v_payment.organization_id;

  -- New expiry: extend from GREATEST(now, current_expiry)
  IF v_payment.billing_cycle = 'monthly' THEN
    v_new_expiry := GREATEST(NOW(), COALESCE(v_current_expiry, NOW())) + INTERVAL '1 month';
  ELSE
    v_new_expiry := GREATEST(NOW(), COALESCE(v_current_expiry, NOW())) + INTERVAL '1 year';
  END IF;

  UPDATE organizations
  SET
    subscription_tier = v_payment.tier,
    subscription_expiry_date = v_new_expiry,
    is_trialing = FALSE,
    trial_ends_at = NULL,
    payment_state = 'paid_active',
    is_active = TRUE
  WHERE id = v_payment.organization_id;

  UPDATE subscription_payments
  SET completed_at = COALESCE(completed_at, NOW())
  WHERE id = p_payment_id;

  RETURN TRUE;
END $$;

COMMENT ON FUNCTION activate_subscription_after_payment IS
  'Atomically extends org subscription after ClickPesa payment confirmed SUCCESS. Called by webhook handler and status-check function.';
