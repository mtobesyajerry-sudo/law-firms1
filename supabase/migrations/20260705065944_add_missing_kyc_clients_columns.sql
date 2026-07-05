-- Add columns referenced by KycCddForm that don't yet exist in kyc_clients

ALTER TABLE kyc_clients
  ADD COLUMN IF NOT EXISTS beneficiaries          jsonb,
  ADD COLUMN IF NOT EXISTS customer_type          text,
  ADD COLUMN IF NOT EXISTS customer_data          jsonb,
  ADD COLUMN IF NOT EXISTS policy_information     jsonb,
  ADD COLUMN IF NOT EXISTS sanctions_screening    jsonb,
  ADD COLUMN IF NOT EXISTS customer_declaration   jsonb,
  ADD COLUMN IF NOT EXISTS compliance_approval    jsonb,
  ADD COLUMN IF NOT EXISTS risk_assessment        jsonb,
  ADD COLUMN IF NOT EXISTS total_risk_score       numeric,
  ADD COLUMN IF NOT EXISTS risk_level             text,
  ADD COLUMN IF NOT EXISTS enhanced_dd_required   boolean,
  ADD COLUMN IF NOT EXISTS monitoring_status      text,
  ADD COLUMN IF NOT EXISTS customer_status        text,
  ADD COLUMN IF NOT EXISTS first_payment_verified boolean,
  ADD COLUMN IF NOT EXISTS matter_id              uuid,
  ADD COLUMN IF NOT EXISTS pep_declaration        jsonb,
  ADD COLUMN IF NOT EXISTS ongoing_monitoring     jsonb,
  ADD COLUMN IF NOT EXISTS suspicious_indicators  jsonb;
