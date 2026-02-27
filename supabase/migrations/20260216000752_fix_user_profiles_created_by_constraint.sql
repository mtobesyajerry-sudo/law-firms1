/*
  # Fix user_profiles.created_by Constraint for User Deletion

  ## Issue
  Cannot delete users because the created_by column has NO ACTION constraint.
  If User A created User B, attempting to delete User A fails because User B 
  still references User A in the created_by field.

  ## Solution
  Update the created_by foreign key constraint to SET NULL on delete.
  This preserves the audit trail while allowing user deletion.

  ## Changes
  - Drop and recreate user_profiles.created_by constraint with SET NULL
*/

-- Drop the existing constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_created_by_fkey;

-- Recreate with SET NULL on delete
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth.users(id) 
    ON DELETE SET NULL;
