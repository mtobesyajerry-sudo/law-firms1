-- Replace the str_status CHECK constraint to add 'saved' and 'filed_with_fiu'
-- which model the two-step internal-record → confirmed-FIU-filed lifecycle.
ALTER TABLE suspicious_activity_reports
  DROP CONSTRAINT IF EXISTS suspicious_activity_reports_str_status_check;

ALTER TABLE suspicious_activity_reports
  ADD CONSTRAINT suspicious_activity_reports_str_status_check
    CHECK (str_status IN (
      'draft', 'pending_review', 'pending_approval', 'approved',
      'submitted', 'acknowledged',
      'saved', 'filed_with_fiu'
    ));
