/*
  # Remove DNFBP References - Law Firm Only System

  This migration converts the system from a generic DNFBP system to a law firm-specific system.

  ## Changes

  1. **Organizations Table**
     - Remove `dnfbp_category` column (replaced with law_firm_type)
     - Add `law_firm_type` column (solo practice, small firm, medium firm, large firm)
     - Add `brela_registration` and `tls_registration` columns

  2. **Assessments Table**
     - Remove `dnfbp_category` column
     - Ensure framework_type defaults to 'legal_professionals'

  3. **System Content Table**
     - Update content_type enum to remove DNFBP references

  4. **Drop Registration Requests Table**
     - Remove generic registration_requests table (law_firm_registrations is used instead)

  ## Security
  - All changes maintain existing RLS policies
  - Data integrity preserved through proper column removal
*/

-- =====================================================
-- STEP 1: Drop the generic registration_requests table
-- =====================================================

DROP TABLE IF EXISTS registration_requests CASCADE;

-- =====================================================
-- STEP 2: Update Organizations table for law firms
-- =====================================================

-- Add law firm specific columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'law_firm_type'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN law_firm_type text CHECK (law_firm_type IN ('solo_practitioner', 'small_firm', 'medium_firm', 'large_firm'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'brela_registration'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN brela_registration text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'tls_registration'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN tls_registration text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'practice_areas'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN practice_areas text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'number_of_lawyers'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN number_of_lawyers integer;
  END IF;
END $$;

-- Migrate existing data: map dnfbp_category to law_firm_type based on size
UPDATE organizations
SET law_firm_type = CASE
  WHEN size = 'small' OR business_type = 'sole_proprietor' THEN 'solo_practitioner'
  WHEN size = 'medium' THEN 'small_firm'
  WHEN size = 'large' THEN 'medium_firm'
  ELSE 'small_firm'
END
WHERE law_firm_type IS NULL;

-- Drop DNFBP-specific columns
ALTER TABLE organizations DROP COLUMN IF EXISTS dnfbp_category CASCADE;

-- Update business_type to be law firm specific
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_business_type_check;

ALTER TABLE organizations
ADD CONSTRAINT organizations_business_type_check
CHECK (business_type IN ('law_firm', 'sole_proprietor', 'partnership', 'company'));

-- Set default business_type to law_firm
UPDATE organizations SET business_type = 'law_firm' WHERE business_type IS NULL;

-- =====================================================
-- STEP 3: Update Assessments table
-- =====================================================

-- Remove DNFBP columns from assessments
ALTER TABLE assessments DROP COLUMN IF EXISTS dnfbp_category CASCADE;
ALTER TABLE assessments DROP COLUMN IF EXISTS dnfbp_tier CASCADE;

-- Ensure framework_type is set to legal_professionals
UPDATE assessments
SET framework_type = 'legal_professionals'
WHERE framework_type IS NULL OR framework_type != 'legal_professionals';

-- Update constraint to only allow legal_professionals
ALTER TABLE assessments
DROP CONSTRAINT IF EXISTS assessments_framework_type_check;

ALTER TABLE assessments
ADD CONSTRAINT assessments_framework_type_check
CHECK (framework_type = 'legal_professionals');

-- Add comment explaining this is law firm only
COMMENT ON TABLE assessments IS 'AML/CFT compliance assessments for Tanzanian law firms based on the Anti-Money Laundering Act, 2006';
COMMENT ON COLUMN assessments.framework_type IS 'Always set to legal_professionals - this system serves law firms only';

-- =====================================================
-- STEP 4: Update System Content table
-- =====================================================

-- Update content_type enum if system_content table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_content') THEN
    -- Drop the old constraint
    ALTER TABLE system_content DROP CONSTRAINT IF EXISTS system_content_content_type_check;

    -- Add new constraint without DNFBP references
    ALTER TABLE system_content
    ADD CONSTRAINT system_content_content_type_check
    CHECK (content_type IN (
      'introduction',
      'disclaimer',
      'compliance_report_template',
      'assessment_instructions',
      'law_firm_guidance',
      'aml_regulations',
      'privacy_policy',
      'terms_of_service'
    ));

    -- Update existing DNFBP content types
    UPDATE system_content
    SET content_type = 'law_firm_guidance'
    WHERE content_type LIKE '%dnfbp%';
  END IF;
END $$;

-- =====================================================
-- STEP 5: Update comments and documentation
-- =====================================================

COMMENT ON TABLE organizations IS 'Tanzanian law firms using the AML compliance system';
COMMENT ON TABLE law_firm_registrations IS 'Registration requests from law firms to join the system';
COMMENT ON COLUMN organizations.law_firm_type IS 'Type of law firm: solo_practitioner, small_firm, medium_firm, or large_firm';
COMMENT ON COLUMN organizations.business_type IS 'Legal business structure of the law firm';
COMMENT ON COLUMN organizations.brela_registration IS 'Business Registration and Licensing Agency (BRELA) registration number';
COMMENT ON COLUMN organizations.tls_registration IS 'Tanganyika Law Society registration number';

-- =====================================================
-- STEP 6: Add helpful views for law firm data
-- =====================================================

-- Create or replace view for law firm statistics
CREATE OR REPLACE VIEW law_firm_statistics AS
SELECT
  law_firm_type,
  COUNT(*) as firm_count,
  SUM(CASE WHEN subscription_expiry_date > CURRENT_DATE THEN 1 ELSE 0 END) as active_subscriptions
FROM organizations
WHERE business_type IN ('law_firm', 'sole_proprietor', 'partnership', 'company')
GROUP BY law_firm_type;

COMMENT ON VIEW law_firm_statistics IS 'Statistics about law firms registered in the system';
