/*
  # Add disclaimer acceptance tracking to assessments

  1. Changes
    - Add `disclaimer_accepted` column to assessments table to track whether user has accepted the disclaimer
    - Add `disclaimer_accepted_at` timestamp to record when disclaimer was accepted
    - Default value is false for disclaimer_accepted

  2. Purpose
    - Track user acknowledgment of system disclaimer before starting assessments
    - Maintain audit trail of when users accepted the disclaimer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'disclaimer_accepted'
  ) THEN
    ALTER TABLE assessments ADD COLUMN disclaimer_accepted boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'disclaimer_accepted_at'
  ) THEN
    ALTER TABLE assessments ADD COLUMN disclaimer_accepted_at timestamptz;
  END IF;
END $$;
