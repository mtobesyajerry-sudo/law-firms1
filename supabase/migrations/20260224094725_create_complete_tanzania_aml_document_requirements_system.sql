/*
  # Complete Tanzania AML Document Requirements System
  
  ## Overview
  Creates comprehensive document management system aligned with Tanzania AML laws
  and FATF guidance for client due diligence at all risk levels.
  
  ## New Tables
  1. **document_types** - Master table for all document types
  2. **dd_level_document_requirements** - Maps documents to DD levels (simplified/standard/enhanced)
  3. **document_verification_log** - Audit log for all document actions
  4. Updates **client_documents** with document_type_id if missing
  
  ## Tanzania AML Requirements
  
  ### Simplified DD (Low Risk)
  - Basic ID + Risk justification MANDATORY
  - Individuals: 2-3 docs | Entities: 3-4 docs
  
  ### Standard DD (Default)
  - Identity, address, income, beneficial ownership, screening
  - Individuals: 7-10 docs | Entities: 10-15 docs
  
  ### Enhanced DD (High Risk - PEPs, suspicious, high-risk jurisdictions)
  - All standard PLUS background checks, SOW/SOF mandatory, senior approval, monitoring
  - Individuals: 15-25+ docs | Entities: 20-30+ docs
  
  ## Security
  - RLS enabled | Organization-based access | Automatic audit logging
*/

-- ================================================================
-- TABLE 1: DOCUMENT TYPES
-- ================================================================

CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'identity', 'address', 'financial', 'corporate', 'ownership', 
    'regulatory', 'background', 'transaction', 'other'
  )),
  description text,
  client_type text NOT NULL CHECK (client_type IN ('individual', 'legal_entity', 'both')),
  validity_months integer DEFAULT 36,
  is_mandatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_types_category ON document_types(category);
CREATE INDEX IF NOT EXISTS idx_document_types_client_type ON document_types(client_type);
CREATE INDEX IF NOT EXISTS idx_document_types_code ON document_types(code);

-- ================================================================
-- TABLE 2: DD LEVEL REQUIREMENTS
-- ================================================================

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

CREATE INDEX IF NOT EXISTS idx_dd_requirements_level ON dd_level_document_requirements(dd_level, client_type);
CREATE INDEX IF NOT EXISTS idx_dd_requirements_doc_type ON dd_level_document_requirements(document_type_id);

-- ================================================================
-- TABLE 3: UPDATE CLIENT_DOCUMENTS
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_documents' AND column_name = 'document_type_id'
  ) THEN
    ALTER TABLE client_documents ADD COLUMN document_type_id uuid REFERENCES document_types(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_client_documents_doc_type ON client_documents(document_type_id);
  END IF;
END $$;

-- ================================================================
-- TABLE 4: VERIFICATION LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS document_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('uploaded', 'verified', 'rejected', 'expired', 'deleted', 'updated')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_document ON document_verification_log(document_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_action ON document_verification_log(action);

-- ================================================================
-- ENABLE RLS
-- ================================================================

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_level_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verification_log ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- document_types
DROP POLICY IF EXISTS "Anyone can view active document types" ON document_types;
CREATE POLICY "Anyone can view active document types"
  ON document_types FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage document types" ON document_types;
CREATE POLICY "Admins can manage document types"
  ON document_types FOR ALL TO authenticated
  USING (is_admin());

-- dd_level_document_requirements
DROP POLICY IF EXISTS "Anyone can view DD requirements" ON dd_level_document_requirements;
CREATE POLICY "Anyone can view DD requirements"
  ON dd_level_document_requirements FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage DD requirements" ON dd_level_document_requirements;
CREATE POLICY "Admins can manage DD requirements"
  ON dd_level_document_requirements FOR ALL TO authenticated
  USING (is_admin());

-- document_verification_log
DROP POLICY IF EXISTS "Users can view org document logs" ON document_verification_log;
CREATE POLICY "Users can view org document logs"
  ON document_verification_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_documents
      JOIN kyc_clients ON kyc_clients.id = client_documents.client_id
      WHERE client_documents.id = document_verification_log.document_id
      AND kyc_clients.organization_id = get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "Users can create verification logs" ON document_verification_log;
CREATE POLICY "Users can create verification logs"
  ON document_verification_log FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all logs" ON document_verification_log;
CREATE POLICY "Admins can view all logs"
  ON document_verification_log FOR SELECT TO authenticated
  USING (is_admin());

-- ================================================================
-- TRIGGER: Document change logging
-- ================================================================

CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
      COALESCE(NEW.verified_by, auth.uid()),
      OLD.status,
      NEW.status,
      NEW.verification_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_document_change ON client_documents;
CREATE TRIGGER trigger_log_document_change
  AFTER INSERT OR UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_change();
