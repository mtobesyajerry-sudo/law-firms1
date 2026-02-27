/*
  # Fix Remaining Admin INSERT Policies

  1. Problem
    - INSERT policies for assessments and organizations still query user_profiles
    - This can cause recursion issues
    - Need to update to use is_admin_direct() function

  2. Solution
    - Update INSERT policies to use is_admin_direct(auth.uid())
    - Ensures consistency across all admin policies

  3. Tables Updated
    - assessments (INSERT)
    - organizations (INSERT)
*/

-- assessments INSERT policy
DROP POLICY IF EXISTS "Admins can create any assessment" ON assessments;
CREATE POLICY "Admins can create any assessment"
  ON assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_direct(auth.uid()));

-- organizations INSERT policy
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
CREATE POLICY "Admins can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_direct(auth.uid()));
