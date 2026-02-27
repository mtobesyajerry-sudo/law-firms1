/*
  # Add EDD Document Types to Main Document System

  ## Overview
  Adds Enhanced Due Diligence (EDD) specific document types to the main document_types table
  so they appear in the document requirements checklist for enhanced DD clients.

  ## New Document Types Added
  1. **pep_assessment** - PEP Assessment Form (comprehensive PEP risk assessment)
  2. **edd_questionnaire** - Enhanced DD Questionnaire (detailed wealth/funds verification)
  3. **senior_approval** - Senior Management Approval (written approval for onboarding)
  4. **monitoring_checklist** - Ongoing Monitoring Checklist (enhanced monitoring schedule)
  5. **public_records_search** - Public Records Search Results (due diligence searches)
  6. **economic_rationale** - Transaction Economic Rationale (transaction purpose explanation)
  7. **country_risk_assessment** - Country Risk Assessment (high-risk jurisdiction assessment)

  ## DD Level Assignment
  - All these documents are added as requirements for Enhanced DD only
  - Mandatory for both individual and legal entity clients at Enhanced DD level
  - These supplement the core identification, financial, and ownership documents

  ## Security
  - Uses existing RLS policies from document_types and dd_level_document_requirements tables
  - No additional security changes needed
*/

-- Insert EDD-specific document types
INSERT INTO document_types (code, name, category, description, client_type, validity_months) VALUES
  ('pep_assessment', 'PEP Assessment Form', 'regulatory', 'Comprehensive risk assessment for PEP relationships', 'both', 12),
  ('edd_questionnaire', 'Enhanced DD Questionnaire', 'regulatory', 'Detailed questionnaire for wealth and funds verification', 'both', 12),
  ('senior_approval', 'Senior Management Approval', 'regulatory', 'Written approval from senior management for client onboarding', 'both', 0),
  ('monitoring_checklist', 'Ongoing Monitoring Checklist', 'regulatory', 'Checklist and schedule for enhanced ongoing monitoring', 'both', 12),
  ('public_records_search', 'Public Records Search Results', 'regulatory', 'Documentation of public database and media searches', 'both', 6),
  ('economic_rationale', 'Transaction Economic Rationale', 'regulatory', 'Statement explaining transaction economic purpose', 'both', 0),
  ('country_risk_assessment', 'Country Risk Assessment', 'regulatory', 'Assessment for high-risk jurisdiction connections', 'both', 12)
ON CONFLICT (code) DO NOTHING;

-- Add EDD documents as Enhanced DD requirements for individuals
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'pep_assessment'), true, 11, 'PEP risk assessment'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'edd_questionnaire'), true, 12, 'EDD questionnaire'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'senior_approval'), true, 13, 'Senior approval'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'monitoring_checklist'), true, 14, 'Monitoring plan'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'public_records_search'), true, 15, 'Public records'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'economic_rationale'), false, 16, 'Transaction rationale'),
  ('enhanced', 'individual', (SELECT id FROM document_types WHERE code = 'country_risk_assessment'), false, 17, 'Country risk')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;

-- Add EDD documents as Enhanced DD requirements for legal entities
INSERT INTO dd_level_document_requirements (dd_level, client_type, document_type_id, is_mandatory, priority, description) VALUES
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'pep_assessment'), true, 14, 'PEP assessment'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'edd_questionnaire'), true, 15, 'EDD questionnaire'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'senior_approval'), true, 16, 'Senior approval'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'monitoring_checklist'), true, 17, 'Monitoring checklist'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'public_records_search'), true, 18, 'Public records search'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'economic_rationale'), false, 19, 'Economic rationale'),
  ('enhanced', 'legal_entity', (SELECT id FROM document_types WHERE code = 'country_risk_assessment'), false, 20, 'Country risk assessment')
ON CONFLICT (dd_level, client_type, document_type_id) DO NOTHING;
