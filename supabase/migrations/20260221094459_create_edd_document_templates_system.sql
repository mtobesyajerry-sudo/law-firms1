/*
  # Create EDD Document Templates System

  1. New Tables
    - `edd_document_types`
      - `id` (uuid, primary key)
      - `code` (text, unique) - machine-readable identifier
      - `name` (text) - display name
      - `description` (text) - template purpose
      - `category` (text) - document category
      - `display_order` (integer) - display order
      - `is_active` (boolean) - active status
      - `template_content` (text) - template content/structure
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `edd_documents`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to kyc_clients)
      - `document_type_id` (uuid, foreign key to edd_document_types)
      - `status` (text) - pending, in_progress, completed
      - `completed_date` (date)
      - `completed_by` (uuid, foreign key to auth.users)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users within same organization
*/

-- Create edd_document_types table
CREATE TABLE IF NOT EXISTS edd_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('regulatory', 'pep', 'monitoring', 'approval')),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  template_content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create edd_documents table
CREATE TABLE IF NOT EXISTS edd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES edd_document_types(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_date date,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, document_type_id)
);

-- Enable RLS
ALTER TABLE edd_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE edd_documents ENABLE ROW LEVEL SECURITY;

-- Policies for edd_document_types (public read for authenticated users)
CREATE POLICY "Authenticated users can read document types"
  ON edd_document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for edd_documents (organization-scoped)
CREATE POLICY "Users can read EDD documents in their organization"
  ON edd_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      JOIN user_profiles up ON up.organization_id = kc.organization_id
      WHERE kc.id = edd_documents.client_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert EDD documents in their organization"
  ON edd_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      JOIN user_profiles up ON up.organization_id = kc.organization_id
      WHERE kc.id = edd_documents.client_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update EDD documents in their organization"
  ON edd_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      JOIN user_profiles up ON up.organization_id = kc.organization_id
      WHERE kc.id = edd_documents.client_id
      AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      JOIN user_profiles up ON up.organization_id = kc.organization_id
      WHERE kc.id = edd_documents.client_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete EDD documents in their organization"
  ON edd_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      JOIN user_profiles up ON up.organization_id = kc.organization_id
      WHERE kc.id = edd_documents.client_id
      AND up.id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_edd_documents_client_id ON edd_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_edd_documents_document_type_id ON edd_documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_edd_documents_status ON edd_documents(status);
