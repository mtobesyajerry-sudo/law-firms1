/*
  # Seed Realistic Transaction Alerts for Monitoring Dashboard

  1. Changes
    - Create transaction monitoring rules for common AML scenarios
    - Seed realistic transaction alerts with correct constraint values
    - Include various alert severities, statuses, and typologies
    
  2. Security
    - All data belongs to existing organizations
    - RLS policies already enforce proper access control
*/

DO $$
DECLARE
  v_org_id uuid;
  v_client1_id uuid;
  v_client2_id uuid;
  v_rule1_id uuid;
  v_rule2_id uuid;
  v_rule3_id uuid;
  v_rule4_id uuid;
  v_rule5_id uuid;
  v_rule6_id uuid;
BEGIN
  -- Get organization
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    
    -- Check if rules already exist, if not insert them
    IF NOT EXISTS (SELECT 1 FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-01') THEN
      -- Seed transaction monitoring rules
      INSERT INTO transaction_monitoring_rules (
        organization_id, rule_code, rule_name, rule_description, rule_category,
        is_active, severity, priority, large_transaction_threshold, 
        cash_transaction_threshold, base_alert_score, status
      ) VALUES
        (v_org_id, 'LAML-01', 'Large Cash Transaction', 'Transactions exceeding TZS 10,000,000 in cash', 'amount_threshold', true, 'critical', 1, 10000000, 10000000, 90, 'active'),
        (v_org_id, 'LAML-02', 'Unusual Transaction Pattern', 'Multiple transactions that deviate from normal customer behavior', 'pattern', true, 'medium', 3, NULL, NULL, 65, 'active'),
        (v_org_id, 'LAML-03', 'High-Risk Country Transaction', 'Transactions involving jurisdictions with higher ML/TF risk', 'geographic', true, 'high', 2, NULL, NULL, 80, 'active'),
        (v_org_id, 'LAML-04', 'Structuring Detection', 'Multiple transactions just below reporting threshold', 'typology', true, 'high', 2, NULL, 5000000, 85, 'active'),
        (v_org_id, 'LAML-05', 'Rapid Movement of Funds', 'Funds received and immediately transferred out', 'velocity', true, 'high', 2, NULL, NULL, 82, 'active'),
        (v_org_id, 'LAML-06', 'PEP Transaction Alert', 'Transactions involving Politically Exposed Persons', 'typology', true, 'critical', 1, NULL, NULL, 92, 'active'),
        (v_org_id, 'LAML-07', 'Cross-Border Wire Transfer', 'International wire transfers exceeding threshold', 'geographic', true, 'high', 2, 50000000, NULL, 85, 'active'),
        (v_org_id, 'LAML-08', 'Account Takeover Pattern', 'Unusual activity suggesting possible account compromise', 'behavioral', true, 'critical', 1, NULL, NULL, 88, 'active');
    END IF;
    
    -- Get clients
    SELECT id INTO v_client1_id FROM kyc_clients WHERE organization_id = v_org_id ORDER BY created_at LIMIT 1;
    SELECT id INTO v_client2_id FROM kyc_clients WHERE organization_id = v_org_id ORDER BY created_at DESC LIMIT 1;
    
    -- Get rule IDs
    SELECT id INTO v_rule1_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-01';
    SELECT id INTO v_rule2_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-02';
    SELECT id INTO v_rule3_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-04';
    SELECT id INTO v_rule4_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-05';
    SELECT id INTO v_rule5_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-06';
    SELECT id INTO v_rule6_id FROM transaction_monitoring_rules WHERE organization_id = v_org_id AND rule_code = 'LAML-07';
    
    -- Only proceed if we have valid data
    IF v_client1_id IS NOT NULL THEN
      
      -- Alert 1: Critical - Large Cash Transaction (New) - using 'amount_threshold' alert_type
      INSERT INTO transaction_alerts (
        organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
        alert_type, alert_severity, alert_priority, transaction_reference,
        transaction_date, transaction_amount, transaction_currency, transaction_type,
        transaction_description, alert_description, suspicious_indicators,
        alert_score, client_risk_rating, investigation_status
      ) VALUES (
        v_org_id, 'ALT-2024-001', NOW() - INTERVAL '2 hours', v_client1_id, v_rule1_id,
        'amount_threshold', 'critical', 1, 'TXN-20240228-001',
        NOW() - INTERVAL '3 hours', 15000000, 'TZS', 'cash_deposit',
        'Large cash deposit without clear business justification',
        'Cash transaction of TZS 15,000,000 exceeds threshold and lacks supporting documentation',
        ARRAY['Amount exceeds TZS 10M threshold', 'No supporting invoice or contract', 'Unusual for client profile'],
        95, 'High', 'new'
      );
      
      -- Alert 2: High - Structuring Pattern (Under Investigation)
      INSERT INTO transaction_alerts (
        organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
        alert_type, alert_severity, alert_priority, transaction_reference,
        transaction_date, transaction_amount, transaction_currency, transaction_type,
        transaction_description, alert_description, suspicious_indicators,
        alert_score, client_risk_rating, investigation_status, investigation_started_date
      ) VALUES (
        v_org_id, 'ALT-2024-002', NOW() - INTERVAL '1 day', v_client1_id, v_rule3_id,
        'typology', 'high', 2, 'TXN-20240227-MULTI',
        NOW() - INTERVAL '1 day', 18000000, 'TZS', 'multiple_deposits',
        'Multiple cash deposits in amounts just below TZS 5M threshold over 3 days',
        'Possible structuring: 4 transactions of TZS 4.5M each within 72 hours',
        ARRAY['Multiple transactions below reporting threshold', 'Short time period', 'Same depositor', 'Cash-intensive'],
        88, 'Medium', 'under_investigation', NOW() - INTERVAL '12 hours'
      );
      
      -- Alert 3: High - Rapid Movement of Funds (New)
      INSERT INTO transaction_alerts (
        organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
        alert_type, alert_severity, alert_priority, transaction_reference,
        transaction_date, transaction_amount, transaction_currency, transaction_type,
        transaction_description, alert_description, suspicious_indicators,
        alert_score, client_risk_rating, investigation_status
      ) VALUES (
        v_org_id, 'ALT-2024-003', NOW() - INTERVAL '5 hours', v_client1_id, v_rule4_id,
        'velocity', 'high', 2, 'TXN-20240228-002',
        NOW() - INTERVAL '6 hours', 25000000, 'TZS', 'wire_transfer',
        'Large funds received and immediately transferred to offshore account',
        'Client received TZS 25M and transferred 95% within 2 hours to foreign account',
        ARRAY['Immediate fund movement', 'Offshore destination', 'No business activity', 'Unusual pattern'],
        82, 'Medium', 'new'
      );
      
      -- Alert 4: Critical - PEP Transaction (Escalated)
      IF v_client2_id IS NOT NULL AND v_client2_id != v_client1_id THEN
        INSERT INTO transaction_alerts (
          organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
          alert_type, alert_severity, alert_priority, transaction_reference,
          transaction_date, transaction_amount, transaction_currency, transaction_type,
          transaction_description, alert_description, suspicious_indicators,
          alert_score, client_risk_rating, investigation_status, investigation_started_date
        ) VALUES (
          v_org_id, 'ALT-2024-004', NOW() - INTERVAL '3 days', v_client2_id, v_rule5_id,
          'typology', 'critical', 1, 'TXN-20240225-003',
          NOW() - INTERVAL '3 days', 50000000, 'TZS', 'business_transaction',
          'Large transaction involving a Politically Exposed Person without enhanced due diligence',
          'Client identified as PEP family member; transaction lacks EDD documentation',
          ARRAY['PEP involvement', 'No enhanced due diligence', 'Large amount', 'Insufficient documentation'],
          92, 'High', 'escalated', NOW() - INTERVAL '2 days'
        );
      END IF;
      
      -- Alert 5: High - Cross-Border Wire Transfer (New)
      INSERT INTO transaction_alerts (
        organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
        alert_type, alert_severity, alert_priority, transaction_reference,
        transaction_date, transaction_amount, transaction_currency, transaction_type,
        transaction_description, alert_description, suspicious_indicators,
        alert_score, client_risk_rating, investigation_status
      ) VALUES (
        v_org_id, 'ALT-2024-005', NOW() - INTERVAL '1 hour', v_client1_id, v_rule6_id,
        'geographic', 'high', 2, 'TXN-20240228-004',
        NOW() - INTERVAL '2 hours', 75000000, 'TZS', 'international_wire',
        'Large international wire transfer to high-risk jurisdiction',
        'Wire transfer of TZS 75M to entity in jurisdiction with weak AML controls',
        ARRAY['High-risk destination country', 'Large amount', 'Limited business justification', 'First international transaction'],
        85, 'Medium', 'new'
      );
      
      -- Alert 6: Medium - Unusual Pattern (Resolved - No Action)
      INSERT INTO transaction_alerts (
        organization_id, alert_number, alert_date, client_id, triggered_by_rule_id,
        alert_type, alert_severity, alert_priority, transaction_reference,
        transaction_date, transaction_amount, transaction_currency, transaction_type,
        transaction_description, alert_description, suspicious_indicators,
        alert_score, client_risk_rating, investigation_status,
        investigation_started_date, investigation_completed_date, resolution_type,
        investigator_conclusion, is_false_positive
      ) VALUES (
        v_org_id, 'ALT-2024-006', NOW() - INTERVAL '7 days', v_client1_id, v_rule2_id,
        'pattern', 'medium', 3, 'TXN-20240221-001',
        NOW() - INTERVAL '7 days', 8000000, 'TZS', 'business_transaction',
        'Transaction pattern deviates from established customer profile',
        'Increased transaction frequency and amounts over past month',
        ARRAY['Higher than normal volume', 'Pattern change', 'Different transaction types'],
        65, 'Low', 'resolved_no_action',
        NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', 'no_action',
        'Client expanded business operations. Supporting documentation verified. Pattern consistent with legitimate business growth.',
        true
      );
      
    END IF;
  END IF;
END $$;