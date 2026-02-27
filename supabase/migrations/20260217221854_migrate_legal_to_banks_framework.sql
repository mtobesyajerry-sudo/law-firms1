/*
  # Migrate Legal Professionals Framework to Banks & Financial Institutions Framework

  1. Purpose
    - Update all existing assessments using 'legal_professionals' framework to 'banks_financial_institutions'
    - Ensure consistency across the system

  2. Changes
    - Update framework_type in assessments table where applicable

  3. Security
    - No changes to RLS policies
    - All existing security controls remain in place
*/

-- Update all assessments from legal_professionals to banks_financial_institutions
UPDATE assessments
SET framework_type = 'banks_financial_institutions'
WHERE framework_type = 'legal_professionals';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully migrated framework from legal_professionals to banks_financial_institutions';
END $$;
