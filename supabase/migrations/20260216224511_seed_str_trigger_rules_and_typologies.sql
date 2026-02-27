/*
  # Seed STR Trigger Rules and Typologies

  ## Overview
  Populates the STR system with default trigger rules based on:
  - FATF red flags
  - Tanzania AML/CFT regulations
  - Legal profession typologies
  - International best practices

  ## Changes
  1. Insert default trigger rules for rule-based detection
  2. Insert score-based threshold rules
  3. Insert behavioral pattern rules
  4. Insert document integrity rules
  5. Insert common ML/TF typologies for legal professionals
*/

-- ============================================================================
-- Insert Default Trigger Rules
-- ============================================================================

-- Get the first organization (for system-wide rules)
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  -- Only insert if no rules exist
  IF NOT EXISTS (SELECT 1 FROM str_trigger_rules) THEN
    
    -- ========================================================================
    -- RULE-BASED TRIGGERS
    -- ========================================================================
    
    -- High-Risk Jurisdiction
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'High-Risk Jurisdiction - Client',
      'Rule-Based',
      'Geographic Risk',
      'Client is located in or transacting with a high-risk or sanctioned jurisdiction as per FATF list',
      '{"field": "country_of_residence", "operator": "in", "values": ["North Korea", "Iran", "Myanmar", "Syria"]}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- PEP Detection
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Politically Exposed Person (PEP)',
      'Rule-Based',
      'Customer Risk',
      'Client identified as a Politically Exposed Person (PEP) or close associate/family member',
      '{"field": "pep_status", "operator": "equals", "value": true}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- Complex Ownership Structure
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Complex/Opaque Ownership Structure',
      'Rule-Based',
      'Customer Risk',
      'Client has complex corporate structure with multiple layers or offshore entities without clear business purpose',
      '{"field": "beneficial_owners", "operator": "array_length_gt", "value": 5}'::jsonb,
      'Medium',
      true,
      true,
      true
    );
    
    -- Sanctions Screening Hit
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Sanctions Screening Match',
      'Rule-Based',
      'Sanctions',
      'Client matches sanctions list or adverse media screening',
      '{"field": "sanctions_screening_result", "operator": "not_equals", "value": "clear"}'::jsonb,
      'Critical',
      true,
      true,
      true
    );
    
    -- Large Cash Transaction
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Large Cash Transaction',
      'Rule-Based',
      'Transaction Risk',
      'Client attempting to pay legal fees with large amounts of cash (threshold: USD 10,000 equivalent)',
      '{"field": "payment_method", "operator": "equals", "value": "cash", "threshold": 10000}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- Third-Party Funding
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Third-Party Funding Without Explanation',
      'Rule-Based',
      'Transaction Risk',
      'Fees paid by unknown third party without clear relationship or explanation',
      '{"field": "payment_source", "operator": "equals", "value": "third_party"}'::jsonb,
      'Medium',
      true,
      true,
      true
    );
    
    -- Offshore Entity
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Offshore Entity Without Clear Purpose',
      'Rule-Based',
      'Customer Risk',
      'Client operates through offshore entities without clear legitimate business purpose',
      '{"field": "country_of_incorporation", "operator": "in", "values": ["BVI", "Cayman Islands", "Panama", "Seychelles"]}'::jsonb,
      'Medium',
      true,
      true,
      true
    );
    
    -- KYC Information Refusal
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Refusal to Provide KYC Information',
      'Behavioral',
      'Customer Behavior',
      'Client refuses, delays, or provides incomplete KYC documentation',
      '{"field": "kyc_compliance", "operator": "equals", "value": "incomplete"}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- ========================================================================
    -- SCORE-BASED TRIGGERS
    -- ========================================================================
    
    -- High Risk Score
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Risk Score Exceeds High Threshold',
      'Score-Based',
      'Risk Assessment',
      'Client risk score exceeds 75/100 indicating high ML/TF risk',
      '{"field": "current_risk_rating", "operator": "in", "values": ["High", "Very High"]}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- Risk Escalation
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Significant Risk Score Increase',
      'Score-Based',
      'Risk Assessment',
      'Client risk score increased by more than 25 points in periodic review',
      '{"field": "risk_score_change", "operator": "gt", "value": 25}'::jsonb,
      'Medium',
      true,
      true,
      true
    );
    
    -- ========================================================================
    -- BEHAVIORAL TRIGGERS
    -- ========================================================================
    
    -- Unusual Urgency
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Unusual Urgency or Pressure',
      'Behavioral',
      'Customer Behavior',
      'Client displays unusual urgency to complete transaction or avoid normal procedures',
      '{"type": "manual_trigger", "requires_documentation": true}'::jsonb,
      'Medium',
      true,
      false,
      true
    );
    
    -- Frequent Instruction Changes
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Frequent Changes in Instructions',
      'Behavioral',
      'Customer Behavior',
      'Client frequently changes instructions, especially regarding fund transfers or beneficiaries',
      '{"type": "pattern_detection", "threshold": 3}'::jsonb,
      'Medium',
      true,
      false,
      true
    );
    
    -- Avoidance of Controls
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Attempts to Avoid Compliance Controls',
      'Behavioral',
      'Customer Behavior',
      'Client attempts to structure transactions to avoid reporting thresholds or compliance procedures',
      '{"type": "manual_trigger", "requires_documentation": true}'::jsonb,
      'High',
      true,
      false,
      true
    );
    
    -- ========================================================================
    -- DOCUMENT INTEGRITY TRIGGERS
    -- ========================================================================
    
    -- Inconsistent Documentation
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Inconsistent or Contradictory Documents',
      'Document Integrity',
      'Documentation',
      'Provided documents contain inconsistencies or contradictions',
      '{"type": "manual_trigger", "requires_documentation": true}'::jsonb,
      'High',
      true,
      false,
      true
    );
    
    -- Suspected Forgery
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Suspected Forged or Altered Documents',
      'Document Integrity',
      'Documentation',
      'Documents appear forged, altered, or of questionable authenticity',
      '{"type": "manual_trigger", "requires_documentation": true}'::jsonb,
      'Critical',
      true,
      false,
      true
    );
    
    -- Income Mismatch
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Transaction Value Exceeds Declared Income',
      'Document Integrity',
      'Financial Profile',
      'Transaction value or assets significantly exceed client declared income or known financial capacity',
      '{"type": "manual_trigger", "requires_documentation": true}'::jsonb,
      'High',
      true,
      false,
      true
    );
    
    -- ========================================================================
    -- LEGAL PROFESSION SPECIFIC TRIGGERS
    -- ========================================================================
    
    -- Real Estate Red Flag
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Suspicious Real Estate Transaction',
      'Rule-Based',
      'Service-Specific',
      'Real estate transaction with unusual features: rapid buy-sell, below-market value, complex structures',
      '{"field": "service_type", "operator": "equals", "value": "real_estate", "additional_flags": ["rapid_transaction", "price_anomaly"]}'::jsonb,
      'Medium',
      true,
      true,
      true
    );
    
    -- Trust/Company Formation
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Suspicious Trust or Company Formation',
      'Rule-Based',
      'Service-Specific',
      'Formation of trusts or companies with no apparent legitimate purpose or beneficial owner obscured',
      '{"field": "service_type", "operator": "equals", "value": "trust_formation", "risk_factors": ["unclear_purpose", "nominee_directors"]}'::jsonb,
      'High',
      true,
      true,
      true
    );
    
    -- Client Account Activity
    INSERT INTO str_trigger_rules (
      organization_id, rule_name, rule_type, rule_category, description,
      trigger_condition, severity, is_active, auto_generate_alert, requires_manual_review
    ) VALUES (
      v_org_id,
      'Misuse of Client Account',
      'Rule-Based',
      'Service-Specific',
      'Client account used for rapid movement of funds unrelated to legal services',
      '{"field": "service_type", "operator": "equals", "value": "client_account", "pattern": "rapid_fund_movement"}'::jsonb,
      'Critical',
      true,
      true,
      true
    );
    
  END IF;
END $$;

-- ============================================================================
-- Insert Common ML/TF Typologies for Legal Professionals
-- ============================================================================

-- Only insert if str_typologies table has no data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'str_typologies') THEN
    IF NOT EXISTS (SELECT 1 FROM str_typologies) THEN
      
      INSERT INTO str_typologies (typology_name, category, description, indicators, mitigation_measures) VALUES
      
      -- Real Estate Money Laundering
      ('Real Estate Money Laundering', 'Property Transactions', 
       'Use of real estate transactions to launder proceeds of crime through purchase, renovation, or sale of property',
       '["Rapid purchase and resale", "Cash purchases", "Below market value transactions", "Use of intermediaries or nominees", "Complex ownership structures", "Purchase by shell companies"]'::jsonb,
       '["Enhanced due diligence on source of funds", "Verification of property valuations", "Background checks on all parties", "Documentation of business rationale", "Ongoing monitoring of property ownership chains"]'::jsonb),
      
      -- Trust and Company Service Provider Misuse
      ('TCSP Misuse', 'Corporate Services',
       'Misuse of trust and company services to obscure beneficial ownership and facilitate illicit financial flows',
       '["Multiple layers of corporate structures", "Use of offshore jurisdictions", "Nominee directors/shareholders", "Bearer shares", "Lack of legitimate business purpose", "Rapid changes in ownership"]'::jsonb,
       '["Enhanced beneficial ownership verification", "Independent verification of business activities", "Understanding of corporate structure rationale", "Regular updates of ownership information", "Source of wealth verification"]'::jsonb),
      
      -- Client Account Misuse
      ('Client Account Misuse', 'Client Funds',
       'Misuse of lawyer client accounts to move illicit funds under the guise of legal fees or settlements',
       '["Unusually large deposits unrelated to legal services", "Rapid in-and-out transactions", "Third-party payments", "Transactions inconsistent with client profile", "Requests to transfer funds to unrelated parties"]'::jsonb,
       '["Strict client account policies", "Transaction monitoring", "Verification of fund sources", "Documentation of all transfers", "Senior management approval for unusual transactions", "Regular account reconciliation"]'::jsonb),
      
      -- Structuring (Smurfing)
      ('Structuring Below Reporting Thresholds', 'Transaction Patterns',
       'Breaking down large transactions into smaller amounts to avoid reporting thresholds',
       '["Multiple transactions just below reporting limits", "Pattern of deposits/withdrawals", "Use of multiple accounts", "Unusual frequency of cash transactions", "No apparent business rationale"]'::jsonb,
       '["Aggregation of related transactions", "Pattern detection and monitoring", "Enhanced scrutiny of cash transactions", "Documentation of business rationale", "Staff training on structuring red flags"]'::jsonb),
      
      -- Trade-Based Money Laundering
      ('Trade-Based Money Laundering via Legal Services', 'Trade Finance',
       'Use of trade transactions and related legal services to disguise illicit fund transfers',
       '["Over/under-invoicing", "Phantom shipments", "Multiple invoicing", "Falsely described goods", "Complex payment structures", "Involvement of shell companies"]'::jsonb,
       '["Verification of underlying commercial transactions", "Independent valuation where possible", "Enhanced due diligence on trading parties", "Review of shipping and customs documents", "Understanding of trade flows"]'::jsonb),
      
      -- PEP Corruption Proceeds
      ('PEP-Related Corruption', 'Political Exposure',
       'Movement of corruption proceeds through legal services by Politically Exposed Persons or associates',
       '["PEP involvement", "Public procurement connections", "Asset purchases inconsistent with known income", "Use of family members or associates", "Offshore structures", "Lack of transparency"]'::jsonb,
       '["Enhanced due diligence on PEPs", "Source of wealth verification", "Media and adverse information screening", "Senior management approval", "Continuous monitoring", "Understanding of PEP income sources"]'::jsonb),
      
      -- Terrorist Financing
      ('Terrorist Financing', 'National Security',
       'Use of legal services to facilitate terrorist financing through legitimate-appearing transactions',
       '["Links to high-risk jurisdictions", "Charitable organizations with unclear purpose", "Unusual fund transfers to individuals", "Lack of economic rationale", "Use of cash or informal value transfer", "Connections to known extremist groups"]'::jsonb,
       '["Enhanced screening procedures", "Sanctions list checking", "Geographic risk assessment", "Purpose of transaction verification", "Monitoring of news and intelligence sources", "Immediate escalation of concerns"]'::jsonb),
      
      -- Gateway Transactions
      ('Gateway Transactions', 'Cross-Border',
       'Use of legal profession as gateway to move funds between jurisdictions',
       '["Multiple cross-border transfers", "Involvement of multiple law firms", "No substantive legal service", "Transfers to/from high-risk jurisdictions", "Complex routing of funds", "Minimal or no legal documentation"]'::jsonb,
       '["Verification of underlying legal service", "Understanding of all transaction parties", "Enhanced due diligence on cross-border transactions", "Documentation of legal service provided", "Questioning unusual routing"]'::jsonb),
      
      -- Loan-Back Schemes
      ('Loan-Back Schemes', 'Financial Structures',
       'Creating artificial loan structures to legitimize illicit funds or avoid tax obligations',
       '["Back-to-back loans", "Loans from offshore entities", "No genuine lending relationship", "Unusual loan terms", "Collateral inconsistent with loan", "No repayment schedule or enforcement"]'::jsonb,
       '["Verification of genuine lending relationship", "Assessment of loan terms reasonableness", "Source of lender funds verification", "Understanding of business purpose", "Documentation of all parties", "Tax implications consideration"]'::jsonb),
      
      -- Art and High-Value Goods
      ('Art and High-Value Goods Transactions', 'Valuables',
       'Use of art, antiques, and high-value goods transactions to launder money',
       '["Subjective valuations", "Rapid buy-sell transactions", "Use of intermediaries", "Anonymous buyers/sellers", "Cash payments", "Offshore storage or ownership"]'::jsonb,
       '["Independent valuation", "Provenance verification", "Source of funds documentation", "Buyer and seller verification", "Understanding of market norms", "Documentation of transaction rationale"]'::jsonb);
      
    END IF;
  END IF;
END $$;
