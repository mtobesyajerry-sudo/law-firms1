/*
  # Update Existing KYC Clients with Comprehensive Data
  
  ## Overview
  Updates the two existing KYC clients (John D. Doe and Bower Incorporated)
  with all the new comprehensive fields including:
  - Digital onboarding details
  - Enhanced risk assessment data
  - Screening status and monitoring flags
  - Regulatory classifications
  - Transaction monitoring setup
  - Account management fields
  
  ## Clients Updated
  1. John D. Doe (Individual) - Low-risk employee
  2. Bower Incorporated (Corporate) - High-risk gold trader
  
  ## Compliance
  - Complete customer profiles
  - Risk-based approach
  - Enhanced due diligence where applicable
*/

-- Update John D. Doe (Individual Client) - Low Risk Profile
UPDATE kyc_clients
SET
  -- Digital Onboarding Fields
  onboarding_channel = 'branch',
  digital_identity_verified = true,
  biometric_verification_status = 'passed',
  video_kyc_completed = false,
  liveness_check_passed = true,
  
  -- Enhanced Risk Fields
  industry_sector = 'Employment - Private Sector',
  industry_risk_level = 'low',
  cash_intensive_business = false,
  high_value_transactions_expected = false,
  expected_monthly_transactions = 15,
  expected_monthly_volume_tzs = 5000000, -- 5M TZS (~$2,000)
  expected_monthly_volume_usd = 2000,
  actual_monthly_volume_tzs = 4800000,
  cross_border_transactions_expected = false,
  
  -- Screening & Monitoring Fields
  last_screening_date = CURRENT_TIMESTAMP,
  next_screening_due = CURRENT_TIMESTAMP + INTERVAL '12 months',
  screening_status = 'clear',
  sanctions_hit = false,
  pep_screening_date = CURRENT_TIMESTAMP,
  adverse_media_found = false,
  enhanced_monitoring_required = false,
  transaction_monitoring_active = true,
  alert_count = 0,
  str_filed_count = 0,
  
  -- Regulatory Classification
  regulatory_classification = 'retail',
  customer_segment = 'Mass Market',
  fatf_high_risk_jurisdiction = false,
  high_risk_countries = NULL,
  tax_residency_countries = ARRAY['Tanzania'],
  
  -- Account Status & Restrictions
  account_restrictions = NULL,
  account_blocked = false,
  transaction_limit_daily = 2000000, -- 2M TZS
  transaction_limit_monthly = 10000000, -- 10M TZS
  
  -- Relationship & Service Fields
  account_opening_date = '2023-06-15',
  products_services = ARRAY['Savings Account', 'Current Account', 'Mobile Banking'],
  delivery_channels = ARRAY['branch', 'mobile', 'atm'],
  
  -- Correspondent Banking Fields
  is_correspondent_bank = false,
  shell_bank = false,
  
  -- Beneficial Ownership
  complex_ownership_structure = false,
  beneficial_owners_identified = true,
  beneficial_owners_verified = true,
  
  -- Third Party Payments
  third_party_payments_allowed = false,
  third_party_authorization_received = false,
  
  updated_at = CURRENT_TIMESTAMP
WHERE client_name = 'John D. Doe';

-- Update Bower Incorporated (Corporate Client) - High Risk Profile
UPDATE kyc_clients
SET
  -- Digital Onboarding Fields
  onboarding_channel = 'branch',
  digital_identity_verified = true,
  biometric_verification_status = 'not_required',
  video_kyc_completed = true,
  liveness_check_passed = false,
  
  -- Enhanced Risk Fields
  industry_sector = 'Mining & Precious Metals Trading',
  industry_risk_level = 'very_high',
  cash_intensive_business = true,
  high_value_transactions_expected = true,
  expected_monthly_transactions = 50,
  expected_monthly_volume_tzs = 500000000, -- 500M TZS (~$200,000)
  expected_monthly_volume_usd = 200000,
  actual_monthly_volume_tzs = 480000000,
  cross_border_transactions_expected = true,
  
  -- Screening & Monitoring Fields
  last_screening_date = CURRENT_TIMESTAMP,
  next_screening_due = CURRENT_TIMESTAMP + INTERVAL '3 months', -- Quarterly for high-risk
  screening_status = 'clear',
  sanctions_hit = false,
  pep_screening_date = CURRENT_TIMESTAMP,
  adverse_media_found = false,
  enhanced_monitoring_required = true,
  enhanced_monitoring_reason = 'High-risk industry (precious metals), cash-intensive business, cross-border transactions with DRC',
  enhanced_monitoring_start_date = '2024-01-01',
  transaction_monitoring_active = true,
  alert_count = 0,
  str_filed_count = 0,
  
  -- Regulatory Classification
  regulatory_classification = 'corporate',
  customer_segment = 'High Net Worth Corporate',
  fatf_high_risk_jurisdiction = true, -- DRC operations
  high_risk_countries = ARRAY['Congo DRC', 'Uganda'],
  tax_residency_countries = ARRAY['Congo DRC', 'Tanzania'],
  
  -- Account Status & Restrictions
  account_restrictions = '{"wire_transfer_approval_required": true, "cash_deposit_limit": 50000000, "management_approval_threshold": 100000000}'::jsonb,
  account_blocked = false,
  transaction_limit_daily = 200000000, -- 200M TZS
  transaction_limit_monthly = 1000000000, -- 1B TZS
  
  -- Relationship & Service Fields
  account_opening_date = '2023-09-20',
  products_services = ARRAY['Corporate Account', 'Trade Finance', 'Foreign Exchange', 'Wire Transfers'],
  delivery_channels = ARRAY['branch', 'online', 'wire'],
  
  -- Correspondent Banking Fields
  is_correspondent_bank = false,
  shell_bank = false,
  
  -- Beneficial Ownership
  complex_ownership_structure = true,
  beneficial_owners_identified = true,
  beneficial_owners_verified = true,
  
  -- Third Party Payments
  third_party_payments_allowed = true,
  third_party_authorization_received = true,
  
  updated_at = CURRENT_TIMESTAMP
WHERE client_name = 'Bower Incorporated ';