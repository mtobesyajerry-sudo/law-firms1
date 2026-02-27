/*
  # Add Law Firm Roles to User Profiles

  1. Changes
    - Drop the old conflicting role check constraints
    - Add new comprehensive role constraint supporting all law firm roles
    - Keep backward compatibility with existing 'admin' and 'client' roles

  2. Security
    - Maintains existing RLS policies
    - No data loss
*/

-- Drop conflicting constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add comprehensive role constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'client', 'lawyer', 'compliance_officer', 'mlro', 'senior_partner'));
