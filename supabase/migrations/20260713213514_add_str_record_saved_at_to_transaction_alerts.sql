-- Add str_record_saved_at to track internal STR record save (distinct from actual FIU filing).
-- str_filed_at now means "actually filed with FIU" (set by Confirm Filed with FIU action).
-- str_record_saved_at means "STR record saved internally in our system" (set by STRFilingModal submit).
ALTER TABLE transaction_alerts
  ADD COLUMN IF NOT EXISTS str_record_saved_at timestamptz;
ALTER TABLE transaction_alerts
  ADD COLUMN IF NOT EXISTS str_record_saved_by uuid;
ALTER TABLE transaction_alerts
  ADD CONSTRAINT transaction_alerts_str_record_saved_by_fkey
  FOREIGN KEY (str_record_saved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
