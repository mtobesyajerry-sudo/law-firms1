/*
  # Fix Assessment Responses RLS and Create Snapshots Table

  1. Changes
    - Create helper function for assessment_responses access control
    - Fix RLS policies to prevent recursion
    - Create assessment_snapshots table for maturity tracking
    - Add organization_id to domain_scores if missing

  2. Security
    - Use SECURITY DEFINER to prevent RLS recursion
    - Maintain proper access control for all roles
*/

-- Create helper function to check if user can access assessment responses
CREATE OR REPLACE FUNCTION can_access_assessment_responses(p_assessment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  assessment_org_id uuid;
BEGIN
  -- Get user role and org
  SELECT role, organization_id INTO user_role, user_org_id
  FROM user_profiles
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;

  -- Admin can access all
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get assessment org
  SELECT organization_id INTO assessment_org_id
  FROM assessments
  WHERE id = p_assessment_id
  LIMIT 1;

  -- Staff, lawyers, compliance officers, and clients can access responses in their org
  IF user_org_id = assessment_org_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Clients can manage own responses" ON assessment_responses;
DROP POLICY IF EXISTS "Staff can manage all assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Compliance: Read-only assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management: Read-only assessment responses" ON assessment_responses;

-- Create new policies using helper function
CREATE POLICY "Users can read assessment responses in their org"
  ON assessment_responses
  FOR SELECT
  TO authenticated
  USING (can_access_assessment_responses(assessment_id));

CREATE POLICY "Staff and clients can insert assessment responses"
  ON assessment_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_access_assessment_responses(assessment_id) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff', 'lawyer', 'client', 'compliance_officer', 'mlro')
      AND is_active = true
    )
  );

CREATE POLICY "Staff and clients can update assessment responses"
  ON assessment_responses
  FOR UPDATE
  TO authenticated
  USING (
    can_access_assessment_responses(assessment_id) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff', 'lawyer', 'client', 'compliance_officer', 'mlro')
      AND is_active = true
    )
  )
  WITH CHECK (
    can_access_assessment_responses(assessment_id) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff', 'lawyer', 'client', 'compliance_officer', 'mlro')
      AND is_active = true
    )
  );

CREATE POLICY "Staff and clients can delete assessment responses"
  ON assessment_responses
  FOR DELETE
  TO authenticated
  USING (
    can_access_assessment_responses(assessment_id) AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff', 'lawyer', 'client')
      AND is_active = true
    )
  );

-- Add organization_id to domain_scores if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_scores' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE domain_scores ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    -- Populate organization_id from assessment
    UPDATE domain_scores ds
    SET organization_id = a.organization_id
    FROM assessments a
    WHERE ds.assessment_id = a.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE domain_scores ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Create assessment_snapshots table
CREATE TABLE IF NOT EXISTS assessment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('periodic', 'final', 'milestone')),
  snapshot_date timestamptz DEFAULT now(),
  
  -- Overall scores
  overall_maturity_score numeric(5,2),
  compliance_percentage numeric(5,2),
  
  -- Domain breakdown
  domain_scores jsonb,
  control_assessments jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE assessment_snapshots ENABLE ROW LEVEL SECURITY;

-- Check if RLS is enabled for domain_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'domain_scores' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing domain_scores policies if they exist
DROP POLICY IF EXISTS "Users can read domain scores in their org" ON domain_scores;
DROP POLICY IF EXISTS "Staff can manage domain scores" ON domain_scores;

-- RLS policies for domain_scores
CREATE POLICY "Users can read domain scores in their org"
  ON domain_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND organization_id = domain_scores.organization_id
      AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "Staff can manage domain scores"
  ON domain_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'staff', 'lawyer') OR 
           (role IN ('compliance_officer', 'mlro') AND organization_id = domain_scores.organization_id))
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'staff', 'lawyer') OR 
           (role IN ('compliance_officer', 'mlro') AND organization_id = domain_scores.organization_id))
      AND is_active = true
    )
  );

-- RLS policies for assessment_snapshots
CREATE POLICY "Users can read snapshots in their org"
  ON assessment_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND organization_id = assessment_snapshots.organization_id
      AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
    )
  );

CREATE POLICY "Staff can manage snapshots"
  ON assessment_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'staff', 'lawyer') OR 
           (role IN ('compliance_officer', 'mlro') AND organization_id = assessment_snapshots.organization_id))
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'staff', 'lawyer') OR 
           (role IN ('compliance_officer', 'mlro') AND organization_id = assessment_snapshots.organization_id))
      AND is_active = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_domain_scores_assessment ON domain_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_org ON domain_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_assessment ON assessment_snapshots(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_org ON assessment_snapshots(organization_id);
