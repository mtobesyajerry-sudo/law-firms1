/*
  # Add Comprehensive Subscription Management System

  1. New Tables
    - `subscription_plans` - Defines available subscription tiers and pricing
    - `organization_subscriptions` - Tracks organization subscription history and status
    - `payment_transactions` - Records all payment transactions
    - `subscription_features` - Define features per subscription tier

  2. Changes to Existing Tables
    - Add subscription-related fields to `organizations` table

  3. Security
    - Enable RLS on all new tables
    - Add policies for subscription management
    - Only admins and system admins can manage subscriptions

  4. Features
    - Trial period support (30 days)
    - Multiple subscription tiers (Trial, Basic, Professional, Enterprise)
    - Payment tracking
    - Automatic suspension on expiry
    - Feature-based access control
*/

-- Add subscription fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial' 
  CHECK (subscription_tier IN ('trial', 'basic', 'professional', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' 
  CHECK (subscription_status IN ('active', 'expired', 'suspended', 'cancelled')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'overdue', 'failed'));

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise')),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  annual_price DECIMAL(10,2),
  max_users INTEGER NOT NULL DEFAULT 5,
  max_clients INTEGER,
  max_assessments_per_month INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create organization subscriptions history table
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  tier TEXT NOT NULL CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TZS',
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual', 'trial')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL 
    CHECK (transaction_type IN ('subscription', 'renewal', 'upgrade', 'refund', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'mobile_money', 'credit_card', 'cash', 'other')),
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_date TIMESTAMPTZ,
  receipt_number TEXT,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create subscription features table
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise')),
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  limit_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tier, feature_key)
);

ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;

-- Seed subscription plans
INSERT INTO subscription_plans (tier, name, description, monthly_price, annual_price, max_users, max_clients, max_assessments_per_month, display_order, features)
VALUES 
  ('trial', '30-Day Trial', 'Full access for 30 days to explore all features', 0, 0, 5, 10, 10, 1, 
    '["client_management", "risk_assessments", "basic_reporting", "email_support"]'::jsonb),
  ('basic', 'Basic Plan', 'Essential AML compliance tools for small firms', 50000, 500000, 5, 50, 50, 2, 
    '["client_management", "risk_assessments", "kyc_cdd", "basic_reporting", "email_support"]'::jsonb),
  ('professional', 'Professional Plan', 'Advanced features for growing practices', 150000, 1500000, 15, 200, 200, 3, 
    '["client_management", "risk_assessments", "kyc_cdd", "advanced_reporting", "transaction_monitoring", "screening", "priority_support", "api_access"]'::jsonb),
  ('enterprise', 'Enterprise Plan', 'Unlimited access with premium support', 500000, 5000000, 100, NULL, NULL, 4, 
    '["all_features", "unlimited_users", "unlimited_clients", "unlimited_assessments", "custom_integrations", "dedicated_support", "training", "api_access"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  max_users = EXCLUDED.max_users,
  features = EXCLUDED.features,
  updated_at = now();

-- Seed subscription features
INSERT INTO subscription_features (tier, feature_key, feature_name, feature_description, is_enabled, limit_value)
VALUES 
  -- Trial features
  ('trial', 'max_users', 'Maximum Users', 'Number of staff users allowed', true, 5),
  ('trial', 'max_clients', 'Maximum Clients', 'Number of clients that can be managed', true, 10),
  ('trial', 'max_assessments', 'Maximum Assessments', 'Risk assessments per month', true, 10),
  ('trial', 'duration_days', 'Trial Duration', 'Number of days for trial period', true, 30),
  
  -- Basic features
  ('basic', 'max_users', 'Maximum Users', 'Number of staff users allowed', true, 5),
  ('basic', 'max_clients', 'Maximum Clients', 'Number of clients that can be managed', true, 50),
  ('basic', 'max_assessments', 'Maximum Assessments', 'Risk assessments per month', true, 50),
  ('basic', 'client_management', 'Client Management', 'Full CDD/KYC client management', true, NULL),
  ('basic', 'risk_assessments', 'Risk Assessments', 'Institutional risk assessments', true, NULL),
  ('basic', 'basic_reporting', 'Basic Reporting', 'Standard compliance reports', true, NULL),
  
  -- Professional features
  ('professional', 'max_users', 'Maximum Users', 'Number of staff users allowed', true, 15),
  ('professional', 'max_clients', 'Maximum Clients', 'Number of clients that can be managed', true, 200),
  ('professional', 'max_assessments', 'Maximum Assessments', 'Risk assessments per month', true, 200),
  ('professional', 'transaction_monitoring', 'Transaction Monitoring', 'Monitor client transactions', true, NULL),
  ('professional', 'screening', 'Sanctions Screening', 'PEP and sanctions list screening', true, NULL),
  ('professional', 'advanced_reporting', 'Advanced Reporting', 'Custom reports and analytics', true, NULL),
  ('professional', 'api_access', 'API Access', 'Programmatic access to platform', true, NULL),
  
  -- Enterprise features
  ('enterprise', 'unlimited_users', 'Unlimited Users', 'No limit on staff users', true, NULL),
  ('enterprise', 'unlimited_clients', 'Unlimited Clients', 'No limit on client management', true, NULL),
  ('enterprise', 'unlimited_assessments', 'Unlimited Assessments', 'No limit on assessments', true, NULL),
  ('enterprise', 'all_features', 'All Features', 'Access to all platform features', true, NULL),
  ('enterprise', 'custom_integrations', 'Custom Integrations', 'Tailored system integrations', true, NULL),
  ('enterprise', 'dedicated_support', 'Dedicated Support', '24/7 priority support', true, NULL),
  ('enterprise', 'training', 'Staff Training', 'Onboarding and ongoing training', true, NULL)
ON CONFLICT (tier, feature_key) DO NOTHING;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "System admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'system_admin'
    )
  );

-- RLS Policies for organization_subscriptions
CREATE POLICY "Users can view their organization subscriptions"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('system_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage organization subscriptions"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('system_admin', 'admin')
    )
  );

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their organization payments"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('system_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage payment transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('system_admin', 'admin')
    )
  );

-- RLS Policies for subscription_features
CREATE POLICY "Anyone can view subscription features"
  ON subscription_features FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "System admins can manage subscription features"
  ON subscription_features FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'system_admin'
    )
  );

-- Function to check subscription status and update if expired
CREATE OR REPLACE FUNCTION check_subscription_status(org_id UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  status TEXT,
  tier TEXT,
  days_remaining INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT 
    o.subscription_status,
    o.subscription_tier,
    o.subscription_expiry_date,
    o.trial_ends_at,
    o.is_active as org_active
  INTO org_record
  FROM organizations o
  WHERE o.id = org_id;

  -- Check if trial has expired
  IF org_record.subscription_tier = 'trial' 
     AND org_record.trial_ends_at IS NOT NULL 
     AND org_record.trial_ends_at < now() THEN
    
    UPDATE organizations 
    SET 
      subscription_status = 'expired',
      is_active = false
    WHERE id = org_id;
    
    RETURN QUERY SELECT false, 'expired'::TEXT, 'trial'::TEXT, 0;
    RETURN;
  END IF;

  -- Check if subscription has expired
  IF org_record.subscription_expiry_date IS NOT NULL 
     AND org_record.subscription_expiry_date < now() THEN
    
    UPDATE organizations 
    SET 
      subscription_status = 'expired',
      payment_status = 'overdue'
    WHERE id = org_id;
    
    RETURN QUERY SELECT false, 'expired'::TEXT, org_record.subscription_tier, 0;
    RETURN;
  END IF;

  -- Calculate days remaining
  RETURN QUERY SELECT 
    true,
    org_record.subscription_status,
    org_record.subscription_tier,
    CASE 
      WHEN org_record.subscription_tier = 'trial' THEN
        EXTRACT(DAY FROM (org_record.trial_ends_at - now()))::INTEGER
      WHEN org_record.subscription_expiry_date IS NOT NULL THEN
        EXTRACT(DAY FROM (org_record.subscription_expiry_date - now()))::INTEGER
      ELSE NULL
    END;
END;
$$;

-- Function to initialize trial subscription for new organizations
CREATE OR REPLACE FUNCTION initialize_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set trial period (30 days from now)
  NEW.subscription_tier := COALESCE(NEW.subscription_tier, 'trial');
  NEW.subscription_status := COALESCE(NEW.subscription_status, 'active');
  NEW.trial_ends_at := COALESCE(NEW.trial_ends_at, now() + INTERVAL '30 days');
  NEW.subscription_expiry_date := COALESCE(NEW.subscription_expiry_date, now() + INTERVAL '30 days');
  NEW.monthly_fee := COALESCE(NEW.monthly_fee, 0);
  NEW.payment_status := COALESCE(NEW.payment_status, 'paid');
  NEW.is_active := COALESCE(NEW.is_active, true);
  
  RETURN NEW;
END;
$$;

-- Create trigger for trial initialization
DROP TRIGGER IF EXISTS set_trial_subscription_trigger ON organizations;
CREATE TRIGGER set_trial_subscription_trigger
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION initialize_trial_subscription();

-- Update existing organizations to have trial subscription
UPDATE organizations
SET 
  subscription_tier = COALESCE(subscription_tier, 'trial'),
  subscription_status = COALESCE(subscription_status, 'active'),
  trial_ends_at = COALESCE(trial_ends_at, now() + INTERVAL '30 days'),
  subscription_expiry_date = COALESCE(subscription_expiry_date, now() + INTERVAL '30 days'),
  monthly_fee = COALESCE(monthly_fee, 0),
  payment_status = COALESCE(payment_status, 'paid')
WHERE subscription_tier IS NULL OR subscription_status IS NULL;

-- Create initial subscription records for existing organizations
INSERT INTO organization_subscriptions (organization_id, tier, status, start_date, end_date, trial_ends_at, monthly_fee, billing_cycle)
SELECT 
  id,
  COALESCE(subscription_tier, 'trial'),
  COALESCE(subscription_status, 'active'),
  created_at,
  subscription_expiry_date,
  trial_ends_at,
  COALESCE(monthly_fee, 0),
  'trial'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM organization_subscriptions 
  WHERE organization_subscriptions.organization_id = organizations.id
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_id ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);
