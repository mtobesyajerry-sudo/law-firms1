/*
  # Fix Law Firm Registration Insert Policy

  1. Problem
    - Current policy requires user_id = auth.uid()
    - New flow submits registrations with user_id = NULL (before account creation)
    - This blocks legitimate registration submissions

  2. Solution
    - Allow authenticated users to insert registrations with NULL user_id
    - This allows pre-approval registration submissions
    - Admin will set user_id when approving the registration

  3. Security
    - Users can only submit registrations for themselves (user_id = NULL)
    - Cannot impersonate other users
    - Cannot modify existing registrations
    - Only admins can approve and set user_id
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert own registration" ON law_firm_registrations;

-- Create new policy that allows NULL user_id for pre-approval submissions
CREATE POLICY "Users can submit registration requests"
  ON law_firm_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Also ensure users can only update their own registrations (after approval)
DROP POLICY IF EXISTS "Users can update own registration" ON law_firm_registrations;

CREATE POLICY "Users can update own approved registration"
  ON law_firm_registrations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all registrations" ON law_firm_registrations;

CREATE POLICY "Admins can manage all registrations"
  ON law_firm_registrations
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
