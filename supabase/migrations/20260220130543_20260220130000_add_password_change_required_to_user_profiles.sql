/*
  # Add password_change_required Column to user_profiles

  1. Purpose
    - Add password_change_required column to user_profiles table
    - Required for first-time user login workflow
    - Forces new users to change their password on first login

  2. Changes
    - Add boolean column with default false
    - Existing users won't be forced to change password
    - New users created by admin will have this set to true

  3. Security
    - No RLS changes needed
    - Column is part of user_profiles table with existing policies
*/

-- Add password_change_required column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'password_change_required'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN password_change_required boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_profiles.password_change_required IS 'Forces user to change password on next login (used for admin-created accounts)';
