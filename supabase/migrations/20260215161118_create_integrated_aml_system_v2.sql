/*
  # Create Integrated AML Compliance System

  ## Overview
  This migration creates a comprehensive AML compliance system for law firms that integrates:
  - Institutional Risk Assessment (existing)
  - Client KYC and risk scoring
  - Enhanced Due Diligence (EDD)
  - Monitoring and alerts
  - Suspicious Transaction Reports (STR)

  ## New Tables

  ### 1. `kyc_clients` - Client profile information
  ### 2. `kyc_assessments` - KYC assessment records
  ### 3. `enhanced_due_diligence` - EDD records for high-risk clients
  ### 4. `monitoring_activities` - Ongoing monitoring activities
  ### 5. `suspicious_transaction_reports` - STR filing records
  ### 6. `system_alerts` - System-generated alerts
  ### 7. `risk_appetite_settings` - Organization risk appetite settings

  ## Security
  - Enable RLS on all tables
  - Organization-based access control
*/

-- Create kyc_clients table
CREATE TABLE IF NOT EXISTS kyc_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_type text NOT NULL CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'other')),
  client_name text NOT NULL,
  client_id_number text,
  date_of_birth date,
  incorporation_date date,
  nationality text,
  country_of_residence text,
  country_of_incorporation text,
  business_activity text,
  source_of_funds text,
  source_of_wealth text,
  estimated_annual_turnover text,
  purpose_of_relationship text,
  beneficial_owners jsonb DEFAULT '[]'::jsonb,
  pep_status boolean DEFAULT false,
  sanctions_screening_result text,
  adverse_media_findings text,
  client_status text DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'suspended', 'rejected')),
  base_risk_score integer DEFAULT 0 CHECK (base_risk_score >= 0 AND base_risk_score <= 100),
  current_risk_rating text CHECK (current_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  institutional_risk_multiplier numeric DEFAULT 1.0,
  next_review_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create kyc_assessments table
CREATE TABLE IF NOT EXISTS kyc_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  assessment_type text DEFAULT 'initial' CHECK (assessment_type IN ('initial', 'periodic_review', 'trigger_event', 'enhanced_dd')),
  assessment_date date DEFAULT CURRENT_DATE,
  assessor_name text,
  assessor_position text,
  client_risk_factors jsonb DEFAULT '{}'::jsonb,
  identity_verification_status text CHECK (identity_verification_status IN ('pending', 'verified', 'failed', 'not_applicable')),
  document_verification_status text CHECK (document_verification_status IN ('pending', 'verified', 'failed', 'not_applicable')),
  source_of_funds_verified boolean DEFAULT false,
  beneficial_ownership_verified boolean DEFAULT false,
  pep_screening_completed boolean DEFAULT false,
  sanctions_screening_completed boolean DEFAULT false,
  adverse_media_screening_completed boolean DEFAULT false,
  customer_risk_score integer DEFAULT 0 CHECK (customer_risk_score >= 0 AND customer_risk_score <= 100),
  transaction_risk_score integer DEFAULT 0 CHECK (transaction_risk_score >= 0 AND transaction_risk_score <= 100),
  geographic_risk_score integer DEFAULT 0 CHECK (geographic_risk_score >= 0 AND geographic_risk_score <= 100),
  product_service_risk_score integer DEFAULT 0 CHECK (product_service_risk_score >= 0 AND product_service_risk_score <= 100),
  base_risk_rating text CHECK (base_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  adjusted_risk_rating text CHECK (adjusted_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  institutional_assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  edd_required boolean DEFAULT false,
  edd_triggers jsonb DEFAULT '[]'::jsonb,
  monitoring_frequency text DEFAULT 'annual' CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approval_date date,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create enhanced_due_diligence table
CREATE TABLE IF NOT EXISTS enhanced_due_diligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  kyc_assessment_id uuid REFERENCES kyc_assessments(id) ON DELETE SET NULL,
  edd_triggers jsonb DEFAULT '[]'::jsonb,
  senior_management_approval boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approval_date date,
  additional_information_obtained jsonb DEFAULT '{}'::jsonb,
  source_of_wealth_documentation jsonb DEFAULT '[]'::jsonb,
  enhanced_monitoring_measures text,
  ongoing_due_diligence_plan text,
  risk_mitigation_measures text,
  review_frequency text DEFAULT 'quarterly' CHECK (review_frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  next_review_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'superseded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create suspicious_transaction_reports table (before monitoring_activities)
CREATE TABLE IF NOT EXISTS suspicious_transaction_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  str_reference_number text,
  reporting_date date DEFAULT CURRENT_DATE,
  reporting_officer text,
  mlro_approval boolean DEFAULT false,
  mlro_name text,
  mlro_approval_date date,
  suspicious_activity_description text,
  suspicious_transactions jsonb DEFAULT '[]'::jsonb,
  indicators_of_suspicion jsonb DEFAULT '[]'::jsonb,
  investigation_summary text,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  amount_involved numeric,
  currency text DEFAULT 'USD',
  filing_status text DEFAULT 'draft' CHECK (filing_status IN ('draft', 'pending_approval', 'submitted', 'acknowledged')),
  submission_date date,
  fiu_reference_number text,
  fiu_acknowledgement_date date,
  internal_case_number text,
  follow_up_actions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create monitoring_activities table
CREATE TABLE IF NOT EXISTS monitoring_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  activity_type text DEFAULT 'transaction_review' CHECK (activity_type IN ('transaction_review', 'periodic_review', 'alert_investigation', 'ongoing_monitoring')),
  activity_date date DEFAULT CURRENT_DATE,
  monitoring_officer text,
  findings text,
  transactions_reviewed jsonb DEFAULT '[]'::jsonb,
  suspicious_indicators jsonb DEFAULT '[]'::jsonb,
  risk_assessment_change text,
  action_taken text,
  escalated boolean DEFAULT false,
  escalation_reason text,
  str_filed boolean DEFAULT false,
  str_id uuid REFERENCES suspicious_transaction_reports(id) ON DELETE SET NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('review_due', 'high_risk_client', 'transaction_threshold', 'unusual_activity', 'document_expiry', 'edd_required', 'monitoring_alert')),
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  assessment_id uuid,
  alert_title text NOT NULL,
  alert_description text,
  alert_data jsonb DEFAULT '{}'::jsonb,
  triggered_date timestamptz DEFAULT now(),
  due_date date,
  status text DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  assigned_to uuid REFERENCES auth.users(id),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_date timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_date timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create risk_appetite_settings table
CREATE TABLE IF NOT EXISTS risk_appetite_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  institutional_risk_multipliers jsonb DEFAULT '{"Low": 1.0, "Medium": 1.2, "High": 1.5, "Very High": 2.0}'::jsonb,
  auto_edd_triggers jsonb DEFAULT '{"high_risk_country": true, "pep": true, "high_transaction_volume": true, "adverse_media": true}'::jsonb,
  monitoring_frequencies jsonb DEFAULT '{"Low": "annual", "Medium": "quarterly", "High": "monthly", "Very High": "weekly"}'::jsonb,
  approval_thresholds jsonb DEFAULT '{"Low": "officer", "Medium": "manager", "High": "senior_manager", "Very High": "mlro"}'::jsonb,
  transaction_thresholds jsonb DEFAULT '{"reporting_threshold": 10000, "enhanced_monitoring_threshold": 50000}'::jsonb,
  review_frequencies jsonb DEFAULT '{"Low": 36, "Medium": 24, "High": 12, "Very High": 6}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE kyc_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_due_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_transaction_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_appetite_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_clients
CREATE POLICY "Users can view kyc_clients in their organization"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert kyc_clients in their organization"
  ON kyc_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update kyc_clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete kyc_clients in their organization"
  ON kyc_clients FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for kyc_assessments
CREATE POLICY "Users can view kyc_assessments in their organization"
  ON kyc_assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert kyc_assessments in their organization"
  ON kyc_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update kyc_assessments in their organization"
  ON kyc_assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete kyc_assessments in their organization"
  ON kyc_assessments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for enhanced_due_diligence
CREATE POLICY "Users can view edd in their organization"
  ON enhanced_due_diligence FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert edd in their organization"
  ON enhanced_due_diligence FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update edd in their organization"
  ON enhanced_due_diligence FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete edd in their organization"
  ON enhanced_due_diligence FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for monitoring_activities
CREATE POLICY "Users can view monitoring_activities in their organization"
  ON monitoring_activities FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert monitoring_activities in their organization"
  ON monitoring_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update monitoring_activities in their organization"
  ON monitoring_activities FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete monitoring_activities in their organization"
  ON monitoring_activities FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for suspicious_transaction_reports
CREATE POLICY "Users can view str in their organization"
  ON suspicious_transaction_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert str in their organization"
  ON suspicious_transaction_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update str in their organization"
  ON suspicious_transaction_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete str in their organization"
  ON suspicious_transaction_reports FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for system_alerts
CREATE POLICY "Users can view alerts in their organization"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert alerts in their organization"
  ON system_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update alerts in their organization"
  ON system_alerts FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete alerts in their organization"
  ON system_alerts FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for risk_appetite_settings
CREATE POLICY "Users can view risk settings for their organization"
  ON risk_appetite_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert risk settings for their organization"
  ON risk_appetite_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update risk settings for their organization"
  ON risk_appetite_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kyc_clients_org ON kyc_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_status ON kyc_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_risk ON kyc_clients(current_risk_rating);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_review_date ON kyc_clients(next_review_date);

CREATE INDEX IF NOT EXISTS idx_kyc_assessments_org ON kyc_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_assessments_client ON kyc_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_assessments_status ON kyc_assessments(status);

CREATE INDEX IF NOT EXISTS idx_edd_org ON enhanced_due_diligence(organization_id);
CREATE INDEX IF NOT EXISTS idx_edd_client ON enhanced_due_diligence(client_id);
CREATE INDEX IF NOT EXISTS idx_edd_status ON enhanced_due_diligence(status);

CREATE INDEX IF NOT EXISTS idx_monitoring_org ON monitoring_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_client ON monitoring_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_status ON monitoring_activities(status);

CREATE INDEX IF NOT EXISTS idx_str_org ON suspicious_transaction_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_str_client ON suspicious_transaction_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_str_status ON suspicious_transaction_reports(filing_status);

CREATE INDEX IF NOT EXISTS idx_alerts_org ON system_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_client ON system_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned ON system_alerts(assigned_to);

-- Create trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_kyc_clients_updated_at') THEN
    CREATE TRIGGER update_kyc_clients_updated_at BEFORE UPDATE ON kyc_clients
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_kyc_assessments_updated_at') THEN
    CREATE TRIGGER update_kyc_assessments_updated_at BEFORE UPDATE ON kyc_assessments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_edd_updated_at') THEN
    CREATE TRIGGER update_edd_updated_at BEFORE UPDATE ON enhanced_due_diligence
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_monitoring_updated_at') THEN
    CREATE TRIGGER update_monitoring_updated_at BEFORE UPDATE ON monitoring_activities
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_str_updated_at') THEN
    CREATE TRIGGER update_str_updated_at BEFORE UPDATE ON suspicious_transaction_reports
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_risk_settings_updated_at') THEN
    CREATE TRIGGER update_risk_settings_updated_at BEFORE UPDATE ON risk_appetite_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
