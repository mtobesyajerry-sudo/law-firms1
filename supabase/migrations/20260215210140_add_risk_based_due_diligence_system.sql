/*
  # Risk-Based Customer Due Diligence System

  ## Overview
  This migration implements a comprehensive risk-based CDD framework aligned with:
  - FATF Risk-Based Approach
  - Tanzania Anti-Money Laundering laws
  - DNFBP guidance
  - National Risk Assessment requirements

  ## New Tables

  ### 1. `client_due_diligence_profiles`
  Stores the due diligence level and risk profile for each client.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `dd_level` (enum: 'simplified', 'moderate', 'enhanced')
  - `risk_score` (numeric: 0-100)
  - `risk_category` (text: 'low', 'medium', 'high')
  - `risk_justification` (text)
  - `last_assessment_date` (timestamptz)
  - `next_review_date` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `risk_scoring_details`
  Detailed breakdown of risk scores by category.
  - `id` (uuid, primary key)
  - `dd_profile_id` (uuid, references client_due_diligence_profiles)
  - `client_risk_score` (numeric)
  - `geographic_risk_score` (numeric)
  - `service_risk_score` (numeric)
  - `behavioural_risk_score` (numeric)
  - `institutional_risk_score` (numeric)
  - `total_risk_score` (numeric)
  - `scoring_factors` (jsonb)
  - `created_at` (timestamptz)

  ### 3. `dd_escalations`
  Tracks when due diligence level is escalated.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `previous_dd_level` (text)
  - `new_dd_level` (text)
  - `escalation_reason` (text)
  - `trigger_type` (text)
  - `escalated_by` (uuid, references user_profiles)
  - `escalated_at` (timestamptz)
  - `approved_by` (uuid, references user_profiles)
  - `approved_at` (timestamptz)
  - `status` (text: 'pending', 'approved', 'rejected')

  ### 4. `senior_management_approvals`
  Tracks senior management approvals for high-risk clients.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `approval_type` (text: 'onboarding', 'continuation', 'escalation')
  - `requested_by` (uuid, references user_profiles)
  - `requested_at` (timestamptz)
  - `approved_by` (uuid, references user_profiles)
  - `approved_at` (timestamptz)
  - `status` (text: 'pending', 'approved', 'rejected')
  - `justification` (text)
  - `decision_notes` (text)

  ### 5. `source_of_wealth_funds`
  Captures source of wealth and funds for EDD clients.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `source_of_wealth` (text)
  - `source_of_funds` (text)
  - `wealth_description` (text)
  - `estimated_net_worth` (numeric)
  - `annual_income` (numeric)
  - `assets_description` (text)
  - `employment_details` (text)
  - `business_interests` (text)
  - `supporting_documents` (jsonb)
  - `verified_by` (uuid, references user_profiles)
  - `verified_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `red_flags`
  Tracks detected red flags and suspicious indicators.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `flag_type` (text)
  - `flag_category` (text: 'pep', 'geographic', 'transaction', 'behavioural', 'documentation')
  - `severity` (text: 'low', 'medium', 'high', 'critical')
  - `description` (text)
  - `detected_at` (timestamptz)
  - `detected_by` (text: 'system' or 'manual')
  - `reviewed_by` (uuid, references user_profiles)
  - `reviewed_at` (timestamptz)
  - `status` (text: 'open', 'under_review', 'resolved', 'false_positive')
  - `resolution_notes` (text)
  - `requires_str` (boolean)

  ### 7. `enhanced_monitoring_requirements`
  Defines enhanced monitoring requirements for high-risk clients.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `monitoring_frequency` (text: 'daily', 'weekly', 'monthly')
  - `transaction_threshold` (numeric)
  - `review_requirements` (jsonb)
  - `additional_checks` (jsonb)
  - `assigned_to` (uuid, references user_profiles)
  - `active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. `dd_audit_trail`
  Comprehensive audit trail for all DD decisions.
  - `id` (uuid, primary key)
  - `client_id` (uuid, references kyc_clients)
  - `action_type` (text)
  - `action_description` (text)
  - `previous_state` (jsonb)
  - `new_state` (jsonb)
  - `justification` (text)
  - `performed_by` (uuid, references user_profiles)
  - `performed_at` (timestamptz)
  - `metadata` (jsonb)

  ## Security
  - All tables have RLS enabled
  - Policies ensure proper access control based on user roles
  - Audit trail is immutable (insert-only)
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE dd_level AS ENUM ('simplified', 'moderate', 'enhanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE flag_status AS ENUM ('open', 'under_review', 'resolved', 'false_positive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Client Due Diligence Profiles
CREATE TABLE IF NOT EXISTS client_due_diligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dd_level dd_level NOT NULL DEFAULT 'moderate',
  risk_score numeric CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_category text CHECK (risk_category IN ('low', 'medium', 'high')),
  risk_justification text,
  last_assessment_date timestamptz DEFAULT now(),
  next_review_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Risk Scoring Details
CREATE TABLE IF NOT EXISTS risk_scoring_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_profile_id uuid REFERENCES client_due_diligence_profiles(id) ON DELETE CASCADE NOT NULL,
  client_risk_score numeric DEFAULT 0,
  geographic_risk_score numeric DEFAULT 0,
  service_risk_score numeric DEFAULT 0,
  behavioural_risk_score numeric DEFAULT 0,
  institutional_risk_score numeric DEFAULT 0,
  total_risk_score numeric DEFAULT 0,
  scoring_factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. DD Escalations
CREATE TABLE IF NOT EXISTS dd_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  previous_dd_level text NOT NULL,
  new_dd_level text NOT NULL,
  escalation_reason text NOT NULL,
  trigger_type text,
  escalated_by uuid REFERENCES user_profiles(id),
  escalated_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  status approval_status DEFAULT 'pending'
);

-- 4. Senior Management Approvals
CREATE TABLE IF NOT EXISTS senior_management_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  approval_type text CHECK (approval_type IN ('onboarding', 'continuation', 'escalation')) NOT NULL,
  requested_by uuid REFERENCES user_profiles(id) NOT NULL,
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  status approval_status DEFAULT 'pending',
  justification text NOT NULL,
  decision_notes text
);

-- 5. Source of Wealth and Funds
CREATE TABLE IF NOT EXISTS source_of_wealth_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  source_of_wealth text,
  source_of_funds text,
  wealth_description text,
  estimated_net_worth numeric,
  annual_income numeric,
  assets_description text,
  employment_details text,
  business_interests text,
  supporting_documents jsonb DEFAULT '[]',
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Red Flags
CREATE TABLE IF NOT EXISTS red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  flag_type text NOT NULL,
  flag_category text CHECK (flag_category IN ('pep', 'geographic', 'transaction', 'behavioural', 'documentation')) NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  detected_by text DEFAULT 'system',
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  status flag_status DEFAULT 'open',
  resolution_notes text,
  requires_str boolean DEFAULT false
);

-- 7. Enhanced Monitoring Requirements
CREATE TABLE IF NOT EXISTS enhanced_monitoring_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  monitoring_frequency text CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'monthly',
  transaction_threshold numeric,
  review_requirements jsonb DEFAULT '[]',
  additional_checks jsonb DEFAULT '[]',
  assigned_to uuid REFERENCES user_profiles(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. DD Audit Trail
CREATE TABLE IF NOT EXISTS dd_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  justification text,
  performed_by uuid REFERENCES user_profiles(id) NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dd_profiles_client ON client_due_diligence_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_level ON client_due_diligence_profiles(dd_level);
CREATE INDEX IF NOT EXISTS idx_dd_profiles_risk ON client_due_diligence_profiles(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_scoring_profile ON risk_scoring_details(dd_profile_id);
CREATE INDEX IF NOT EXISTS idx_escalations_client ON dd_escalations(client_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON dd_escalations(status);
CREATE INDEX IF NOT EXISTS idx_approvals_client ON senior_management_approvals(client_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON senior_management_approvals(status);
CREATE INDEX IF NOT EXISTS idx_wealth_client ON source_of_wealth_funds(client_id);
CREATE INDEX IF NOT EXISTS idx_red_flags_client ON red_flags(client_id);
CREATE INDEX IF NOT EXISTS idx_red_flags_status ON red_flags(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_client ON enhanced_monitoring_requirements(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_client ON dd_audit_trail(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON dd_audit_trail(performed_at);

-- Enable Row Level Security
ALTER TABLE client_due_diligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scoring_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_management_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_of_wealth_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_monitoring_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_due_diligence_profiles
CREATE POLICY "Users can view DD profiles for their organization"
  ON client_due_diligence_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert DD profiles for their clients"
  ON client_due_diligence_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update DD profiles for their clients"
  ON client_due_diligence_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for risk_scoring_details
CREATE POLICY "Users can view risk scoring for their clients"
  ON risk_scoring_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_due_diligence_profiles cddp
      INNER JOIN kyc_clients kc ON cddp.client_id = kc.id
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE cddp.id = dd_profile_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert risk scoring for their clients"
  ON risk_scoring_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_due_diligence_profiles cddp
      INNER JOIN kyc_clients kc ON cddp.client_id = kc.id
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE cddp.id = dd_profile_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for dd_escalations
CREATE POLICY "Users can view escalations for their clients"
  ON dd_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert escalations for their clients"
  ON dd_escalations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update escalations for their clients"
  ON dd_escalations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for senior_management_approvals
CREATE POLICY "Users can view approvals for their clients"
  ON senior_management_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert approval requests for their clients"
  ON senior_management_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Senior users can update approvals"
  ON senior_management_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
      AND up.role IN ('admin', 'compliance_officer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
      AND up.role IN ('admin', 'compliance_officer')
    )
  );

-- RLS Policies for source_of_wealth_funds
CREATE POLICY "Users can view wealth info for their clients"
  ON source_of_wealth_funds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert wealth info for their clients"
  ON source_of_wealth_funds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update wealth info for their clients"
  ON source_of_wealth_funds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for red_flags
CREATE POLICY "Users can view red flags for their clients"
  ON red_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert red flags for their clients"
  ON red_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update red flags for their clients"
  ON red_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for enhanced_monitoring_requirements
CREATE POLICY "Users can view monitoring requirements for their clients"
  ON enhanced_monitoring_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert monitoring requirements for their clients"
  ON enhanced_monitoring_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update monitoring requirements for their clients"
  ON enhanced_monitoring_requirements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- RLS Policies for dd_audit_trail (read-only for most, insert-only)
CREATE POLICY "Users can view audit trail for their clients"
  ON dd_audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit trail for their clients"
  ON dd_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients kc
      INNER JOIN user_profiles up ON kc.organization_id = up.organization_id
      WHERE kc.id = client_id AND up.id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_dd_profiles_updated_at BEFORE UPDATE ON client_due_diligence_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_wealth_updated_at BEFORE UPDATE ON source_of_wealth_funds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_monitoring_updated_at BEFORE UPDATE ON enhanced_monitoring_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;