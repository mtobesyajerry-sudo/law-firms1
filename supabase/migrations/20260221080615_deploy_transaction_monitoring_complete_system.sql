/*
  # Transaction Monitoring System - Complete Implementation
  
  ## Overview
  Deploys the complete transaction monitoring system including:
  - Transaction records table
  - Behavioral profiling for AI-driven monitoring
  - Integration with existing alert system
  
  ## Tables Created
  1. `transactions` - All financial transaction records
  2. `behavioral_profiles` - AI-driven customer behavior baselines
  
  ## Security
  - RLS enabled
  - Organization-scoped access
  
  ## Compliance
  - Tanzania AML Regulations 2022 - Transaction monitoring
  - FATF Recommendation 10 - Record keeping
  - FATF Recommendation 20 - Suspicious transaction reporting
*/

-- Transactions Table (Core transaction records)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  transaction_ref text UNIQUE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'trade', 'fx_exchange', 'wire', 'cash', 'check')),
  transaction_date timestamptz DEFAULT now(),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'TZS',
  amount_usd numeric,
  counterparty_name text,
  counterparty_account text,
  counterparty_bank text,
  counterparty_country text,
  originating_country text,
  destination_country text,
  purpose_code text,
  description text,
  channel text CHECK (channel IN ('branch', 'atm', 'online', 'mobile', 'agent')),
  is_cash boolean DEFAULT false,
  is_cross_border boolean DEFAULT false,
  is_high_value boolean DEFAULT false,
  risk_score integer DEFAULT 0,
  risk_indicators jsonb,
  alerts_generated integer DEFAULT 0,
  flagged_for_review boolean DEFAULT false,
  reviewed_by_id uuid,
  review_date timestamptz,
  review_outcome text CHECK (review_outcome IN ('cleared', 'suspicious', 'escalated')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_flagged ON transactions(flagged_for_review);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);

-- Behavioral Profiles (AI-driven customer behavior baselines)
CREATE TABLE IF NOT EXISTS behavioral_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  profile_period_start date NOT NULL,
  profile_period_end date NOT NULL,
  transaction_count integer DEFAULT 0,
  avg_transaction_amount numeric DEFAULT 0,
  max_transaction_amount numeric DEFAULT 0,
  total_volume numeric DEFAULT 0,
  typical_transaction_types jsonb,
  typical_counterparties jsonb,
  typical_countries jsonb,
  typical_channels jsonb,
  transaction_frequency_pattern jsonb,
  anomaly_threshold numeric DEFAULT 2.0,
  baseline_risk_score integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_client ON behavioral_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_org ON behavioral_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_period ON behavioral_profiles(profile_period_start, profile_period_end);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Transactions
CREATE POLICY "Users can view own organization transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- RLS Policies for Behavioral Profiles
CREATE POLICY "Users can view own organization behavioral profiles"
  ON behavioral_profiles FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage behavioral profiles"
  ON behavioral_profiles FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));