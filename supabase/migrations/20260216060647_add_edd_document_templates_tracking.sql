/*
  # Add EDD Document Templates Tracking System

  ## Overview
  Creates a system to track Enhanced Due Diligence (EDD) document completion status
  for KYC clients, including templates for manual completion and printing.

  ## New Tables
  
  ### `edd_document_types`
  Defines the types of EDD documents required for Enhanced Due Diligence:
  - `id` (uuid, primary key)
  - `name` (text) - Document type name
  - `description` (text) - Description of the document
  - `required_for_risk_level` (text) - Which risk level requires this (High, all)
  - `template_available` (boolean) - Whether a printable template exists
  - `display_order` (integer) - Order for display
  - `created_at` (timestamptz)
  
  ### `edd_documents`
  Tracks completion status of EDD documents for each client:
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to kyc_clients)
  - `document_type_id` (uuid, foreign key to edd_document_types)
  - `status` (text) - pending, completed, reviewed, approved
  - `completed_date` (date) - When document was completed
  - `completed_by` (uuid, foreign key to user_profiles)
  - `reviewed_by` (uuid, foreign key to user_profiles)
  - `reviewed_date` (date)
  - `notes` (text) - Additional notes about the document
  - `file_reference` (text) - Physical file reference or storage location
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on both tables
  - Users can view documents for clients in their organization
  - Admins can view all documents
  - Only admins and compliance officers can approve documents
*/

-- Create EDD document types table
CREATE TABLE IF NOT EXISTS edd_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  required_for_risk_level text NOT NULL DEFAULT 'High',
  template_available boolean DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create EDD documents tracking table
CREATE TABLE IF NOT EXISTS edd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES edd_document_types(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed', 'approved')),
  completed_date date,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_date date,
  notes text,
  file_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, document_type_id)
);

-- Enable RLS
ALTER TABLE edd_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE edd_documents ENABLE ROW LEVEL SECURITY;

-- Policies for edd_document_types (all authenticated users can view)
CREATE POLICY "All authenticated users can view document types"
  ON edd_document_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage document types"
  ON edd_document_types FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

-- Policies for edd_documents
CREATE POLICY "Users can view EDD documents for their organization clients"
  ON edd_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = edd_documents.client_id
      AND kyc_clients.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create EDD documents for their organization clients"
  ON edd_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = edd_documents.client_id
      AND kyc_clients.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update EDD documents for their organization clients"
  ON edd_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = edd_documents.client_id
      AND kyc_clients.organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can delete any EDD document"
  ON edd_documents FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

-- Seed initial EDD document types
INSERT INTO edd_document_types (name, description, required_for_risk_level, display_order) VALUES
('PEP Declaration', 'Self-declaration form for Politically Exposed Persons status', 'High', 1),
('Enhanced DD Questionnaire', 'Detailed questionnaire for source of wealth and funds verification', 'High', 2),
('Public Records Search Results', 'Documentation of searches conducted in public databases and media', 'High', 3),
('Senior Management Approval', 'Written approval from senior management for client onboarding', 'High', 4),
('Ongoing Monitoring Checklist', 'Checklist and schedule for enhanced ongoing monitoring', 'High', 5)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_edd_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_edd_documents_updated_at
  BEFORE UPDATE ON edd_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_edd_documents_updated_at();
