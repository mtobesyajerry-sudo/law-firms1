/*
  # Add Compliance Officer Policies for Assessment Related Tables

  1. Changes
    - Add policies for compliance officers to access assessment_responses
    - Add policies for compliance officers to access section_scores
    - Add policies for compliance officers to access assessment_attachments

  2. Security
    - Compliance officers can only access data for assessments in their organization
    - All policies verify through the assessments table organization_id
*/

-- Assessment Responses Policies
DROP POLICY IF EXISTS "Compliance officers can view assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can update assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance officers can delete assessment responses" ON assessment_responses;

CREATE POLICY "Compliance officers can view assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can update assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can delete assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_responses.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

-- Section Scores Policies
DROP POLICY IF EXISTS "Compliance officers can view section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can create section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can update section scores" ON section_scores;
DROP POLICY IF EXISTS "Compliance officers can delete section scores" ON section_scores;

CREATE POLICY "Compliance officers can view section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = section_scores.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can create section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = section_scores.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can update section scores"
  ON section_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = section_scores.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = section_scores.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can delete section scores"
  ON section_scores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = section_scores.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

-- Assessment Attachments Policies
DROP POLICY IF EXISTS "Compliance officers can view assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can create assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can update assessment attachments" ON assessment_attachments;
DROP POLICY IF EXISTS "Compliance officers can delete assessment attachments" ON assessment_attachments;

CREATE POLICY "Compliance officers can view assessment attachments"
  ON assessment_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_attachments.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_attachments.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can update assessment attachments"
  ON assessment_attachments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_attachments.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_attachments.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

CREATE POLICY "Compliance officers can delete assessment attachments"
  ON assessment_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE assessments.id = assessment_attachments.assessment_id
        AND user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );
