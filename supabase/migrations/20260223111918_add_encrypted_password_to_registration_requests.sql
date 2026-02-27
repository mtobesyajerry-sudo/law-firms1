/*
  # Add Encrypted Password Storage to Registration Requests

  1. Changes
    - Add `encrypted_password` column to store AES-encrypted passwords
    - Keep `password_hash` for backward compatibility (will be deprecated)
    - Passwords will be encrypted client-side before storage
    - After user creation, encrypted password is immediately cleared
  
  2. Security
    - Encrypted passwords are not readable without the encryption key
    - Reduces risk of password exposure in database breaches
    - Follows industry best practices for temporary password storage
*/

ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS encrypted_password TEXT;

COMMENT ON COLUMN registration_requests.encrypted_password IS 'AES-encrypted password for new registration, cleared after user creation';
