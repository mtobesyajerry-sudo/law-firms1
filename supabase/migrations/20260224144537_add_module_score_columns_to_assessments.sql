/*
  # Add Module Score Columns to Assessments Table
  
  1. Changes
    - Add module_1_score (numeric) - Module 1: Inherent Risk score on 1-5 scale
    - Add module_2_score (numeric) - Module 2: Technical Compliance score on 1-5 scale
    - Add module_3_score (numeric) - Module 3: Effectiveness score on 1-5 scale
    - Add module_4_score (numeric) - Module 4: Maturity score on 1-5 scale
    
  2. Purpose
    - These columns store aggregated scores for each assessment module
    - Used by the Integrated Risk Intelligence view to display institutional context
    - Scores are on a 1-5 FATF-aligned scale
*/

-- Add module score columns if they don't exist
DO $$ 
BEGIN
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
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'module_4_score'
  ) THEN
    ALTER TABLE assessments ADD COLUMN module_4_score numeric;
  END IF;
END $$;

-- Now populate the scores from section_scores table
UPDATE assessments a
SET 
  module_1_score = (
    SELECT AVG(risk_score)
    FROM section_scores ss
    WHERE ss.assessment_id = a.id
    AND ss.section_code LIKE '1.%'
  ),
  module_2_score = (
    SELECT AVG(risk_score)
    FROM section_scores ss
    WHERE ss.assessment_id = a.id
    AND ss.section_code LIKE '2.%'
  ),
  module_3_score = (
    SELECT AVG(risk_score)
    FROM section_scores ss
    WHERE ss.assessment_id = a.id
    AND ss.section_code LIKE '3.%'
  ),
  module_4_score = (
    SELECT AVG(risk_score)
    FROM section_scores ss
    WHERE ss.assessment_id = a.id
    AND ss.section_code LIKE '4.%'
  )
WHERE a.status = 'completed';
