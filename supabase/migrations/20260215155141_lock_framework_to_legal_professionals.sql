/*
  # Lock Framework to Legal Professionals Only

  This migration locks the AML risk assessment system to only support legal professionals.

  ## Changes

  1. **Assessments Table**
    - Add framework_type column if it doesn't exist
    - Add entity_category column if it doesn't exist
    - Add entity_tier column if it doesn't exist
    - Set all existing assessments to use legal_professionals framework
    - Update entity_category values to match legal professional categories

  2. **Organizations Table**
    - Add entity_category column if it doesn't exist
    - Update entity_category values to match legal professional categories

  ## Notes
  - This is a breaking change that removes support for other frameworks (DNFBP, insurers, audit firms)
  - Existing assessments will be migrated to the legal professionals framework
  - The system will now only accept legal professional categories
*/

-- Add framework_type column to assessments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'framework_type'
  ) THEN
    ALTER TABLE assessments ADD COLUMN framework_type text DEFAULT 'legal_professionals';
  END IF;
END $$;

-- Add entity_category column to assessments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'entity_category'
  ) THEN
    ALTER TABLE assessments ADD COLUMN entity_category text;
  END IF;
END $$;

-- Add entity_tier column to assessments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'entity_tier'
  ) THEN
    ALTER TABLE assessments ADD COLUMN entity_tier integer DEFAULT 2 CHECK (entity_tier >= 1 AND entity_tier <= 3);
  END IF;
END $$;

-- Add entity_category column to organizations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'entity_category'
  ) THEN
    ALTER TABLE organizations ADD COLUMN entity_category text;
  END IF;
END $$;

-- Update all assessments to use legal_professionals framework
UPDATE assessments
SET framework_type = 'legal_professionals';

-- Update entity_tier from dnfbp_tier if entity_tier is null
UPDATE assessments
SET entity_tier = dnfbp_tier
WHERE entity_tier IS NULL AND dnfbp_tier IS NOT NULL;

-- Update entity categories for assessments based on tier
UPDATE assessments
SET entity_category = CASE
  WHEN entity_tier = 3 THEN 'large_firm'
  WHEN entity_tier = 2 THEN 'medium_firm'
  ELSE 'sole_practitioner'
END
WHERE entity_category IS NULL;

-- Update organization categories
UPDATE organizations
SET entity_category = 'sole_practitioner'
WHERE entity_category IS NULL;

-- Set default framework type for new assessments
ALTER TABLE assessments
ALTER COLUMN framework_type SET DEFAULT 'legal_professionals';
