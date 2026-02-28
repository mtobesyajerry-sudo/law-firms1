/*
  # Add Encrypted Password to Law Firm Registrations

  1. Problem
    - Law firm registration needs to store encrypted passwords for later account creation
    - Currently passwords are not stored during registration request
    - Admin needs the password to create the account upon approval

  2. Solution
    - Add encrypted_password column to law_firm_registrations table
    - Passwords will be encrypted client-side before submission
    - Admin can decrypt and use when creating approved accounts

  3. Security
    - Passwords are encrypted using AES encryption
    - Only stored temporarily until account is created
    - Cleared after successful account creation
*/

-- Add encrypted_password column to law_firm_registrations
ALTER TABLE law_firm_registrations
ADD COLUMN IF NOT EXISTS encrypted_password text;

-- Add comment
COMMENT ON COLUMN law_firm_registrations.encrypted_password IS 'Encrypted password stored temporarily until account is approved and created by admin. Cleared after account creation.';
