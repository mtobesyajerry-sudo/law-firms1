/*
  # Create Transaction Monitoring and Alerts System

  1. New Tables
    - `transaction_monitoring_rules` - Rule configuration for transaction monitoring
    - `transaction_alerts` - Real-time transaction alerts and suspicious activity tracking
    
  2. Security
    - Enable RLS on all tables
    - Organization-level data isolation
    - Role-based access control
*/

-- ============================================
-- 1. TRANSACTION MONITORING RULES
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_monitoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  rule_code text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  rule_description text,
  rule_category text NOT NULL CHECK (rule_category IN ('amount_threshold', 'velocity', 'pattern', 'geographic', 'behavioral', 'typology')),
  
  is_active boolean DEFAULT true,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  threshold_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  large_transaction_threshold numeric DEFAULT 10000000,
  cash_transaction_threshold numeric DEFAULT 5000000,
  suspicious_pattern_indicators text[],
  
  base_alert_score integer DEFAULT 50 CHECK (base_alert_score >= 0 AND base_alert_score <= 100),
  
  applies_to_client_types text[] DEFAULT ARRAY['individual', 'corporate']::text[],
  applies_to_transaction_types text[],
  applies_to_risk_levels text[] DEFAULT ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  
  auto_escalate boolean DEFAULT false,
  auto_block boolean DEFAULT false,
  requires_immediate_review boolean DEFAULT false,
  
  regulatory_reference text,
  fiu_reporting_required boolean DEFAULT false,
  
  alerts_generated integer DEFAULT 0,
  true_positives integer DEFAULT 0,
  false_positives integer DEFAULT 0,
  effectiveness_rate numeric,
  
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tm_rules_org ON transaction_monitoring_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_tm_rules_active ON transaction_monitoring_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_tm_rules_category ON transaction_monitoring_rules(rule_category);

-- ============================================
-- 2. TRANSACTION ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  alert_number text UNIQUE NOT NULL,
  alert_date timestamp with time zone DEFAULT now(),
  
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  triggered_by_rule_id uuid REFERENCES transaction_monitoring_rules(id) ON DELETE SET NULL,
  
  alert_type text NOT NULL CHECK (alert_type IN ('amount_threshold', 'velocity', 'pattern', 'geographic', 'behavioral', 'typology', 'manual')),
  alert_severity text NOT NULL CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),
  alert_priority integer DEFAULT 5 CHECK (alert_priority >= 1 AND alert_priority <= 10),
  
  transaction_reference text,
  transaction_date timestamp with time zone,
  transaction_amount numeric,
  transaction_currency text DEFAULT 'TZS',
  transaction_type text,
  transaction_description text,
  related_transactions jsonb DEFAULT '[]'::jsonb,
  
  alert_description text NOT NULL,
  suspicious_indicators text[],
  risk_factors jsonb DEFAULT '{}'::jsonb,
  
  alert_score integer CHECK (alert_score >= 0 AND alert_score <= 100),
  client_risk_rating text,
  
  investigation_status text DEFAULT 'new' CHECK (investigation_status IN (
    'new', 'assigned', 'under_investigation', 'escalated',
    'resolved_no_action', 'resolved_str_filed', 'resolved_client_exited', 'false_positive'
  )),
  
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date timestamp with time zone,
  investigation_started_date timestamp with time zone,
  investigation_completed_date timestamp with time zone,
  
  investigation_notes text,
  additional_evidence jsonb DEFAULT '[]'::jsonb,
  investigator_conclusion text,
  
  resolution_type text CHECK (resolution_type IN ('no_action', 'str_filed', 'client_exited', 'false_positive', 'escalated', 'pending')),
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_date timestamp with time zone,
  
  str_filed boolean DEFAULT false,
  compliance_case_id uuid,
  
  is_false_positive boolean DEFAULT false,
  false_positive_reason text,
  
  target_resolution_date timestamp with time zone,
  sla_breached boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_alerts_org ON transaction_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_client ON transaction_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_status ON transaction_alerts(investigation_status);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_severity ON transaction_alerts(alert_severity);
CREATE INDEX IF NOT EXISTS idx_transaction_alerts_assigned ON transaction_alerts(assigned_to);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE transaction_monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own org TM rules" ON transaction_monitoring_rules FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage TM rules" ON transaction_monitoring_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users view own org alerts" ON transaction_alerts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users insert own org alerts" ON transaction_alerts FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users update own org alerts" ON transaction_alerts FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users delete own org alerts" ON transaction_alerts FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================
-- AUTOMATED TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION generate_alert_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_num text;
BEGIN
  IF NEW.alert_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT LPAD((COALESCE(MAX(SUBSTRING(alert_number FROM '[0-9]+$')::integer), 0) + 1)::text, 6, '0') INTO sequence_num
  FROM transaction_alerts
  WHERE organization_id = NEW.organization_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.alert_number := 'ALERT-' || year_part || '-' || sequence_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_alert_number ON transaction_alerts;
CREATE TRIGGER set_alert_number
  BEFORE INSERT ON transaction_alerts
  FOR EACH ROW
  EXECUTE FUNCTION generate_alert_number();

CREATE OR REPLACE FUNCTION update_transaction_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transaction_alerts_updated_at ON transaction_alerts;
CREATE TRIGGER update_transaction_alerts_updated_at 
  BEFORE UPDATE ON transaction_alerts
  FOR EACH ROW 
  EXECUTE FUNCTION update_transaction_alerts_updated_at();