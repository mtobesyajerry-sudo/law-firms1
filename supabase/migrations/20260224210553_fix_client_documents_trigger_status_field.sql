/*
  # Fix client_documents trigger function status field reference

  1. Changes
    - Update log_document_change() function to use `verification_status` instead of `status`
    - The trigger was referencing NEW.status which doesn't exist in client_documents table
    - The correct field name is verification_status

  2. Details
    - Fixes the "record new has no field status" error when uploading documents
    - Ensures document verification logging works correctly
*/

CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, new_status, notes)
    VALUES (NEW.id, 'uploaded', NEW.uploaded_by, NEW.verification_status, 'Document uploaded');
  ELSIF TG_OP = 'UPDATE' AND OLD.verification_status != NEW.verification_status THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, previous_status, new_status, notes)
    VALUES (
      NEW.id,
      CASE NEW.verification_status
        WHEN 'verified' THEN 'verified'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'expired' THEN 'expired'
        ELSE 'updated'
      END,
      COALESCE(NEW.verified_by, auth.uid()),
      OLD.verification_status,
      NEW.verification_status,
      NEW.verification_notes
    );
  END IF;
  RETURN NEW;
END;
$$;
