ALTER TABLE new_user_requests
  DROP CONSTRAINT public_access_requests_status_check;

ALTER TABLE new_user_requests
  ADD CONSTRAINT public_access_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
