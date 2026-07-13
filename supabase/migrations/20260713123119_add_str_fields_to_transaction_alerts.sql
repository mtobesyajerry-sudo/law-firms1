-- FIX 78: Add STR deadline + escalation audit fields to transaction_alerts.
-- Reuses str_filed (already exists, default false) for the "requires STR" boolean.
-- Does NOT duplicate: str_filed serves same purpose as requires_str on the sanctions side.

ALTER TABLE transaction_alerts
  ADD COLUMN IF NOT EXISTS str_deadline          timestamptz,
  ADD COLUMN IF NOT EXISTS str_reference_number  text,
  ADD COLUMN IF NOT EXISTS str_filed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS str_filed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalation_justification text,
  ADD COLUMN IF NOT EXISTS escalated_at          timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL;
