/*
  # Add framework_type to assessments table

  1. Purpose
    - Support multi-framework assessments (dnfbp, banks, legal_professionals, accountants)
    - Allow organizations to use different assessment frameworks
    - Ensure backward compatibility with existing assessments

  2. Changes
    - Add framework_type column with default value 'dnfbp'
    - Add check constraint to enforce valid framework types
    - Backfill existing assessments with 'dnfbp' framework

  3. Notes
    - Default is 'dnfbp' for backward compatibility
    - All existing assessments will be set to 'dnfbp'
    - New assessments can specify their framework type
*/

-- Add framework_type column to assessments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'framework_type'
  ) THEN
    ALTER TABLE assessments 
    ADD COLUMN framework_type text DEFAULT 'dnfbp' NOT NULL;
  END IF;
END $$;

-- Add check constraint for valid framework types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'assessments' AND constraint_name = 'valid_framework_type'
  ) THEN
    ALTER TABLE assessments
    ADD CONSTRAINT valid_framework_type 
    CHECK (framework_type IN ('dnfbp', 'banks', 'legal_professionals', 'accountants'));
  END IF;
END $$;

-- Backfill existing assessments with 'dnfbp' framework
UPDATE assessments 
SET framework_type = 'dnfbp' 
WHERE framework_type IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_assessments_framework_type ON assessments(framework_type);

-- Add comment
COMMENT ON COLUMN assessments.framework_type IS 'Assessment framework: dnfbp, banks, legal_professionals, or accountants';
