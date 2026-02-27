/*
  # Add Management User Visibility Policies

  1. Security Requirement
    - Management, senior partners, partners, and compliance officers MUST be able to see all users in their organization
    - This is CRITICAL for security, accountability, and compliance monitoring
    - Early clients with management access also need visibility

  2. New Policies
    - Allow management roles to SELECT all user_profiles in their organization
    - Allow compliance officers to SELECT all user_profiles in their organization (for compliance monitoring)
    - Allow early clients to SELECT all user_profiles in their organization

  3. Security
    - Policies are PERMISSIVE and use role-based checks
    - Users can only see users in their own organization
    - Admins already have global visibility through existing policy
*/

-- Drop policies if they exist, then recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Management can view all users in organization" ON user_profiles;
  DROP POLICY IF EXISTS "Compliance officers can view all users in organization" ON user_profiles;
  DROP POLICY IF EXISTS "Early clients can view all users in organization" ON user_profiles;
END $$;

-- Policy for management, senior partners, and partners to view all users in their organization
CREATE POLICY "Management can view all users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles manager
      WHERE manager.id = auth.uid()
        AND manager.organization_id = user_profiles.organization_id
        AND manager.role IN ('management', 'senior_partner', 'partner')
    )
  );

-- Policy for compliance officers to view all users in their organization (needed for compliance monitoring)
CREATE POLICY "Compliance officers can view all users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles compliance
      WHERE compliance.id = auth.uid()
        AND compliance.organization_id = user_profiles.organization_id
        AND compliance.role = 'compliance_officer'
    )
  );

-- Policy for early clients with management access to view all users in their organization
CREATE POLICY "Early clients can view all users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles early_client
      WHERE early_client.id = auth.uid()
        AND early_client.organization_id = user_profiles.organization_id
        AND is_early_client(auth.uid())
    )
  );
