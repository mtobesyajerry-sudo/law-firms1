/*
  # Add Missing SOW Verification Date Column

  1. Changes
    - Add `sow_verification_date` column to `kyc_clients` table
    - This column tracks when Source of Wealth was verified
  
  2. Security
    - Column is nullable (optional)
    - Inherits existing RLS policies from kyc_clients table
*/

-- Add missing sow_verification_date column
ALTER TABLE kyc_clients 
ADD COLUMN IF NOT EXISTS sow_verification_date date;

-- Add comment for documentation
COMMENT ON COLUMN kyc_clients.sow_verification_date IS 'Date when Source of Wealth (SOW) was verified by compliance officer';
