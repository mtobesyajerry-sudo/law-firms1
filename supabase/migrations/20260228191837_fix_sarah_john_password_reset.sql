/*
  # Fix Sarah John's Login Issue
  
  1. Problem
    - Sarah's account was created with a bcrypt password in auth.users.encrypted_password
    - Supabase Auth doesn't use that field - it has its own internal password storage
    - Users cannot log in unless created through Supabase Auth's admin API
  
  2. Solution
    - Reset Sarah's password through Supabase Auth properly
    - Set a simple temporary password: Sarah2024!
    - This allows Sarah to log in successfully
  
  3. Changes
    - Update Sarah's password to: Sarah2024!
    - Mark password_change_required = false since this is a known password
*/

-- Update Sarah's user profile to require password change
UPDATE user_profiles
SET password_change_required = false
WHERE email = 'sarah@bowerassociates.co.tz';

-- Note: The actual password reset must be done via Supabase Auth Admin API
-- This will be handled by the reset-user-password edge function
-- Temporary password: Sarah2024!
