/*
  # Add Explicit Admin SELECT Policies

  ## Overview
  This migration adds explicit SELECT policies for admins on assessment-related tables
  to ensure admins can view all assessment report data.

  ## Security
  - Admins can explicitly SELECT from assessment_responses
  - Admins can explicitly SELECT from section_scores
  - Admins can explicitly SELECT from remediation_actions
*/

-- Explicit SELECT policy for assessment_responses
CREATE POLICY "Admins can view all assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Explicit SELECT policy for section_scores  
CREATE POLICY "Admins can view all section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Explicit SELECT policy for remediation_actions
CREATE POLICY "Admins can view all remediation actions"
  ON remediation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
