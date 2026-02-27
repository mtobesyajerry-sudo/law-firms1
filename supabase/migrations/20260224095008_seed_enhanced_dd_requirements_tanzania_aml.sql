/*
  # Enhanced Due Diligence Requirements - Tanzania AML
  
  ## Overview
  Seeds document requirements for Enhanced DD - required for HIGH RISK clients
  under Tanzania AML law and FATF guidance.
  
  ## When Enhanced DD is MANDATORY
  - Politically Exposed Persons (PEPs)
  - Clients from high-risk jurisdictions
  - Complex or unusual transactions
  - Suspicious clients or activities
  - High-value transactions
  
  ## Enhanced DD Requirements
  
  This is the MOST COMPREHENSIVE level of due diligence.
  
  ### Individual Clients (15-25+ documents):
  ALL Standard DD requirements PLUS:
  - **Customer Background**: Reputation checks, adverse media, public records
  - **Source of Wealth**: MANDATORY - property, business ownership, inheritance
  - **Source of Funds**: MANDATORY - 12 months bank statements, transaction history
  - **PEP Requirements**: Political positions, public office history, relationships
  - **Senior Approval**: MANDATORY senior management approval
  - **Enhanced Monitoring**: Ongoing monitoring plan, periodic reviews
  - **Transaction Documentation**: Contracts, economic rationale
  
  ### Legal Entity Clients (20-30+ documents):
  ALL Standard DD requirements PLUS:
  - **Full Ownership Chain**: Complete documentation to ultimate beneficial owners
  - **Complex Structures**: Offshore entities, trusts, nominee arrangements
  - **Enhanced Financial**: Source of capital, 12-month statements
  - **Background Checks**: Company reputation, adverse media, public records
  - **Enhanced Screening**: PEP screening of ALL directors and UBOs
  - **Senior Approval**: MANDATORY
  - **Enhanced Monitoring**: Comprehensive ongoing monitoring
  
  ## Critical Compliance Points
  - Source of Wealth documentation is MANDATORY (not optional)
  - Source of Funds documentation is MANDATORY (not optional)
  - Senior management approval is MANDATORY before relationship begins
  - Enhanced ongoing monitoring MUST be implemented
  - All documentation must support reconstruction of transactions
*/

-- ================================================================
-- ENHANCED DD - INDIVIDUAL CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Enhanced identity verification
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'passport'), 
    true, 
    1, 
    'Passport - certified copy REQUIRED for Enhanced DD'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'national_id'), 
    true, 
    2, 
    'National ID - certified copy REQUIRED (multiple IDs required for EDD)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'utility_bill'), 
    true, 
    3, 
    'Recent utility bill or address proof (verified)'
  ),
  
  -- Customer background (MANDATORY for EDD)
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'client_declaration'), 
    true, 
    4, 
    'Detailed client profile with comprehensive background information'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'reputation_check'), 
    true, 
    5, 
    'MANDATORY: Background and reputation checks from independent sources'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'adverse_media_check'), 
    true, 
    6, 
    'MANDATORY: Adverse media screening results and negative news searches'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'public_records_search'), 
    true, 
    7, 
    'MANDATORY: Public information searches (court records, sanctions, databases)'
  ),
  
  -- Source of Wealth (MANDATORY under Tanzania EDD)
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'source_of_wealth'), 
    true, 
    8, 
    'MANDATORY: Comprehensive source of wealth documentation - non-negotiable requirement'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'asset_declaration'), 
    true, 
    9, 
    'MANDATORY: Complete asset declaration (property, investments, businesses)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'property_records'), 
    false, 
    10, 
    'Property ownership evidence with title deeds and valuation (if applicable)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'business_ownership_docs'), 
    false, 
    11, 
    'Business ownership documents and business value (if applicable)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'investment_portfolio'), 
    false, 
    12, 
    'Investment portfolio statements and holdings (if applicable)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'inheritance_evidence'), 
    false, 
    13, 
    'Inheritance documentation - wills, estate documents, probate (if applicable)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'gift_evidence'), 
    false, 
    14, 
    'Gift documentation with donor identification and verification (if applicable)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'financial_statements_personal'), 
    false, 
    15, 
    'Personal financial statements showing complete financial position'
  ),
  
  -- Source of Funds (MANDATORY)
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'sof_declaration'), 
    true, 
    16, 
    'MANDATORY: Source of funds declaration for all transactions'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'bank_statements_12m'), 
    true, 
    17, 
    'MANDATORY: Bank statements for 12 months - full transaction history required'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'transaction_history'), 
    true, 
    18, 
    'MANDATORY: Detailed transaction history and patterns'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'payment_records'), 
    true, 
    19, 
    'Payment records for significant transactions'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'loan_agreements'), 
    false, 
    20, 
    'Loan agreements and documentation (if funds borrowed)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'sale_agreements'), 
    false, 
    21, 
    'Asset sale agreements (if funds from sale of assets)'
  ),
  
  -- PEP Requirements (if applicable)
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'pep_declaration'), 
    true, 
    22, 
    'MANDATORY: PEP declaration and comprehensive screening'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'political_position_details'), 
    false, 
    23, 
    'Political position details (if client is PEP)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'public_office_history'), 
    false, 
    24, 
    'Complete public office history (if client is or was PEP)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'pep_relationship_disclosure'), 
    false, 
    25, 
    'Relationship to public officials or PEPs disclosure'
  ),
  
  -- Approval and Monitoring (MANDATORY)
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'senior_mgmt_approval'), 
    true, 
    26, 
    'MANDATORY: Senior management approval BEFORE relationship commences - non-negotiable'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'enhanced_monitoring_plan'), 
    true, 
    27, 
    'MANDATORY: Enhanced ongoing monitoring plan with specific procedures'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'periodic_review_record'), 
    true, 
    28, 
    'MANDATORY: Periodic review records (more frequent than standard DD)'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'risk_assessment_record'), 
    true, 
    29, 
    'Detailed risk assessment documenting high-risk factors'
  ),
  
  -- Transaction documentation
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'transaction_contracts'), 
    false, 
    30, 
    'Transaction contracts and legal agreements'
  ),
  (
    'enhanced', 
    'individual', 
    (SELECT id FROM document_types WHERE code = 'economic_rationale'), 
    true, 
    31, 
    'Economic rationale documentation explaining purpose and legitimacy of transactions'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();

-- ================================================================
-- ENHANCED DD - LEGAL ENTITY CLIENTS
-- ================================================================

INSERT INTO dd_level_document_requirements (
  dd_level, 
  client_type, 
  document_type_id, 
  is_mandatory, 
  priority, 
  description
) VALUES
  -- Corporate structure (Enhanced)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'cert_incorporation'), 
    true, 
    1, 
    'Certificate of incorporation (verified from official registry)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'memorandum_articles'), 
    true, 
    2, 
    'Memorandum and articles of association (complete and current)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_licence'), 
    true, 
    3, 
    'Current business licence and all operating permits'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'business_profile'), 
    true, 
    4, 
    'Comprehensive company profile with detailed business activities'
  ),
  
  -- Full ownership chain (MANDATORY for EDD)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'full_ownership_chain'), 
    true, 
    5, 
    'MANDATORY: Complete ownership chain documenting ALL levels to ultimate beneficial owners'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'group_structure'), 
    true, 
    6, 
    'MANDATORY: Detailed group structure chart showing all related entities'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'ownership_diagram'), 
    true, 
    7, 
    'MANDATORY: Visual ownership diagram with percentages and control mechanisms'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'offshore_entity_docs'), 
    false, 
    8, 
    'Offshore entity documentation and registration (if structure includes offshore entities)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'trust_deeds'), 
    false, 
    9, 
    'Trust deeds and trust documentation (if structure involves trusts)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'nominee_agreements'), 
    false, 
    10, 
    'Nominee agreements and underlying beneficial owner details (if nominee arrangements exist)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'control_rights_docs'), 
    true, 
    11, 
    'Control rights documentation - voting rights, veto powers, control mechanisms'
  ),
  
  -- Beneficial ownership (Enhanced)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_declaration'), 
    true, 
    12, 
    'MANDATORY: Beneficial ownership declaration for ALL beneficial owners'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'shareholder_register'), 
    true, 
    13, 
    'MANDATORY: Complete and current shareholder register with ownership percentages'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_ids'), 
    true, 
    14, 
    'MANDATORY: Certified identification documents for ALL beneficial owners'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bo_address_proof'), 
    true, 
    15, 
    'MANDATORY: Address proof for ALL beneficial owners (required for EDD)'
  ),
  
  -- Directors and authorization
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'directors_list'), 
    true, 
    16, 
    'Complete list of directors with certified identification documents'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'board_resolution'), 
    true, 
    17, 
    'Board resolution with senior management approval for relationship'
  ),
  
  -- Financial documentation (Enhanced)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'financial_statements'), 
    true, 
    18, 
    'MANDATORY: Latest audited financial statements (last 2-3 years)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'source_of_capital'), 
    true, 
    19, 
    'MANDATORY: Source of capital documentation - evidence of how company was funded'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bank_reference'), 
    true, 
    20, 
    'Bank reference letter confirming banking relationship and standing'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'bank_statements_12m'), 
    true, 
    21, 
    'MANDATORY: Company bank statements for 12 months'
  ),
  
  -- Background checks (MANDATORY)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'reputation_check'), 
    true, 
    22, 
    'MANDATORY: Company background and reputation checks from independent sources'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'adverse_media_check'), 
    true, 
    23, 
    'MANDATORY: Adverse media screening for company, directors, and beneficial owners'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'public_records_search'), 
    true, 
    24, 
    'MANDATORY: Public records search (regulatory actions, litigation, sanctions)'
  ),
  
  -- Regulatory and tax (Enhanced)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'tin_certificate_entity'), 
    true, 
    25, 
    'Tax Identification Number certificate (verified)'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'tax_compliance_cert'), 
    true, 
    26, 
    'MANDATORY: Tax compliance certificate or tax clearance'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'pep_screening'), 
    true, 
    27, 
    'MANDATORY: PEP screening of ALL directors and ALL beneficial owners'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'pep_relationship_disclosure'), 
    false, 
    28, 
    'PEP relationship disclosure for directors and beneficial owners'
  ),
  
  -- Approval and monitoring (MANDATORY)
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'senior_mgmt_approval'), 
    true, 
    29, 
    'MANDATORY: Senior management approval BEFORE relationship commences - non-negotiable'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'enhanced_monitoring_plan'), 
    true, 
    30, 
    'MANDATORY: Enhanced monitoring plan with specific enhanced procedures'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'periodic_review_record'), 
    true, 
    31, 
    'MANDATORY: More frequent periodic review records than standard DD'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'risk_assessment_record'), 
    true, 
    32, 
    'Detailed risk assessment documenting all high-risk factors'
  ),
  
  -- Transaction documentation
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'transaction_contracts'), 
    false, 
    33, 
    'Transaction contracts and underlying agreements'
  ),
  (
    'enhanced', 
    'legal_entity', 
    (SELECT id FROM document_types WHERE code = 'economic_rationale'), 
    true, 
    34, 
    'Economic rationale documentation explaining business purpose and legitimacy'
  )
  
ON CONFLICT (dd_level, client_type, document_type_id) DO UPDATE SET
  is_mandatory = EXCLUDED.is_mandatory,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description,
  updated_at = now();
