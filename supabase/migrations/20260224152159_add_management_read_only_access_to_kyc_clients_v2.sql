/*
  # Add Management Read-Only Access to KYC Clients

  1. Grants Management users read-only access to:
     - kyc_clients table (SELECT only)
     - client_documents (SELECT only)
  
  2. Security
     - Management users can view all client data in their organization
     - Management users CANNOT insert, update, or delete
*/

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Management users can view all kyc_clients in organization" ON kyc_clients;
DROP POLICY IF EXISTS "Management users can view client_documents" ON client_documents;

-- Add read-only SELECT policy for kyc_clients
CREATE POLICY "Management users can view all kyc_clients in organization"
  ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND up.organization_id = kyc_clients.organization_id
    )
  );

-- Add read-only SELECT policy for client_documents
CREATE POLICY "Management users can view client_documents"
  ON client_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN kyc_clients kc ON kc.organization_id = up.organization_id
      WHERE up.id = auth.uid()
      AND up.role = 'management'
      AND kc.id = client_documents.client_id
    )
  );
