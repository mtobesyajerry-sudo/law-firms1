/*
  # Fix Organizations RLS for Staff Users

  This migration fixes the "Database error querying schema" issue that occurs when
  staff users (like Sarah John) try to log in.
  
  The problem was that the organizations table RLS policy used a subquery that could
  cause recursion issues. We replace it with a SECURITY DEFINER helper function.
  
  Changes:
  - Drop the old "Users can view their own organization" policy
  - Create a new policy using the get_user_organization_id() helper function
*/

-- Drop the old policy with the subquery
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Create a new policy using the helper function
CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());
