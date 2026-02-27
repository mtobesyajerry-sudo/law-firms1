/*
  # Add Assessment Attachments Support

  1. New Tables
    - `assessment_attachments`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid, foreign key to assessments)
      - `question_code` (text) - Links to specific question (A1, A6, B1, B5, L2, etc.)
      - `file_name` (text) - Original filename
      - `file_path` (text) - Storage path/URL
      - `file_size` (bigint) - File size in bytes
      - `file_type` (text) - MIME type
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `uploaded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `assessment_attachments` table
    - Users can view attachments for assessments they have access to
    - Users can upload attachments to their own assessments
    - Users can delete their own attachments
    - Admins can view all attachments

  3. Notes
    - Critical questions requiring attachments for ALL tiers: A1, A6, B1, B5, L2
    - File uploads will be stored in Supabase Storage
    - Multiple files can be attached to a single question
*/

-- Create assessment_attachments table
CREATE TABLE IF NOT EXISTS assessment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_code text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assessment_attachments_assessment_id 
  ON assessment_attachments(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_attachments_question_code 
  ON assessment_attachments(question_code);

-- Enable RLS
ALTER TABLE assessment_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for assessments they own
CREATE POLICY "Users can view attachments for their assessments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_attachments.assessment_id
      AND assessments.created_by = auth.uid()
    )
  );

-- Policy: Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Users can upload attachments to their assessments
CREATE POLICY "Users can upload attachments to their assessments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_attachments.assessment_id
      AND assessments.created_by = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Policy: Users can delete attachments from their assessments
CREATE POLICY "Users can delete attachments from their assessments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_attachments.assessment_id
      AND assessments.created_by = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );