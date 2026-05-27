/*
  # Create crdb_deposits table

  ## Purpose
  Tracks incoming CRDB bank transfer deposits for reconciliation against pending
  bank transfer claims in subscription_payments.

  ## New Table: crdb_deposits
  - `id`                  — UUID primary key
  - `amount_tzs`          — deposit amount in TZS (integer, no decimals)
  - `deposit_date`        — date the deposit was received
  - `deposit_time`        — time of deposit (optional)
  - `notes`               — free-text notes (branch, sender name, etc.)
  - `status`              — 'unmatched' | 'matched' | 'orphan'
  - `matched_payment_id`  — FK to subscription_payments once matched
  - `matched_at`          — when the match was recorded
  - `matched_by`          — admin user who performed the match
  - `created_at`          — row creation timestamp
  - `created_by`          — admin user who recorded the deposit

  ## Security
  - RLS enabled, admin-only access (all operations)
*/

CREATE TABLE IF NOT EXISTS crdb_deposits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_tzs          integer     NOT NULL,
  deposit_date        date        NOT NULL,
  deposit_time        time,
  notes               text,
  status              text        NOT NULL DEFAULT 'unmatched',
  matched_payment_id  uuid        REFERENCES subscription_payments(id),
  matched_at          timestamptz,
  matched_by          uuid        REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),
  CONSTRAINT crdb_deposits_status_check CHECK (status IN ('unmatched', 'matched', 'orphan'))
);

ALTER TABLE crdb_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crdb_deposits_admin_all"
  ON crdb_deposits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS crdb_deposits_status_idx ON crdb_deposits (status);
-- Index for amount-based matching queries
CREATE INDEX IF NOT EXISTS crdb_deposits_amount_idx ON crdb_deposits (amount_tzs);
