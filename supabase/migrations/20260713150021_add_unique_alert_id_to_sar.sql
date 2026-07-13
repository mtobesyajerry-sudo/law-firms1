-- Prevent duplicate SAR rows for the same transaction alert.
-- A retry after a partial failure should overwrite, not duplicate.
ALTER TABLE suspicious_activity_reports
  ADD CONSTRAINT sar_alert_id_unique UNIQUE (alert_id);
