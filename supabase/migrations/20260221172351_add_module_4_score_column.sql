/*
  # Add Module 4 Score Column

  1. Changes
    - Add module_4_score column to assessments table
    - Add module_4_rating column for maturity level rating

  2. Notes
    - Module 4 captures Control Maturity Assessment scores (1-5 scale)
    - Higher scores indicate higher maturity (Optimised = 5, Initial = 1)
*/

-- Add module_4_score column
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS module_4_score DECIMAL(3,2) DEFAULT 0;

-- Add module_4_rating column
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS module_4_rating TEXT;

-- Add comment for documentation
COMMENT ON COLUMN assessments.module_4_score IS 'Control Maturity Assessment score (1-5 scale: 1=Initial, 5=Optimised)';
COMMENT ON COLUMN assessments.module_4_rating IS 'Control Maturity level: Initial, Developing, Defined, Managed, or Optimised';
