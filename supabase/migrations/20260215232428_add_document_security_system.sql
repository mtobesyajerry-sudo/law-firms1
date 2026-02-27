-- Document Security System
--
-- Overview: Secure document management with encryption metadata and access control
--
-- Tables Created:
-- 1. secure_documents - Document metadata with encryption and security properties
-- 2. document_sharing - Track document sharing permissions
-- 3. document_versions - Version history for documents
--
-- Security: RLS enabled, encryption at rest, access logging

-- 1. Secure Documents - Document metadata and security
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
CREATE INDEX IF NOT EXISTS idx_secure_documents_classification ON secure_documents(classification);
CREATE INDEX IF NOT EXISTS idx_secure_documents_deleted ON secure_documents(is_deleted);

ALTER TABLE secure_documents ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can soft delete own documents"
  ON secure_documents FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND is_deleted = true);

-- 2. Document Sharing - Granular sharing permissions
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

CREATE POLICY "Document owners can manage sharing"
  ON document_sharing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM secure_documents
      WHERE secure_documents.id = document_sharing.document_id
      AND secure_documents.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM secure_documents
      WHERE secure_documents.id = document_sharing.document_id
      AND secure_documents.owner_id = auth.uid()
    )
  );

-- 3. Document Versions - Version history
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

CREATE POLICY "System can create document versions"
  ON document_versions FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last access info
  NEW.last_accessed_at = now();
  NEW.last_accessed_by = auth.uid();
  NEW.download_count = OLD.download_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for document access (update this manually when downloading)
-- Not automatically triggered, must be called explicitly when document is accessed