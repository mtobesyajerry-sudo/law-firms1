/*
  # Remove Email Unique Constraint from Registration Requests

  ## Summary
  Removes the UNIQUE constraint on the email column in the registration_requests table
  to allow users to re-register with the same email after their previous registration
  request has been deleted or rejected.

  ## Changes Made
  - Drop the unique constraint on the email column in registration_requests table
  - This allows the same email to be used for multiple registration attempts
  - This is necessary because deleted registration requests should not block future registrations

  ## Rationale
  When an admin deletes a registration request, the user should be able to register
  again with the same email. The UNIQUE constraint was preventing this.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registration_requests_email_key'
    AND conrelid = 'registration_requests'::regclass
  ) THEN
    ALTER TABLE registration_requests DROP CONSTRAINT registration_requests_email_key;
  END IF;
END $$;