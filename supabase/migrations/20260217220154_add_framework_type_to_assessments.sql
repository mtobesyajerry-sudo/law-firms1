/*
  # Add framework_type column to assessments table

  1. Purpose
    - Add framework_type column to support multiple assessment frameworks
    - Default to 'banks_financial_institutions' for new assessments
    - Support legal_professionals, banks_financial_institutions, accountants, and real_estate

  2. Changes
    - Add framework_type column with default value
    - Add check constraint for valid framework types
    - Add index for query performance

  3. Security
    - No changes to RLS policies needed
    - All existing security controls remain in place
*/

-- Add framework_type column to assessments table
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS framework_type text DEFAULT 'banks_financial_institutions';

-- Add check constraint to validate framework_type values
ALTER TABLE assessments
ADD CONSTRAINT assessments_framework_type_check
CHECK (framework_type IN ('legal_professionals', 'banks_financial_institutions', 'accountants', 'real_estate'));

-- Add comment to document framework types
COMMENT ON COLUMN assessments.framework_type IS 'Type of framework used for assessment: legal_professionals, banks_financial_institutions, accountants, or real_estate';

-- Create index on framework_type for better query performance
CREATE INDEX IF NOT EXISTS idx_assessments_framework_type
ON assessments(framework_type);
