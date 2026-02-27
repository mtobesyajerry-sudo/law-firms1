/*
  # Enhance KYC Clients Table - Comprehensive Fields
  
  ## Overview
  Adds all missing fields to kyc_clients table as specified in the enterprise
  requirements document, including:
  - Digital onboarding fields
  - Enhanced risk assessment fields
  - Screening and monitoring fields
  - Regulatory classification fields
  - Account restriction fields
  
  ## Fields Added
  - Onboarding channel tracking
  - Digital identity verification
  - Biometric verification
  - Industry sector classification
  - Cash-intensive business flag
  - Expected transaction volumes
  - Screening status and dates
  - Regulatory classification
  - FATF high-risk jurisdiction flag
  - Account restrictions
  - Enhanced monitoring reason
  
  ## Compliance
  - Tanzania AML Regulations 2022
  - FATF Risk-Based Approach
  - Enhanced customer profiling
*/

-- Add Digital Onboarding Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'onboarding_channel') THEN
    ALTER TABLE kyc_clients ADD COLUMN onboarding_channel text CHECK (onboarding_channel IN ('branch', 'mobile', 'web', 'agent', 'video_kyc'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'digital_identity_verified') THEN
    ALTER TABLE kyc_clients ADD COLUMN digital_identity_verified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'biometric_verification_status') THEN
    ALTER TABLE kyc_clients ADD COLUMN biometric_verification_status text CHECK (biometric_verification_status IN ('not_required', 'pending', 'passed', 'failed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'video_kyc_completed') THEN
    ALTER TABLE kyc_clients ADD COLUMN video_kyc_completed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'liveness_check_passed') THEN
    ALTER TABLE kyc_clients ADD COLUMN liveness_check_passed boolean DEFAULT false;
  END IF;
END $$;

-- Add Enhanced Risk Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'industry_sector') THEN
    ALTER TABLE kyc_clients ADD COLUMN industry_sector text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'industry_risk_level') THEN
    ALTER TABLE kyc_clients ADD COLUMN industry_risk_level text CHECK (industry_risk_level IN ('low', 'medium', 'high', 'very_high'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'cash_intensive_business') THEN
    ALTER TABLE kyc_clients ADD COLUMN cash_intensive_business boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'high_value_transactions_expected') THEN
    ALTER TABLE kyc_clients ADD COLUMN high_value_transactions_expected boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'expected_monthly_transactions') THEN
    ALTER TABLE kyc_clients ADD COLUMN expected_monthly_transactions integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'expected_monthly_volume_tzs') THEN
    ALTER TABLE kyc_clients ADD COLUMN expected_monthly_volume_tzs numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'expected_monthly_volume_usd') THEN
    ALTER TABLE kyc_clients ADD COLUMN expected_monthly_volume_usd numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'actual_monthly_volume_tzs') THEN
    ALTER TABLE kyc_clients ADD COLUMN actual_monthly_volume_tzs numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'cross_border_transactions_expected') THEN
    ALTER TABLE kyc_clients ADD COLUMN cross_border_transactions_expected boolean DEFAULT false;
  END IF;
END $$;

-- Add Screening Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'last_screening_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN last_screening_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'next_screening_due') THEN
    ALTER TABLE kyc_clients ADD COLUMN next_screening_due timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'screening_status') THEN
    ALTER TABLE kyc_clients ADD COLUMN screening_status text DEFAULT 'clear' CHECK (screening_status IN ('clear', 'pending_review', 'match_found', 'false_positive', 'not_screened'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'sanctions_hit') THEN
    ALTER TABLE kyc_clients ADD COLUMN sanctions_hit boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'pep_screening_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN pep_screening_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'adverse_media_found') THEN
    ALTER TABLE kyc_clients ADD COLUMN adverse_media_found boolean DEFAULT false;
  END IF;
END $$;

-- Add Regulatory Classification Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'regulatory_classification') THEN
    ALTER TABLE kyc_clients ADD COLUMN regulatory_classification text CHECK (regulatory_classification IN ('retail', 'sme', 'corporate', 'institutional', 'financial_institution'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'customer_segment') THEN
    ALTER TABLE kyc_clients ADD COLUMN customer_segment text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'fatf_high_risk_jurisdiction') THEN
    ALTER TABLE kyc_clients ADD COLUMN fatf_high_risk_jurisdiction boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'high_risk_countries') THEN
    ALTER TABLE kyc_clients ADD COLUMN high_risk_countries text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'tax_residency_countries') THEN
    ALTER TABLE kyc_clients ADD COLUMN tax_residency_countries text[];
  END IF;
END $$;

-- Add Account Status and Restrictions Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'account_restrictions') THEN
    ALTER TABLE kyc_clients ADD COLUMN account_restrictions jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'account_blocked') THEN
    ALTER TABLE kyc_clients ADD COLUMN account_blocked boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'block_reason') THEN
    ALTER TABLE kyc_clients ADD COLUMN block_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'blocked_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN blocked_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'transaction_limit_daily') THEN
    ALTER TABLE kyc_clients ADD COLUMN transaction_limit_daily numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'transaction_limit_monthly') THEN
    ALTER TABLE kyc_clients ADD COLUMN transaction_limit_monthly numeric;
  END IF;
END $$;

-- Add Enhanced Monitoring Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'enhanced_monitoring_required') THEN
    ALTER TABLE kyc_clients ADD COLUMN enhanced_monitoring_required boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'enhanced_monitoring_reason') THEN
    ALTER TABLE kyc_clients ADD COLUMN enhanced_monitoring_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'enhanced_monitoring_start_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN enhanced_monitoring_start_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'transaction_monitoring_active') THEN
    ALTER TABLE kyc_clients ADD COLUMN transaction_monitoring_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'alert_count') THEN
    ALTER TABLE kyc_clients ADD COLUMN alert_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'str_filed_count') THEN
    ALTER TABLE kyc_clients ADD COLUMN str_filed_count integer DEFAULT 0;
  END IF;
END $$;

-- Add Relationship and Service Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'relationship_manager_id') THEN
    ALTER TABLE kyc_clients ADD COLUMN relationship_manager_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'account_opening_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN account_opening_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'account_closure_date') THEN
    ALTER TABLE kyc_clients ADD COLUMN account_closure_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'products_services') THEN
    ALTER TABLE kyc_clients ADD COLUMN products_services text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'delivery_channels') THEN
    ALTER TABLE kyc_clients ADD COLUMN delivery_channels text[];
  END IF;
END $$;

-- Add Correspondent Banking Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'is_correspondent_bank') THEN
    ALTER TABLE kyc_clients ADD COLUMN is_correspondent_bank boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'shell_bank') THEN
    ALTER TABLE kyc_clients ADD COLUMN shell_bank boolean DEFAULT false;
  END IF;
END $$;

-- Add Complex Ownership Indicator
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'complex_ownership_structure') THEN
    ALTER TABLE kyc_clients ADD COLUMN complex_ownership_structure boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'beneficial_owners_identified') THEN
    ALTER TABLE kyc_clients ADD COLUMN beneficial_owners_identified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'beneficial_owners_verified') THEN
    ALTER TABLE kyc_clients ADD COLUMN beneficial_owners_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add Third Party Payment Fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'third_party_payments_allowed') THEN
    ALTER TABLE kyc_clients ADD COLUMN third_party_payments_allowed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_clients' AND column_name = 'third_party_authorization_received') THEN
    ALTER TABLE kyc_clients ADD COLUMN third_party_authorization_received boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_kyc_clients_onboarding_channel ON kyc_clients(onboarding_channel);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_screening_status ON kyc_clients(screening_status);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_industry_sector ON kyc_clients(industry_sector);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_regulatory_class ON kyc_clients(regulatory_classification);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_account_blocked ON kyc_clients(account_blocked);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_enhanced_monitoring ON kyc_clients(enhanced_monitoring_required);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_relationship_manager ON kyc_clients(relationship_manager_id);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_fatf_high_risk ON kyc_clients(fatf_high_risk_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_sanctions_hit ON kyc_clients(sanctions_hit);
CREATE INDEX IF NOT EXISTS idx_kyc_clients_next_screening ON kyc_clients(next_screening_due);