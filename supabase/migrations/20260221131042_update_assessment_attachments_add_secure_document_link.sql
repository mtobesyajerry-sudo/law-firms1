/*
  # Update assessment_attachments to link with secure_documents

  ## Changes
  1. Add secure_document_id column to assessment_attachments
  2. Add storage_path column
  3. Add metadata column for flexible properties
  4. Create necessary indexes

  ## Security
  - Maintains existing RLS policies
  - Adds foreign key constraint to secure_documents
*/

-- Add new columns to assessment_attachments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessment_attachments' AND column_name = 'secure_document_id'
  ) THEN
    ALTER TABLE assessment_attachments ADD COLUMN secure_document_id uuid REFERENCES secure_documents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessment_attachments' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE assessment_attachments ADD COLUMN storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessment_attachments' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE assessment_attachments ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Make file_path nullable since we're using storage_path
ALTER TABLE assessment_attachments ALTER COLUMN file_path DROP NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessment_attachments_secure_document_id ON assessment_attachments(secure_document_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attachments_assessment_id ON assessment_attachments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attachments_created_at ON assessment_attachments(created_at DESC);
