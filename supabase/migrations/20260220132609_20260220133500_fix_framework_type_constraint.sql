/*
  # Fix framework_type constraint to match application code

  1. Problem
    - Code uses 'banks_financial_institutions' as framework type
    - Database constraint only allows 'banks', 'dnfbp', 'legal_professionals', 'accountants'
    - This mismatch causes insert failures

  2. Solution
    - Drop existing constraint
    - Add new constraint that allows 'banks_financial_institutions'
    - Update any existing 'banks' records to 'banks_financial_institutions'

  3. Changes
    - Drop valid_framework_type constraint
    - Update existing records
    - Create new constraint with correct values
*/

-- Drop the existing constraint
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS valid_framework_type;

-- Update any existing 'banks' records to 'banks_financial_institutions'
UPDATE assessments 
SET framework_type = 'banks_financial_institutions' 
WHERE framework_type = 'banks';

-- Add the corrected constraint
ALTER TABLE assessments
ADD CONSTRAINT valid_framework_type 
CHECK (framework_type IN ('dnfbp', 'banks_financial_institutions', 'legal_professionals', 'accountants'));

-- Add comment
COMMENT ON COLUMN assessments.framework_type IS 'Assessment framework: dnfbp, banks_financial_institutions, legal_professionals, or accountants';
