/*
  # Add Overall Risk Score Column to Assessments

  1. Changes
    - Add overall_risk_score column to assessments table
    - Stores the numerical risk score (0-100 scale)

  2. Notes
    - Complements overall_risk_rating (text: LOW, MODERATE, HIGH, VERY HIGH)
    - Allows for more granular risk analysis
*/

-- Add overall_risk_score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' 
    AND column_name = 'overall_risk_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN overall_risk_score DECIMAL(5,2) DEFAULT 0;
    COMMENT ON COLUMN assessments.overall_risk_score IS 'Numerical overall risk score (0-100 scale)';
  END IF;
END $$;
