/*
  # Add User Policies for Assessment-Related Tables

  ## Overview
  This migration adds proper RLS policies for regular users to access
  assessment_responses, section_scores, and remediation_actions tables
  based on their organization membership.

  ## Security
  - Add SELECT, INSERT, UPDATE, DELETE policies for assessment_responses
  - Add SELECT, INSERT, UPDATE, DELETE policies for section_scores
  - Add SELECT, INSERT, UPDATE, DELETE policies for remediation_actions
*/

-- Assessment Responses Policies for Users
CREATE POLICY "Users can view organization assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can insert organization assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update organization assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can delete organization assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- Section Scores Policies for Users
CREATE POLICY "Users can view organization section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can insert organization section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update organization section scores"
  ON section_scores FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can delete organization section scores"
  ON section_scores FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

-- Remediation Actions Policies for Users
CREATE POLICY "Users can view organization remediation actions"
  ON remediation_actions FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can insert organization remediation actions"
  ON remediation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update organization remediation actions"
  ON remediation_actions FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can delete organization remediation actions"
  ON remediation_actions FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    )
  );
