/*
  # Add Escalated Date Column to Transaction Alerts

  1. Changes
    - Add `escalated_date` column to track when alerts are escalated
    - Add `escalated_by` column to track who escalated the alert

  2. Purpose
    - Enable proper audit trail for alert escalation workflow
    - Support compliance requirements for tracking alert lifecycle
*/

-- Add escalated tracking columns
ALTER TABLE transaction_alerts
ADD COLUMN IF NOT EXISTS escalated_date timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS escalated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_escalated_date ON transaction_alerts(escalated_date);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_escalated_by ON transaction_alerts(escalated_by);

-- Add comment for documentation
COMMENT ON COLUMN transaction_alerts.escalated_date IS 'Timestamp when the alert was escalated to senior management or compliance';
COMMENT ON COLUMN transaction_alerts.escalated_by IS 'User ID who escalated the alert';
