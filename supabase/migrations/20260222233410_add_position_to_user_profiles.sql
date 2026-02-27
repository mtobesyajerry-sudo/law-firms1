/*
  # Add Position/Job Title to User Profiles

  1. Changes
    - Add `position` column to `user_profiles` table to store user's job title/position in organization
    - Default value is NULL (optional field)
    - Text field to allow flexible position names

  2. Security
    - No RLS changes needed (inherits existing user_profiles policies)
*/

-- Add position column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'position'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN position text;
  END IF;
END $$;
