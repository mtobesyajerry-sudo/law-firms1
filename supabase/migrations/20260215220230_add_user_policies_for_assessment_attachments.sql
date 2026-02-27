/*
  # Add User Policies for Assessment Attachments

  ## Overview
  This migration adds proper RLS policies for regular users to access
  assessment_attachments table based on their organization membership.

  ## Security
  - Add SELECT, INSERT, UPDATE, DELETE policies for assessment_attachments
*/

-- Assessment Attachments Policies for Users
CREATE POLICY "Users can view organization assessment attachments"
  ON assessment_attachments FOR SELECT
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

CREATE POLICY "Users can insert organization assessment attachments"
  ON assessment_attachments FOR INSERT
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

CREATE POLICY "Users can update organization assessment attachments"
  ON assessment_attachments FOR UPDATE
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

CREATE POLICY "Users can delete organization assessment attachments"
  ON assessment_attachments FOR DELETE
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
