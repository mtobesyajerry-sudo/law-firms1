/*
  # Add pending_confirmation status and customer_confirmed_at to subscription_payments

  ## Summary
  Closes the bank-transfer reconciliation gap by:
  1. Extending the status CHECK constraint to include 'pending_confirmation' — the state
     a bank-transfer claim enters when the customer clicks "I have made the transfer".
  2. Adding customer_confirmed_at (nullable timestamptz) to record when that confirmation
     was submitted.

  ## Changes
  ### subscription_payments
  - DROP + RECREATE status_check constraint (adds 'pending_confirmation')
  - ADD COLUMN customer_confirmed_at timestamptz (nullable, no default — only set on transition)

  ## Notes
  - No existing rows are affected; all current statuses remain valid values.
  - The column addition uses IF NOT EXISTS so reruns are safe.
*/

-- 1. Replace status constraint to include 'pending_confirmation'
ALTER TABLE subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_status_check;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_status_check
  CHECK (status IN (
    'pending',
    'pending_confirmation',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  ));

-- 2. Add customer_confirmed_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments' AND column_name = 'customer_confirmed_at'
  ) THEN
    ALTER TABLE subscription_payments ADD COLUMN customer_confirmed_at timestamptz;
  END IF;
END $$;
