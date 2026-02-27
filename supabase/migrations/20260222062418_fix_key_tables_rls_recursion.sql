/*
  # Fix RLS Recursion for Key Tables

  ## Problem
  Key tables have RLS policies that query user_profiles directly, causing
  recursion issues. This prevents users from seeing their organization's data.

  ## Solution
  Update RLS policies to use SECURITY DEFINER helper functions instead of
  direct user_profiles queries.

  ## Tables Fixed
  - kyc_clients
  - assessments  
  - aml_cases
  - screening_results
  - transactions
  - correspondent_banks
*/

-- ============================================================================
-- KYC CLIENTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can insert own org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admins can insert all clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can update own org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admins can update all clients" ON kyc_clients;
DROP POLICY IF EXISTS "Users can delete own org clients" ON kyc_clients;
DROP POLICY IF EXISTS "Admins can delete all clients" ON kyc_clients;

CREATE POLICY "Admins can view all clients" ON kyc_clients FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org clients" ON kyc_clients FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all clients" ON kyc_clients FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org clients" ON kyc_clients FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all clients" ON kyc_clients FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org clients" ON kyc_clients FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete all clients" ON kyc_clients FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Users can delete own org clients" ON kyc_clients FOR DELETE TO authenticated USING (organization_id = get_user_organization_id());

-- ============================================================================
-- ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can view all assessments" ON assessments;
DROP POLICY IF EXISTS "Users can insert own org assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can insert all assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update own org assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can update all assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete own org assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can delete all assessments" ON assessments;

CREATE POLICY "Admins can view all assessments" ON assessments FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org assessments" ON assessments FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all assessments" ON assessments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org assessments" ON assessments FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all assessments" ON assessments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org assessments" ON assessments FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete all assessments" ON assessments FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Users can delete own org assessments" ON assessments FOR DELETE TO authenticated USING (organization_id = get_user_organization_id());

-- ============================================================================
-- AML CASES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org cases" ON aml_cases;
DROP POLICY IF EXISTS "Admins can view all cases" ON aml_cases;
DROP POLICY IF EXISTS "Users can insert own org cases" ON aml_cases;
DROP POLICY IF EXISTS "Admins can insert all cases" ON aml_cases;
DROP POLICY IF EXISTS "Users can update own org cases" ON aml_cases;
DROP POLICY IF EXISTS "Admins can update all cases" ON aml_cases;

CREATE POLICY "Admins can view all cases" ON aml_cases FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org cases" ON aml_cases FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all cases" ON aml_cases FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org cases" ON aml_cases FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all cases" ON aml_cases FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org cases" ON aml_cases FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================================
-- SCREENING RESULTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org screening results" ON screening_results;
DROP POLICY IF EXISTS "Admins can view all screening results" ON screening_results;
DROP POLICY IF EXISTS "Users can insert own org screening results" ON screening_results;
DROP POLICY IF EXISTS "Admins can insert all screening results" ON screening_results;
DROP POLICY IF EXISTS "Users can update own org screening results" ON screening_results;
DROP POLICY IF EXISTS "Admins can update all screening results" ON screening_results;

CREATE POLICY "Admins can view all screening results" ON screening_results FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org screening results" ON screening_results FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all screening results" ON screening_results FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org screening results" ON screening_results FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all screening results" ON screening_results FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org screening results" ON screening_results FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own org transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own org transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org transactions" ON transactions FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all transactions" ON transactions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org transactions" ON transactions FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================================
-- CORRESPONDENT BANKS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own org correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Admins can view all correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Users can insert own org correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Admins can insert all correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Users can update own org correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Admins can update all correspondent banks" ON correspondent_banks;

CREATE POLICY "Admins can view all correspondent banks" ON correspondent_banks FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view own org correspondent banks" ON correspondent_banks FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert all correspondent banks" ON correspondent_banks FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users can insert own org correspondent banks" ON correspondent_banks FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Admins can update all correspondent banks" ON correspondent_banks FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can update own org correspondent banks" ON correspondent_banks FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());