/*
  # Add Missing Module Score Columns

  ## Overview
  This migration adds the missing module score columns to the assessments table.
  These columns are required for the FATF-aligned risk scoring system.

  ## Changes
  1. Add module score columns:
    - `overall_risk_score` (numeric) - Overall weighted risk score (1-5 scale)
    - `module_1_score` (numeric) - Module 1 (Inherent Risk) score
    - `module_2_score` (numeric) - Module 2 (Technical Compliance) score  
    - `module_3_score` (numeric) - Module 3 (Effectiveness) score

  ## Notes
  - Uses IF NOT EXISTS checks to avoid errors if columns already exist
  - These columns support the FATF 1-5 risk scoring methodology
*/

-- Add module score columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'overall_risk_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN overall_risk_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'module_1_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN module_1_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'module_2_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN module_2_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'module_3_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN module_3_score numeric;
  END IF;
END $$;
