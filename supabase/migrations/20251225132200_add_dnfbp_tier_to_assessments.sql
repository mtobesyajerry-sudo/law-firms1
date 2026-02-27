/*
  # Add DNFBP Tier to Assessments

  1. Changes
    - Add `dnfbp_tier` column to `assessments` table
    - This tracks the tier level (1=Small, 2=Medium, 3=Large) used for the assessment
    - Tier determines how many questions the DNFBP needs to answer:
      * Tier 1 (Small): ~75 core questions
      * Tier 2 (Medium): ~120 questions (core + selected elaborations)
      * Tier 3 (Large): All 169 questions (comprehensive assessment)
    
  2. Notes
    - Tier is calculated based on employee count and turnover
    - Default to tier 2 (medium) if not specified
    - Tier is set when assessment is created and remains fixed for that assessment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'dnfbp_tier'
  ) THEN
    ALTER TABLE assessments ADD COLUMN dnfbp_tier integer DEFAULT 2 CHECK (dnfbp_tier >= 1 AND dnfbp_tier <= 3);
  END IF;
END $$;