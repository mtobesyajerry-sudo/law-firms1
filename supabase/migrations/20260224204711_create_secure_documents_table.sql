/*
  # Create Secure Documents System
  
  ## Overview
  Creates the secure_documents table and related infrastructure for document storage
  
  ## Tables Created
  1. secure_documents - Main document metadata table
  2. document_sharing - Document sharing permissions
  3. document_versions - Document version history
  4. document_access_logs - Access audit trail
  
  ## Security
  - RLS enabled on all tables
  - Organization-based access control
  - Admin full access
*/

-- 1. Secure Documents Table
CREATE TABLE IF NOT EXISTS secure_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  client_id uuid,
  document_name text NOT NULL,
  document_type text,
  file_size bigint,
  mime_type text,
  storage_path text NOT NULL,
  encryption_key_id text,
  is_encrypted boolean DEFAULT true,
  checksum text,
  watermarked boolean DEFAULT false,
  watermark_text text,
  classification text CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'confidential',
  requires_mfa boolean DEFAULT false,
  download_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  last_accessed_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secure_documents_owner_id ON secure_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_assessment_id ON secure_documents(assessment_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_organization_id ON secure_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_client_id ON secure_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_secure_documents_classification ON secure_documents(classification);
CREATE INDEX IF NOT EXISTS idx_secure_documents_deleted ON secure_documents(is_deleted);

ALTER TABLE secure_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND is_deleted = false
  );

CREATE POLICY "Users can view organization documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = secure_documents.organization_id
    )
    AND is_deleted = false
  );

CREATE POLICY "Admins can view all documents"
  ON secure_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create documents"
  ON secure_documents FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2. Document Sharing Table
CREATE TABLE IF NOT EXISTS document_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES secure_documents(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_role text,
  shared_by uuid NOT NULL REFERENCES auth.users(id),
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'download', 'edit', 'full')) DEFAULT 'view',
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_sharing_document_id ON document_sharing(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sharing_user_id ON document_sharing(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_sharing_active ON document_sharing(is_active);

ALTER TABLE document_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sharing for accessible documents"
  ON document_sharing FOR SELECT
  TO authenticated
  USING (
    shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM secure_documents
      WHERE secure_documents.id = document_sharing.document_id
      AND secure_documents.owner_id = auth.uid()
    )
  );

-- 3. Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES secure_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  checksum text,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  change_description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of accessible documents"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM secure_documents
      WHERE secure_documents.id = document_versions.document_id
      AND (
        secure_documents.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.organization_id = secure_documents.organization_id
        )
      )
    )
  );

-- 4. Document Access Logs Table
CREATE TABLE IF NOT EXISTS document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES secure_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  client_id uuid,
  assessment_id uuid,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'edit', 'delete', 'share')),
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_access_type ON document_access_logs(access_type);

ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert access logs"
  ON document_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());