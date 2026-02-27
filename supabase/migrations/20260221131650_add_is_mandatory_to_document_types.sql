/*
  # Add is_mandatory field to document_types

  ## Changes
  1. Adds is_mandatory boolean column to document_types table
  2. Sets default value based on category and code
  3. Updates existing records with appropriate mandatory flags

  ## Security
  - No RLS changes needed
  - Maintains existing constraints
*/

-- Add is_mandatory column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_types' AND column_name = 'is_mandatory'
  ) THEN
    ALTER TABLE document_types ADD COLUMN is_mandatory boolean DEFAULT false;
  END IF;
END $$;

-- Update mandatory status for critical identity documents
UPDATE document_types 
SET is_mandatory = true 
WHERE category = 'identity' 
  AND code IN ('passport', 'national_id', 'drivers_license');

-- Update mandatory status for critical corporate documents
UPDATE document_types 
SET is_mandatory = true 
WHERE category = 'corporate' 
  AND code IN ('incorporation_cert', 'business_license');

-- Update mandatory status for address verification
UPDATE document_types 
SET is_mandatory = true 
WHERE category = 'address' 
  AND code = 'utility_bill';

-- All other documents remain optional (is_mandatory = false)
