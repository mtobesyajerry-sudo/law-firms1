/*
  # Seed Maturity Reference Data

  1. Maturity Levels (1-5 scale)
    - Initial, Developing, Defined, Managed, Optimised

  2. AML Domains (9 domains)
    - Governance, Risk Assessment, CDD, Transaction Monitoring, etc.

  3. Sample Controls
    - Key controls for each domain
*/

-- Insert maturity levels (5-level scale)
INSERT INTO maturity_levels (level, name, description, criteria) VALUES
(1, 'Initial', 'Ad-hoc processes, no formal structure', '{"characteristics": ["Reactive approach", "No documented procedures", "Minimal compliance awareness"], "typical_gaps": ["Missing policies", "No ownership", "Inconsistent execution"]}'),
(2, 'Developing', 'Basic processes exist but not fully documented', '{"characteristics": ["Some documented procedures", "Informal accountability", "Basic compliance awareness"], "typical_gaps": ["Incomplete documentation", "Limited training", "Reactive monitoring"]}'),
(3, 'Defined', 'Documented and consistently followed processes', '{"characteristics": ["Comprehensive policies and procedures", "Clear roles and responsibilities", "Regular training"], "typical_gaps": ["Limited automation", "Inconsistent quality", "Manual processes"]}'),
(4, 'Managed', 'Monitored, measured, and continuously improved', '{"characteristics": ["Performance metrics in place", "Regular audits and reviews", "Risk-based approach"], "typical_gaps": ["Limited predictive capabilities", "Some manual intervention needed"]}'),
(5, 'Optimised', 'Fully integrated, automated, and innovative', '{"characteristics": ["Continuous improvement culture", "Predictive analytics", "Full automation where appropriate", "Industry leading"], "typical_gaps": []}')
ON CONFLICT (level) DO NOTHING;

-- Insert AML domains with weights (9 domains)
INSERT INTO aml_domains (code, name, description, weight, sort_order) VALUES
('GOV', 'Governance & Oversight', 'Board oversight, management accountability, three lines of defense', 0.15, 1),
('ERA', 'Enterprise Risk Assessment', 'Institution-wide ML/TF risk assessment and risk appetite', 0.12, 2),
('CDD', 'Customer Due Diligence', 'Customer identification, verification, and ongoing monitoring', 0.18, 3),
('TM', 'Transaction Monitoring', 'Automated monitoring systems and alert management', 0.15, 4),
('STR', 'Suspicious Activity Reporting', 'SAR/STR filing, investigation quality, and FIU coordination', 0.10, 5),
('SANC', 'Sanctions & PEP Screening', 'Screening systems, list management, and ongoing monitoring', 0.10, 6),
('REC', 'Record Keeping', 'Document retention, data quality, and audit trail', 0.08, 7),
('TRN', 'Training & Awareness', 'Staff training programs and compliance culture', 0.07, 8),
('AUD', 'Independent Testing', 'Internal audit and independent reviews', 0.05, 9)
ON CONFLICT (code) DO NOTHING;

-- Insert sample controls for each domain (key controls only)
INSERT INTO aml_controls (domain_id, control_code, control_name, control_description, regulatory_reference, control_type, automation_level, testing_frequency, is_mandatory, min_entity_tier, sort_order)
SELECT 
  d.id,
  c.control_code,
  c.control_name,
  c.control_description,
  c.regulatory_reference,
  c.control_type,
  c.automation_level,
  c.testing_frequency,
  c.is_mandatory,
  c.min_entity_tier,
  c.sort_order
FROM aml_domains d
CROSS JOIN LATERAL (
  VALUES
    -- Governance Controls
    ('GOV-001', 'Board AML Oversight', 'Board receives regular AML/CFT reports and provides oversight', 'AML Regulations Section 5', 'preventive', 'manual', 'quarterly', true, 1, 1),
    ('GOV-002', 'MLRO Appointment', 'Qualified MLRO appointed with appropriate authority and resources', 'AML Regulations Section 6', 'preventive', 'manual', 'annual', true, 1, 2),
    ('GOV-003', 'AML Policies', 'Comprehensive AML/CFT policies approved by Board', 'AML Regulations Section 7', 'preventive', 'manual', 'annual', true, 1, 3),
    
    -- Risk Assessment Controls
    ('ERA-001', 'Enterprise Risk Assessment', 'Annual institution-wide ML/TF risk assessment', 'Risk-Based Approach Guidelines', 'detective', 'semi-automated', 'annual', true, 1, 1),
    ('ERA-002', 'Risk Appetite Statement', 'Documented risk appetite and tolerance levels', 'Risk-Based Approach Guidelines', 'preventive', 'manual', 'annual', true, 2, 2),
    
    -- CDD Controls
    ('CDD-001', 'Customer Identification', 'Robust customer identification and verification process', 'CDD Regulations Section 10', 'preventive', 'semi-automated', 'continuous', true, 1, 1),
    ('CDD-002', 'Beneficial Ownership', 'Verification of beneficial owners for legal entities', 'CDD Regulations Section 11', 'preventive', 'semi-automated', 'continuous', true, 1, 2),
    ('CDD-003', 'Enhanced Due Diligence', 'EDD for high-risk customers', 'CDD Regulations Section 12', 'preventive', 'manual', 'continuous', true, 1, 3),
    ('CDD-004', 'Ongoing Monitoring', 'Periodic review of customer information and activity', 'CDD Regulations Section 13', 'detective', 'semi-automated', 'continuous', true, 1, 4),
    
    -- Transaction Monitoring Controls
    ('TM-001', 'Automated TM System', 'Automated transaction monitoring system in place', 'Transaction Monitoring Guidelines', 'detective', 'fully-automated', 'continuous', true, 2, 1),
    ('TM-002', 'Scenario Calibration', 'Regular review and tuning of monitoring scenarios', 'Transaction Monitoring Guidelines', 'detective', 'semi-automated', 'quarterly', true, 2, 2),
    ('TM-003', 'Alert Investigation', 'Documented alert investigation procedures', 'Transaction Monitoring Guidelines', 'detective', 'manual', 'continuous', true, 1, 3),
    
    -- STR Controls
    ('STR-001', 'STR Filing Process', 'Formal process for STR decision-making and filing', 'STR Regulations Section 15', 'detective', 'manual', 'continuous', true, 1, 1),
    ('STR-002', 'Quality Assurance', 'STR quality review before submission', 'STR Regulations Section 16', 'detective', 'manual', 'monthly', true, 1, 2),
    
    -- Sanctions Controls
    ('SANC-001', 'Screening System', 'Automated sanctions and PEP screening', 'Sanctions Guidelines', 'preventive', 'fully-automated', 'continuous', true, 1, 1),
    ('SANC-002', 'List Management', 'Regular updates to sanctions and PEP lists', 'Sanctions Guidelines', 'preventive', 'semi-automated', 'continuous', true, 1, 2),
    ('SANC-003', 'Match Review', 'Documented process for reviewing screening alerts', 'Sanctions Guidelines', 'detective', 'manual', 'continuous', true, 1, 3),
    
    -- Record Keeping Controls
    ('REC-001', 'Document Retention', 'AML records retained for required period (5+ years)', 'Record Keeping Regulations', 'preventive', 'semi-automated', 'annual', true, 1, 1),
    ('REC-002', 'Audit Trail', 'Comprehensive audit trail for all AML activities', 'Record Keeping Regulations', 'detective', 'fully-automated', 'continuous', true, 1, 2),
    
    -- Training Controls
    ('TRN-001', 'Initial Training', 'AML training for all new employees', 'Training Requirements', 'preventive', 'manual', 'continuous', true, 1, 1),
    ('TRN-002', 'Annual Refresher', 'Annual AML refresher training', 'Training Requirements', 'preventive', 'manual', 'annual', true, 1, 2),
    
    -- Audit Controls
    ('AUD-001', 'Independent Testing', 'Annual independent AML audit', 'Audit Requirements', 'detective', 'manual', 'annual', true, 1, 1),
    ('AUD-002', 'Gap Remediation', 'Tracking and remediation of audit findings', 'Audit Requirements', 'corrective', 'manual', 'quarterly', true, 1, 2)
) AS c(control_code, control_name, control_description, regulatory_reference, control_type, automation_level, testing_frequency, is_mandatory, min_entity_tier, sort_order)
WHERE d.code = SUBSTRING(c.control_code FROM 1 FOR POSITION('-' IN c.control_code) - 1)
ON CONFLICT (control_code) DO NOTHING;
