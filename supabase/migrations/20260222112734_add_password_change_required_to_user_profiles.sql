/*
  # Add password_change_required column to user_profiles

  1. Changes
    - Add `password_change_required` boolean column to track if user needs to change password
    - Default to false for existing users
    
  2. Security
    - Allows forcing password changes for new users or security purposes
*/

-- Add password_change_required column to user_profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'password_change_required'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_change_required BOOLEAN DEFAULT false;
  END IF;
END $$;
