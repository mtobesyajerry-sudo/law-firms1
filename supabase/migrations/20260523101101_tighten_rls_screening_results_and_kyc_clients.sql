/*
  # Tighten RLS: screening_results UPDATE and kyc_clients SELECT/INSERT

  ## Changes

  ### 1. screening_results — Fix UPDATE missing WITH CHECK
  The existing UPDATE policy had USING but no WITH CHECK, meaning a user could
  change the organization_id column during an update to any value without
  the policy re-validating ownership. The new policy adds an identical WITH CHECK
  so both the row being read AND the row being written must belong to the caller's org.

  ### 2. kyc_clients — Restrict SELECT and INSERT to approved roles only
  The previous "KYC clients organization access" SELECT and INSERT policies allowed
  ANY role in the org to read/insert KYC clients (e.g. a future 'client' self-service
  role). The new policies restrict access to the explicit set of professional roles
  that legitimately need KYC data: admin, management, senior_partner, partner,
  staff, lawyer, compliance_officer, mlro.

  Both policies also enforce is_active = true so suspended accounts lose access.

  ## Security impact
  - Any role not in the approved list (e.g. 'client', 'guest', unknown future roles)
    receives zero rows on SELECT and an error on INSERT, regardless of org membership.
  - The org isolation guarantee is unchanged — users still cannot cross org boundaries.
*/

-- ============================================================
-- Fix 1: screening_results UPDATE — add WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "Users can update screening results" ON screening_results;

CREATE POLICY "Users can update screening results"
  ON screening_results
  FOR UPDATE
  TO authenticated
  USING (user_can_modify_screening_results(organization_id))
  WITH CHECK (user_can_modify_screening_results(organization_id));

-- ============================================================
-- Fix 2: kyc_clients — role-restricted SELECT
-- ============================================================
DROP POLICY IF EXISTS "KYC clients organization access" ON kyc_clients;

CREATE POLICY "KYC clients organization access"
  ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = kyc_clients.organization_id
        AND user_profiles.role IN (
          'admin', 'management', 'senior_partner', 'partner',
          'staff', 'lawyer', 'compliance_officer', 'mlro'
        )
        AND user_profiles.is_active = true
    )
  );

-- ============================================================
-- Fix 2: kyc_clients — role-restricted INSERT
-- ============================================================
DROP POLICY IF EXISTS "KYC clients organization insert" ON kyc_clients;

CREATE POLICY "KYC clients organization insert"
  ON kyc_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = kyc_clients.organization_id
        AND user_profiles.role IN (
          'admin', 'management', 'senior_partner', 'partner',
          'staff', 'lawyer', 'compliance_officer', 'mlro'
        )
        AND user_profiles.is_active = true
    )
  );
