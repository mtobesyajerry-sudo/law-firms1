/*
  # Create Maturity Assessment System for Module 4

  1. New Tables
    - maturity_levels: 5-level maturity scale reference
    - aml_domains: AML/CFT domain categories
    - aml_controls: Control library
    - control_assessments: Control-level assessments
    - domain_scores: Aggregated domain scores
    - gap_analysis: Identified gaps
    - remediation_plans: Action plans

  2. Security
    - RLS enabled on all tables
    - Organization-based access control
*/

-- Create maturity_levels reference table
CREATE TABLE IF NOT EXISTS maturity_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer UNIQUE NOT NULL CHECK (level >= 1 AND level <= 5),
  name text NOT NULL,
  description text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create aml_domains table
CREATE TABLE IF NOT EXISTS aml_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  weight numeric NOT NULL CHECK (weight >= 0 AND weight <= 1),
  sort_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create aml_controls table
CREATE TABLE IF NOT EXISTS aml_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES aml_domains(id) ON DELETE CASCADE,
  control_code text UNIQUE NOT NULL,
  control_name text NOT NULL,
  control_description text NOT NULL,
  regulatory_reference text,
  control_type text CHECK (control_type IN ('preventive', 'detective', 'corrective')),
  automation_level text CHECK (automation_level IN ('manual', 'semi-automated', 'fully-automated')),
  required_evidence jsonb DEFAULT '[]',
  testing_frequency text CHECK (testing_frequency IN ('continuous', 'monthly', 'quarterly', 'annual')),
  is_mandatory boolean DEFAULT true,
  min_entity_tier integer DEFAULT 1 CHECK (min_entity_tier >= 1 AND min_entity_tier <= 3),
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create control_assessments table
CREATE TABLE IF NOT EXISTS control_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  control_id uuid NOT NULL REFERENCES aml_controls(id) ON DELETE CASCADE,
  maturity_level integer CHECK (maturity_level >= 1 AND maturity_level <= 5),
  maturity_score numeric CHECK (maturity_score >= 0 AND maturity_score <= 100),
  evidence_quality text CHECK (evidence_quality IN ('poor', 'fair', 'good', 'excellent')),
  implementation_status text CHECK (implementation_status IN ('not-implemented', 'partial', 'implemented', 'optimised')),
  control_owner text,
  last_tested_date date,
  testing_result text CHECK (testing_result IN ('passed', 'failed', 'partial', 'not-tested')),
  assessor_notes text,
  gaps_identified jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, control_id)
);

-- Create domain_scores table
CREATE TABLE IF NOT EXISTS domain_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES aml_domains(id) ON DELETE CASCADE,
  average_maturity numeric CHECK (average_maturity >= 1 AND average_maturity <= 5),
  weighted_score numeric CHECK (weighted_score >= 0 AND weighted_score <= 100),
  controls_assessed integer DEFAULT 0,
  controls_total integer DEFAULT 0,
  compliance_percentage numeric DEFAULT 0 CHECK (compliance_percentage >= 0 AND compliance_percentage <= 100),
  gaps_critical integer DEFAULT 0,
  gaps_high integer DEFAULT 0,
  gaps_medium integer DEFAULT 0,
  gaps_low integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, domain_id)
);

-- Create gap_analysis table
CREATE TABLE IF NOT EXISTS gap_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  control_assessment_id uuid REFERENCES control_assessments(id) ON DELETE CASCADE,
  gap_category text CHECK (gap_category IN ('missing-control', 'weak-implementation', 'inadequate-evidence', 'ineffective-testing')),
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  gap_description text NOT NULL,
  regulatory_risk text,
  business_impact text,
  recommended_action text,
  priority_score integer CHECK (priority_score >= 1 AND priority_score <= 10),
  status text DEFAULT 'identified' CHECK (status IN ('identified', 'acknowledged', 'in-remediation', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create remediation_plans table
CREATE TABLE IF NOT EXISTS remediation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  gap_id uuid REFERENCES gap_analysis(id) ON DELETE CASCADE,
  control_id uuid REFERENCES aml_controls(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  responsible_party text,
  accountable_party text,
  target_maturity_level integer CHECK (target_maturity_level >= 1 AND target_maturity_level <= 5),
  estimated_cost numeric,
  estimated_effort_days integer,
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'deferred')),
  start_date date,
  target_date date,
  completion_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  progress_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE maturity_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maturity_levels (reference data - read-only for all authenticated)
CREATE POLICY "Allow authenticated users to read maturity levels"
  ON maturity_levels FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for aml_domains (reference data - read-only for all authenticated)
CREATE POLICY "Allow authenticated users to read domains"
  ON aml_domains FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for aml_controls (reference data - read-only for all authenticated)
CREATE POLICY "Allow authenticated users to read controls"
  ON aml_controls FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for control_assessments
CREATE POLICY "Users can view control assessments for their organization"
  ON control_assessments FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can insert control assessments"
  ON control_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'compliance_officer', 'management', 'admin')
    )
  );

CREATE POLICY "Staff can update control assessments"
  ON control_assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'compliance_officer', 'management', 'admin')
    )
  );

-- RLS Policies for domain_scores
CREATE POLICY "Users can view domain scores for their organization"
  ON domain_scores FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage domain scores"
  ON domain_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'compliance_officer', 'management', 'admin')
    )
  );

-- RLS Policies for gap_analysis
CREATE POLICY "Users can view gaps for their organization"
  ON gap_analysis FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage gap analysis"
  ON gap_analysis FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'compliance_officer', 'management', 'admin')
    )
  );

-- RLS Policies for remediation_plans
CREATE POLICY "Users can view remediation plans for their organization"
  ON remediation_plans FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage remediation plans"
  ON remediation_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'compliance_officer', 'management', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_control_assessments_assessment ON control_assessments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_control_assessments_control ON control_assessments(control_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_assessment ON domain_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_domain ON domain_scores(domain_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_assessment ON gap_analysis(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_severity ON gap_analysis(severity, status);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_assessment ON remediation_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_status ON remediation_plans(status, priority);
