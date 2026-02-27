/*
  # Remove Duplicate/Old RLS Policies

  ## Problem
  After creating new RLS policies with helper functions, some old policies
  with direct user_profiles queries still exist, creating confusion and
  potential conflicts.

  ## Solution
  Remove all old policies that directly query user_profiles and keep only
  the new policies using helper functions.

  ## Changes
  Drop old/duplicate policies from:
  - aml_cases
  - kyc_clients
  - screening_results
  - transactions
  - correspondent_banks
*/

-- Remove old aml_cases policies
DROP POLICY IF EXISTS "Users can view own organization cases" ON aml_cases;
DROP POLICY IF EXISTS "Users can insert own organization cases" ON aml_cases;
DROP POLICY IF EXISTS "Users can update own organization cases" ON aml_cases;

-- Remove old kyc_clients policies
DROP POLICY IF EXISTS "Users can view clients in their organization" ON kyc_clients;
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON kyc_clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON kyc_clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON kyc_clients;

-- Remove old screening_results policies
DROP POLICY IF EXISTS "Users can view own organization screening results" ON screening_results;
DROP POLICY IF EXISTS "Users view own org screening" ON screening_results;
DROP POLICY IF EXISTS "Users can insert own organization screening results" ON screening_results;
DROP POLICY IF EXISTS "Users can update own organization screening results" ON screening_results;

-- Remove old transactions policies
DROP POLICY IF EXISTS "Users can view own organization transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own organization transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own organization transactions" ON transactions;

-- Remove old correspondent_banks policies
DROP POLICY IF EXISTS "Users can view own organization correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Users can insert own organization correspondent banks" ON correspondent_banks;
DROP POLICY IF EXISTS "Users can update own organization correspondent banks" ON correspondent_banks;

-- Remove old assessments policy if it exists
DROP POLICY IF EXISTS "Clients can view own assessments" ON assessments;