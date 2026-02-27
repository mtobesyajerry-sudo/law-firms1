/*
  # Add DD Level to KYC Clients

  ## Changes
  - Add current_dd_level column to kyc_clients table
  - Defaults to 'standard' for existing clients
  - Supports simplified, standard, and enhanced levels
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'current_dd_level'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN current_dd_level text DEFAULT 'standard' CHECK (current_dd_level IN ('simplified', 'standard', 'enhanced'));
  END IF;
END $$;
