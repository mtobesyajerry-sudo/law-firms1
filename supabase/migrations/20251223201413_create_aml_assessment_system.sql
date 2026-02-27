/*
  # AML/CFT/CPF Risk Assessment System

  ## Overview
  This migration creates the database schema for a comprehensive DNFBP AML/CFT/CPF 
  institutional risk assessment system based on regulatory self-assessment questionnaires.

  ## Tables Created

  ### 1. organizations
  Stores information about DNFBPs (Designated Non-Financial Businesses and Professions)
  - `id` (uuid, primary key) - Unique organization identifier
  - `name` (text) - Organization name
  - `business_type` (text) - Type of DNFBP
  - `size` (text) - Organization size (small/medium/large)
  - `contact_email` (text) - Primary contact email
  - `created_by` (uuid) - User who created the record
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. assessments
  Tracks individual assessment sessions
  - `id` (uuid, primary key) - Unique assessment identifier
  - `organization_id` (uuid, foreign key) - Links to organizations
  - `assessment_date` (date) - Date assessment was conducted
  - `status` (text) - Assessment status (draft/in_progress/completed/reviewed)
  - `overall_risk_rating` (text) - Final risk rating (low/medium/high)
  - `assessor_name` (text) - Person conducting assessment
  - `assessor_role` (text) - Role of assessor
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_by` (uuid) - User who created the assessment
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. assessment_responses
  Stores responses to individual assessment questions
  - `id` (uuid, primary key) - Unique response identifier
  - `assessment_id` (uuid, foreign key) - Links to assessments
  - `section_code` (text) - Section identifier (A-M)
  - `question_code` (text) - Question identifier
  - `question_text` (text) - Full question text
  - `response` (text) - Answer (yes/no/partial/na)
  - `notes` (text) - Additional comments or context
  - `risk_score` (numeric) - Calculated risk score for this question
  - `created_at` (timestamptz) - Response creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. section_scores
  Aggregated risk scores by assessment section
  - `id` (uuid, primary key) - Unique identifier
  - `assessment_id` (uuid, foreign key) - Links to assessments
  - `section_code` (text) - Section identifier (A-M)
  - `section_name` (text) - Section full name
  - `total_questions` (integer) - Number of questions in section
  - `answered_questions` (integer) - Number of questions answered
  - `risk_score` (numeric) - Calculated section risk score
  - `risk_level` (text) - Section risk level (low/medium/high)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. remediation_actions
  Tracks identified weaknesses and mitigation plans
  - `id` (uuid, primary key) - Unique action identifier
  - `assessment_id` (uuid, foreign key) - Links to assessments
  - `section_code` (text) - Related section
  - `weakness_description` (text) - Description of identified weakness
  - `mitigation_measure` (text) - Planned or implemented mitigation
  - `priority` (text) - Priority level (high/medium/low)
  - `status` (text) - Implementation status (planned/in_progress/completed)
  - `target_date` (date) - Target completion date
  - `responsible_party` (text) - Person/team responsible
  - `completed_date` (date) - Actual completion date
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled on all tables
  - Authenticated users can manage their own organization's data
  - Policies enforce data isolation by organization

  ## Indexes
  - Foreign key indexes for optimal join performance
  - Assessment status and date indexes for reporting
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text NOT NULL,
  size text DEFAULT 'medium',
  contact_email text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft',
  overall_risk_rating text,
  assessor_name text,
  assessor_role text,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  section_code text NOT NULL,
  question_code text NOT NULL,
  question_text text NOT NULL,
  response text,
  notes text,
  risk_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, question_code)
);

-- Create section_scores table
CREATE TABLE IF NOT EXISTS section_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  section_code text NOT NULL,
  section_name text NOT NULL,
  total_questions integer DEFAULT 0,
  answered_questions integer DEFAULT 0,
  risk_score numeric DEFAULT 0,
  risk_level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, section_code)
);

-- Create remediation_actions table
CREATE TABLE IF NOT EXISTS remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  section_code text,
  weakness_description text NOT NULL,
  mitigation_measure text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'planned',
  target_date date,
  responsible_party text,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_org ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_responses_assessment ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_responses_section ON assessment_responses(section_code);
CREATE INDEX IF NOT EXISTS idx_section_scores_assessment ON section_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_remediation_assessment ON remediation_actions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_actions(status);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for assessments
CREATE POLICY "Users can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can insert own assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can delete own assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
  );

-- RLS Policies for assessment_responses
CREATE POLICY "Users can view own assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own assessment responses"
  ON assessment_responses FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

-- RLS Policies for section_scores
CREATE POLICY "Users can view own section scores"
  ON section_scores FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own section scores"
  ON section_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own section scores"
  ON section_scores FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own section scores"
  ON section_scores FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

-- RLS Policies for remediation_actions
CREATE POLICY "Users can view own remediation actions"
  ON remediation_actions FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own remediation actions"
  ON remediation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own remediation actions"
  ON remediation_actions FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own remediation actions"
  ON remediation_actions FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.created_by = auth.uid()
    )
  );