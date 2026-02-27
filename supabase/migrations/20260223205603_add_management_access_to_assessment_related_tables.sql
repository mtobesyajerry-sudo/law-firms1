/*
  # Add Management User Access to Assessment-Related Tables (READ-ONLY)

  ## Changes
  1. Add SELECT policy for Management users to view assessment_responses
  2. Add SELECT policy for Management users to view section_scores
  3. Add SELECT policy for Management users to view assessment_attachments

  ## Security
  - Management users can ONLY VIEW records related to assessments in their organization
  - Management users CANNOT create, update, or delete assessment-related records
  - All policies check organization membership via assessment relationship

  ## IMPORTANT
  - Management role is for oversight and compliance monitoring only
  - Write access (INSERT, UPDATE, DELETE) is restricted to Staff and Compliance Officer roles
*/

-- Add Management user READ-ONLY policies for assessment_responses table
CREATE POLICY "Management can view org assessment responses"
  ON assessment_responses
  FOR SELECT
  TO authenticated
  USING (
    (get_user_role() = 'management')
    AND (assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id = get_user_organization_id()
    ))
  );

-- Add Management user READ-ONLY policies for section_scores table
CREATE POLICY "Management can view org section scores"
  ON section_scores
  FOR SELECT
  TO authenticated
  USING (
    (get_user_role() = 'management')
    AND (assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id = get_user_organization_id()
    ))
  );

-- Add Management user READ-ONLY policies for assessment_attachments table
CREATE POLICY "Management can view org assessment attachments"
  ON assessment_attachments
  FOR SELECT
  TO authenticated
  USING (
    (get_user_role() = 'management')
    AND (assessment_id IN (
      SELECT id FROM assessments
      WHERE organization_id = get_user_organization_id()
    ))
  );
