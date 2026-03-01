/*
  # Fix Transactions RLS with Security Definer Functions
  
  Replaces RLS subqueries with security definer helper functions to avoid recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own organization transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can update transactions" ON transactions;

-- Create helper function to check if user can view transactions
CREATE OR REPLACE FUNCTION public.user_can_view_transactions(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
  );
END;
$$;

-- Create helper function to check if user can modify transactions
CREATE OR REPLACE FUNCTION public.user_can_modify_transactions(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND role IN ('staff', 'admin')
  );
END;
$$;

-- Recreate policies using helper functions
CREATE POLICY "Users can view own organization transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_can_view_transactions(organization_id));

CREATE POLICY "Staff can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_can_modify_transactions(organization_id));

CREATE POLICY "Staff can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_can_modify_transactions(organization_id));
