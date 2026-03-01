/*
  # Create Client Transactions Table
  
  Creates transactions table for tracking client financial activities with RLS policies
*/

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES kyc_clients(id) ON DELETE CASCADE,
  transaction_ref TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'trade', 'fx_exchange', 'wire', 'cash', 'check')),
  transaction_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  counterparty_name TEXT,
  counterparty_country TEXT,
  origin_country TEXT,
  destination_country TEXT,
  transaction_description TEXT,
  transaction_channel TEXT CHECK (transaction_channel IN ('online', 'branch', 'atm', 'mobile', 'api')),
  high_risk_country BOOLEAN DEFAULT false,
  cash_intensive BOOLEAN DEFAULT false,
  cross_border BOOLEAN DEFAULT false,
  risk_score INT DEFAULT 0,
  alert_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
