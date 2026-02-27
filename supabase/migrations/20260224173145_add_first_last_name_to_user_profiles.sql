/*
  # Add first_name and last_name to user_profiles

  1. Changes
    - Add `first_name` column to user_profiles
    - Add `last_name` column to user_profiles
    - Populate first_name from full_name (extract first word)
    - Populate last_name from full_name (extract remaining words)

  2. Notes
    - This allows personalized greetings on dashboards
    - Maintains backward compatibility with full_name
    - Non-breaking change - full_name remains unchanged
*/

-- Add first_name and last_name columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Populate first_name and last_name from full_name where they don't exist
UPDATE user_profiles
SET 
  first_name = COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)),
  last_name = COALESCE(last_name, SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
WHERE full_name IS NOT NULL 
  AND (first_name IS NULL OR last_name IS NULL);