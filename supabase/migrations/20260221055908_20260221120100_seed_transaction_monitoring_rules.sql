/*
  # Seed Transaction Monitoring Rules for Tanzania

  ## Overview
  This migration seeds the transaction_monitoring_rules table with rules aligned with:
  - Tanzania AML Act
  - AML Regulations 2022
  - Financial Intelligence Unit (FIU) guidelines

  ## Rules Included
  1. Large Transaction Reports (TZS 10M+)
  2. Cash Transaction Reports (TZS 5M+)
  3. Rapid Movement of Funds
  4. Structuring/Smurfing Detection
  5. High-Risk Country Transactions
  6. Round Amount Transactions
  7. Unusual Cash Activity
  8. Cross-Border Wire Transfers
  9. PEP Transaction Monitoring
  10. Dormant Account Reactivation
*/

-- Insert default transaction monitoring rules
INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  large_transaction_threshold,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  regulatory_reference,
  fiu_reporting_required,
  status
) 
SELECT 
  o.id as organization_id,
  'TZA-LTR-001',
  'Large Transaction Reporting',
  'Transactions exceeding TZS 10 million must be reported to FIU within 5 business days',
  'amount_threshold',
  'high',
  9,
  '{"amount": 10000000, "currency": "TZS", "period": "per_transaction", "reporting_deadline_days": 5}'::jsonb,
  10000000,
  85,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  'AML Regulations 2022, Section 15',
  true,
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-LTR-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  cash_transaction_threshold,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  regulatory_reference,
  fiu_reporting_required,
  status
) 
SELECT 
  o.id,
  'TZA-CTR-001',
  'Cash Transaction Reporting',
  'Cash transactions exceeding TZS 5 million require enhanced scrutiny and reporting',
  'amount_threshold',
  'high',
  9,
  '{"amount": 5000000, "currency": "TZS", "transaction_types": ["cash_deposit", "cash_withdrawal"], "period": "per_transaction"}'::jsonb,
  5000000,
  80,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  'AML Regulations 2022, Section 15',
  true,
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-CTR-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-VEL-001',
  'Rapid Movement of Funds',
  'Multiple large transactions within a short timeframe indicating possible money laundering',
  'velocity',
  'critical',
  10,
  '{"transaction_count": 5, "period": "24_hours", "min_individual_amount": 1000000, "total_amount_threshold": 8000000}'::jsonb,
  90,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Medium', 'High', 'Very High']::text[],
  ARRAY['multiple_large_transactions', 'short_time_window', 'inconsistent_with_profile']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-VEL-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  requires_immediate_review,
  status
) 
SELECT 
  o.id,
  'TZA-STR-001',
  'Structuring / Smurfing Detection',
  'Multiple transactions just below reporting thresholds to avoid detection',
  'pattern',
  'critical',
  10,
  '{"transaction_count": 3, "period": "7_days", "amount_range": {"min": 4000000, "max": 4999999}, "threshold_percentage": 90}'::jsonb,
  95,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  ARRAY['just_below_threshold', 'multiple_similar_amounts', 'deliberate_splitting']::text[],
  true,
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-STR-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-GEO-001',
  'High-Risk Country Transactions',
  'Transactions involving high-risk or sanctioned jurisdictions',
  'geographic',
  'critical',
  10,
  '{"high_risk_countries": ["DPRK", "IRN", "SYR", "VEN", "MM"], "sanctioned_countries": true, "min_amount": 500000}'::jsonb,
  95,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  ARRAY['sanctioned_jurisdiction', 'high_risk_country', 'no_business_rationale']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-GEO-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-PAT-001',
  'Round Amount Transactions',
  'Frequent round amount transactions that are inconsistent with normal business patterns',
  'pattern',
  'medium',
  6,
  '{"transaction_count": 5, "period": "30_days", "round_amounts": [1000000, 2000000, 5000000, 10000000], "min_percentage": 80}'::jsonb,
  65,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Medium', 'High', 'Very High']::text[],
  ARRAY['predominantly_round_amounts', 'inconsistent_with_business', 'potential_structuring']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-PAT-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-CASH-001',
  'Unusual Cash Activity',
  'Cash activity that is inconsistent with customer profile or business type',
  'behavioral',
  'high',
  8,
  '{"cash_percentage": 75, "period": "30_days", "min_total_amount": 3000000, "profile_deviation": true}'::jsonb,
  75,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  ARRAY['high_cash_usage', 'inconsistent_with_profile', 'no_apparent_business_reason']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-CASH-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-WIRE-001',
  'Cross-Border Wire Transfers',
  'Frequent or large cross-border wire transfers requiring enhanced scrutiny',
  'geographic',
  'high',
  8,
  '{"transaction_type": "wire_transfer", "cross_border": true, "min_amount": 2000000, "frequency_threshold": 5, "period": "30_days"}'::jsonb,
  80,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Medium', 'High', 'Very High']::text[],
  ARRAY['frequent_cross_border', 'high_amounts', 'unclear_business_purpose']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-WIRE-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  requires_immediate_review,
  status
) 
SELECT 
  o.id,
  'TZA-PEP-001',
  'PEP Transaction Monitoring',
  'Enhanced monitoring of all transactions involving Politically Exposed Persons',
  'behavioral',
  'high',
  9,
  '{"client_type": "pep", "min_amount": 1000000, "enhanced_scrutiny": true, "automatic_review": true}'::jsonb,
  85,
  ARRAY['individual']::text[],
  ARRAY['High', 'Very High']::text[],
  ARRAY['pep_status', 'large_transaction', 'enhanced_scrutiny_required']::text[],
  true,
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-PEP-001'
);

INSERT INTO transaction_monitoring_rules (
  organization_id,
  rule_code,
  rule_name,
  rule_description,
  rule_category,
  severity,
  priority,
  threshold_config,
  base_alert_score,
  applies_to_client_types,
  applies_to_risk_levels,
  suspicious_pattern_indicators,
  status
) 
SELECT 
  o.id,
  'TZA-DOR-001',
  'Dormant Account Reactivation',
  'Sudden reactivation of dormant accounts with large transactions',
  'behavioral',
  'high',
  8,
  '{"dormancy_period_days": 180, "reactivation_amount": 2000000, "rapid_activity": true}'::jsonb,
  80,
  ARRAY['individual', 'corporate']::text[],
  ARRAY['Low', 'Medium', 'High', 'Very High']::text[],
  ARRAY['long_dormancy', 'sudden_large_activity', 'potential_account_takeover']::text[],
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_monitoring_rules WHERE rule_code = 'TZA-DOR-001'
);