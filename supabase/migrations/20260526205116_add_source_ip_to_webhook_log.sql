/*
  # Add source_ip to clickpesa_webhook_log

  Captures the originating IP of incoming webhook requests for audit and
  abuse-detection purposes. NULL for entries created before this migration.
*/
ALTER TABLE clickpesa_webhook_log
  ADD COLUMN IF NOT EXISTS source_ip text;
