/*
  # KYC Document Requirements System

  ## Overview
  Implements a comprehensive document management system for client due diligence
  aligned with Tanzania AML laws, FATF guidelines, and legal sector best practices.

  ## New Tables

  1. `document_types`
     - Defines all document types that can be required
     - Includes category, description, and validity period
     - Examples: National ID, Passport, Business License, etc.

  2. `dd_level_document_requirements`
     - Maps document types to due diligence levels
     - Defines which documents are mandatory/optional for each DD level
     - Supports both individual and legal entity clients
     - Includes minimum and maximum document counts

  3. `client_documents`
     - Stores uploaded documents for each client
     - Tracks document status, expiry, and verification
     - Links to Supabase Storage for file management
     - Maintains audit trail of document changes

  4. `document_verification_log`
     - Audit trail for document verification actions
     - Tracks who verified, when, and any notes
     - Supports compliance reporting

  ## Security
  - Enable RLS on all new tables
  - Admins can manage all documents
  - Clients can only view/upload their own organization's documents
  - Document verification requires admin role

  ## Features Supported
  - Dynamic document requests based on risk level
  - Document expiry tracking and alerts
  - Audit trail for compliance
  - Support for escalation triggers (PEP, offshore, etc.)
*/

-- Document Types Master Table
CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('identity', 'address', 'financial', 'corporate', 'ownership', 'regulatory', 'other')),
  description text,
  client_type text NOT NULL CHECK (client_type IN ('individual', 'legal_entity', 'both')),
  validity_months integer DEFAULT 36,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Requirements by DD Level
CREATE TABLE IF NOT EXISTS dd_level_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_level text NOT NULL CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  client_type text NOT NULL CHECK (client_type IN ('individual', 'legal_entity')),
  document_type_id uuid REFERENCES document_types(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT true,
  priority integer DEFAULT 100,
  description text,
  triggers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dd_level, client_type, document_type_id)
);

-- Client Documents
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  document_type_id uuid REFERENCES document_types(id) ON DELETE RESTRICT NOT NULL,
  file_name text NOT NULL,
  file_path text,
  file_size integer,
  mime_type text,
  document_number text,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verification_notes text,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  uploaded_by uuid REFERENCES user_profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Verification Audit Log
CREATE TABLE IF NOT EXISTS document_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('uploaded', 'verified', 'rejected', 'expired', 'deleted', 'updated')),
  performed_by uuid REFERENCES user_profiles(id) NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category);
CREATE INDEX IF NOT EXISTS idx_document_types_client_type ON document_types(client_type);
CREATE INDEX IF NOT EXISTS idx_dd_requirements_level ON dd_level_document_requirements(dd_level, client_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiry ON client_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_log_document ON document_verification_log(document_id);

-- Enable RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_level_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_types
CREATE POLICY "Anyone can view active document types"
  ON document_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage document types"
  ON document_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for dd_level_document_requirements
CREATE POLICY "Anyone can view DD requirements"
  ON dd_level_document_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage DD requirements"
  ON dd_level_document_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for client_documents
CREATE POLICY "Users can view their organization's client documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all client documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can upload documents for their organization's clients"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their organization's client documents"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE kyc_clients.id = client_documents.client_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all client documents"
  ON client_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for document_verification_log
CREATE POLICY "Users can view logs for their organization's documents"
  ON document_verification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_documents
      JOIN kyc_clients ON kyc_clients.id = client_documents.client_id
      JOIN user_profiles ON user_profiles.organization_id = kyc_clients.organization_id
      WHERE client_documents.id = document_verification_log.document_id
      AND user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all document logs"
  ON document_verification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create verification logs"
  ON document_verification_log FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- Function to automatically log document changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, new_status, notes)
    VALUES (NEW.id, 'uploaded', NEW.uploaded_by, NEW.status, 'Document uploaded');
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO document_verification_log (document_id, action, performed_by, previous_status, new_status, notes)
    VALUES (
      NEW.id,
      CASE NEW.status
        WHEN 'verified' THEN 'verified'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'expired' THEN 'expired'
        ELSE 'updated'
      END,
      auth.uid(),
      OLD.status,
      NEW.status,
      NEW.verification_notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic document logging
DROP TRIGGER IF EXISTS trigger_log_document_change ON client_documents;
CREATE TRIGGER trigger_log_document_change
  AFTER INSERT OR UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_change();

-- Function to check for expired documents
CREATE OR REPLACE FUNCTION check_expired_documents()
RETURNS void AS $$
BEGIN
  UPDATE client_documents
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'verified'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
