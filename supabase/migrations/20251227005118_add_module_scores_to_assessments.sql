/*
  # Add Module Scores to Assessments Table

  1. Changes
    - Add `overall_risk_score` (numeric) - Overall weighted risk score (1-3 scale)
    - Add `module_1_score` (numeric) - Module 1 (Inherent Risk) score with 45% weight
    - Add `module_2_score` (numeric) - Module 2 (Technical Compliance) score with 30% weight
    - Add `module_3_score` (numeric) - Module 3 (Effectiveness) score with 25% weight

  2. Notes
    - New DNFBP-specific scoring system: 1 (Low/Compliant/Effective), 2 (Moderate/Partial), 3 (High/Non-Compliant/Ineffective)
    - Module weights: 45% Inherent Risk, 30% Technical Compliance, 25% Effectiveness
    - Module 1 has internal subsection weights: 25% Business Model, 25% Cash/Payment, 20% Customer/Transaction, 20% Geographic, 10% Supervisory
*/

-- Add score fields to assessments table
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
