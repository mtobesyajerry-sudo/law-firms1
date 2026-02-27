/*
  # Fix Compliance Officer INSERT Policies for Related Tables

  1. Problem
    - INSERT policies were incorrectly checking the row being inserted
    - Policies need to verify through the parent assessment's organization
    
  2. Solution
    - Fix INSERT policies for assessment_responses, section_scores, assessment_attachments
    - Check that the assessment_id being inserted belongs to user's organization

  3. Security
    - Users can only insert data for assessments in their organization
    - Verification through assessments table organization_id
*/

-- Fix assessment_responses INSERT policy
DROP POLICY IF EXISTS "Compliance officers can create assessment responses" ON assessment_responses;

CREATE POLICY "Compliance officers can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT assessments.id
      FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

-- Fix section_scores INSERT policy
DROP POLICY IF EXISTS "Compliance officers can create section scores" ON section_scores;

CREATE POLICY "Compliance officers can create section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT assessments.id
      FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );

-- Fix assessment_attachments INSERT policy
DROP POLICY IF EXISTS "Compliance officers can create assessment attachments" ON assessment_attachments;

CREATE POLICY "Compliance officers can create assessment attachments"
  ON assessment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT assessments.id
      FROM assessments
      JOIN user_profiles ON user_profiles.organization_id = assessments.organization_id
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('compliance_officer', 'mlro')
    )
  );
