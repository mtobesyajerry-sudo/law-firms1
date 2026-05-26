/*
  # Rate-limit sales_enquiries INSERT

  ## Purpose
  Prevent abuse of the public contact/enquiry form by limiting how many submissions
  a single email address can make in a short window.

  ## Logic
  A BEFORE INSERT trigger fires on every new row in sales_enquiries.
  It counts existing rows with the same email that were created in the last 5 minutes.
  If that count is 3 or more, the insert is rejected with a descriptive exception.

  ## Why email not IP
  IP address is not available inside a Postgres trigger (no HTTP context).
  Email is the natural identity for a contact form and is already NOT NULL on the table.
  Rate-limiting by email stops repeat submissions from the same sender, which is the
  primary abuse vector for this form.

  ## Notes
  - Threshold: 3 submissions per email per 5-minute window.
  - Legitimate users are extremely unlikely to submit more than once in 5 minutes.
  - The trigger is BEFORE INSERT so no row is written on rejection.
  - The exception message is safe to surface to the caller (no internal detail exposed).
*/

CREATE OR REPLACE FUNCTION public.check_sales_enquiry_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
  FROM sales_enquiries
  WHERE email = NEW.email
    AND created_at >= NOW() - INTERVAL '5 minutes';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many enquiries from this address. Please wait a few minutes before trying again.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_enquiries_rate_limit ON sales_enquiries;

CREATE TRIGGER trg_sales_enquiries_rate_limit
  BEFORE INSERT ON sales_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION check_sales_enquiry_rate_limit();
