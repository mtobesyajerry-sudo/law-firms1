/*
  # Add Review Frequency Column to KYC Clients
  
  1. Changes
    - Add `review_frequency` column to `kyc_clients` table
    - This column tracks how often a client should be reviewed
    - Default value is 'annual' for all existing clients
    
  2. Notes
    - This column is referenced by the client review system
    - Valid values: 'monthly', 'quarterly', 'semi_annual', 'annual'
*/

-- Add review_frequency column to kyc_clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'review_frequency'
  ) THEN
    ALTER TABLE kyc_clients 
    ADD COLUMN review_frequency text 
    CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'))
    DEFAULT 'annual';
  END IF;
END $$;

-- Update existing clients to have annual review frequency
UPDATE kyc_clients 
SET review_frequency = 'annual' 
WHERE review_frequency IS NULL;
