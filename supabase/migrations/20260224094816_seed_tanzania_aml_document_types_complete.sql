/*
  # Seed Tanzania AML Document Types - Complete
  
  ## Overview
  Seeds all document types required for Tanzania AML compliance across
  simplified, standard, and enhanced due diligence levels.
  
  ## Document Categories
  1. **Identity** - National ID, Passport, Driving Licence, Voter ID
  2. **Address** - Utility bills, tenancy agreements, bank statements, TIN
  3. **Financial** - Income proof, SOF/SOW, bank statements, assets
  4. **Corporate** - Registration, articles, licenses, resolutions
  5. **Ownership** - Beneficial ownership, shareholding, structure charts
  6. **Regulatory** - PEP declarations, screening, tax certificates
  7. **Background** - Reputation checks, adverse media (EDD)
  8. **Transaction** - Contracts, rationale (EDD)
  9. **Other** - Risk assessments, client declarations
  
  ## Total Document Types: 50+
  Covers all Tanzania AML requirements from simplified to enhanced DD
*/

-- ================================================================
-- IDENTITY DOCUMENTS
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('national_id', 'National ID (NIDA)', 'identity', 'Tanzania National Identification Card - primary identification', 'individual', 60, true),
  ('passport', 'Passport', 'identity', 'Valid passport - primary identification or travel document', 'individual', 120, true),
  ('driving_licence', 'Driving Licence', 'identity', 'Valid driving licence - acceptable alternative identification', 'individual', 60, true),
  ('voter_card', 'Voter Registration Card', 'identity', 'Voter registration card - acceptable where applicable', 'individual', 60, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- ADDRESS DOCUMENTS
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('utility_bill', 'Utility Bill', 'address', 'Recent utility bill (electricity, water, gas) - max 3 months old', 'both', 3, true),
  ('tenancy_agreement', 'Tenancy Agreement', 'address', 'Rental or lease agreement showing current address', 'both', 24, true),
  ('bank_statement_address', 'Bank Statement', 'address', 'Bank statement showing residential address - max 3 months old', 'both', 3, true),
  ('tin_certificate', 'TIN Certificate', 'address', 'Tax Identification Number certificate', 'both', 0, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- FINANCIAL DOCUMENTS (Standard & Enhanced)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('employment_letter', 'Employment Letter', 'financial', 'Letter from employer confirming employment and position', 'individual', 12, true),
  ('payslip', 'Payslips', 'financial', 'Recent salary payslips (last 3 months) or employment confirmation', 'individual', 3, true),
  ('bank_reference', 'Bank Reference Letter', 'financial', 'Bank reference letter confirming account and standing', 'both', 12, true),
  ('sof_declaration', 'Source of Funds Declaration', 'financial', 'Declaration of source of funds for specific transaction. Template available in SOF/SOW Templates tab', 'both', 12, true),
  ('tax_return', 'Tax Return', 'financial', 'Personal or corporate tax return documentation', 'both', 12, true),
  ('bank_statements_12m', 'Bank Statements (12 months)', 'financial', 'Twelve months of bank statements - required for Enhanced DD', 'both', 12, true),
  ('transaction_history', 'Transaction History', 'financial', 'Detailed transaction records and payment history', 'both', 6, true),
  ('payment_records', 'Payment Records', 'financial', 'Records of payments made and received for transactions', 'both', 12, true),
  ('loan_agreements', 'Loan Documentation', 'financial', 'Loan agreements and lending documentation (if funds borrowed)', 'both', 24, true),
  ('sale_agreements', 'Asset Sale Agreements', 'financial', 'Contracts and documentation showing sale of assets', 'both', 24, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- SOURCE OF WEALTH DOCUMENTS (Enhanced DD - MANDATORY)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('source_of_wealth', 'Source of Wealth Documentation', 'financial', 'MANDATORY for Enhanced DD - comprehensive evidence of wealth accumulation', 'both', 12, true),
  ('asset_declaration', 'Asset Declaration', 'financial', 'Complete declaration of assets owned (property, investments, businesses)', 'both', 12, true),
  ('property_records', 'Property Ownership Records', 'financial', 'Evidence of real estate ownership with title deeds and valuation', 'both', 0, true),
  ('business_ownership_docs', 'Business Ownership Evidence', 'financial', 'Proof of business ownership and business value/income', 'both', 12, true),
  ('investment_portfolio', 'Investment Portfolio', 'financial', 'Investment holdings and portfolio statements', 'both', 6, true),
  ('inheritance_evidence', 'Inheritance Documentation', 'financial', 'Proof of inherited wealth (wills, estate documents, probate)', 'both', 0, true),
  ('gift_evidence', 'Gift Documentation', 'financial', 'Evidence of gifted funds with donor identification and verification', 'both', 12, true),
  ('financial_statements_personal', 'Personal Financial Statements', 'financial', 'Detailed personal financial position statement', 'individual', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- CORPORATE DOCUMENTS
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('cert_incorporation', 'Certificate of Incorporation', 'corporate', 'Official certificate of company registration', 'legal_entity', 0, true),
  ('memorandum_articles', 'Memorandum & Articles of Association', 'corporate', 'Constitutional documents of the company', 'legal_entity', 0, true),
  ('business_profile', 'Business Profile', 'corporate', 'Comprehensive business description and activities', 'legal_entity', 12, true),
  ('board_resolution', 'Board Resolution', 'corporate', 'Board resolution authorizing relationship and signatories', 'legal_entity', 24, true),
  ('business_licence', 'Business Licence', 'regulatory', 'Current business operating licence', 'legal_entity', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- BENEFICIAL OWNERSHIP DOCUMENTS (MANDATORY for entities)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('bo_declaration', 'Beneficial Ownership Declaration', 'ownership', 'Formal declaration of all beneficial owners (25%+ ownership or control)', 'legal_entity', 12, true),
  ('shareholder_register', 'Shareholder Register', 'ownership', 'Complete list of shareholders with percentages', 'legal_entity', 12, true),
  ('bo_ids', 'Beneficial Owner IDs', 'ownership', 'Identification documents for all beneficial owners', 'legal_entity', 60, true),
  ('bo_address_proof', 'Beneficial Owner Address Proof', 'ownership', 'Address verification for all beneficial owners', 'legal_entity', 12, true),
  ('directors_list', 'List of Directors', 'ownership', 'Complete list of company directors with identification', 'legal_entity', 12, true),
  ('group_structure', 'Group Structure Chart', 'ownership', 'Organizational chart showing group structure', 'legal_entity', 12, true),
  ('ownership_diagram', 'Ownership Diagram', 'ownership', 'Visual diagram showing ownership and control structure', 'legal_entity', 12, true),
  ('full_ownership_chain', 'Complete Ownership Chain', 'ownership', 'MANDATORY for EDD - full documentation of ownership to ultimate beneficial owners', 'legal_entity', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- COMPLEX CORPORATE STRUCTURES (Enhanced DD)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('offshore_entity_docs', 'Offshore Entity Documentation', 'corporate', 'Registration and structure documentation for offshore entities', 'legal_entity', 0, true),
  ('trust_deeds', 'Trust Deeds', 'ownership', 'Trust documentation if entity involves trust structures', 'legal_entity', 0, true),
  ('nominee_agreements', 'Nominee Agreements', 'ownership', 'Documentation of any nominee shareholder or director arrangements', 'legal_entity', 0, true),
  ('control_rights_docs', 'Control Rights Documentation', 'ownership', 'Evidence of voting rights, control mechanisms, veto powers', 'legal_entity', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- FINANCIAL DOCUMENTS (Entities)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('financial_statements', 'Audited Financial Statements', 'financial', 'Latest audited financial statements (balance sheet, P&L)', 'legal_entity', 12, true),
  ('source_of_capital', 'Source of Capital Documentation', 'financial', 'Evidence of source of company capital and funding', 'legal_entity', 0, true),
  ('tin_certificate_entity', 'TIN Certificate', 'regulatory', 'Tax Identification Number certificate for entity', 'legal_entity', 0, true),
  ('tax_compliance_cert', 'Tax Compliance Certificate', 'regulatory', 'Tax clearance or compliance certificate', 'legal_entity', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- PEP AND REGULATORY DOCUMENTS
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('pep_declaration', 'PEP Declaration', 'regulatory', 'Declaration of political exposure and screening results', 'both', 12, true),
  ('pep_screening', 'PEP Screening Report', 'regulatory', 'PEP and sanctions screening report for directors and beneficial owners', 'legal_entity', 12, true),
  ('political_position_details', 'Political Position Details', 'regulatory', 'Documentation of current or former political positions held', 'individual', 12, true),
  ('public_office_history', 'Public Office History', 'regulatory', 'Complete history of public positions and offices held', 'individual', 0, true),
  ('pep_relationship_disclosure', 'PEP Relationship Disclosure', 'regulatory', 'Disclosure of family or close associate relationships with PEPs', 'both', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- BACKGROUND CHECK DOCUMENTS (Enhanced DD - MANDATORY)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('adverse_media_check', 'Adverse Media Screening Report', 'background', 'Results of adverse media and negative news screening', 'both', 12, true),
  ('reputation_check', 'Reputation and Background Check', 'background', 'Public information searches and reputation verification', 'both', 12, true),
  ('public_records_search', 'Public Records Search', 'background', 'Search of court records, sanctions lists, and public databases', 'both', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- APPROVAL AND MONITORING DOCUMENTS (Enhanced DD - MANDATORY)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('senior_mgmt_approval', 'Senior Management Approval', 'regulatory', 'MANDATORY for EDD - documented approval from senior management for high-risk relationship', 'both', 0, true),
  ('enhanced_monitoring_plan', 'Enhanced Monitoring Plan', 'regulatory', 'Plan for ongoing enhanced monitoring of high-risk client', 'both', 12, true),
  ('periodic_review_record', 'Periodic Review Record', 'regulatory', 'Documentation of periodic client reviews and updates', 'both', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- TRANSACTION DOCUMENTATION (Enhanced DD)
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('transaction_contracts', 'Transaction Contracts', 'transaction', 'Legal contracts and agreements related to specific transactions', 'both', 24, true),
  ('economic_rationale', 'Economic Rationale Documentation', 'transaction', 'Documentation explaining business/economic purpose and rationale of transactions', 'both', 24, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

-- ================================================================
-- GENERAL DOCUMENTS
-- ================================================================

INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_active) VALUES
  ('client_declaration', 'Client Declaration Form', 'other', 'General client information and declaration form (purpose, nature of relationship)', 'both', 12, true),
  ('risk_assessment_record', 'Risk Assessment Record', 'other', 'Formal risk assessment and classification documentation', 'both', 12, true),
  ('risk_justification', 'Risk Classification Justification', 'other', 'MANDATORY for Simplified DD - documentation explaining why simplified DD was applied', 'both', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  client_type = EXCLUDED.client_type,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();
