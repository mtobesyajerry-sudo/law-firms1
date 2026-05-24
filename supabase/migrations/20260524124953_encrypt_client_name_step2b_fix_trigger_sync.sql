
/*
  # Encrypt client_name — Step 2b: Fix trigger sync

  Corrects the trigger to capture the plain value in a local variable
  before nulling it, so the legacy client_name column stays in sync
  during the transition period.
*/

CREATE OR REPLACE FUNCTION public.encrypt_kyc_client_pii()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'extensions', 'public', 'vault'
AS $function$
DECLARE
  v_client_name text;
BEGIN
  IF NEW.passport_number_plain IS NOT NULL AND NEW.passport_number_plain != '' THEN
    NEW.passport_number_encrypted := encrypt_pii(NEW.passport_number_plain);
    NEW.passport_number_plain     := NULL;
  END IF;

  IF NEW.national_id_plain IS NOT NULL AND NEW.national_id_plain != '' THEN
    NEW.national_id_encrypted := encrypt_pii(NEW.national_id_plain);
    NEW.national_id_plain     := NULL;
  END IF;

  IF NEW.address_plain IS NOT NULL AND NEW.address_plain != '' THEN
    NEW.address_encrypted := encrypt_pii(NEW.address_plain);
    NEW.address_plain     := NULL;
  END IF;

  IF NEW.phone_plain IS NOT NULL AND NEW.phone_plain != '' THEN
    NEW.phone_encrypted := encrypt_pii(NEW.phone_plain);
    NEW.phone_plain     := NULL;
  END IF;

  IF NEW.tax_id_plain IS NOT NULL AND NEW.tax_id_plain != '' THEN
    NEW.tax_id_encrypted := encrypt_pii(NEW.tax_id_plain);
    NEW.tax_id_plain     := NULL;
  END IF;

  -- Encrypt client name; keep legacy client_name in sync during transition
  IF NEW.client_name_plain IS NOT NULL AND NEW.client_name_plain != '' THEN
    v_client_name             := NEW.client_name_plain;
    NEW.client_name_encrypted := encrypt_pii(v_client_name);
    NEW.client_name_plain     := NULL;
    NEW.client_name           := v_client_name;
  END IF;

  RETURN NEW;
END;
$function$;
