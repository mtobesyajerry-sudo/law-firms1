/*
  # Create Control Evidence Mapping Table

  1. New Tables
    - `control_evidence_mapping`
      - Maps evidence documents to control assessments
      - Tracks verification status and coverage percentage
      - Links to secure_documents for evidence storage

  2. Security
    - Enable RLS on control_evidence_mapping table
    - Add policies for authenticated users to manage evidence within their organization
*/

-- Create control_evidence_mapping table
CREATE TABLE IF NOT EXISTS control_evidence_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_assessment_id uuid NOT NULL REFERENCES control_assessments(id) ON DELETE CASCADE,
  document_id uuid,
  evidence_type text CHECK (evidence_type IN ('policy', 'procedure', 'record', 'report', 'system-output', 'other')),
  coverage_percentage integer DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE control_evidence_mapping ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_evidence_control_assessment 
  ON control_evidence_mapping(control_assessment_id);

CREATE INDEX IF NOT EXISTS idx_control_evidence_document 
  ON control_evidence_mapping(document_id);

-- RLS Policies
CREATE POLICY "Users can view evidence in their org"
  ON control_evidence_mapping
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
      AND up.is_active = true
    )
  );

CREATE POLICY "Staff can insert evidence in their org"
  ON control_evidence_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer', 'compliance_officer', 'mlro')
      AND up.is_active = true
    )
  );

CREATE POLICY "Staff can update evidence in their org"
  ON control_evidence_mapping
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer', 'compliance_officer', 'mlro')
      AND up.is_active = true
    )
  );

CREATE POLICY "Staff can delete evidence in their org"
  ON control_evidence_mapping
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
      AND up.role IN ('staff', 'lawyer')
      AND up.is_active = true
    )
  );
