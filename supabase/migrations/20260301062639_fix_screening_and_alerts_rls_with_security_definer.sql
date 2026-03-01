/*
  # Fix Screening Results and Transaction Alerts RLS
  
  Replaces RLS subqueries with security definer helper functions to avoid recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own organization screening results" ON screening_results;
DROP POLICY IF EXISTS "Users can create screening results" ON screening_results;
DROP POLICY IF EXISTS "Users can update screening results" ON screening_results;
DROP POLICY IF EXISTS "Management: Read-only screening results" ON screening_results;
DROP POLICY IF EXISTS "Compliance: Full access to screening results" ON screening_results;

DROP POLICY IF EXISTS "Users view own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users insert own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users update own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Users delete own org alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Management: Read-only transaction alerts" ON transaction_alerts;
DROP POLICY IF EXISTS "Compliance: Full access to transaction alerts" ON transaction_alerts;

-- Create helper function for screening results
CREATE OR REPLACE FUNCTION public.user_can_view_screening_results(org_id UUID)
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

CREATE OR REPLACE FUNCTION public.user_can_modify_screening_results(org_id UUID)
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
    AND role IN ('staff', 'admin', 'compliance_officer', 'mlro')
  );
END;
$$;

-- Create helper function for transaction alerts
CREATE OR REPLACE FUNCTION public.user_can_view_alerts(org_id UUID)
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

CREATE OR REPLACE FUNCTION public.user_can_modify_alerts(org_id UUID)
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
    AND role IN ('staff', 'admin', 'compliance_officer', 'mlro')
  );
END;
$$;

-- Recreate screening_results policies
CREATE POLICY "Users can view screening results"
  ON screening_results FOR SELECT
  TO authenticated
  USING (user_can_view_screening_results(organization_id));

CREATE POLICY "Users can insert screening results"
  ON screening_results FOR INSERT
  TO authenticated
  WITH CHECK (user_can_modify_screening_results(organization_id));

CREATE POLICY "Users can update screening results"
  ON screening_results FOR UPDATE
  TO authenticated
  USING (user_can_modify_screening_results(organization_id));

CREATE POLICY "Users can delete screening results"
  ON screening_results FOR DELETE
  TO authenticated
  USING (user_can_modify_screening_results(organization_id));

-- Recreate transaction_alerts policies
CREATE POLICY "Users can view transaction alerts"
  ON transaction_alerts FOR SELECT
  TO authenticated
  USING (user_can_view_alerts(organization_id));

CREATE POLICY "Users can insert transaction alerts"
  ON transaction_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_can_modify_alerts(organization_id));

CREATE POLICY "Users can update transaction alerts"
  ON transaction_alerts FOR UPDATE
  TO authenticated
  USING (user_can_modify_alerts(organization_id));

CREATE POLICY "Users can delete transaction alerts"
  ON transaction_alerts FOR DELETE
  TO authenticated
  USING (user_can_modify_alerts(organization_id));
