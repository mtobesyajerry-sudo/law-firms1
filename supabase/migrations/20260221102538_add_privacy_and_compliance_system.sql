-- Privacy and Compliance System
--
-- Overview: Privacy policy, terms of use, and consent tracking
--
-- Tables Created:
-- 1. legal_documents - Store privacy policies, terms of use, and other legal docs
-- 2. user_consents - Track user consent for various purposes
-- 3. data_retention_policies - Define data retention rules
-- 4. data_deletion_requests - Track GDPR/data deletion requests
--
-- Security: RLS enabled, audit trail for compliance

-- 1. Legal Documents - Versioned legal documents
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('privacy_policy', 'terms_of_use', 'cookie_policy', 'data_protection', 'aml_policy')),
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  effective_date timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(document_type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_active ON legal_documents(is_active);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active legal documents"
  ON legal_documents FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage legal documents"
  ON legal_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 2. User Consents - Track user consent
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN (
    'terms_of_use',
    'privacy_policy',
    'data_processing',
    'marketing_communications',
    'kyc_data_collection',
    'data_sharing',
    'cookies'
  )),
  document_id uuid REFERENCES legal_documents(id),
  document_version text NOT NULL,
  consented boolean NOT NULL,
  consent_method text NOT NULL CHECK (consent_method IN ('explicit_checkbox', 'implicit_signup', 'explicit_button')),
  ip_address text,
  user_agent text,
  consented_at timestamptz DEFAULT now(),
  withdrawn_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_consented ON user_consents(consented);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
  ON user_consents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 3. Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL UNIQUE,
  retention_period_days integer NOT NULL,
  description text NOT NULL,
  legal_basis text,
  auto_delete boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_type ON data_retention_policies(data_type);

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retention policies"
  ON data_retention_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 4. Data Deletion Requests - GDPR compliance
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('full_deletion', 'partial_deletion', 'data_export')),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  data_categories text[] DEFAULT ARRAY[]::text[],
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  completion_notes text,
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at DESC);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage deletion requests"
  ON data_deletion_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Insert default privacy policy
INSERT INTO legal_documents (document_type, version, title, content, effective_date, is_active)
SELECT 
  'privacy_policy',
  '1.0',
  'Privacy Policy',
  '# Privacy Policy

**Effective Date:** ' || to_char(now(), 'YYYY-MM-DD') || '

## 1. Introduction
This Privacy Policy describes how we collect, use, and protect your personal information in compliance with applicable data protection laws.

## 2. Data We Collect
### 2.1 Account Information - Email address, Full name, Organization details, Role and permissions
### 2.2 KYC/AML Data - Client identification information, Risk assessment data, Due diligence records
### 2.3 Technical Data - IP addresses, Browser information, Session data, Audit logs

## 3. How We Use Your Data
- Providing KYC/AML compliance services
- Account management and authentication
- Security and fraud prevention
- Legal and regulatory compliance

## 4. Legal Basis - Contract performance, Legal obligations (AML/CFT regulations), Legitimate interests, Consent

## 5. Data Security - Encryption in transit and at rest, Multi-factor authentication, Role-based access control, Comprehensive audit logging

## 6. Data Retention - Assessment data: 7 years, Audit logs: 7 years, Account data: Duration + 1 year, Session data: 90 days

## 7. Your Rights - Access, Rectify, Delete (subject to legal obligations), Object to processing, Data portability, Withdraw consent

## 8. Contact - Contact your system administrator for privacy inquiries.',
  now(),
  true
WHERE NOT EXISTS (SELECT 1 FROM legal_documents WHERE document_type = 'privacy_policy' AND version = '1.0');

-- Insert default terms of use
INSERT INTO legal_documents (document_type, version, title, content, effective_date, is_active)
SELECT 
  'terms_of_use',
  '1.0',
  'Terms of Use',
  '# Terms of Use

**Effective Date:** ' || to_char(now(), 'YYYY-MM-DD') || '

## 1. Acceptance of Terms
By accessing this system, you agree to these Terms of Use.

## 2. System Purpose
This system provides KYC/AML risk assessment and compliance management services.

## 3. User Responsibilities
- Provide accurate information
- Maintain account security
- Use the system lawfully
- Protect confidential data
- Report security incidents
- Comply with AML regulations

## 4. Prohibited Activities
- Share your credentials
- Attempt unauthorized access
- Interfere with system operation
- Extract data for unauthorized purposes
- Violate data protection laws

## 5. Account Security
- Use strong passwords
- Enable multi-factor authentication
- Report suspicious activity immediately
- Do not share accounts

## 6. Limitation of Liability
The system is provided "as is" for compliance support. You remain responsible for your regulatory obligations.

## 7. Termination
We may suspend or terminate accounts for violations of these terms.',
  now(),
  true
WHERE NOT EXISTS (SELECT 1 FROM legal_documents WHERE document_type = 'terms_of_use' AND version = '1.0');

-- Insert default data retention policies
INSERT INTO data_retention_policies (data_type, retention_period_days, description, legal_basis, auto_delete)
SELECT * FROM (VALUES
  ('assessment_data', 2555, 'KYC/AML assessment records (7 years)', 'Legal obligation under AML regulations', false),
  ('audit_logs', 2555, 'System audit logs (7 years)', 'Legal and regulatory compliance', false),
  ('login_history', 365, 'Login attempt records (1 year)', 'Security and fraud prevention', false),
  ('session_data', 90, 'Active and expired sessions (90 days)', 'Security monitoring', true),
  ('document_access_logs', 2555, 'Document access tracking (7 years)', 'Compliance and audit trail', false),
  ('user_account_data', 365, 'Account data after closure (1 year)', 'Legal obligations', false),
  ('suspicious_activity_alerts', 1095, 'Security alerts (3 years)', 'Security and compliance', false)
) AS v(data_type, retention_period_days, description, legal_basis, auto_delete)
WHERE NOT EXISTS (SELECT 1 FROM data_retention_policies WHERE data_retention_policies.data_type = v.data_type);