/*
  # Fix Client-Matter Relationships RLS for All Roles

  ## Issue
  The INSERT policy on `client_matter_relationships` only allowed roles:
  - lawyer, mlro, senior_partner, admin
  
  This excluded:
  - staff
  - management
  - compliance_officer
  
  This caused silent failures when staff/management users tried to create matters with clients.

  ## Changes
  1. Update INSERT policy to allow all authenticated users in the same organization
  2. Keep the organization check to ensure data isolation
  3. Add missing roles: staff, management, compliance_officer

  ## Security
  - Users can only create relationships for matters in their organization
  - Organization boundary is enforced via get_user_org() function
  - RLS ensures data isolation between organizations
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authorized users can create relationships" ON client_matter_relationships;

-- Create new policy that allows all authenticated users in the organization
CREATE POLICY "Users can create relationships in their organization"
  ON client_matter_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM matters m
      WHERE m.id = client_matter_relationships.matter_id
        AND m.organization_id = get_user_org()
    )
  );
