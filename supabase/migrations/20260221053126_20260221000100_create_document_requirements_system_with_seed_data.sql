/*
  # Document Requirements System for KYC/CDD

  ## Overview
  Creates a comprehensive document management system for client due diligence
  aligned with Tanzania AML laws and FATF guidelines.

  ## New Tables

  1. **document_types**
     - Master table defining all document types
     - Categories: identity, address, financial, corporate, ownership, regulatory
     - Includes validity periods and client type applicability

  2. **dd_level_document_requirements**
     - Maps documents to DD levels (simplified, standard, enhanced)
     - Defines mandatory/optional status per client type
     - Priority ordering for checklist display

  3. **client_documents**
     - Stores uploaded documents for each client
     - Tracks verification status, expiry dates
     - Audit trail maintained automatically

  4. **document_verification_log**
     - Audit log for all document actions
     - Tracks uploads, verifications, rejections

  ## Document Requirements by DD Level
  - **Simplified DD**: 2-3 docs (individuals), 3-4 docs (entities)
  - **Standard DD**: 5-7 docs (individuals), 7-10 docs (entities)  
  - **Enhanced DD**: 10+ docs (individuals), 12-20 docs (entities)

  ## Security
  - RLS enabled on all tables
  - Admins can manage everything
  - Users can only access their organization's documents
  - Automatic audit logging via triggers
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

-- Indexes
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

-- Function to log document changes
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

-- Seed Document Types
INSERT INTO document_types (code, name, category, description, client_type, validity_months) VALUES
  ('national_id', 'National ID (NIDA)', 'identity', 'Tanzania National Identification Card', 'individual', 60),
  ('passport', 'Passport', 'identity', 'Valid passport', 'individual', 120),
  ('driving_licence', 'Driving Licence', 'identity', 'Valid driving licence', 'individual', 60),
  ('voter_card', 'Voter Registration Card', 'identity', 'Voter registration card', 'individual', 60),
  ('utility_bill', 'Utility Bill', 'address', 'Recent utility bill (max 3 months old)', 'both', 3),
  ('tenancy_agreement', 'Tenancy Agreement', 'address', 'Rental/lease agreement', 'both', 24),
  ('bank_statement', 'Bank Statement', 'address', 'Bank statement showing address (max 3 months old)', 'both', 3),
  ('tin_certificate', 'TIN Certificate', 'address', 'Tax identification certificate', 'both', 0),
  ('employment_letter', 'Employment Letter', 'financial', 'Letter from employer', 'individual', 12),
  ('payslip', 'Payslips/Employment Confirmation', 'financial', 'Recent salary payslips or employment confirmation', 'individual', 3),
  ('bank_reference', 'Bank Reference Letter', 'financial', 'Bank reference letter', 'both', 12),
  ('sof_declaration', 'Source of Funds Declaration', 'financial', 'Declaration of source of funds. Printable template available in SOF/SOW Templates tab', 'both', 12),
  ('tax_return', 'Tax Return', 'financial', 'Personal tax return', 'individual', 12),
  ('asset_declaration', 'Asset Declaration', 'financial', 'Declaration of assets', 'individual', 12),
  ('investment_portfolio', 'Investment Portfolio', 'financial', 'Investment holdings', 'individual', 6),
  ('bank_statements_12m', 'Bank Statements (12 months)', 'financial', 'Twelve months of statements', 'both', 12),
  ('transaction_history', 'Transaction History', 'financial', 'Transaction records', 'both', 6),
  ('pep_declaration', 'PEP Declaration', 'regulatory', 'Political exposure declaration', 'individual', 12),
  ('client_declaration', 'Client Declaration Form', 'other', 'Purpose and source declaration', 'both', 12),
  ('source_of_wealth', 'Source of Wealth Documentation', 'financial', 'SOW evidence', 'both', 12),
  ('cert_incorporation', 'Certificate of Incorporation', 'corporate', 'Registration certificate', 'legal_entity', 0),
  ('business_licence', 'Business Licence', 'regulatory', 'Operating licence', 'legal_entity', 12),
  ('tin_certificate_entity', 'TIN Certificate', 'regulatory', 'Tax ID certificate', 'legal_entity', 0),
  ('directors_list', 'List of Directors', 'ownership', 'Company directors', 'legal_entity', 12),
  ('memorandum_articles', 'Memorandum & Articles', 'corporate', 'Constitutional documents', 'legal_entity', 0),
  ('board_resolution', 'Board Resolution', 'corporate', 'Authorization resolution', 'legal_entity', 24),
  ('shareholder_register', 'Shareholder Register', 'ownership', 'Shareholder list', 'legal_entity', 12),
  ('bo_declaration', 'Beneficial Ownership Declaration', 'ownership', 'BO declaration', 'legal_entity', 12),
  ('bo_ids', 'Beneficial Owner IDs', 'ownership', 'BO identification', 'legal_entity', 60),
  ('bo_address_proof', 'Beneficial Owner Address Proof', 'ownership', 'BO address', 'legal_entity', 12),
  ('financial_statements', 'Financial Statements', 'financial', 'Audited financials', 'legal_entity', 12),
  ('business_profile', 'Business Profile', 'corporate', 'Business description', 'legal_entity', 12),
  ('group_structure', 'Group Structure Chart', 'ownership', 'Group structure', 'legal_entity', 12),
  ('ownership_diagram', 'Ownership Diagram', 'ownership', 'Ownership chart', 'legal_entity', 12),
  ('source_of_capital', 'Source of Capital', 'financial', 'Capital source evidence', 'legal_entity', 0),
  ('pep_screening', 'PEP Screening Report', 'regulatory', 'PEP screening', 'legal_entity', 12),
  ('tax_compliance_cert', 'Tax Compliance Certificate', 'regulatory', 'Tax clearance', 'legal_entity', 12)
ON CONFLICT (code) DO NOTHING;

-- Simplified DD - Individual  
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'national_id'), true, 1, 'Primary ID'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'utility_bill'), true, 2, 'Address proof'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'client_declaration'), true, 3, 'Declaration')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Enhanced DD - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'passport'), true, 1, 'Primary ID'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'national_id'), true, 2, 'Secondary ID'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'utility_bill'), true, 3, 'Address'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'asset_declaration'), true, 4, 'Assets'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'investment_portfolio'), true, 5, 'Investments'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'bank_statements_12m'), true, 6, 'Bank statements'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'transaction_history'), true, 7, 'Transactions'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'sof_declaration'), true, 8, 'SOF'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'source_of_wealth'), true, 9, 'SOW'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'pep_declaration'), true, 10, 'PEP')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Standard DD - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Registration'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_licence'), true, 2, 'Licence'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'memorandum_articles'), true, 3, 'Articles'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'board_resolution'), true, 4, 'Resolution'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'shareholder_register'), true, 5, 'Shareholders'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_declaration'), true, 6, 'BO declaration'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_ids'), true, 7, 'BO IDs'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'directors_list'), true, 8, 'Directors'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'financial_statements'), true, 9, 'Financials'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_profile'), true, 10, 'Business profile')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Simplified DD - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Registration'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_licence'), true, 2, 'Licence'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'tin_certificate_entity'), true, 3, 'TIN'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'directors_list'), true, 4, 'Directors')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Enhanced DD - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Registration'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'group_structure'), true, 2, 'Group structure'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'ownership_diagram'), true, 3, 'Ownership'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_declaration'), true, 4, 'BO declaration'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_ids'), true, 5, 'BO IDs'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_address_proof'), true, 6, 'BO address'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'shareholder_register'), true, 7, 'Shareholders'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'financial_statements'), true, 8, 'Financials'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bank_reference'), true, 9, 'Bank reference'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'source_of_capital'), true, 10, 'Capital source'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'board_resolution'), true, 11, 'Resolution'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'pep_screening'), true, 12, 'PEP screening'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'tax_compliance_cert'), true, 13, 'Tax compliance')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;
