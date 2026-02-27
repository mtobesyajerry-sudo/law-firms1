/*
  # Add business_type column to registration_requests

  1. Changes
    - Add `business_type` column to store practice areas for law firms
    - Add `size` column to store firm size
    - Add `dnfbp_category` column to store firm type
    
  2. Notes
    - These fields align with the registration form in Auth.jsx
    - All fields are optional to maintain backward compatibility
*/

-- Add missing columns to registration_requests table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registration_requests' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE registration_requests ADD COLUMN business_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registration_requests' AND column_name = 'size'
  ) THEN
    ALTER TABLE registration_requests ADD COLUMN size TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registration_requests' AND column_name = 'dnfbp_category'
  ) THEN
    ALTER TABLE registration_requests ADD COLUMN dnfbp_category TEXT;
  END IF;
END $$;
