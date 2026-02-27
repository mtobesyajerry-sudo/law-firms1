/*
  # Fix user_profiles created_by foreign key for user deletion

  1. Changes
    - Drop existing created_by foreign key constraint with NO ACTION
    - Add new created_by foreign key with ON DELETE SET NULL
    - This allows users to be deleted even if they created other user profiles
    
  2. Security
    - Maintains referential integrity while allowing proper user cleanup
    - Set to NULL when creator is deleted (audit trail preserved in other tables)
*/

-- Drop the existing constraint
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_created_by_fkey;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;
