/*
  # Add DNFBP Introduction Information Fields

  ## Overview
  This migration adds fields to the assessments table to capture introductory
  information about the DNFBP at the start of each risk assessment. This information
  helps categorize the DNFBP and provides context for the assessment.

  ## Changes to assessments table
  
  New fields added:
  - `dnfbp_category` (text) - Type of DNFBP (e.g., Real Estate Agent, Lawyer, etc.)
  - `contact_person` (text) - Name of person conducting assessment
  - `contact_position` (text) - Position/title of contact person
  - `contact_email` (text) - Email of contact person
  - `contact_phone` (text) - Phone number of contact person
  - `business_description` (text) - Brief description of business activities
  - `number_of_employees` (text) - Employee count range
  - `annual_turnover` (text) - Annual turnover range
  - `geographical_presence` (text) - Geographic areas of operation
  - `introduction_completed` (boolean) - Track if introduction step is complete

  ## Purpose
  These fields enable the system to:
  1. Properly categorize each DNFBP
  2. Provide context-specific risk assessment guidance
  3. Generate more accurate and relevant reports
  4. Maintain contact information for follow-up
*/

-- Add DNFBP introduction fields to assessments table
DO $$
BEGIN
  -- DNFBP Category
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'dnfbp_category'
  ) THEN
    ALTER TABLE assessments ADD COLUMN dnfbp_category text;
  END IF;

  -- Contact Person Details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE assessments ADD COLUMN contact_person text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'contact_position'
  ) THEN
    ALTER TABLE assessments ADD COLUMN contact_position text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE assessments ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE assessments ADD COLUMN contact_phone text;
  END IF;

  -- Business Information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'business_description'
  ) THEN
    ALTER TABLE assessments ADD COLUMN business_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'number_of_employees'
  ) THEN
    ALTER TABLE assessments ADD COLUMN number_of_employees text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'annual_turnover'
  ) THEN
    ALTER TABLE assessments ADD COLUMN annual_turnover text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'geographical_presence'
  ) THEN
    ALTER TABLE assessments ADD COLUMN geographical_presence text;
  END IF;

  -- Completion tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'introduction_completed'
  ) THEN
    ALTER TABLE assessments ADD COLUMN introduction_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create index for DNFBP category for faster filtering
CREATE INDEX IF NOT EXISTS idx_assessments_dnfbp_category ON assessments(dnfbp_category);