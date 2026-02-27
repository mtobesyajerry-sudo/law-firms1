/*
  # Final Complete Client Operational Data
  
  All constraints validated
*/

DO $$
DECLARE
  john_doe_id uuid;
  bower_inc_id uuid;
  org_id uuid;
BEGIN
  SELECT id INTO john_doe_id FROM kyc_clients WHERE client_name = 'John D. Doe';
  SELECT id INTO bower_inc_id FROM kyc_clients WHERE client_name = 'Bower Incorporated ';
  SELECT organization_id INTO org_id FROM kyc_clients LIMIT 1;

  -- Screening Results (6 records total - 3 per client)
  INSERT INTO screening_results (
    organization_id, client_id, screening_type, screened_name, screening_date,
    screening_status, match_found, match_count, highest_confidence_score,
    risk_level, requires_manual_review, cleared, clearance_notes, next_rescreen_date, screening_provider
  ) VALUES 
  (org_id, john_doe_id, 'sanctions', 'John D. Doe', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'Low', false, true, 'UN, OFAC, EU sanctions: Clear', CURRENT_DATE + INTERVAL '12 months', 'internal'),
  (org_id, john_doe_id, 'pep', 'John D. Doe', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'None', false, true, 'PEP screening: No matches', CURRENT_DATE + INTERVAL '12 months', 'internal'),
  (org_id, john_doe_id, 'adverse_media', 'John D. Doe', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'None', false, true, 'Adverse media: Clear', CURRENT_DATE + INTERVAL '12 months', 'internal'),
  (org_id, bower_inc_id, 'sanctions', 'Bower Incorporated', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'High', true, true, 'Sanctions clear. High risk: DRC operations', CURRENT_DATE + INTERVAL '3 months', 'internal'),
  (org_id, bower_inc_id, 'pep', 'Bower Incorporated', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'Medium', true, true, 'PEP: No matches. Enhanced monitoring', CURRENT_DATE + INTERVAL '3 months', 'internal'),
  (org_id, bower_inc_id, 'adverse_media', 'Bower Incorporated', CURRENT_TIMESTAMP, 'completed', false, 0, 0, 'Medium', false, true, 'No adverse media', CURRENT_DATE + INTERVAL '3 months', 'internal');

  -- Continuous Screening Queue (2 records)
  INSERT INTO continuous_screening_queue (organization_id, client_id, screening_frequency, last_screened, next_screening_due, queue_status) VALUES 
  (org_id, john_doe_id, 'annual', CURRENT_TIMESTAMP, CURRENT_DATE + INTERVAL '12 months', 'active'),
  (org_id, bower_inc_id, 'quarterly', CURRENT_TIMESTAMP, CURRENT_DATE + INTERVAL '3 months', 'active');

  -- Behavioral Profiles (2 records)
  INSERT INTO behavioral_profiles (organization_id, client_id, profile_period_start, profile_period_end, transaction_count, avg_transaction_amount, max_transaction_amount, total_volume, typical_transaction_types, typical_counterparties, typical_countries, typical_channels, anomaly_threshold, baseline_risk_score) VALUES 
  (org_id, john_doe_id, '2024-01-01', '2024-01-31', 18, 250000, 800000, 4500000, '{"deposit": 10, "withdrawal": 6, "payment": 2}'::jsonb, '{"employer": 1, "utilities": 3}'::jsonb, '{"Tanzania": 18}'::jsonb, '{"branch": 8, "mobile": 7, "atm": 3}'::jsonb, 2.0, 15),
  (org_id, bower_inc_id, '2024-01-01', '2024-01-31', 45, 10500000, 85000000, 472000000, '{"wire": 25, "fx_exchange": 12, "cash": 8}'::jsonb, '{"gold_suppliers": 15, "buyers": 20}'::jsonb, '{"Congo DRC": 20, "Tanzania": 15, "UAE": 10}'::jsonb, '{"branch": 30, "wire": 15}'::jsonb, 1.5, 75);

  -- Transactions - John Doe (3 records)
  INSERT INTO transactions (organization_id, client_id, transaction_ref, transaction_type, transaction_date, amount, currency, amount_usd, counterparty_name, purpose_code, description, channel, is_cash, is_cross_border, risk_score, flagged_for_review) VALUES 
  (org_id, john_doe_id, 'TXN-JD-001', 'deposit', '2024-02-01 09:15:00', 2500000, 'TZS', 1000, 'ABC Corporation Ltd', 'SAL', 'Monthly salary', 'branch', false, false, 5, false),
  (org_id, john_doe_id, 'TXN-JD-002', 'withdrawal', '2024-02-05 14:30:00', 500000, 'TZS', 200, 'ATM Network', 'CASH', 'Cash withdrawal', 'atm', true, false, 5, false),
  (org_id, john_doe_id, 'TXN-JD-003', 'payment', '2024-02-10 11:20:00', 180000, 'TZS', 72, 'Tanzania Electric Supply Co', 'UTIL', 'Electricity bill', 'mobile', false, false, 3, false);

  -- Transactions - Bower Inc (3 records)
  INSERT INTO transactions (organization_id, client_id, transaction_ref, transaction_type, transaction_date, amount, currency, amount_usd, counterparty_name, counterparty_country, destination_country, purpose_code, description, channel, is_cash, is_cross_border, is_high_value, risk_score, flagged_for_review) VALUES 
  (org_id, bower_inc_id, 'TXN-BI-001', 'wire', '2024-02-03 10:00:00', 45000000, 'TZS', 18000, 'Kinshasa Gold Traders SARL', 'Congo DRC', 'Tanzania', 'GOLD', 'Gold purchase', 'branch', false, true, true, 65, true),
  (org_id, bower_inc_id, 'TXN-BI-002', 'cash', '2024-02-08 15:45:00', 25000000, 'TZS', 10000, 'Local Gold Miners Cooperative', 'Tanzania', 'Tanzania', 'GOLD', 'Cash gold purchase', 'branch', true, false, true, 70, true),
  (org_id, bower_inc_id, 'TXN-BI-003', 'wire', '2024-02-12 11:30:00', 75000000, 'TZS', 30000, 'Dubai Gold Exchange LLC', 'UAE', 'UAE', 'GOLD', 'Gold export proceeds', 'branch', false, true, true, 55, false);

  -- Transaction Alerts (2 records)
  INSERT INTO transaction_alerts (organization_id, client_id, alert_type, alert_severity, alert_priority, transaction_reference, transaction_date, transaction_amount, transaction_currency, transaction_type, transaction_description, alert_description, suspicious_indicators, risk_factors, investigation_status, client_risk_rating) VALUES 
  (org_id, bower_inc_id, 'amount_threshold', 'medium', 4, 'TXN-BI-001', '2024-02-03'::date, 45000000, 'TZS', 'wire', 'Gold purchase from DRC', 'High-value cross-border wire to DRC (FATF high-risk)', ARRAY['cross_border', 'high_risk_jurisdiction'], '{"drc_operations": true, "gold_trading": true}'::jsonb, 'new', 'High'),
  (org_id, bower_inc_id, 'amount_threshold', 'high', 5, 'TXN-BI-002', '2024-02-08'::date, 25000000, 'TZS', 'cash', 'Cash gold purchase', 'Large cash transaction - CTR threshold exceeded', ARRAY['large_cash', 'cash_intensive', 'precious_metals'], '{"cash_intensive": true, "high_value_cash": true}'::jsonb, 'new', 'High');

END $$;