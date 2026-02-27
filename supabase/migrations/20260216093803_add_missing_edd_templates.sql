/*
  # Add Missing EDD Document Templates

  ## Overview
  Adds three additional EDD document types that were missing from the templates:
  - PEP Assessment Form (detailed assessment beyond basic declaration)
  - Transaction Economic Rationale (statement explaining transaction purpose)
  - Country Risk Assessment (for high-risk jurisdiction involvement)

  ## Changes
  - Adds 3 new document types to edd_document_types table
  - These complement the existing 5 templates with additional regulatory requirements

  ## Document Types Added
  1. **PEP Assessment Form** - Comprehensive risk assessment for PEP relationships
  2. **Transaction Economic Rationale** - Detailed explanation of transaction economic purpose
  3. **Country Risk Assessment** - Assessment for clients with high-risk jurisdiction connections
*/

-- Add missing EDD document types
INSERT INTO edd_document_types (name, description, required_for_risk_level, display_order) VALUES
('PEP Assessment Form', 'Comprehensive risk assessment and approval form for PEP relationships', 'High', 6),
('Transaction Economic Rationale', 'Detailed statement explaining the economic purpose and rationale of transactions', 'High', 7),
('Country Risk Assessment', 'Risk assessment for clients with connections to high-risk jurisdictions', 'High', 8)
ON CONFLICT (name) DO NOTHING;