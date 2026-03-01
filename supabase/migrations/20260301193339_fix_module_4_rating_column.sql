/*
  # Ensure Module 4 Rating Column Exists

  1. Changes
    - Add module_4_rating column to assessments table if missing
    - Ensures assessment completion can save maturity ratings

  2. Notes
    - This column stores the maturity level rating for Module 4
    - Values: Initial, Developing, Defined, Managed, Optimised
*/

-- Add module_4_rating column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' 
    AND column_name = 'module_4_rating'
  ) THEN
    ALTER TABLE assessments ADD COLUMN module_4_rating TEXT;
    COMMENT ON COLUMN assessments.module_4_rating IS 'Control Maturity level: Initial, Developing, Defined, Managed, or Optimised';
  END IF;
END $$;
