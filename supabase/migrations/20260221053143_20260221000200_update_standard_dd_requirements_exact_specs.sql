/*
  # Update Standard DD Document Requirements - Exact Specifications

  ## Overview
  Updates Standard Due Diligence requirements for individuals to match exact specifications
  provided by user with correct document types and mandatory/optional status.

  ## Standard DD Requirements for Individuals:
  
  ### Identity Documents:
  - Passport (Required) - Primary identification required (at least one)
  - National ID/NIDA (Required) - Primary identification required (at least one)
  - Voter Registration Card (Optional) - Optional supporting document
  
  ### Address Documents:
  - Bank Statement (Required) - Proof of residential address (at least one, max 3 months old)
  - Tenancy Agreement (Required) - Proof of residential address (at least one, max 3 months old)
  - Utility Bill (Required) - Proof of residential address (at least one, max 3 months old)
  - TIN Certificate (Required) - Tax identification required
  
  ### Financial Documents:
  - Source of Funds Declaration (Required) - With printable template
  - Payslips/Employment Confirmation (Required) - Evidence of occupation and income
  - Bank Reference Letter (Optional) - Optional supporting document

  ## Document Collection Guidelines
  - Collect originals or certified copies in person when possible
  - Verify authenticity through official channels
  - Maintain physical copies in secure, locked storage
  - Record verification in offline compliance register
  - Ensure documents are current and not expired
  - Additional verification for high-risk clients
*/

-- First, delete existing standard DD requirements for individuals
DELETE FROM dd_level_document_requirements 
WHERE dd_level = 'standard' AND client_type = 'individual';

-- Insert updated Standard DD document requirements for individuals

-- IDENTITY DOCUMENTS
INSERT INTO dd_level_document_requirements (
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description
) VALUES
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'passport'),
  true,
  1,
  'Primary identification required (at least one)'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'national_id'),
  true,
  2,
  'Primary identification required (at least one)'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'voter_card'),
  false,
  3,
  'Optional supporting document'
);

-- ADDRESS DOCUMENTS
INSERT INTO dd_level_document_requirements (
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description
) VALUES
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'bank_statement'),
  true,
  4,
  'Proof of residential address (at least one, max 3 months old)'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'tenancy_agreement'),
  true,
  5,
  'Proof of residential address (at least one, max 3 months old)'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'utility_bill'),
  true,
  6,
  'Proof of residential address (at least one, max 3 months old)'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'tin_certificate'),
  true,
  7,
  'Tax identification required'
);

-- FINANCIAL DOCUMENTS
INSERT INTO dd_level_document_requirements (
  dd_level,
  client_type,
  document_type_id,
  is_mandatory,
  priority,
  description
) VALUES
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'sof_declaration'),
  true,
  8,
  'Declaration of source of funds for transaction. Printable template available in SOF/SOW Templates tab'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'payslip'),
  true,
  9,
  'Evidence of occupation and income'
),
(
  'standard',
  'individual',
  (SELECT id FROM document_types WHERE code = 'bank_reference'),
  false,
  10,
  'Optional supporting document'
);
