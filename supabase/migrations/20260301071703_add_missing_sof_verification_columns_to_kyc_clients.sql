/*
  # Add Missing SOF Verification Columns to kyc_clients
  
  ## Problem
  - SOFSOWTemplates.jsx tries to update sof_verification_date, sof_verified_by
  - These columns don't exist in kyc_clients table
  - Only source_of_funds and source_of_wealth text fields exist
  - Causing "Could not find the 'sof_verification_date' column" error
  
  ## Solution
  - Add sof_verification_date, sof_verified_by, source_of_funds_verified
  - These already exist for SOW (sow_verification_date, etc) but missing for SOF
  
  ## Impact
  - Fixes "Failed to update verification status" error in SOF/SOW templates
*/

-- Add missing SOF verification tracking columns
ALTER TABLE kyc_clients
ADD COLUMN IF NOT EXISTS source_of_funds_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sof_verification_date date,
ADD COLUMN IF NOT EXISTS sof_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_of_wealth_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sow_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sof_verified ON kyc_clients(source_of_funds_verified);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sow_verified ON kyc_clients(source_of_wealth_verified);
