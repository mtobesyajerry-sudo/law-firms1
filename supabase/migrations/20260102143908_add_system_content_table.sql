/*
  # Add System Content Management Table
  
  1. New Tables
    - `system_content`
      - `id` (uuid, primary key)
      - `content_key` (text, unique) - identifier for content type (e.g., 'terms', 'privacy', 'support')
      - `title` (text) - display title for the content section
      - `content` (text) - the actual content (HTML or markdown supported)
      - `updated_by` (uuid, foreign key to user_profiles)
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `system_content` table
    - Add policy for all authenticated users to read content
    - Add policy for admins only to update content
    
  3. Initial Data
    - Insert default content for terms, privacy, and support
*/

CREATE TABLE IF NOT EXISTS system_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  updated_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system content"
  ON system_content
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update system content"
  ON system_content
  FOR UPDATE
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

INSERT INTO system_content (content_key, title, content)
VALUES 
  ('support', 'Contact Support', 'Email: mtobesyaj@gmail.com\nPhone: +255 717 745182'),
  ('privacy', 'Privacy Policy', '# Privacy Policy

## 1. Introduction

Your privacy and the security of your personal data are important to us. This Privacy Policy explains how we collect, use, disclose, retain, secure, and protect personal data through your use of the risk assessment platforms ("the Systems") designed for Non-Profit Organizations (NPOs), Designated Non-Financial Businesses & Professions (DNFBPs), and Banks & Financial Institutions in the United Republic of Tanzania.

This policy is drafted in accordance with the Personal Data Protection Act (PDPA), 2023 of Tanzania and other applicable laws governing data protection and privacy.

By accessing or using the Systems, you consent to the collection and use of your personal data as described in this policy.

## 2. Data Controller

The entity responsible for your personal data ("Data Controller") is:

[Your Company / Organization Name]
[Physical Address]
[Contact Email]
[Contact Phone Number]

For queries about this policy or your data, please contact our Data Protection Officer at: dpo@[yourdomain].tz

## 3. Personal Data We Collect

We collect personal data that you provide when using the Systems or interacting with our services, including but not limited to:

### 3.1 Identity Data
- Full name
- Job title/role
- Organization name
- Professional contact details

### 3.2 Contact Data
- Email address
- Telephone number
- Postal address

### 3.3 Authentication Data
- Username and password (securely hashed)
- Multi-factor authentication identifiers (where enabled)

### 3.4 Assessment Data
- Institutional details (e.g., type of entity, tier, operational details)
- Responses to risk assessment questionnaires
- Uploaded documents supporting responses (e.g., policies, procedures)

### 3.5 Usage Data
- System usage logs
- Audit logs
- IP addresses and device identifiers
- Browser and session information

### 3.6 Support Data
- Support requests
- Correspondence with customer support

## 4. How We Use Personal Data

We use personal data for the following purposes:

### 4.1 To Provide and Improve Services
- To enable your access to and use of the Systems
- To generate risk assessment reports
- To personalize your experience
- To improve system functionality and security

### 4.2 To Communicate with You
- Responding to inquiries
- Sending system notices, updates, and alerts
- Supporting account management

### 4.3 For Legal, Regulatory, and Compliance Purposes
- To comply with legal obligations (e.g., FIU reporting requirements)
- To respond to lawful requests by public authorities
- To support audit and security requirements

## 5. Legal Basis for Processing

Under the PDPA and applicable laws, we process personal data on the following bases:

- **Consent:** Where you voluntarily submit data to the Systems.
- **Contract Performance:** To provide services you have requested.
- **Legal Obligation:** To comply with regulatory and statutory requirements.
- **Legitimate Interests:** To maintain and improve system security, prevent fraud, and conduct internal analytics.

## 6. Data Sharing and Disclosure

We may share personal data with:

### 6.1 Service Providers and Subprocessors
Third-party providers (e.g., cloud hosting, email, backup services) under contractual obligations to protect your data.

### 6.2 Regulators and Law Enforcement
Authorized public authorities (e.g., Financial Intelligence Unit, Bank of Tanzania) when required by law or court order.

### 6.3 Affiliates
Other entities within our corporate group, where necessary to provide services.

**We do not sell personal data to third parties.**

## 7. Cross-Border Data Transfers

Your data may be stored or processed outside Tanzania (e.g., cloud infrastructure). When transferring data across borders, we implement appropriate safeguards (e.g., standard contractual clauses or equivalent measures) to ensure continued protection in line with the PDPA.

## 8. Data Retention

We retain personal data only as long as necessary for:
- Providing the services
- Legal or regulatory compliance
- System integrity and security
- Audit requirements

After this period, data is securely deleted or anonymized.

## 9. Data Security and Protection Measures

We implement technical and organizational measures, including but not limited to:
- Encryption at rest (AES-256) and encryption in transit (TLS 1.2+/1.3)
- Secure password storage (bcrypt or Argon2)
- Role-based access control
- Multi-tenant isolation via database RLS
- Immutable audit logging
- Regular security audits and vulnerability scanning
- Document storage encryption and secure file handling

Access to personal data is limited to authorized personnel under strict access controls.

## 10. Your Rights Under Tanzanian Law

You have the right to:
- Access the personal data we hold about you
- Correct inaccurate or incomplete data
- Object to processing for direct marketing or other purposes
- Withdraw consent at any time (where consent is the basis)
- Request deletion or restriction of processing
- Data portability (where applicable)

To exercise your rights, contact our Data Protection Officer at dpo@[yourdomain].tz.

## 11. Children''s Data

The Systems are intended for professional and organizational use. We do not knowingly collect personal data from children under the age of 16.

## 12. Changes to this Policy

We may update this policy to reflect changes in law, technology, or business practices. The "Last Updated" date at the top indicates when changes were made. Continued use constitutes acceptance of the updated policy.

## 13. Contact Information

For any questions, concerns, or requests regarding your personal data or this Privacy Policy, contact:

**Data Protection Officer**
Email: dpo@[yourdomain].tz
Phone: [Insert Phone Number]
Address: [Insert Physical Address]'),
  ('terms', 'Terms & Conditions', '# DNFBP AML/CFT/CPF Risk Assessment System

## 1. Acceptance of Terms

By accessing or using the DNFBP AML/CFT/CPF Risk Assessment System ("the System"), you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not agree with these Terms, you should not use the System.

## 2. Purpose and Scope of the System

The System is designed to support Designated Non-Financial Businesses and Professions (DNFBPs) operating in the United Republic of Tanzania in conducting self-assessed money laundering, terrorist financing, and proliferation financing (ML/TF/PF) risk assessments.

The System is aligned with:
- the Anti-Money Laundering Act, Cap. 423;
- applicable AML/CFT/CPF regulations, guidelines, and supervisory expectations issued by competent authorities; and
- the Financial Action Task Force (FATF) Recommendations applicable to DNFBPs.

The System applies a risk-based approach to assist users in identifying, assessing, documenting, and managing ML/TF/PF risks inherent in their activities.

## 3. Nature of the Assessment and Disclaimer

The System is a self-assessment and compliance-support tool and does not constitute legal, regulatory, accounting, or professional advice.

Risk ratings, narratives, and recommendations generated by the System are based solely on information provided by the user and predefined analytical logic. Responsibility for:
- compliance with applicable laws and regulatory obligations,
- the accuracy, completeness, and timeliness of information submitted, and
- decisions taken based on the assessment results

remains solely with the user.

The System does not replace supervisory judgment, professional advice, or independent regulatory assessments.

## 4. Data Protection and Confidentiality

Information submitted into the System is stored using appropriate technical and organizational security measures designed to safeguard confidentiality, integrity, and availability.

Users are responsible for:
- ensuring the accuracy and lawfulness of submitted data; and
- ensuring they have the authority to submit information relating to clients, transactions, or internal processes.

The System provider does not assume responsibility for inaccuracies, omissions, or misstatements in user-supplied information.

## 5. Limitation of Liability

To the fullest extent permitted by law, the System provider shall not be liable for any loss, penalty, sanction, or adverse consequence arising directly or indirectly from:
- reliance on outputs generated by the System,
- use or misuse of the System, or
- failure by the user to meet legal or regulatory obligations.

Use of the System is at the user''s own risk.

## 6. Amendments

The System provider reserves the right to amend these Terms and Conditions from time to time. Continued use of the System following any amendments constitutes acceptance of the revised Terms.

## 7. Governing Law

These Terms and Conditions shall be governed by and construed in accordance with the laws of the United Republic of Tanzania.')
ON CONFLICT (content_key) DO NOTHING;