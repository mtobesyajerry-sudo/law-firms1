/*
  # Lock DNFBP Category to Organization

  ## Overview
  This migration moves the DNFBP category from individual assessments to the organization level,
  preventing account sharing between different DNFBP entities. Once an organization's DNFBP type
  is set, it cannot be changed.

  ## Changes

  ### organizations table
  - Add `dnfbp_category` field to store the organization's DNFBP type
  - This field is set during the first assessment and cannot be changed

  ### Data Migration
  - For existing organizations, copy dnfbp_category from their first assessment
  - All future assessments will inherit the organization's DNFBP category

  ## Security Benefits
  - Prevents one account from being used by multiple different DNFBP types
  - Ensures one subscription = one organization = one DNFBP entity
  - Maintains data integrity for compliance reporting

  ## Notes
  - The dnfbp_category field in assessments is kept for historical data
  - New assessments will automatically inherit from organization
*/

-- Add dnfbp_category to organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'dnfbp_category'
  ) THEN
    ALTER TABLE organizations ADD COLUMN dnfbp_category text;
  END IF;
END $$;

-- Migrate existing DNFBP categories from assessments to organizations
-- Use the DNFBP category from the organization's first (oldest) assessment
DO $$
DECLARE
  org_record RECORD;
  first_assessment_category text;
BEGIN
  FOR org_record IN
    SELECT DISTINCT organization_id
    FROM assessments
    WHERE organization_id IS NOT NULL
      AND dnfbp_category IS NOT NULL
  LOOP
    -- Get the DNFBP category from the first assessment for this organization
    SELECT dnfbp_category INTO first_assessment_category
    FROM assessments
    WHERE organization_id = org_record.organization_id
      AND dnfbp_category IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1;

    -- Update the organization with this DNFBP category
    IF first_assessment_category IS NOT NULL THEN
      UPDATE organizations
      SET dnfbp_category = first_assessment_category
      WHERE id = org_record.organization_id
        AND dnfbp_category IS NULL;
    END IF;
  END LOOP;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_dnfbp_category ON organizations(dnfbp_category);