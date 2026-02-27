/*
  # Add Encrypted Password Storage to New User Requests

  1. Changes
    - Add `encrypted_temporary_password` column to store AES-encrypted passwords
    - Keep `temporary_password` for backward compatibility (will be deprecated)
    - Passwords will be encrypted client-side before storage
    - After user creation, encrypted password is immediately cleared
  
  2. Security
    - Encrypted passwords are not readable without the encryption key
    - Reduces risk of password exposure in database breaches
    - Follows industry best practices for temporary password storage
*/

ALTER TABLE new_user_requests 
ADD COLUMN IF NOT EXISTS encrypted_temporary_password TEXT;

COMMENT ON COLUMN new_user_requests.encrypted_temporary_password IS 'AES-encrypted temporary password set by management, cleared after user creation';
