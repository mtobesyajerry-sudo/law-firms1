/*
  # Add Password Change Required Field

  1. Changes
    - Add `password_change_required` boolean field to `user_profiles` table
      - Defaults to false for existing users
      - Will be set to true when admin creates new users
    
  2. Purpose
    - Track whether a user needs to change their password on first login
    - Enhance security by forcing password changes for admin-created accounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password_change_required'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_change_required boolean DEFAULT false NOT NULL;
  END IF;
END $$;