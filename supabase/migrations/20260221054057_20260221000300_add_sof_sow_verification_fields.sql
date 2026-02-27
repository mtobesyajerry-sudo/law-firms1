/*
  # Add SOF/SOW Verification Fields to KYC Clients

  ## Overview
  Adds verification tracking fields for Source of Funds and Source of Wealth
  to support the SOF/SOW Templates workflow.

  ## Changes Made
  
  1. **New Fields in kyc_clients table:**
     - source_of_funds_verified (boolean) - Tracks if SOF has been verified
     - source_of_wealth_verified (boolean) - Tracks if SOW has been verified
     - sof_verification_date (timestamptz) - Date when SOF was verified
     - sow_verification_date (timestamptz) - Date when SOW was verified
     - sof_verified_by (uuid) - User who verified SOF
     - sow_verified_by (uuid) - User who verified SOW
  
  2. **Purpose:**
     - Enable tracking of SOF/SOW template completion
     - Support compliance workflows for Enhanced DD
     - Maintain audit trail of verification activities

  ## Usage in Application
  - SOFSOWTemplates component uses these fields to show completion status
  - Users can mark templates as completed, updating these fields
  - Status badges reflect verification state (completed/pending)
*/

-- Add SOF/SOW verification tracking fields to kyc_clients
DO $$
BEGIN
  -- Add source_of_funds_verified field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_funds_verified'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN source_of_funds_verified boolean DEFAULT false;
  END IF;

  -- Add source_of_wealth_verified field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_wealth_verified'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN source_of_wealth_verified boolean DEFAULT false;
  END IF;

  -- Add SOF verification date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sof_verification_date'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN sof_verification_date timestamptz;
  END IF;

  -- Add SOW verification date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sow_verification_date'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN sow_verification_date timestamptz;
  END IF;

  -- Add SOF verified by field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sof_verified_by'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN sof_verified_by uuid REFERENCES user_profiles(id);
  END IF;

  -- Add SOW verified by field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sow_verified_by'
  ) THEN
    ALTER TABLE kyc_clients ADD COLUMN sow_verified_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create index for verification status queries
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sof_verified ON kyc_clients(source_of_funds_verified) WHERE source_of_funds_verified = false;
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sow_verified ON kyc_clients(source_of_wealth_verified) WHERE source_of_wealth_verified = false;

-- Add comment explaining the fields
COMMENT ON COLUMN kyc_clients.source_of_funds_verified IS 'Indicates if Source of Funds verification template has been completed';
COMMENT ON COLUMN kyc_clients.source_of_wealth_verified IS 'Indicates if Source of Wealth verification template has been completed';
COMMENT ON COLUMN kyc_clients.sof_verification_date IS 'Timestamp when SOF verification was completed';
COMMENT ON COLUMN kyc_clients.sow_verification_date IS 'Timestamp when SOW verification was completed';
COMMENT ON COLUMN kyc_clients.sof_verified_by IS 'User who completed SOF verification';
COMMENT ON COLUMN kyc_clients.sow_verified_by IS 'User who completed SOW verification';
