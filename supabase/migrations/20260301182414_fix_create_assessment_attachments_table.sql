/*
  # Create Assessment Attachments Table
  
  1. New Tables
    - `assessment_attachments`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid, foreign key to assessments)
      - `question_code` (text) - Category/question code
      - `file_name` (text) - Original filename
      - `file_path` (text) - Storage path in Supabase Storage
      - `storage_path` (text) - Alternative storage path field
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `uploaded_at` (timestamptz)
      - `metadata` (jsonb) - Additional metadata
      - `secure_document_id` (uuid) - Link to secure_documents if needed
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Admin can manage all attachments
    - Compliance officers can manage attachments for their org assessments
    - Staff can manage attachments for their org assessments
    
  3. Notes
    - Used for storing documents attached to risk assessments
    - Supports multiple file types (PDF, images, Word, Excel, etc.)
*/

-- Create assessment_attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS assessment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_code text NOT NULL,
  file_name text NOT NULL,
  file_path text,
  storage_path text,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  secure_document_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessment_attachments_assessment_id 
  ON assessment_attachments(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_attachments_question_code 
  ON assessment_attachments(question_code);

CREATE INDEX IF NOT EXISTS idx_assessment_attachments_created_at 
  ON assessment_attachments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_attachments_uploaded_by 
  ON assessment_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE assessment_attachments ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view all attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (is_admin());

-- Compliance Officer policies
CREATE POLICY "Compliance officers can view assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can update assessment attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  )
  WITH CHECK (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Compliance officers can delete assessment attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['compliance_officer', 'mlro']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

-- Staff policies
CREATE POLICY "Staff can view assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['staff']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Staff can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_role(ARRAY['staff']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Staff can update assessment attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (
    user_has_role(ARRAY['staff']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  )
  WITH CHECK (
    user_has_role(ARRAY['staff']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );

CREATE POLICY "Staff can delete assessment attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    user_has_role(ARRAY['staff']) 
    AND assessment_id IN (
      SELECT id FROM assessments WHERE organization_id = get_user_org()
    )
  );
