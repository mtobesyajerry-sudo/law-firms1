/*
  # Fix Framework Type for Accountants & Auditors

  1. Changes
    - Updates all existing assessments with entity_category='accountant' to use framework_type='audit_firm'
    - Creates a trigger to automatically set framework_type to 'audit_firm' when entity_category is 'accountant'

  2. Purpose
    - Ensures all accountant/auditor assessments use the correct specialized framework
    - Prevents future assessments from being created with wrong framework type
*/

-- Update existing accountant assessments to use audit_firm framework
UPDATE assessments
SET framework_type = 'audit_firm'
WHERE entity_category = 'accountant'
  AND framework_type != 'audit_firm';

-- Create function to automatically set audit_firm framework for accountants
CREATE OR REPLACE FUNCTION set_accountant_framework()
RETURNS TRIGGER AS $$
BEGIN
  -- If entity_category is accountant, force framework_type to audit_firm
  IF NEW.entity_category = 'accountant' THEN
    NEW.framework_type := 'audit_firm';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update on assessments
DROP TRIGGER IF EXISTS ensure_accountant_framework ON assessments;
CREATE TRIGGER ensure_accountant_framework
  BEFORE INSERT OR UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION set_accountant_framework();
