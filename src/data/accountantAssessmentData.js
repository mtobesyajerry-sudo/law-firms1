// ACCOUNTANTS & AUDITORS INSTITUTIONAL AML/CFT RISK ASSESSMENT - TANZANIA
// Structural twin of the law-firm/insurance assessment data. Same modules, tiers, scoring engine
// and narrative/tier signatures. Sector-specific content (Module 1 inherent-risk questions,
// tiering triggers, narratives) is grounded in the FATF (2019) Risk-Based Approach for the
// Accounting Profession and the Tanzanian AML framework (AML Act Cap.423, AML Regulations 2022
// as amended 2023, Guide to DNFBPs 2023, NBAA scope).

export const accountantsFramework = {
  name: 'Accountants and Auditors',
  code: 'accountants_tanzania',
  description: 'AML/CFT/CPF Risk Assessment for Professional Accountants and Auditors in Tanzania',
  supervisor: 'National Board of Accountants and Auditors (NBAA) & Financial Intelligence Unit (FIU)',
  legislation: 'Anti-Money Laundering Act (Cap. 423), AML Regulations 2022 (as amended 2023), Guide to DNFBPs 2023 & FATF RBA for the Accounting Profession',
  tiers: {
    1: { name: 'Tier 1 - Small Firm / Sole Practitioner', description: 'Audit, bookkeeping and payroll; no company/trust formation, client-fund handling, or cross-border element' },
    2: { name: 'Tier 2 - Audit / Tax / Advisory Firm', description: 'Audit and tax advisory with some corporate services, intermediary-introduced or foreign clients' },
    3: { name: 'Tier 3 - Corporate-Services / Formation Firm', description: 'Company and trust formation and management, offshore structuring, private-wealth and multi-jurisdictional work' }
  }
};

// MODULE 1: INHERENT RISK ASSESSMENT - "What ML/TF/PF risk exists BEFORE controls?"

const module1Questions = {
  '1A': {
    title: '1A. SERVICE / ENGAGEMENT RISK',
    description: 'Inherent risk arising from the nature of accounting services and engagements provided (FATF RBA: company/trust formation and fund handling are the highest-vulnerability activities).',
    questions: [
      { code: 'A1.1', text: 'Does the firm provide company or trust formation and management services?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1, guidance: 'Formation and management of companies and trusts is identified by FATF as a particular area of vulnerability.' },
      { code: 'A1.2', text: 'Does the firm handle, administer or hold client funds or assets?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1, guidance: 'Handling client money materially increases inherent ML/TF exposure.' },
      { code: 'A1.3', text: 'Does the firm act (or arrange to act) as nominee director, shareholder, or registered office?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1, guidance: 'Nominee arrangements can obscure beneficial ownership.' },
      { code: 'A1.4', text: 'Does the firm assist clients in buying or selling business entities?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A1.5', text: 'Does the firm provide real estate transaction services on behalf of clients?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A1.6', text: 'Does the firm provide tax planning and advisory services?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A1.7', text: 'Does the firm provide insolvency or liquidation services?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A1.8', text: 'Does the firm audit or keep books for cash-intensive businesses?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A1.9', text: 'Does the firm make introductions to financial institutions on behalf of clients?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1, guidance: 'Accountants may be used as introducers/intermediaries to layer funds.' },
      { code: 'A1.10', text: 'Does the firm advise on complex or restructured corporate arrangements?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A1.11', text: 'Does the firm provide offshore or international tax structuring advice?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A1.12', text: 'Does the firm serve private-wealth clients involving offshore vehicles or family offices?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 }
    ]
  },
  '1B': {
    title: '1B. CLIENT RISK',
    description: 'Inherent risk arising from the client base, beneficial-ownership transparency, and political exposure.',
    questions: [
      { code: 'A2.1', text: 'Does the firm act for politically exposed persons (PEPs) or their close associates?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1, guidance: 'PEP clients require enhanced CDD, senior approval, and source-of-wealth/funds.' },
      { code: 'A2.2', text: 'Do engagements involve unexplained third-party funding into or out of a client entity?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.3', text: 'Does the firm act for clients in cash-intensive business sectors?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.4', text: 'Does the firm act for clients whose beneficial owner is difficult to identify?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1, guidance: 'Opaque ownership (shell/shelf/front companies, nominees) is a core red flag.' },
      { code: 'A2.5', text: 'Does the firm encounter clients requesting unusual secrecy or conducting business in unconventional circumstances?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.6', text: 'Does the firm act for clients whose profile is inconsistent with their transactions or structures?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.7', text: 'Does the firm act for clients with complex ownership or control structures?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.8', text: 'Does the firm act for non-resident or foreign individual clients?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A2.9', text: 'Does the firm take on clients introduced by intermediaries?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A2.10', text: 'Does the firm act for multinational or foreign-controlled entities?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A2.11', text: 'Does the firm act for clients connected to higher-risk jurisdictions?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A2.12', text: 'Does the firm act for clients using offshore entities or secrecy jurisdictions?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 },
      { code: 'A2.13', text: 'Does the firm serve global private-wealth clients or family offices?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 }
    ]
  },
  '1C': {
    title: '1C. GEOGRAPHIC RISK',
    description: 'Inherent risk arising from cross-border engagements, foreign clients, and exposure to higher-risk jurisdictions.',
    questions: [
      { code: 'A3.1', text: 'Does the firm act on engagements with cross-border elements?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A3.2', text: 'Does the firm rely on identity documents or verification from foreign sources?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A3.3', text: 'Does the firm handle funds or structures connected to other jurisdictions?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A3.4', text: 'Does the firm act for clients whose business operates substantially abroad?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A3.5', text: 'Does the firm have exposure to offshore financial centres?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A3.6', text: 'Does the firm work with foreign intermediaries or agents?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A3.7', text: 'Does the firm act on multi-jurisdictional structures or transactions?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 }
    ]
  },
  '1D': {
    title: '1D. DELIVERY CHANNEL & TRANSACTION RISK',
    description: 'Inherent risk arising from how the firm is engaged, transaction value/velocity, cash, and intermediaries.',
    questions: [
      { code: 'A4.1', text: 'Does the firm receive or handle cash payments from clients?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.2', text: 'Does the firm onboard clients on a non-face-to-face basis?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.3', text: 'Does the firm rely on intermediaries or introducers for client onboarding?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.4', text: 'Do engagements involve large or unusual value relative to the client profile?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.5', text: 'Does the firm process or route client funds through its own accounts?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.6', text: 'Does the firm encounter requests for rapid or unusually urgent completion?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A4.7', text: 'Does the firm handle transactions involving unidentified third parties?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 2, weight: 1 },
      { code: 'A4.8', text: 'Does the firm act through complex payment chains or multiple intermediaries?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 }
    ]
  },
  '1E': {
    title: '1E. ACCOUNTING-SPECIFIC VULNERABILITY',
    description: 'Vulnerabilities specific to the accounting profession (FATF RBA: nominee arrangements, formation with no rationale, incomplete records, lending legitimacy).',
    questions: [
      { code: 'A5.1', text: 'Does the firm form companies/trusts where the beneficial owner differs from the instructing party without clear rationale?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A5.2', text: 'Does the firm encounter clients maintaining incomplete or inconsistent accounting records?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A5.3', text: 'Does the firm act where nominee, bearer-share, or undisclosed-control arrangements are present?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 1, weight: 1 },
      { code: 'A5.4', text: 'Could the firm\'s services lend a sense of legitimacy to opaque or complex structures?', type: 'risk', options: ['Yes', 'Partially', 'No'], minTier: 3, weight: 1 }
    ]
  }
};

// MODULE 2: COMPLIANCE RISK (TECHNICAL COMPLIANCE) - "Do legally required AML/CFT controls EXIST?"

const module2Questions = {
  'B1': {
    title: '2A. GOVERNANCE',
    description: 'Existence of AML/CFT governance arrangements required by the AML Act and Regulations 2022 (as amended).',
    questions: [
      { code: 'B1.1', text: 'Is an AML/CFT compliance officer appointed at management level?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Appointment Letter / Job Description', acceptableEvidence: 'Official appointment letter appointing the AML/CFT compliance officer at management level', importanceNote: 'Compliance officer at management level is mandatory - reg 9(n)(i) (Nov 2023)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B1.2', text: 'Are AML/CFT roles and responsibilities documented across the firm?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'AML Roles & Responsibilities Document', acceptableEvidence: 'Documented allocation of AML/CFT responsibilities', importanceNote: 'Clear accountability is a baseline governance requirement', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B1.3', text: 'Have the partners or senior management approved the AML/CFT policy?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Approved AML/CFT Policy', acceptableEvidence: 'Partner/management-approved AML/CFT policy with approval date', importanceNote: 'Senior-management ownership of the programme is required', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B1.4', text: 'Is there an employee screening procedure applied on hiring?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Employee Screening Procedure', acceptableEvidence: 'Documented pre-recruitment screening procedure', importanceNote: 'Employee screening on hiring is required - reg 9(n)(ii) (Nov 2023)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B1.5', text: 'Is there an ongoing AML/CFT training programme for partners and staff?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Training Plan / Records', acceptableEvidence: 'Training plan and attendance/completion records', importanceNote: 'Ongoing training is required - reg 9(n)(iii) (Nov 2023)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B1.6', text: 'Is there an independent audit function that tests the AML/CFT system?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: true, attachmentLabel: 'Independent Audit Report / Terms of Reference', acceptableEvidence: 'Independent internal or external audit report covering AML/CFT', importanceNote: 'Independent audit function is required - reg 9(n)(iv) (Nov 2023)', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } }
    ]
  },
  'B2': {
    title: '2B. BUSINESS-WIDE RISK ASSESSMENT',
    description: 'Existence of a documented institutional ML/TF/PF risk assessment - Act s.15; Regs 2022 reg 3 (as amended).',
    questions: [
      { code: 'B2.1', text: 'Has the firm conducted a documented institutional ML/TF/PF risk assessment?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Institutional Risk Assessment Report', acceptableEvidence: 'Documented institutional risk assessment in the FIU report format', importanceNote: 'Institutional RA is mandatory - reg 3', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B2.2', text: 'Does the risk assessment cover client, service, geographic and channel risk?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'The RA must address all four FIU risk categories', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B2.3', text: 'Is the risk assessment kept up to date (reviewed at least every three years and on major changes)?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Minimum update cadence is every three years - reg 3(2) (Nov 2023); update on new services/clients', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B2.4', text: 'Do the assessed risks demonstrably inform the controls applied?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: false, importanceNote: 'Risk-based approach requires controls proportionate to assessed risk', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } }
    ]
  },
  'B3': {
    title: '2C. CUSTOMER DUE DILIGENCE',
    description: 'Existence of CDD/EDD controls - Act s.15A; Regs 2022 reg 8/8A/8B (as amended 2023), including beneficial-ownership and nominee measures.',
    questions: [
      { code: 'B3.1', text: 'Are documented CDD procedures in place to identify and verify the client?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'CDD Procedure', acceptableEvidence: 'Documented CDD procedure covering identification and verification', importanceNote: 'CDD is mandatory - Act s.15A; reg 8', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.2', text: 'Do procedures require identification of the ultimate beneficial owner (20%+ interest)?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Ultimate beneficial ownership must be identified - reg 8B', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.3', text: 'Do procedures require detection of nominee, bearer-share, or undisclosed-control arrangements?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Nominee detection is central to the accounting-profession risk (FATF RBA)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.4', text: 'Do procedures require a mandatory PEP determination for clients and beneficial owners?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Mandatory PEP determination - reg 8(4)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.5', text: 'Do procedures require source of funds AND source of wealth for higher-risk clients and PEPs?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'SoF and SoW are distinct and both required for PEPs - reg 8(m),(n); FATF RBA Box 2', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.6', text: 'Is enhanced due diligence applied to higher-risk clients with senior approval?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'EDD with senior (partner/CEO) approval for PEPs - reg 8(4)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.7', text: 'Is ongoing monitoring of the client relationship documented and applied?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: false, importanceNote: 'Ongoing monitoring is required - reg 8A', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B3.8', text: 'Where reliance is placed on intermediaries for CDD, are documented reliance controls in place?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: false, importanceNote: 'Third-party/intermediary reliance must be controlled; responsibility retained - reg 13', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } }
    ]
  },
  'B4': {
    title: '2D. SANCTIONS & TFS',
    description: 'Existence of targeted financial sanctions and screening controls - POTA Regulations and AML Regulations.',
    questions: [
      { code: 'B4.1', text: 'Are clients and beneficial owners screened against UN and national sanctions/TFS lists?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'Sanctions Screening Procedure', acceptableEvidence: 'Documented screening procedure and evidence of list coverage', importanceNote: 'Sanctions/TFS screening is mandatory', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B4.2', text: 'Are there documented asset-freezing and reporting procedures for confirmed matches?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'TFS obligations require freeze-without-delay and reporting', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B4.3', text: 'Is screening repeated on list updates and at key engagement events?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: false, importanceNote: 'Ongoing re-screening is needed to remain effective', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } }
    ]
  },
  'B5': {
    title: '2E. SUSPICIOUS TRANSACTION REPORTING',
    description: 'Existence of suspicious transaction reporting controls - Act; Regs reg 16 (as amended Nov 2023).',
    questions: [
      { code: 'B5.1', text: 'Are documented procedures in place to identify and report suspicious transactions to the FIU?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: true, attachmentLabel: 'STR Procedure', acceptableEvidence: 'Documented STR procedure with internal escalation and FIU submission steps', importanceNote: 'STR reporting is mandatory - reg 16', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B5.2', text: 'Is there an internal escalation route to the compliance officer for suspicions?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Internal escalation underpins timely reporting', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B5.3', text: 'Are tipping-off controls in place (including filing an STR rather than pursuing CDD where CDD would tip off)?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 1, weight: 1, requiresAttachment: false, importanceNote: 'Tipping-off prohibited; STR-instead-of-CDD permitted - reg 8(m) (Jan 2023)', tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' } },
      { code: 'B5.4', text: 'Are records of internal and external STRs maintained for the required retention period?', type: 'control', options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'], minTier: 2, weight: 1, requiresAttachment: false, importanceNote: 'Minimum 10-year record retention - Guide para 11.2', tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' } }
    ]
  }
};

// MODULE 3: EFFECTIVENESS RISK - "Do AML/CFT controls WORK in practice?"

const module3Questions = {
  'C1': {
    title: 'C1. RISK-BASED DECISION-MAKING',
    description: 'Whether risk assessment outputs actually drive client acceptance and engagement decisions',
    questions: [
      { code: 'C1.1', text: 'Are risk assessments used to guide acceptance of clients and engagements?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.2', text: 'Are higher-risk cases (PEPs, formations, offshore links) escalated in practice?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.3', text: 'Is the documented risk appetite applied consistently at engagement acceptance?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.4', text: 'Are declined or exited engagements recorded with reasons?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C2': {
    title: 'C2. SUSPICIOUS ACTIVITY',
    description: 'Whether suspicious activity is identified and reported in practice',
    questions: [
      { code: 'C2.1', text: 'Are accounting red flags (nominee arrangements, formation with no rationale, incomplete records) detected in practice?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.2', text: 'Have suspicious matters actually been escalated internally where warranted?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.3', text: 'Are STRs filed with the FIU where the threshold for suspicion is met?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.4', text: 'Does ongoing monitoring detect anomalies in client structures and fund flows?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C3': {
    title: 'C3. SANCTIONS EFFECTIVENESS',
    description: 'Whether sanctions/TFS screening works in practice',
    questions: [
      { code: 'C3.1', text: 'Does screening reliably catch true matches across clients and beneficial owners?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C3.2', text: 'Are confirmed matches frozen and reported without delay?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C3.3', text: 'Are list updates applied promptly and re-screening performed?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C4': {
    title: 'C4. GOVERNANCE & REMEDIATION',
    description: 'Whether oversight and continuous improvement function in practice',
    questions: [
      { code: 'C4.1', text: 'Do partners / senior management review AML/CFT effectiveness and act on findings?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C4.2', text: 'Are audit and review findings remediated within agreed timeframes?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 },
      { code: 'C4.3', text: 'Is training shown to improve detection of red flags in practice?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  }
};

// MODULE ASSEMBLY

export const accountantsModules = {
  module1: { code: 'module1', title: 'CATEGORY (A): INHERENT RISK ASSESSMENT', description: 'What ML/TF/PF risk exists BEFORE controls?', sections: module1Questions },
  module2: { code: 'module2', title: 'CATEGORY (B): COMPLIANCE RISK (TECHNICAL COMPLIANCE)', description: 'Do legally required AML/CFT controls EXIST?', sections: module2Questions },
  module3: { code: 'module3', title: 'CATEGORY (C): EFFECTIVENESS RISK', description: 'Do AML/CFT controls WORK in practice?', sections: module3Questions }
};

export const accountantsCategories = [
  { value: 'sole_practitioner', label: 'Sole Practitioner', tier: 1 },
  { value: 'small_firm', label: 'Small Accounting Firm', tier: 1 },
  { value: 'audit_firm', label: 'Audit Firm', tier: 2 },
  { value: 'tax_advisory_firm', label: 'Tax / Advisory Firm', tier: 2 },
  { value: 'corporate_services_firm', label: 'Corporate Services / Formation Firm', tier: 3 },
  { value: 'multi_service_firm', label: 'Multi-Service / International Firm', tier: 3 }
];

export const accountantsTierProfiles = {
  1: {
    name: 'Tier 1 - Small Firm / Sole Practitioner',
    description: 'Audit, bookkeeping and payroll; no company/trust formation, client-fund handling, or cross-border element',
    questionCount: 35,
    autoEscalationTriggers: ['Company/trust formation', 'Client-fund handling', 'PEP clients', 'Nominee arrangements', 'Cash payments']
  },
  2: {
    name: 'Tier 2 - Audit / Tax / Advisory Firm',
    description: 'Audit and tax advisory with some corporate services, intermediary-introduced or foreign clients',
    questionCount: 50,
    autoEscalationTriggers: ['Offshore exposure', 'Multi-jurisdictional structures', 'Global private wealth', 'Complex payment chains']
  },
  3: {
    name: 'Tier 3 - Corporate-Services / Formation Firm',
    description: 'Company and trust formation and management, offshore structuring, private-wealth and multi-jurisdictional work',
    questionCount: 62,
    autoEscalationTriggers: []
  }
};

export function getAccountantsQuestionsForTier(tier) {
  const questions = [];
  Object.values(accountantsModules).forEach(module => {
    Object.values(module.sections).forEach(section => {
      section.questions.forEach(question => {
        if (question.minTier <= tier) {
          questions.push({ ...question, section: section.title, module: module.title });
        }
      });
    });
  });
  return questions;
}

// AUTOMATED TIER DETERMINATION (accountant triggers)

export function determineAutomaticTier(responses) {
  const tier3Triggers = [
    responses['A1.12'] === 'Yes', // Private-wealth offshore vehicles
    responses['A2.12'] === 'Yes', // Offshore entities / secrecy jurisdictions
    responses['A2.13'] === 'Yes', // Global private-wealth clients
    responses['A3.7'] === 'Yes',  // Multi-jurisdictional structures
    responses['A4.8'] === 'Yes'   // Complex payment chains
  ];
  if (tier3Triggers.some(t => t)) {
    return { tier: 3, reason: 'Offshore structuring, private-wealth, or multi-jurisdictional exposure detected', automatic: true };
  }

  const tier2Triggers = [
    responses['A1.1'] === 'Yes',  // Company/trust formation
    responses['A1.11'] === 'Yes', // Offshore/international structuring
    responses['A2.9'] === 'Yes',  // Intermediary-introduced business
    responses['A2.10'] === 'Yes', // Multinational/foreign-controlled clients
    responses['A2.11'] === 'Yes', // High-risk jurisdiction clients
    responses['A3.5'] === 'Yes',  // Offshore exposure
    responses['A3.6'] === 'Yes'   // Foreign intermediaries
  ];
  if (tier2Triggers.some(t => t)) {
    return { tier: 2, reason: 'Company/trust formation, corporate structuring, or foreign exposure detected', automatic: true };
  }

  const tier1HighRiskFactors = [
    responses['A1.2'] === 'Yes',  // Client-fund handling
    responses['A1.3'] === 'Yes',  // Nominee arrangements
    responses['A2.1'] === 'Yes',  // PEPs
    responses['A2.2'] === 'Yes',  // Unexplained third-party funding
    responses['A4.1'] === 'Yes',  // Cash payments
    responses['A5.3'] === 'Yes'   // Nominee/bearer/undisclosed control
  ];
  const highRiskCount = tier1HighRiskFactors.filter(t => t).length;
  if (highRiskCount >= 3) {
    return { tier: 2, reason: 'Multiple high-risk accounting exposure factors detected', automatic: true };
  }

  return { tier: 1, reason: 'Domestic firm with limited formation, fund-handling, or cross-border exposure', automatic: false };
}

// AUTOMATED NARRATIVE GENERATION (accountant-flavoured; mirrors the law-firm signatures)

export function generateInherentRiskNarrative(inherentResult, responses, tier) {
  const level = inherentResult?.level || inherentResult?.rating || 'Medium';
  return `Based on the institutional risk assessment, the firm's inherent ML/TF/PF exposure before controls is assessed as ${level}. This reflects the services provided (company and trust formation, client-fund handling and nominee arrangements carry higher inherent risk than audit, bookkeeping and payroll), the client base and beneficial-ownership transparency, the geographic footprint of engagements, and the channels through which the firm is engaged. The assessment was conducted at Tier ${tier} scope.`;
}

export function generateComplianceNarrative(complianceResult, tier) {
  const level = complianceResult?.level || complianceResult?.rating || 'Medium';
  return `Technical compliance (whether legally required AML/CFT controls exist) is assessed as ${level}. This covers governance and the management-level compliance officer, the business-wide risk assessment, customer due diligence including beneficial-ownership and nominee detection, sanctions/TFS screening, and suspicious transaction reporting, evaluated against the AML Act and Regulations 2022 as amended in 2023, at Tier ${tier} requirements.`;
}

export function generateEffectivenessNarrative(effectivenessResult) {
  const level = effectivenessResult?.level || effectivenessResult?.rating || 'Medium';
  return `Effectiveness (whether the controls work in practice) is assessed as ${level}. This considers whether risk-based decisions, detection of accounting red flags such as nominee arrangements and formations without rationale, suspicious-matter reporting, sanctions screening, and governance and remediation operate effectively in day-to-day practice rather than existing only on paper.`;
}

export function generateMaturityNarrative(maturityResult, tier) {
  const level = maturityResult?.level || maturityResult?.rating || 'Developing';
  return `The institutional AML/CFT maturity of the firm is assessed as ${level}. Maturity reflects the embedding, consistency and continuous improvement of the compliance programme over time, assessed at Tier ${tier} expectations.`;
}

export function generateResidualRiskNarrative(residualResult) {
  const level = residualResult?.level || residualResult?.rating || 'Medium';
  return `After applying the existing controls and accounting for their effectiveness, the firm's residual ML/TF/PF risk is assessed as ${level}. Residual risk represents the exposure that remains once inherent risk is mitigated by the compliance programme, and should drive the prioritised action plan.`;
}

export function generateExecutiveSummary(inherentResult, complianceResult, effectivenessResult, maturityResult, residualResult, tier, organizationName) {
  const name = organizationName || 'The firm';
  const inh = inherentResult?.level || inherentResult?.rating || 'Medium';
  const res = residualResult?.level || residualResult?.rating || 'Medium';
  return `${name} was assessed under the Tanzania AML/CFT institutional risk assessment framework for accountants and auditors (Tier ${tier}). Inherent ML/TF/PF risk is ${inh}; after controls and effectiveness, residual risk is ${res}. The assessment addresses the four FIU risk categories (client, service, geographic, transaction & delivery channel) plus accounting-specific vulnerabilities, and is aligned with the Guide to DNFBPs 2023, the FATF Risk-Based Approach for the Accounting Profession, and the AML Act and Regulations 2022 (as amended 2023). Prioritised remediation should focus on the areas rated weakest in the compliance and effectiveness modules.`;
}

// PRIMARY EXPORT (mirrors lawFirmsAssessmentData shape)
export const accountantsAssessmentData = {
  framework: accountantsFramework,
  modules: accountantsModules,
  categories: accountantsCategories,
  tierProfiles: accountantsTierProfiles,
  getQuestionsForTier: getAccountantsQuestionsForTier,
  generateInherentRiskNarrative,
  generateComplianceNarrative,
  generateEffectivenessNarrative,
  generateMaturityNarrative,
  generateResidualRiskNarrative,
  generateExecutiveSummary,
  determineAutomaticTier
};
