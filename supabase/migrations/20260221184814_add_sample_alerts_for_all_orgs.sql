/*
  # Add Sample Transaction Alerts for All Organizations

  1. Purpose
    - Create sample transaction alerts for all existing organizations
    - Ensure every organization has demo data to explore the STR Alert system
    - Populate with realistic AML/CFT scenarios

  2. Changes
    - Add 2-3 sample transaction alerts per organization
    - Include various severity levels (medium, high)
    - Include various statuses (new, in_progress)
    - Use realistic Tanzania-based scenarios

  3. Security
    - Only inserts sample data for existing organizations
    - Maintains proper organization_id relationships
    - Does not modify existing alerts
*/

-- Add sample alerts for all organizations that don't already have alerts
DO $$
DECLARE
  org RECORD;
  sample_client_id uuid;
  alert_count int;
BEGIN
  -- Loop through all organizations
  FOR org IN SELECT id, name FROM organizations
  LOOP
    -- Check if organization already has alerts
    IF NOT EXISTS (
      SELECT 1 FROM transaction_alerts WHERE organization_id = org.id
    ) THEN
      -- Try to get an existing client for this organization
      SELECT id INTO sample_client_id
      FROM kyc_clients
      WHERE organization_id = org.id
      LIMIT 1;

      -- If no client exists, create a sample client
      IF sample_client_id IS NULL THEN
        INSERT INTO kyc_clients (
          organization_id,
          client_name,
          client_type,
          current_risk_rating,
          current_dd_level,
          email,
          phone_number,
          physical_address,
          city,
          country,
          created_at
        ) VALUES (
          org.id,
          'Sample Trading Co. Ltd',
          'Legal Entity',
          'Medium',
          'standard',
          'sample@trading.co.tz',
          '+255 123 456 789',
          'Sample Street, Business District',
          'Dar es Salaam',
          'Tanzania',
          NOW()
        )
        RETURNING id INTO sample_client_id;
      END IF;

      -- Get current alert count
      SELECT COUNT(*) INTO alert_count FROM transaction_alerts;

      -- Insert sample alerts
      INSERT INTO transaction_alerts (
        organization_id,
        client_id,
        alert_number,
        alert_type,
        alert_severity,
        alert_priority,
        transaction_reference,
        transaction_date,
        transaction_amount,
        transaction_currency,
        transaction_type,
        transaction_description,
        alert_description,
        suspicious_indicators,
        risk_factors,
        investigation_status,
        client_risk_rating,
        detected_at
      ) VALUES
      (
        org.id,
        sample_client_id,
        'ALERT-2026-' || LPAD((alert_count + 1)::text, 6, '0'),
        'amount_threshold',
        'medium',
        4,
        'TXN-DEMO-001',
        CURRENT_DATE - INTERVAL '5 days',
        25000000,
        'TZS',
        'wire',
        'Cross-border payment for import of electronics',
        'Large wire transfer to high-risk jurisdiction - requires enhanced due diligence',
        ARRAY['cross_border', 'high_risk_jurisdiction', 'electronics_trade'],
        '{"cross_border": true, "high_risk_country": true, "import_trade": true}'::jsonb,
        'new',
        'Medium',
        CURRENT_TIMESTAMP - INTERVAL '5 days'
      ),
      (
        org.id,
        sample_client_id,
        'ALERT-2026-' || LPAD((alert_count + 2)::text, 6, '0'),
        'pattern_anomaly',
        'high',
        5,
        'TXN-DEMO-002',
        CURRENT_DATE - INTERVAL '2 days',
        50000000,
        'TZS',
        'cash',
        'Large cash deposit - precious metals trading',
        'Significant cash transaction exceeding CTR threshold - cash intensive business pattern detected',
        ARRAY['large_cash', 'cash_intensive', 'precious_metals', 'ctr_threshold'],
        '{"cash_intensive": true, "high_value_cash": true, "precious_metals": true}'::jsonb,
        'new',
        'High',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
      );

      RAISE NOTICE 'Added sample alerts for organization: %', org.name;
    END IF;
  END LOOP;
END $$;
