/*
  # Add detailed scoring fields to section_scores table

  1. Changes
    - Add `total_score` field to store actual score achieved
    - Add `max_score` field to store maximum possible score
    - Add `weight` field for section weight in overall calculation
    - Add `weighted_score` field for calculated weighted score
    - Rename `risk_level` to `risk_rating` for consistency
  
  2. Notes
    - These fields enable more detailed risk scoring presentation
    - Supports professional compliance report generation
*/

DO $$ 
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'total_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN total_score numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'max_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN max_score numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'weight'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN weight numeric DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'weighted_score'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN weighted_score numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'section_scores' AND column_name = 'risk_rating'
  ) THEN
    ALTER TABLE section_scores ADD COLUMN risk_rating text;
    
    UPDATE section_scores SET risk_rating = risk_level WHERE risk_level IS NOT NULL;
  END IF;
END $$;