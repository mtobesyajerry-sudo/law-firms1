/*
  # Seed Document Types and Requirements

  ## Overview
  Populates document types and DD level requirements based on Tanzania AML/FATF guidelines

  ## Document Types Categories
  1. Identity Documents
  2. Address/Residence Documents  
  3. Financial Documents
  4. Corporate Documents
  5. Ownership Documents
  6. Regulatory Documents

  ## DD Levels
  - Simplified (Low Risk): 2-3 docs for individuals, 3-4 for entities
  - Standard (Medium Risk): 5-7 docs for individuals, 7-10 for entities
  - Enhanced (High Risk): 10+ docs for individuals, 12-20 for entities
*/

-- Insert Document Types for Individual Clients
INSERT INTO document_types (code, name, category, description, client_type, validity_months) VALUES
  ('national_id', 'National ID', 'identity', 'Tanzania National Identification Card', 'individual', 60),
  ('passport', 'Passport', 'identity', 'Valid passport', 'individual', 120),
  ('driving_licence', 'Driving Licence', 'identity', 'Valid driving licence', 'individual', 60),
  ('voter_id', 'Voter ID', 'identity', 'Voter registration card', 'individual', 60),
  ('utility_bill', 'Utility Bill', 'address', 'Recent utility bill (water, electricity, gas)', 'both', 6),
  ('tenancy_agreement', 'Tenancy Agreement', 'address', 'Rental or lease agreement', 'both', 24),
  ('govt_letter', 'Government Letter', 'address', 'Letter from government authority', 'both', 12),
  ('bank_statement', 'Bank Statement', 'address', 'Bank statement showing address', 'both', 6),
  ('employment_letter', 'Employment Letter', 'financial', 'Letter from employer', 'individual', 12),
  ('payslip', 'Payslip', 'financial', 'Recent salary payslip', 'individual', 3),
  ('tax_return', 'Tax Return', 'financial', 'Personal tax return', 'individual', 12),
  ('asset_declaration', 'Asset Declaration', 'financial', 'Declaration of assets and wealth', 'individual', 12),
  ('investment_portfolio', 'Investment Portfolio', 'financial', 'Investment holdings statement', 'individual', 6),
  ('property_ownership', 'Property Ownership', 'financial', 'Property title or ownership documents', 'individual', 0),
  ('bank_statements_6m', 'Bank Statements (6 months)', 'financial', 'Six months of bank statements', 'both', 6),
  ('bank_statements_12m', 'Bank Statements (12 months)', 'financial', 'Twelve months of bank statements', 'both', 12),
  ('transaction_history', 'Transaction History', 'financial', 'Detailed transaction records', 'both', 6),
  ('contract_agreement', 'Contract/Agreement', 'financial', 'Contract supporting transaction', 'both', 0),
  ('pep_declaration', 'PEP Declaration', 'regulatory', 'Political exposure declaration', 'individual', 12),
  ('public_position_verify', 'Public Position Verification', 'regulatory', 'Verification of political position', 'individual', 12),
  ('client_declaration', 'Client Declaration Form', 'other', 'Purpose and source of funds declaration', 'both', 12)
ON CONFLICT (code) DO NOTHING;

-- Insert Document Types for Legal Entity Clients
INSERT INTO document_types (code, name, category, description, client_type, validity_months) VALUES
  ('cert_incorporation', 'Certificate of Incorporation', 'corporate', 'Certificate of registration/incorporation', 'legal_entity', 0),
  ('business_licence', 'Business Licence', 'regulatory', 'Valid business operating licence', 'legal_entity', 12),
  ('tin_certificate', 'TIN Certificate', 'regulatory', 'Tax Identification Number certificate', 'legal_entity', 0),
  ('directors_list', 'List of Directors', 'ownership', 'List of company directors', 'legal_entity', 12),
  ('memorandum_articles', 'Memorandum & Articles', 'corporate', 'Memorandum and Articles of Association', 'legal_entity', 0),
  ('board_resolution', 'Board Resolution', 'corporate', 'Board resolution authorizing engagement', 'legal_entity', 24),
  ('shareholder_register', 'Shareholder Register', 'ownership', 'Register of shareholders', 'legal_entity', 12),
  ('bo_declaration', 'Beneficial Ownership Declaration', 'ownership', 'Declaration of beneficial owners', 'legal_entity', 12),
  ('bo_ids', 'Beneficial Owner IDs', 'ownership', 'ID documents for all beneficial owners', 'legal_entity', 60),
  ('bo_address_proof', 'Beneficial Owner Address Proof', 'ownership', 'Proof of address for beneficial owners', 'legal_entity', 12),
  ('financial_statements', 'Financial Statements', 'financial', 'Audited financial statements', 'legal_entity', 12),
  ('bank_reference', 'Bank Reference', 'financial', 'Reference letter from bank', 'legal_entity', 12),
  ('business_profile', 'Business Profile', 'corporate', 'Description of business activities', 'legal_entity', 12),
  ('group_structure', 'Group Structure Chart', 'ownership', 'Corporate group structure diagram', 'legal_entity', 12),
  ('ownership_diagram', 'Ownership Diagram', 'ownership', 'Visual representation of ownership', 'legal_entity', 12),
  ('trust_nominee_docs', 'Trust/Nominee Documentation', 'ownership', 'Trust deed or nominee agreements', 'legal_entity', 0),
  ('offshore_entity_docs', 'Offshore Entity Documentation', 'corporate', 'Documents for offshore structures', 'legal_entity', 12),
  ('source_of_capital', 'Source of Capital', 'financial', 'Evidence of capital source', 'legal_entity', 0),
  ('sale_agreements', 'Sale Agreements', 'financial', 'Sales contracts and agreements', 'legal_entity', 0),
  ('loan_agreements', 'Loan Agreements', 'financial', 'Loan contracts and facilities', 'legal_entity', 0),
  ('investment_contracts', 'Investment Contracts', 'financial', 'Investment agreements', 'legal_entity', 0),
  ('aml_policies', 'AML Policies', 'regulatory', 'Client AML/CFT policies', 'legal_entity', 12),
  ('regulatory_licences', 'Regulatory Licences', 'regulatory', 'Industry-specific licences', 'legal_entity', 12),
  ('tax_compliance_cert', 'Tax Compliance Certificate', 'regulatory', 'Tax clearance certificate', 'legal_entity', 12),
  ('pep_screening', 'PEP Screening Report', 'regulatory', 'Political exposure screening', 'legal_entity', 12)
ON CONFLICT (code) DO NOTHING;

-- Simplified DD Requirements - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  -- Mandatory identity (any one)
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'national_id'), true, 1, 'Primary identification'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'passport'), false, 2, 'Alternative identification'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'driving_licence'), false, 3, 'Alternative identification'),
  -- Address proof (any one)
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'utility_bill'), true, 4, 'Proof of address'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'tenancy_agreement'), false, 5, 'Alternative address proof'),
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'govt_letter'), false, 6, 'Alternative address proof'),
  -- Basic declaration
  ('simplified', 'individual', (SELECT id FROM document_types WHERE code = 'client_declaration'), true, 7, 'Purpose and source declaration')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Simplified DD Requirements - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Company registration'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_licence'), true, 2, 'Operating licence'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'tin_certificate'), true, 3, 'Tax registration'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'directors_list'), true, 4, 'Company directors'),
  ('simplified', 'legal_entity', (SELECT id FROM document_types WHERE code = 'memorandum_articles'), false, 5, 'Constitutional documents')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Standard DD Requirements - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  -- Identity
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'passport'), true, 1, 'Primary identification'),
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'national_id'), false, 2, 'Secondary identification'),
  -- Address
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'utility_bill'), true, 3, 'Proof of address'),
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'bank_statement'), false, 4, 'Alternative address proof'),
  -- Source of income (any one)
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'employment_letter'), true, 5, 'Employment verification'),
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'payslip'), false, 6, 'Income verification'),
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'tax_return'), false, 7, 'Alternative income proof'),
  -- Purpose
  ('standard', 'individual', (SELECT id FROM document_types WHERE code = 'client_declaration'), true, 8, 'Engagement purpose')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Standard DD Requirements - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  -- Corporate docs
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Registration certificate'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_licence'), true, 2, 'Operating licence'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'memorandum_articles'), true, 3, 'Constitutional documents'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'board_resolution'), true, 4, 'Authorization'),
  -- Ownership
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'shareholder_register'), true, 5, 'Ownership structure'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_declaration'), true, 6, 'Beneficial ownership'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_ids'), true, 7, 'Beneficial owner identification'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'directors_list'), true, 8, 'Directors'),
  -- Financial
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'financial_statements'), true, 9, 'Financial information'),
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bank_reference'), false, 10, 'Banking relationship'),
  -- Business
  ('standard', 'legal_entity', (SELECT id FROM document_types WHERE code = 'business_profile'), true, 11, 'Business description')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Enhanced DD Requirements - Individual
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  -- Identity
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'passport'), true, 1, 'Primary identification'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'national_id'), true, 2, 'Secondary identification'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'utility_bill'), true, 3, 'Proof of residence'),
  -- Source of wealth (mandatory for enhanced)
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'asset_declaration'), true, 4, 'Asset declaration'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'investment_portfolio'), true, 5, 'Investment holdings'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'property_ownership'), false, 6, 'Property records'),
  -- Source of funds
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'bank_statements_12m'), true, 7, 'Financial history'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'transaction_history'), true, 8, 'Transaction records'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'contract_agreement'), false, 9, 'Supporting contracts'),
  -- Political exposure
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'pep_declaration'), true, 10, 'PEP declaration'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'public_position_verify'), false, 11, 'Position verification')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Enhanced DD Requirements - Legal Entity
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  -- Corporate structure
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'cert_incorporation'), true, 1, 'Registration'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'group_structure'), true, 2, 'Group structure'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'ownership_diagram'), true, 3, 'Ownership chart'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'trust_nominee_docs'), false, 4, 'Trust structures'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'offshore_entity_docs'), false, 5, 'Offshore entities'),
  -- Beneficial ownership
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_declaration'), true, 6, 'BO declaration'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_ids'), true, 7, 'BO identification'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bo_address_proof'), true, 8, 'BO address proof'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'shareholder_register'), true, 9, 'Shareholders'),
  -- Financial and wealth
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'financial_statements'), true, 10, 'Financial statements'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'bank_reference'), true, 11, 'Banking reference'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'source_of_capital'), true, 12, 'Capital source'),
  -- Transaction support
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'sale_agreements'), false, 13, 'Sales contracts'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'loan_agreements'), false, 14, 'Loan contracts'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'investment_contracts'), false, 15, 'Investment agreements'),
  -- Governance
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'aml_policies'), false, 16, 'AML compliance'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'board_resolution'), true, 17, 'Board authorization'),
  -- Political exposure
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'pep_screening'), true, 18, 'PEP screening'),
  -- Regulatory
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'regulatory_licences'), false, 19, 'Regulatory licences'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'tax_compliance_cert'), true, 20, 'Tax compliance')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;
