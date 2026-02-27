/*
  # Add password_hash column to registration_requests

  1. Changes
    - Add `password_hash` column to store encrypted passwords for pending registrations
    
  2. Security
    - Passwords should be hashed before storing
    - Column is optional to maintain backward compatibility
*/

-- Add password_hash column to registration_requests table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'registration_requests' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE registration_requests ADD COLUMN password_hash TEXT;
  END IF;
END $$;
