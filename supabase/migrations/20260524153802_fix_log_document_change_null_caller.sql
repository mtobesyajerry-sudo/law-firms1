/*
  # Fix log_document_change trigger for NULL caller context

  ## Summary
  The log_document_change() trigger was failing when called from service-role
  context (migrations, admin scripts) because COALESCE(NEW.verified_by, auth.uid())
  returns NULL when both are NULL, violating the NOT NULL constraint on
  document_verification_log.performed_by.

  ## Fix
  Skip the log INSERT entirely when no actor can be identified. Service-role
  operations are already audited at the Postgres level; skipping the application
  log row for NULL-actor transitions is safe and prevents spurious errors.
*/
CREATE OR REPLACE FUNCTION public.log_document_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  actor_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Always log uploads; performed_by is the uploader
    INSERT INTO document_verification_log (document_id, action, performed_by, new_status, notes)
    VALUES (NEW.id, 'uploaded', NEW.uploaded_by, NEW.verification_status, 'Document uploaded');

  ELSIF TG_OP = 'UPDATE' AND OLD.verification_status != NEW.verification_status THEN
    actor_id := COALESCE(NEW.verified_by, auth.uid());

    -- Skip log when no actor is identifiable (service-role / migration context)
    IF actor_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO document_verification_log (document_id, action, performed_by, previous_status, new_status, notes)
    VALUES (
      NEW.id,
      CASE NEW.verification_status
        WHEN 'verified' THEN 'verified'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'expired'  THEN 'expired'
        ELSE 'updated'
      END,
      actor_id,
      OLD.verification_status,
      NEW.verification_status,
      NEW.verification_notes
    );
  END IF;

  RETURN NEW;
END;
$function$;
