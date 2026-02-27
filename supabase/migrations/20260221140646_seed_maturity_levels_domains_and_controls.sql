/*
  # Seed Maturity Levels, AML Domains, and Control Library
  
  ## Overview
  Seeds reference data for the AML/CFT maturity assessment system:
  - 5 maturity levels (Initial to Optimised)
  - 9 weighted AML/CFT domains
  - Comprehensive control library with 60+ controls
  
  ## Maturity Levels (1-5)
  1. Initial/Ad hoc - No formal control
  2. Developing - Basic or incomplete
  3. Defined - Defined and implemented
  4. Managed - Monitored and reviewed
  5. Optimised - Continuously improved
  
  ## 9 AML Domains (Total weight = 100%)
  1. Governance and Oversight (15%)
  2. Enterprise ML/TF Risk Assessment (15%)
  3. Customer Due Diligence and KYC (15%)
  4. Transaction Monitoring (15%)
  5. Sanctions and Screening (10%)
  6. Suspicious Activity Reporting (10%)
  7. Internal Controls and Compliance Monitoring (10%)
  8. Independent Audit and Assurance (5%)
  9. Training and Awareness (5%)
*/

-- Seed maturity levels
INSERT INTO maturity_levels (level, name, description, criteria) VALUES
(1, 'Initial / Ad hoc', 'No formal control exists. Processes are unpredictable, reactive, and poorly controlled. Success depends on individual effort.', 
 '{"indicators": ["No documented policies or procedures", "Ad hoc processes", "Reactive approach", "No management oversight", "No evidence of implementation"], "scoring": "Control not implemented or only informal practices exist"}'),

(2, 'Developing', 'Basic control exists but is incomplete. Processes are characterized as inconsistent and unpredictable. Limited documentation and awareness.', 
 '{"indicators": ["Basic policies documented", "Inconsistent implementation", "Limited staff awareness", "Minimal management oversight", "Incomplete evidence"], "scoring": "Control partially implemented with significant gaps"}'),

(3, 'Defined', 'Control is formally defined and implemented. Processes are documented, standardized, and understood. Staff are trained and aware of requirements.', 
 '{"indicators": ["Formal policies and procedures", "Consistent implementation", "Staff trained and aware", "Management oversight established", "Complete documentation"], "scoring": "Control fully implemented and documented"}'),

(4, 'Managed', 'Control is monitored, measured, and reviewed. Performance metrics exist. Management actively oversees effectiveness. Issues are identified and addressed promptly.', 
 '{"indicators": ["Regular monitoring and testing", "Performance metrics tracked", "Issues identified and escalated", "Management information reporting", "Quality assurance reviews"], "scoring": "Control implemented, monitored, and regularly reviewed"}'),

(5, 'Optimised', 'Control is continuously improved based on metrics, industry best practices, and emerging risks. Proactive risk management. Technology and automation utilized where appropriate.', 
 '{"indicators": ["Continuous improvement program", "Benchmarking against best practices", "Proactive risk identification", "Advanced analytics and automation", "Regular independent validation"], "scoring": "Control optimised with continuous improvement"}')
ON CONFLICT (level) DO NOTHING;

-- Seed AML domains
INSERT INTO aml_domains (code, name, description, weight, sort_order) VALUES
('GOV', 'Governance and Oversight', 'Board and senior management oversight of AML/CFT program, including MLRO appointment, governance structure, and accountability frameworks', 0.15, 1),
('ERA', 'Enterprise ML/TF Risk Assessment', 'Institutional-wide money laundering and terrorist financing risk assessment covering customers, products, services, delivery channels, and geographic risk', 0.15, 2),
('CDD', 'Customer Due Diligence and KYC', 'Customer identification, verification, beneficial ownership, risk classification, and enhanced due diligence procedures', 0.15, 3),
('TM', 'Transaction Monitoring', 'Systems and procedures for monitoring customer transactions, identifying unusual activity, scenario design, and alert investigation', 0.15, 4),
('SAN', 'Sanctions and Screening', 'Screening procedures for sanctions lists, PEPs, adverse media, and watchlists at onboarding and on an ongoing basis', 0.10, 5),
('SAR', 'Suspicious Activity Reporting', 'Internal escalation procedures, STR/SAR filing, record keeping, and reporting to Financial Intelligence Unit', 0.10, 6),
('ICC', 'Internal Controls and Compliance Monitoring', 'Compliance monitoring program, control testing, key risk indicators, and management information reporting', 0.10, 7),
('AUD', 'Independent Audit and Assurance', 'Internal audit, external review, independent testing, and remediation tracking', 0.05, 8),
('TRN', 'Training and Awareness', 'AML/CFT training program, attendance tracking, effectiveness testing, and awareness campaigns', 0.05, 9)
ON CONFLICT (code) DO NOTHING;

-- Get domain IDs for control insertion
DO $$
DECLARE
  gov_id uuid;
  era_id uuid;
  cdd_id uuid;
  tm_id uuid;
  san_id uuid;
  sar_id uuid;
  icc_id uuid;
  aud_id uuid;
  trn_id uuid;
BEGIN
  -- Get domain IDs
  SELECT id INTO gov_id FROM aml_domains WHERE code = 'GOV';
  SELECT id INTO era_id FROM aml_domains WHERE code = 'ERA';
  SELECT id INTO cdd_id FROM aml_domains WHERE code = 'CDD';
  SELECT id INTO tm_id FROM aml_domains WHERE code = 'TM';
  SELECT id INTO san_id FROM aml_domains WHERE code = 'SAN';
  SELECT id INTO sar_id FROM aml_domains WHERE code = 'SAR';
  SELECT id INTO icc_id FROM aml_domains WHERE code = 'ICC';
  SELECT id INTO aud_id FROM aml_domains WHERE code = 'AUD';
  SELECT id INTO trn_id FROM aml_domains WHERE code = 'TRN';

  -- Insert controls for GOVERNANCE AND OVERSIGHT domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (gov_id, 'GOV-001', 'Board Oversight of AML/CFT', 'Board of Directors provides active oversight of AML/CFT program, reviews risk assessments, and receives regular management information', 'FATF R.1, AML Act S.10', 'detective', 'manual', '["Board minutes discussing AML risk", "Board AML committee charter", "Management information reports to Board"]', 'quarterly', true, 1, 1),
  (gov_id, 'GOV-002', 'Approved AML/CFT Policy', 'Comprehensive AML/CFT policy approved by Board and reviewed annually', 'FATF R.1, BoT AML Regulations', 'preventive', 'manual', '["Board-approved AML policy", "Policy review records", "Version control log"]', 'annual', true, 1, 2),
  (gov_id, 'GOV-003', 'MLRO Appointment and Independence', 'Money Laundering Reporting Officer appointed at management level with adequate authority, resources, and independence', 'FATF R.18, AML Act S.12', 'preventive', 'manual', '["MLRO appointment letter", "Job description", "Reporting structure/org chart", "Independence assessment"]', 'annual', true, 1, 3),
  (gov_id, 'GOV-004', 'AML Governance Structure', 'Clear AML governance structure with defined roles, responsibilities, and escalation procedures', 'FATF R.1', 'preventive', 'manual', '["Organizational chart", "RACI matrix", "Committee charters", "Escalation procedures"]', 'annual', true, 1, 4),
  (gov_id, 'GOV-005', 'Adequate Resources', 'Sufficient budget, staff, and technology resources allocated to AML/CFT compliance function', 'FATF R.1', 'preventive', 'manual', '["AML budget allocation", "Staffing plan", "Technology inventory", "Resource adequacy assessment"]', 'annual', true, 2, 5);

  -- Insert controls for ENTERPRISE RISK ASSESSMENT domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (era_id, 'ERA-001', 'Enterprise ML/TF Risk Assessment', 'Comprehensive institution-wide money laundering and terrorist financing risk assessment', 'FATF R.1, BoT Risk-Based Supervision', 'detective', 'manual', '["ML/TF risk assessment report", "Risk methodology document", "Risk scoring framework"]', 'annual', true, 1, 1),
  (era_id, 'ERA-002', 'Customer Risk Assessment', 'Assessment of ML/TF risk across customer segments including retail, corporate, PEPs, and high-risk categories', 'FATF R.1, R.10', 'detective', 'manual', '["Customer risk matrix", "Risk segmentation analysis", "Customer risk profiles"]', 'annual', true, 1, 2),
  (era_id, 'ERA-003', 'Product and Service Risk Assessment', 'Assessment of ML/TF risk for all products and services offered', 'FATF R.1', 'detective', 'manual', '["Product risk assessment", "Service risk ratings", "New product approval records"]', 'annual', true, 1, 3),
  (era_id, 'ERA-004', 'Geographic Risk Assessment', 'Assessment of ML/TF risk based on customer location, transaction destinations, and high-risk jurisdictions', 'FATF R.1', 'detective', 'manual', '["Geographic risk matrix", "High-risk country list", "Cross-border transaction analysis"]', 'quarterly', true, 2, 4),
  (era_id, 'ERA-005', 'Delivery Channel Risk Assessment', 'Assessment of ML/TF risk across delivery channels including branches, mobile banking, internet banking, and agents', 'FATF R.1', 'detective', 'manual', '["Channel risk assessment", "Digital banking risk analysis", "Agent network risk review"]', 'annual', true, 2, 5),
  (era_id, 'ERA-006', 'Risk Assessment Review and Update', 'Periodic review and update of risk assessments when material changes occur or at least annually', 'FATF R.1', 'detective', 'manual', '["Risk assessment update log", "Material change trigger documentation", "Annual review sign-off"]', 'annual', true, 1, 6);

  -- Insert controls for CUSTOMER DUE DILIGENCE domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (cdd_id, 'CDD-001', 'Customer Identification Program', 'Formal CIP to identify and verify identity of all customers using reliable, independent documents or information', 'FATF R.10, AML Act S.14', 'preventive', 'semi-automated', '["CIP policy and procedures", "Identification document requirements list", "Verification process flowchart"]', 'annual', true, 1, 1),
  (cdd_id, 'CDD-002', 'Beneficial Ownership Identification', 'Procedures to identify and verify beneficial owners of legal entities and arrangements', 'FATF R.10, R.24, R.25', 'preventive', 'manual', '["Beneficial ownership policy", "BO threshold (25%)", "BO identification forms", "Verification records"]', 'annual', true, 1, 2),
  (cdd_id, 'CDD-003', 'Customer Risk Classification', 'Risk-based customer classification system to assign risk ratings and determine appropriate due diligence level', 'FATF R.1, R.10', 'preventive', 'semi-automated', '["Risk classification methodology", "Risk rating system documentation", "Customer risk profiles"]', 'annual', true, 1, 3),
  (cdd_id, 'CDD-004', 'Purpose and Nature of Business Relationship', 'Procedures to understand and document the purpose and intended nature of the business relationship', 'FATF R.10', 'preventive', 'manual', '["Account opening questionnaire", "Business relationship documentation", "Source of funds/wealth declarations"]', 'annual', true, 1, 4),
  (cdd_id, 'CDD-005', 'Enhanced Due Diligence', 'Enhanced CDD procedures for high-risk customers including PEPs, high-risk countries, and complex ownership structures', 'FATF R.12, R.13', 'preventive', 'manual', '["EDD policy and triggers", "PEP procedures", "Enhanced verification requirements", "Senior management approval records"]', 'quarterly', true, 1, 5),
  (cdd_id, 'CDD-006', 'Simplified Due Diligence', 'Risk-based simplified CDD for proven low-risk customers where permitted by regulation', 'FATF R.1, R.10', 'preventive', 'manual', '["SDD policy", "Low-risk criteria", "Regulatory approval/guidance", "SDD customer list"]', 'annual', false, 2, 6),
  (cdd_id, 'CDD-007', 'Ongoing Due Diligence', 'Periodic review and update of customer information based on risk rating', 'FATF R.10', 'detective', 'semi-automated', '["Ongoing DD policy", "Review frequency by risk tier", "Customer update records", "Refresh schedule and logs"]', 'continuous', true, 1, 7),
  (cdd_id, 'CDD-008', 'Politically Exposed Persons (PEP) Procedures', 'Procedures to identify, classify, and apply enhanced measures to PEPs (domestic and foreign)', 'FATF R.12, R.13', 'preventive', 'semi-automated', '["PEP identification policy", "PEP screening tools", "Senior management approval", "Source of wealth verification"]', 'continuous', true, 1, 8);

  -- Insert controls for TRANSACTION MONITORING domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (tm_id, 'TM-001', 'Transaction Monitoring Framework', 'Comprehensive framework for monitoring customer transactions to detect unusual or suspicious activity', 'FATF R.10, R.20', 'detective', 'fully-automated', '["Transaction monitoring policy", "System configuration documentation", "Monitoring coverage assessment"]', 'continuous', true, 1, 1),
  (tm_id, 'TM-002', 'Transaction Monitoring Scenarios', 'Risk-based scenarios designed to detect typologies relevant to the institution (structuring, rapid movement of funds, etc.)', 'FATF R.1, R.20', 'detective', 'fully-automated', '["Scenario library", "Typology mapping", "Threshold documentation", "Scenario design rationale"]', 'quarterly', true, 2, 2),
  (tm_id, 'TM-003', 'Alert Review and Investigation', 'Documented procedures for timely review, investigation, and disposition of transaction monitoring alerts', 'FATF R.20', 'detective', 'semi-automated', '["Alert investigation procedures", "Case management workflow", "Investigation templates", "Disposition records"]', 'monthly', true, 1, 3),
  (tm_id, 'TM-004', 'Threshold and Parameter Tuning', 'Regular review and tuning of monitoring thresholds and parameters to optimize detection and reduce false positives', 'FATF R.1', 'detective', 'semi-automated', '["Tuning methodology", "Threshold review records", "False positive analysis", "Effectiveness metrics"]', 'quarterly', true, 2, 4),
  (tm_id, 'TM-005', 'Model Validation and Testing', 'Independent validation and testing of transaction monitoring models and scenarios', 'FATF R.1', 'detective', 'manual', '["Model validation reports", "Independent testing results", "Validation methodology", "Issue remediation tracking"]', 'annual', true, 3, 5),
  (tm_id, 'TM-006', 'Backlog Management', 'Monitoring and management of alert investigation backlog to ensure timely review', 'FATF R.20', 'detective', 'semi-automated', '["Backlog reports", "Aging analysis", "Escalation procedures", "Resource allocation plans"]', 'monthly', true, 2, 6);

  -- Insert controls for SANCTIONS AND SCREENING domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (san_id, 'SAN-001', 'Sanctions Screening Program', 'Comprehensive program to screen customers and transactions against sanctions lists', 'FATF R.6, UN Security Council Resolutions', 'preventive', 'fully-automated', '["Sanctions policy", "Screening procedures", "System configuration", "List sources inventory"]', 'continuous', true, 1, 1),
  (san_id, 'SAN-002', 'Sanctions List Management', 'Procedures to ensure screening lists are current, comprehensive, and updated promptly', 'FATF R.6', 'preventive', 'fully-automated', '["List of screening sources", "Update frequency schedule", "Update verification logs", "Vendor SLAs"]', 'continuous', true, 1, 2),
  (san_id, 'SAN-003', 'Screening at Onboarding', 'Screening of all new customers against sanctions, PEP, and adverse media lists before establishing relationship', 'FATF R.6, R.12', 'preventive', 'fully-automated', '["Onboarding screening workflow", "Pre-clearance procedures", "Screening results documentation"]', 'continuous', true, 1, 3),
  (san_id, 'SAN-004', 'Ongoing Screening', 'Regular screening of existing customers against updated sanctions and watchlists', 'FATF R.6', 'preventive', 'fully-automated', '["Ongoing screening frequency", "Batch screening schedules", "Match resolution procedures"]', 'continuous', true, 1, 4),
  (san_id, 'SAN-005', 'Payment Screening', 'Real-time screening of payment messages against sanctions lists', 'FATF R.6, R.16', 'preventive', 'fully-automated', '["Payment screening configuration", "SWIFT message screening", "Interdiction procedures"]', 'continuous', true, 2, 5),
  (san_id, 'SAN-006', 'Hit Investigation and Escalation', 'Documented procedures for investigating screening hits, determining true matches, and escalating confirmed matches', 'FATF R.6', 'detective', 'semi-automated', '["Hit investigation procedures", "False positive analysis", "True match escalation workflow", "Senior management notification"]', 'continuous', true, 1, 6),
  (san_id, 'SAN-007', 'Asset Freezing and Reporting', 'Procedures to freeze assets and report confirmed sanctions matches to authorities without delay', 'FATF R.6, R.7', 'corrective', 'manual', '["Asset freeze procedures", "Regulatory reporting templates", "Communication protocols", "Freeze order records"]', 'continuous', true, 1, 7);

  -- Insert controls for SUSPICIOUS ACTIVITY REPORTING domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (sar_id, 'SAR-001', 'Internal Suspicious Activity Escalation', 'Clear procedures for staff to escalate suspicious activity to MLRO/compliance', 'FATF R.20, AML Act S.15', 'detective', 'semi-automated', '["Internal escalation procedures", "Suspicious activity referral form", "Escalation log"]', 'continuous', true, 1, 1),
  (sar_id, 'SAR-002', 'STR/SAR Review and Filing', 'Documented process for MLRO to review suspicious activity and determine whether to file STR/SAR', 'FATF R.20, AML Act S.15', 'detective', 'manual', '["STR review procedures", "Filing criteria and thresholds", "Review documentation", "Decision rationale records"]', 'continuous', true, 1, 2),
  (sar_id, 'SAR-003', 'Timely STR/SAR Filing', 'STRs/SARs filed with Financial Intelligence Unit within regulatory timeframes', 'FATF R.20, AML Act S.15', 'corrective', 'semi-automated', '["FIU filing procedures", "Regulatory deadline tracking", "Filing confirmation receipts", "Timeliness metrics"]', 'continuous', true, 1, 3),
  (sar_id, 'SAR-004', 'STR/SAR Record Keeping', 'Comprehensive record keeping of all STRs/SARs filed including supporting documentation', 'FATF R.11, AML Act S.17', 'preventive', 'semi-automated', '["STR filing log", "Supporting documentation", "FIU correspondence", "5-year retention records"]', 'continuous', true, 1, 4),
  (sar_id, 'SAR-005', 'Tipping-Off Prevention', 'Policies and training to prevent tipping off customers that STR/SAR has been filed', 'FATF R.20, AML Act S.16', 'preventive', 'manual', '["Tipping-off policy", "Staff training materials", "Confidentiality procedures", "Access restrictions"]', 'annual', true, 1, 5),
  (sar_id, 'SAR-006', 'STR/SAR Quality Assurance', 'Quality review of STRs/SARs to ensure narrative quality, completeness, and regulatory compliance', 'FATF R.20', 'detective', 'manual', '["STR quality review checklist", "Sample review records", "Quality metrics", "Feedback to investigators"]', 'quarterly', true, 2, 6);

  -- Insert controls for INTERNAL CONTROLS domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (icc_id, 'ICC-001', 'Compliance Monitoring Program', 'Risk-based compliance monitoring and testing program covering all key AML controls', 'FATF R.1, R.18', 'detective', 'manual', '["Annual monitoring plan", "Test schedules", "Monitoring scope", "Risk-based prioritization"]', 'annual', true, 2, 1),
  (icc_id, 'ICC-002', 'Control Testing and Validation', 'Independent testing of AML controls to assess design and operating effectiveness', 'FATF R.1, R.18', 'detective', 'manual', '["Control testing procedures", "Test results and findings", "Effectiveness assessments", "Issue tracking"]', 'quarterly', true, 2, 2),
  (icc_id, 'ICC-003', 'Key Risk Indicators (KRIs)', 'Defined KRIs to monitor AML program effectiveness and emerging risk trends', 'FATF R.1', 'detective', 'semi-automated', '["KRI framework", "KRI dashboard", "Threshold alerts", "Trend analysis reports"]', 'monthly', true, 2, 3),
  (icc_id, 'ICC-004', 'Management Information (MI) Reporting', 'Regular MI reporting to senior management and Board on AML risks, issues, and metrics', 'FATF R.1, R.18', 'detective', 'manual', '["MI report templates", "Reporting schedule", "Distribution list", "Management meeting minutes"]', 'quarterly', true, 1, 4),
  (icc_id, 'ICC-005', 'Issue Remediation Tracking', 'Structured process to track and remediate identified AML deficiencies and regulatory issues', 'FATF R.1', 'corrective', 'semi-automated', '["Issue register", "Remediation plans", "Action tracking system", "Closure validation"]', 'monthly', true, 2, 5),
  (icc_id, 'ICC-006', 'Three Lines of Defense Model', 'Clear delineation of AML responsibilities across business lines (1st line), compliance (2nd line), and internal audit (3rd line)', 'FATF R.1, R.18', 'preventive', 'manual', '["3LOD framework document", "Roles and responsibilities matrix", "Accountability assignment"]', 'annual', true, 3, 6);

  -- Insert controls for INDEPENDENT AUDIT domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (aud_id, 'AUD-001', 'Internal Audit of AML Program', 'Independent internal audit review of AML program at least annually', 'FATF R.1, R.18', 'detective', 'manual', '["Internal audit reports", "Audit scope and plan", "Findings and recommendations", "Management responses"]', 'annual', true, 2, 1),
  (aud_id, 'AUD-002', 'External Independent Review', 'Periodic external independent review or audit of AML program by qualified third party', 'FATF R.1', 'detective', 'manual', '["External audit reports", "Consultant review reports", "Regulatory examination reports"]', 'annual', false, 3, 2),
  (aud_id, 'AUD-003', 'Audit Finding Remediation', 'Timely remediation of audit findings with management action plans and target dates', 'FATF R.1', 'corrective', 'manual', '["Audit issue tracker", "Management action plans", "Remediation evidence", "Follow-up audit confirmation"]', 'quarterly', true, 2, 3),
  (aud_id, 'AUD-004', 'Regulatory Examination Preparedness', 'Process to prepare for and respond to regulatory examinations and supervisory requests', 'FATF R.1, R.26-R.28', 'preventive', 'manual', '["Examination preparation checklist", "Document repository", "Response procedures", "Historical exam reports"]', 'annual', true, 2, 4);

  -- Insert controls for TRAINING domain
  INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, required_evidence, testing_frequency, is_mandatory, min_entity_tier, sort_order) VALUES
  (trn_id, 'TRN-001', 'AML Training Program', 'Comprehensive AML training program for all relevant staff covering regulatory requirements, policies, and procedures', 'FATF R.1, R.18, AML Act S.13', 'preventive', 'semi-automated', '["Training curriculum", "Course materials", "Training policy", "Role-based training matrix"]', 'annual', true, 1, 1),
  (trn_id, 'TRN-002', 'New Hire AML Training', 'Mandatory AML training for all new hires within defined timeframe (e.g., 30 days)', 'FATF R.18', 'preventive', 'semi-automated', '["New hire training records", "Completion certificates", "Timeframe compliance tracking"]', 'continuous', true, 1, 2),
  (trn_id, 'TRN-003', 'Annual Refresher Training', 'Annual AML refresher training for all staff to reinforce requirements and update on new risks/typologies', 'FATF R.18', 'preventive', 'semi-automated', '["Annual training attendance records", "Course completion tracking", "100% compliance target"]', 'annual', true, 1, 3),
  (trn_id, 'TRN-004', 'Role-Specific Training', 'Specialized training for high-risk roles (frontline, compliance, investigations, senior management)', 'FATF R.18', 'preventive', 'semi-automated', '["Role-based training modules", "Specialized curriculum", "Attendance by role", "Advanced training completion"]', 'annual', true, 2, 4),
  (trn_id, 'TRN-005', 'Training Effectiveness Testing', 'Assessments and testing to verify staff understanding and retention of AML training', 'FATF R.1', 'detective', 'semi-automated', '["Training assessments/quizzes", "Test results", "Pass rates", "Remedial training for failures"]', 'annual', true, 2, 5),
  (trn_id, 'TRN-006', 'AML Awareness Campaigns', 'Ongoing awareness initiatives (newsletters, bulletins, case studies) to reinforce AML culture', 'FATF R.1', 'preventive', 'manual', '["Awareness materials", "Distribution records", "Campaign schedule", "Engagement metrics"]', 'quarterly', false, 2, 6);

END $$;