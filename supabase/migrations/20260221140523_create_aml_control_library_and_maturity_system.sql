/*
  # AML/CFT Control Library and Maturity Assessment System
  
  ## Overview
  Creates comprehensive control library with maturity levels, domain structure,
  and document-to-control mapping for banks and financial institutions.
  
  ## 1. New Tables
  
  ### aml_domains
  Master table for 9 weighted AML/CFT domains
  - `id` (uuid, primary key)
  - `code` (text, unique) - Domain identifier (GOV, ERA, CDD, TM, etc.)
  - `name` (text) - Full domain name
  - `description` (text) - Domain purpose and scope
  - `weight` (numeric) - Domain weight percentage (0-1, sum=1.0)
  - `sort_order` (integer) - Display order
  - `is_active` (boolean) - Enable/disable domain
  
  ### aml_controls
  Master control library with all required AML/CFT controls
  - `id` (uuid, primary key)
  - `domain_id` (uuid) - Foreign key to aml_domains
  - `control_code` (text, unique) - Control identifier (GOV-001, CDD-003)
  - `control_name` (text) - Short control name
  - `control_description` (text) - Detailed control requirement
  - `regulatory_reference` (text) - Regulation/standard reference
  - `control_type` (text) - preventive/detective/corrective
  - `automation_level` (text) - manual/semi-automated/fully-automated
  - `required_evidence` (jsonb) - Array of required document types
  - `testing_frequency` (text) - continuous/monthly/quarterly/annual
  - `is_mandatory` (boolean) - Required for all institutions
  - `min_entity_tier` (integer) - Minimum tier (1-3)
  - `sort_order` (integer)
  
  ### maturity_levels
  5-level maturity scale definitions
  - `id` (uuid, primary key)
  - `level` (integer, unique) - 1-5
  - `name` (text) - Initial/Developing/Defined/Managed/Optimised
  - `description` (text) - Level characteristics
  - `criteria` (jsonb) - Scoring criteria for this level
  
  ### control_assessments
  Control-level assessment results per institution
  - `id` (uuid, primary key)
  - `assessment_id` (uuid) - Foreign key to assessments
  - `control_id` (uuid) - Foreign key to aml_controls
  - `maturity_level` (integer) - Assessed maturity (1-5)
  - `maturity_score` (numeric) - Calculated score
  - `evidence_quality` (text) - poor/fair/good/excellent
  - `implementation_status` (text) - not-implemented/partial/implemented/optimised
  - `control_owner` (text) - Responsible role/department
  - `last_tested_date` (date) - Last control testing date
  - `testing_result` (text) - passed/failed/partial
  - `assessor_notes` (text)
  - `gaps_identified` (jsonb) - Array of identified gaps
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### control_evidence_mapping
  Maps uploaded documents to controls
  - `id` (uuid, primary key)
  - `control_assessment_id` (uuid) - Foreign key to control_assessments
  - `document_id` (uuid) - Foreign key to secure_documents
  - `evidence_type` (text) - policy/procedure/record/report/system-output
  - `coverage_percentage` (integer) - How much of control this covers (0-100)
  - `verified_by` (uuid) - User who verified evidence
  - `verified_at` (timestamptz)
  - `verification_notes` (text)
  
  ### domain_scores
  Aggregated domain-level maturity scores
  - `id` (uuid, primary key)
  - `assessment_id` (uuid) - Foreign key to assessments
  - `domain_id` (uuid) - Foreign key to aml_domains
  - `average_maturity` (numeric) - Average maturity across controls
  - `weighted_score` (numeric) - Maturity * domain weight
  - `controls_assessed` (integer) - Number of controls evaluated
  - `controls_total` (integer) - Total applicable controls
  - `compliance_percentage` (numeric) - % of controls at level 3+
  - `gaps_critical` (integer) - Count of critical gaps
  - `gaps_high` (integer)
  - `gaps_medium` (integer)
  - `gaps_low` (integer)
  
  ### gap_analysis
  Identified compliance gaps and weaknesses
  - `id` (uuid, primary key)
  - `assessment_id` (uuid) - Foreign key to assessments
  - `control_assessment_id` (uuid) - Foreign key to control_assessments
  - `gap_category` (text) - missing-control/weak-implementation/inadequate-evidence/ineffective-testing
  - `severity` (text) - critical/high/medium/low
  - `gap_description` (text)
  - `regulatory_risk` (text) - Potential regulatory impact
  - `business_impact` (text)
  - `recommended_action` (text)
  - `priority_score` (integer) - 1-10 for prioritization
  - `status` (text) - identified/acknowledged/in-remediation/resolved
  - `created_at` (timestamptz)
  
  ### remediation_plans
  Enhanced action plans linked to gaps and controls
  - `id` (uuid, primary key)
  - `assessment_id` (uuid) - Foreign key to assessments
  - `gap_id` (uuid) - Foreign key to gap_analysis
  - `control_id` (uuid) - Foreign key to aml_controls
  - `action_description` (text)
  - `responsible_party` (text)
  - `accountable_party` (text)
  - `target_maturity_level` (integer) - Target maturity (1-5)
  - `estimated_cost` (numeric)
  - `estimated_effort_days` (integer)
  - `priority` (text) - critical/high/medium/low
  - `status` (text) - planned/in-progress/completed/deferred
  - `start_date` (date)
  - `target_date` (date)
  - `completion_date` (date)
  - `progress_percentage` (integer) - 0-100
  - `progress_notes` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### assessment_snapshots
  Historical snapshots for trend analysis
  - `id` (uuid, primary key)
  - `organization_id` (uuid) - References organizations table
  - `assessment_id` (uuid)
  - `snapshot_date` (date)
  - `overall_maturity` (numeric)
  - `domain_scores` (jsonb) - All domain scores at snapshot
  - `control_count_by_level` (jsonb) - Distribution of controls across maturity levels
  - `gap_count_by_severity` (jsonb)
  - `snapshot_type` (text) - baseline/periodic/remediation/annual
  
  ## 2. Security (RLS Policies)
  All tables have RLS enabled with policies for:
  - Users can view/manage data for their organization
  - Admins can view all data
  
  ## 3. Indexes
  Optimized indexes for frequent queries on:
  - assessment_id lookups
  - domain_id and control_id lookups
  - gap severity and status
  - date-based queries for trending
*/

-- Create maturity_levels table (reference data)
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

-- Create control_evidence_mapping table
CREATE TABLE IF NOT EXISTS control_evidence_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_assessment_id uuid NOT NULL REFERENCES control_assessments(id) ON DELETE CASCADE,
  document_id uuid REFERENCES secure_documents(id) ON DELETE SET NULL,
  evidence_type text CHECK (evidence_type IN ('policy', 'procedure', 'record', 'report', 'system-output', 'other')),
  coverage_percentage integer DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz DEFAULT now()
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
  priority_score integer DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
  status text DEFAULT 'identified' CHECK (status IN ('identified', 'acknowledged', 'in-remediation', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create remediation_plans table (enhanced)
CREATE TABLE IF NOT EXISTS remediation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  gap_id uuid REFERENCES gap_analysis(id) ON DELETE SET NULL,
  control_id uuid REFERENCES aml_controls(id) ON DELETE SET NULL,
  action_description text NOT NULL,
  responsible_party text,
  accountable_party text,
  target_maturity_level integer CHECK (target_maturity_level >= 1 AND target_maturity_level <= 5),
  estimated_cost numeric,
  estimated_effort_days integer,
  priority text DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'deferred', 'cancelled')),
  start_date date,
  target_date date,
  completion_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  progress_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_snapshots table
CREATE TABLE IF NOT EXISTS assessment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  overall_maturity numeric CHECK (overall_maturity >= 1 AND overall_maturity <= 5),
  domain_scores jsonb DEFAULT '{}',
  control_count_by_level jsonb DEFAULT '{}',
  gap_count_by_severity jsonb DEFAULT '{}',
  snapshot_type text DEFAULT 'periodic' CHECK (snapshot_type IN ('baseline', 'periodic', 'remediation', 'annual')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aml_controls_domain_id ON aml_controls(domain_id);
CREATE INDEX IF NOT EXISTS idx_aml_controls_code ON aml_controls(control_code);
CREATE INDEX IF NOT EXISTS idx_control_assessments_assessment_id ON control_assessments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_control_assessments_control_id ON control_assessments(control_id);
CREATE INDEX IF NOT EXISTS idx_control_assessments_maturity ON control_assessments(maturity_level);
CREATE INDEX IF NOT EXISTS idx_control_evidence_mapping_assessment ON control_evidence_mapping(control_assessment_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_assessment_id ON domain_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_domain_id ON domain_scores(domain_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_assessment_id ON gap_analysis(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_severity ON gap_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_status ON gap_analysis(status);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_assessment_id ON remediation_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_remediation_plans_status ON remediation_plans(status);
CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_org ON assessment_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_date ON assessment_snapshots(snapshot_date);

-- Enable RLS on all tables
ALTER TABLE maturity_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_evidence_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maturity_levels (public reference data)
CREATE POLICY "Anyone can view maturity levels"
  ON maturity_levels FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for aml_domains (public reference data)
CREATE POLICY "Anyone can view AML domains"
  ON aml_domains FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for aml_controls (public reference data)
CREATE POLICY "Anyone can view AML controls"
  ON aml_controls FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for control_assessments
CREATE POLICY "Users can view control assessments for their organization"
  ON control_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = control_assessments.assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert control assessments for their organization"
  ON control_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = control_assessments.assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update control assessments for their organization"
  ON control_assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = control_assessments.assessment_id
      AND up.id = auth.uid()
    )
  );

-- RLS Policies for control_evidence_mapping
CREATE POLICY "Users can view evidence mapping for their organization"
  ON control_evidence_mapping FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage evidence mapping for their organization"
  ON control_evidence_mapping FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM control_assessments ca
      JOIN assessments a ON a.id = ca.assessment_id
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE ca.id = control_evidence_mapping.control_assessment_id
      AND up.id = auth.uid()
    )
  );

-- RLS Policies for domain_scores
CREATE POLICY "Users can view domain scores for their organization"
  ON domain_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = domain_scores.assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage domain scores for their organization"
  ON domain_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = domain_scores.assessment_id
      AND up.id = auth.uid()
    )
  );

-- RLS Policies for gap_analysis
CREATE POLICY "Users can view gap analysis for their organization"
  ON gap_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = gap_analysis.assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage gap analysis for their organization"
  ON gap_analysis FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = gap_analysis.assessment_id
      AND up.id = auth.uid()
    )
  );

-- RLS Policies for remediation_plans
CREATE POLICY "Users can view remediation plans for their organization"
  ON remediation_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = remediation_plans.assessment_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage remediation plans for their organization"
  ON remediation_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN user_profiles up ON up.organization_id = a.organization_id
      WHERE a.id = remediation_plans.assessment_id
      AND up.id = auth.uid()
    )
  );

-- RLS Policies for assessment_snapshots
CREATE POLICY "Users can view snapshots for their organization"
  ON assessment_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = assessment_snapshots.organization_id
    )
  );

CREATE POLICY "Users can create snapshots for their organization"
  ON assessment_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = assessment_snapshots.organization_id
    )
  );

-- Admin policies for all tables
CREATE POLICY "Admins can view all control assessments"
  ON control_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all control assessments"
  ON control_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all evidence mappings"
  ON control_evidence_mapping FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all domain scores"
  ON domain_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all gap analysis"
  ON gap_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all remediation plans"
  ON remediation_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all snapshots"
  ON assessment_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );