/*
  # Add SOF/SOW Verification Fields to KYC Clients

  ## Overview
  Adds verification tracking fields for Source of Funds (SOF) and Source of Wealth (SOW) 
  to the kyc_clients table. These fields are updated automatically when verification records 
  are marked as verified.

  ## Changes
  - Adds `source_of_funds_verified` boolean field to track if SOF has been verified
  - Adds `source_of_wealth_verified` boolean field to track if SOW has been verified
  - Both fields default to false
  - These fields are used by the SOF/SOW verification workflow

  ## Security
  No RLS changes needed as kyc_clients already has proper RLS policies
*/

-- Add SOF/SOW verification fields to kyc_clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'kyc_clients'
    AND column_name = 'source_of_funds_verified'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_funds_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'kyc_clients'
    AND column_name = 'source_of_wealth_verified'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN source_of_wealth_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create index for quick lookup of unverified clients
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sof_verified ON kyc_clients(source_of_funds_verified) WHERE source_of_funds_verified = false;
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sow_verified ON kyc_clients(source_of_wealth_verified) WHERE source_of_wealth_verified = false;
