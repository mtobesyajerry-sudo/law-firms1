/*
  # Fix KYC Clients Insert Policy for All Authorized Roles

  1. Changes
    - Update INSERT policy on kyc_clients table to include all authorized roles
    - Allow management, staff, and compliance_officer roles to create clients
    - Maintain organization-level access control

  2. Security
    - Users can only create clients in their own organization
    - Role-based access control maintained
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authorized users can create clients" ON kyc_clients;

-- Create updated insert policy with all authorized roles
CREATE POLICY "Authorized users can create clients"
  ON kyc_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['lawyer', 'mlro', 'senior_partner', 'admin', 'management', 'staff', 'compliance_officer'])
    AND organization_id = get_user_org()
  );
