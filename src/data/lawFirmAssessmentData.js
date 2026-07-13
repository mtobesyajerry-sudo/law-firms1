// INSTITUTIONAL AML/CFT RISK ASSESSMENT FOR LAW FIRMS IN TANZANIA
// Tiered Questionnaire Framework (2026)
// Regulator-Ready | Risk-Based | TLS-Aligned

import { fmtDate } from '../utils/dateFormat';

export const lawFirmsFramework = {
  name: 'Law Firms and Legal Professionals',
  code: 'law_firms_tanzania',
  description: 'AML/CFT/CPF Risk Assessment for Law Firms and Legal Professionals in Tanzania',
  supervisor: 'Tanzania Law Society (TLS) & Financial Intelligence Unit (FIU)',
  legislation: 'Anti-Money Laundering Act, Written Laws (Misc. Amendments) Act & TLS Regulations',
  tiers: {
    1: {
      name: 'Tier 1 – Small / Sole Practitioner Firms',
      description: 'Domestic focus, general legal practice, limited corporate exposure, no cross-border structuring, no trust or nominee services',
      questionCount: 35
    },
    2: {
      name: 'Tier 2 – Medium / Corporate Firms',
      description: 'Real estate and corporate work, some foreign clients, exposure to complex ownership, moderate cross-border exposure',
      questionCount: 50
    },
    3: {
      name: 'Tier 3 – Large / International / Specialist Firms',
      description: 'Multinational clients, complex corporate structuring, cross-border transactions, private wealth, trusts, offshore exposure',
      questionCount: 62
    }
  }
};

// MODULE 1: INHERENT RISK ASSESSMENT - "What ML/TF/PF exposure exists BEFORE controls?"
// Aligned with FATF guidance on risk-based approach for legal professionals

const module1Questions = {
  'A1': {
    title: '1A. SERVICE & PRACTICE AREA RISK',
    description: 'Assessment of inherent risk from legal services provided - FATF high-risk services internationally recognized as vulnerable to ML/TF misuse',
    questions: [
      {
        code: 'A1.1',
        text: 'Does the firm provide real estate conveyancing or property transfer services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Real estate is a primary ML/TF vector - FATF Guidance para 19-21'
      },
      {
        code: 'A1.2',
        text: 'Does the firm provide company formation or restructuring services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Corporate formation can create opacity - FATF Recommendation 22'
      },
      {
        code: 'A1.3',
        text: 'Does the firm provide trust and estate planning services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Trusts can obscure beneficial ownership'
      },
      {
        code: 'A1.4',
        text: 'Does the firm provide management services for companies, trusts, or charities?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Gatekeepers can be misused to distance criminals from assets'
      },
      {
        code: 'A1.5',
        text: 'Does the firm act as nominee, trustee, or company secretary?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Nominee services create beneficial ownership opacity'
      },
      {
        code: 'A1.6',
        text: 'Does the firm handle client funds, escrow accounts, or settlement arrangements?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Client account handling is high-risk - direct exposure to suspicious funds'
      },
      {
        code: 'A1.7',
        text: 'Does the firm provide corporate advisory and structuring services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Complex structuring can facilitate layering'
      },
      {
        code: 'A1.8',
        text: 'Does the firm assist in mergers, acquisitions, or asset transfers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'M&A can be used to integrate illicit funds'
      },
      {
        code: 'A1.9',
        text: 'Does the firm provide cross-border structuring or offshore arrangement services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Cross-border services increase geographic risk exposure'
      },
      {
        code: 'A1.10',
        text: 'Does the firm provide insolvency or restructuring services?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Insolvency can be misused for asset stripping or fraudulent transfers'
      },
      {
        code: 'A1.11',
        text: 'Does the firm provide tax planning or asset protection advisory?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Tax structures can be misused for ML/TF purposes'
      },
      {
        code: 'A1.12',
        text: 'Does the firm provide international tax structuring or offshore optimization?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'International tax structuring heightens opacity and jurisdiction risk'
      }
    ]
  },
  'A2': {
    title: '1B. CLIENT RISK',
    description: 'Assessment of inherent risk arising from client types and characteristics - FATF client risk factors',
    questions: [
      {
        code: 'A2.1',
        text: 'Does the firm serve politically exposed persons (PEPs)?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'PEPs present heightened corruption and bribery risk - FATF R.12'
      },
      {
        code: 'A2.2',
        text: 'Does the firm serve cash-intensive businesses?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cash businesses facilitate placement of illicit funds'
      },
      {
        code: 'A2.3',
        text: 'Does the firm serve foreign or non-resident clients?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cross-border clients increase verification and monitoring challenges'
      },
      {
        code: 'A2.4',
        text: 'Does the firm encounter clients with complex ownership structures?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Layered structures obscure beneficial ownership'
      },
      {
        code: 'A2.5',
        text: 'Does the firm serve trusts, foundations, or layered holding companies?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Legal arrangements can create beneficial ownership opacity'
      },
      {
        code: 'A2.6',
        text: 'Does the firm serve clients in high-risk sectors (mining, gaming, real estate development)?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Extractive and gaming sectors have documented ML/TF vulnerability'
      },
      {
        code: 'A2.7',
        text: 'Does the firm serve shell companies or newly formed entities?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Shell companies lack operational substance - red flag'
      },
      {
        code: 'A2.8',
        text: 'Does the firm serve clients using intermediaries or third-party introducers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Intermediaries create distance from ultimate beneficial owner'
      },
      {
        code: 'A2.9',
        text: 'Does the firm serve clients with unexplained wealth?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Source of wealth verification is critical for high-risk clients'
      },
      {
        code: 'A2.10',
        text: 'Does the firm serve multinational corporate groups?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Multinational structures increase complexity and jurisdiction risk'
      },
      {
        code: 'A2.11',
        text: 'Does the firm serve clients linked to high-risk jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Geographic risk is a key FATF risk factor'
      },
      {
        code: 'A2.12',
        text: 'Does the firm serve offshore entities or secrecy-jurisdiction structures?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Offshore structures heighten opacity and enforcement challenges'
      },
      {
        code: 'A2.13',
        text: 'Does the firm serve global private wealth clients with multi-jurisdictional assets?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Cross-border wealth management increases ML/TF vulnerability'
      }
    ]
  },
  'A3': {
    title: '1C. GEOGRAPHIC RISK',
    description: 'Assessment of inherent risk from geographic operations and jurisdictions - FATF geographic risk factors',
    questions: [
      {
        code: 'A3.1',
        text: 'Does the firm have exposure to FATF-listed jurisdictions (grey or blacklist)?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'FATF public statements identify high-risk and monitored jurisdictions'
      },
      {
        code: 'A3.2',
        text: 'Does the firm have exposure to sanctioned countries?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'UN, EU, US sanctions create PF and enforcement risk'
      },
      {
        code: 'A3.3',
        text: 'Does the firm have exposure to countries with weak AML controls?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Weak supervisory regimes increase ML/TF risk'
      },
      {
        code: 'A3.4',
        text: 'Does the firm handle cross-border clients or transactions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cross-border activity increases verification and monitoring challenges'
      },
      {
        code: 'A3.5',
        text: 'Does the firm have exposure to offshore or secrecy jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Offshore centers can facilitate beneficial ownership opacity'
      },
      {
        code: 'A3.6',
        text: 'Does the firm have exposure to regions with high corruption or organized crime?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Geographic risk includes corruption perception and crime levels'
      },
      {
        code: 'A3.7',
        text: 'Does the firm engage in multi-jurisdictional structuring across 3+ countries?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Complex cross-border structures heighten risk and supervision challenges'
      }
    ]
  },
  'A4': {
    title: '1D. TRANSACTION & STRUCTURAL RISK',
    description: 'Assessment of inherent risk from transaction patterns and structural arrangements - FATF red flag indicators',
    questions: [
      {
        code: 'A4.1',
        text: 'Does the firm encounter unusual or complex transactions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Unusual patterns suggest potential layering or integration'
      },
      {
        code: 'A4.2',
        text: 'Does the firm encounter third-party funding or unexplained source of funds?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Third-party payments distance criminals from transactions'
      },
      {
        code: 'A4.3',
        text: 'Does the firm encounter rapid asset transfers or liquidations?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Speed can indicate attempts to avoid detection or freezing'
      },
      {
        code: 'A4.4',
        text: 'Does the firm encounter frequent beneficial ownership changes?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Rapid ownership changes can obscure control and facilitate layering'
      },
      {
        code: 'A4.5',
        text: 'Does the firm encounter litigation used to disguise payments?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Settlement agreements can legitimize illicit funds - FATF typology'
      },
      {
        code: 'A4.6',
        text: 'Does the firm encounter structured transactions or round-figure amounts?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Structuring to avoid reporting thresholds is a red flag'
      },
      {
        code: 'A4.7',
        text: 'Does the firm encounter unexplained settlement agreements or complex payment chains?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Complex settlements can facilitate integration of criminal proceeds'
      }
    ]
  },
  'A5': {
    title: '1E. PROFESSIONAL VULNERABILITY',
    description: 'Assessment of inherent risk from professional vulnerabilities and sector weaknesses - FATF sector risk factors',
    questions: [
      {
        code: 'A5.1',
        text: 'Is the firm heavily dependent on a few high-risk clients?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Client concentration increases commercial pressure to overlook red flags'
      },
      {
        code: 'A5.2',
        text: 'Does the firm operate in an environment with weak AML awareness?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Lack of sectoral awareness increases gatekeeping failures - FATF studies'
      },
      {
        code: 'A5.3',
        text: 'Are staff trained in legal sector ML/TF typologies?',
        type: 'risk',
        options: ['No', 'Partially', 'Yes'],
        minTier: 1,
        weight: 1,
        guidance: 'Inverted scoring - lack of typology training increases vulnerability'
      },
      {
        code: 'A5.4',
        text: 'Is there risk of willful blindness to suspicious activity?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Professional privilege misapplied as shield from AML obligations'
      },
      {
        code: 'A5.5',
        text: 'Has the legal sector in Tanzania experienced documented abuse cases?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Historical abuse indicates ongoing vulnerability - NRA findings'
      },
      {
        code: 'A5.6',
        text: 'Does the firm face pressure to accept clients without adequate due diligence?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Commercial pressures can override compliance - cultural risk factor'
      }
    ]
  }
};

// MODULE 2: TECHNICAL COMPLIANCE - "Do legally required AML/CFT controls EXIST?"
// Supervisors assess whether policies and procedures are documented and implemented

const module2Questions = {
  'B1': {
    title: '2A. GOVERNANCE',
    description: 'Assessment of AML/CFT governance structures - TLS supervisory requirement',
    questions: [
      {
        code: 'B1.1',
        text: 'Is an AML compliance officer appointed?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Appointment Letter / Job Description',
        acceptableEvidence: 'Official appointment letter, job description, or partner resolution appointing the AML/CFT compliance officer',
        importanceNote: 'Regulatory requirement under AMLA - proof of formal appointment is mandatory',
        tierRequirement: {
          tier1: 'mandatory',
          tier2: 'mandatory',
          tier3: 'mandatory'
        }
      },
      {
        code: 'B1.2',
        text: 'Are AML roles documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'AML/CFT Responsibility Matrix',
        acceptableEvidence: 'Documented roles and responsibilities matrix or organizational chart with AML functions',
        importanceNote: 'Clear documentation ensures accountability and effective AML/CFT implementation'
      },
      {
        code: 'B1.3',
        text: 'Are AML policies approved by partners?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Partner Approval Minutes / Signed Policy',
        acceptableEvidence: 'Partner meeting minutes or signed AML/CFT policy document with approval signatures'
      },
      {
        code: 'B1.4',
        text: 'Is there documented oversight of AML compliance?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'B1.5',
        text: 'Is AML regularly reported to senior management?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'B1.6',
        text: 'Is AML governance integrated into firm strategy?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'B2': {
    title: '2B. BUSINESS-WIDE RISK ASSESSMENT',
    description: 'Assessment of business-wide risk assessment processes',
    questions: [
      {
        code: 'B2.1',
        text: 'Is a business-wide AML risk assessment documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Business-Wide Risk Assessment Report',
        acceptableEvidence: 'Complete ML/TF/PF risk assessment covering clients, services, geography, and delivery channels'
      },
      {
        code: 'B2.2',
        text: 'Is it approved by partners?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'B2.3',
        text: 'Is it reviewed regularly?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'B2.4',
        text: 'Is risk appetite formally documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'B2.5',
        text: 'Is risk appetite embedded in decision-making?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'B3': {
    title: '2C. CLIENT DUE DILIGENCE',
    description: 'Assessment of client identification and verification procedures',
    questions: [
      {
        code: 'B3.1',
        text: 'Are CDD procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'CDD/KYC Policy & Procedures',
        acceptableEvidence: 'CDD/KYC policy manual or documented identification requirements'
      },
      {
        code: 'B3.2',
        text: 'Are beneficial ownership procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Beneficial Ownership Procedures',
        acceptableEvidence: 'Beneficial ownership identification procedures or verification templates'
      },
      {
        code: 'B3.3',
        text: 'Are enhanced due diligence procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'EDD Policy & Procedures',
        acceptableEvidence: 'Enhanced due diligence policy and EDD triggers'
      },
      {
        code: 'B3.4',
        text: 'Are high-risk clients formally risk-rated?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'B3.5',
        text: 'Are ongoing monitoring procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'B4': {
    title: '2D. SANCTIONS & TFS',
    description: 'Assessment of STR and sanctions procedures',
    questions: [
      {
        code: 'B4.1',
        text: 'Are STR procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'STR Policy & Procedures',
        acceptableEvidence: 'Suspicious transaction reporting policy and STR submission procedures'
      },
      {
        code: 'B4.2',
        text: 'Are sanctions procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Sanctions Screening Policy',
        acceptableEvidence: 'Sanctions screening policy and screening workflow procedures'
      },
      {
        code: 'B4.3',
        text: 'Are escalation procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'B4.4',
        text: 'Are asset-freezing procedures documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'B5': {
    title: '2E. SUSPICIOUS TRANSACTION REPORTING',
    description: 'Assessment of training and record-keeping procedures',
    questions: [
      {
        code: 'B5.1',
        text: 'Is AML training documented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Training Policy & Records',
        acceptableEvidence: 'AML/CFT training policy and training completion records'
      },
      {
        code: 'B5.2',
        text: 'Are records retained for 10 years?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Record Retention Policy',
        acceptableEvidence: 'Record retention and destruction policy showing 10-year requirement'
      },
      {
        code: 'B5.3',
        text: 'Is role-based training implemented?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'B5.4',
        text: 'Are training outcomes monitored?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 3,
        weight: 1
      }
    ]
  }
};

// MODULE 3: EFFECTIVENESS RISK - "Do AML/CFT controls WORK in practice?"

const module3Questions = {
  'C1': {
    title: 'C1. RISK-BASED DECISION-MAKING',
    description: 'Assessment of how risk assessments guide decisions',
    questions: [
      {
        code: 'C1.1',
        text: 'Are risk assessments used to guide client acceptance?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C1.2',
        text: 'Are high-risk engagements escalated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C1.3',
        text: 'Are high-risk clients reviewed periodically?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'C1.4',
        text: 'Are engagement decisions subject to governance challenge?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'C2': {
    title: 'C2. SUSPICIOUS ACTIVITY',
    description: 'Assessment of suspicious activity identification and reporting',
    questions: [
      {
        code: 'C2.1',
        text: 'Are suspicious matters identified in practice?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C2.2',
        text: 'Are red flags documented?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C2.3',
        text: 'Are STRs submitted timely?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'C2.4',
        text: 'Is STR quality reviewed?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'C3': {
    title: 'C3. SANCTIONS EFFECTIVENESS',
    description: 'Assessment of sanctions screening effectiveness',
    questions: [
      {
        code: 'C3.1',
        text: 'Are sanctions matches escalated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C3.2',
        text: 'Are near matches investigated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'C3.3',
        text: 'Are sanctions controls audited?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3,
        weight: 1
      }
    ]
  },
  'C4': {
    title: 'C4. GOVERNANCE & REMEDIATION',
    description: 'Assessment of governance oversight and continuous improvement',
    questions: [
      {
        code: 'C4.1',
        text: 'Are AML weaknesses remediated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1,
        weight: 1
      },
      {
        code: 'C4.2',
        text: 'Are repeat failures tracked?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2,
        weight: 1
      },
      {
        code: 'C4.3',
        text: 'Are lessons learned integrated into procedures?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3,
        weight: 1
      }
    ]
  }
};

// NOTE: Module 4 (Maturity Risk) has been merged with the Institutional Maturity Assessment
// The detailed institutional maturity assessment provides comprehensive control maturity evaluation
// across 9 domains with evidence requirements. Module 4 scores are now derived from that assessment.

export const lawFirmsModules = {
  module1: {
    code: 'module1',
    title: 'CATEGORY (A): INHERENT RISK ASSESSMENT',
    description: 'What ML/TF/PF risk exists BEFORE controls?',
    sections: module1Questions
  },
  module2: {
    code: 'module2',
    title: 'CATEGORY (B): COMPLIANCE RISK (TECHNICAL COMPLIANCE)',
    description: 'Do legally required AML/CFT controls EXIST?',
    sections: module2Questions
  },
  module3: {
    code: 'module3',
    title: 'CATEGORY (C): EFFECTIVENESS RISK',
    description: 'Do AML/CFT controls WORK in practice?',
    sections: module3Questions
  }
};

export const lawFirmsCategories = [
  { value: 'law_firm_small', label: 'Small / Sole Practitioner Firm', tier: 1 },
  { value: 'law_firm_medium', label: 'Medium / Corporate Firm', tier: 2 },
  { value: 'law_firm_large', label: 'Large / International / Specialist Firm', tier: 3 },
  { value: 'legal_consultancy', label: 'Legal Consultancy', tier: 2 },
  { value: 'notary_services', label: 'Notary Services', tier: 2 },
  { value: 'trust_company', label: 'Trust and Company Service Provider', tier: 3 }
];

export const lawFirmsTierProfiles = {
  1: {
    name: 'Tier 1 – Small / Sole Practitioner Firms',
    description: 'Domestic focus, general legal practice, limited corporate exposure, no cross-border structuring, no trust or nominee services',
    questionCount: 35,
    autoEscalationTriggers: [
      'Foreign clients',
      'PEP exposure',
      'Cross-border structuring',
      'High-risk sectors',
      'Complex ownership'
    ]
  },
  2: {
    name: 'Tier 2 – Medium / Corporate Firms',
    description: 'Real estate and corporate work, some foreign clients, exposure to complex ownership, moderate cross-border exposure',
    questionCount: 50,
    autoEscalationTriggers: [
      'Offshore entities',
      'Trusts and foundations',
      'Multinational clients',
      'Private wealth structuring'
    ]
  },
  3: {
    name: 'Tier 3 – Large / International / Specialist Firms',
    description: 'Multinational clients, complex corporate structuring, cross-border transactions, private wealth, trusts, offshore exposure',
    questionCount: 62,
    autoEscalationTriggers: []
  }
};

export function getLawFirmsQuestionsForTier(tier) {
  const questions = [];

  Object.values(lawFirmsModules).forEach(module => {
    Object.values(module.sections).forEach(section => {
      section.questions.forEach(question => {
        if (question.minTier <= tier) {
          questions.push({
            ...question,
            section: section.title,
            module: module.title
          });
        }
      });
    });
  });

  return questions;
}

// AUTOMATED NARRATIVE GENERATION

export function generateInherentRiskNarrative(inherentResult, responses, tier) {
  const { score, rating, sectionScores } = inherentResult;

  const riskFactors = [];

  // Analyze section scores to identify key risk drivers
  if (sectionScores.A1 >= 3.5) riskFactors.push('complex client profiles including PEPs and foreign nationals');
  if (sectionScores.A2 >= 3.5) riskFactors.push('high-risk service offerings such as corporate structuring and real estate transactions');
  if (sectionScores.A3 >= 3.5) riskFactors.push('significant cross-border and multi-jurisdictional exposure');
  if (sectionScores.A4 >= 3.5) riskFactors.push('unusual transaction patterns or high-value transfers');
  if (sectionScores.A5 >= 3.5) riskFactors.push('professional vulnerabilities including sector-specific ML/TF typologies');

  let narrative = `The firm's inherent ML/TF risk is assessed as **${rating.toUpperCase()}** (score: ${score.toFixed(2)} on FATF 1-5 scale)`;

  if (riskFactors.length > 0) {
    narrative += `, driven primarily by ${riskFactors.join('; ')}`;
  }

  narrative += '. ';

  // Add tier-specific context
  if (tier === 1 && rating !== 'Low') {
    narrative += 'This elevated risk profile suggests the firm may benefit from enhanced controls typical of Tier 2 firms.';
  } else if (tier === 2 && rating === 'High') {
    narrative += 'This high-risk profile indicates the firm operates at a complexity level consistent with Tier 3 requirements.';
  } else if (tier === 3) {
    narrative += 'As a large/international firm, this risk profile is consistent with the firm\'s practice scope and requires robust governance.';
  }

  return narrative;
}

export function generateComplianceNarrative(complianceResult, tier) {
  const { rating, percentage, criticalGaps, hasRedFlags } = complianceResult;

  let narrative = `The firm has `;

  if (rating === 'Compliant') {
    narrative += `established comprehensive AML/CFT policies and governance structures (${percentage}% compliance) aligned with Tanzanian legal requirements and TLS expectations. `;
    narrative += 'The documented framework provides a solid foundation for effective risk management.';
  } else if (rating === 'Partially Compliant') {
    narrative += `established basic AML/CFT policies and governance structures (${percentage}% compliance), demonstrating awareness of regulatory obligations. However, `;

    if (criticalGaps.length > 0) {
      const gapAreas = criticalGaps.map(g => g.text.toLowerCase()).slice(0, 3).join(', ');
      narrative += `critical gaps were identified in ${gapAreas}. `;
    } else {
      narrative += `gaps were identified in documentation, implementation consistency, and periodic review processes. `;
    }

    narrative += 'Addressing these gaps should be prioritized to achieve full compliance.';
  } else if (rating === 'Weak') {
    narrative += `partially implemented AML/CFT controls (${percentage}% compliance) but significant gaps exist in core regulatory requirements. `;

    if (hasRedFlags) {
      narrative += '**Critical control deficiencies were identified** that require immediate remediation. ';
    }

    narrative += 'The firm requires substantial enhancement to meet minimum TLS expectations.';
  } else {
    narrative += `not established adequate AML/CFT controls (${percentage}% compliance), representing a **material compliance deficiency**. `;

    if (hasRedFlags) {
      narrative += '**Multiple critical controls are missing**, including mandatory requirements under the Anti-Money Laundering Act. ';
    }

    narrative += 'Urgent action is required to establish a compliant AML/CFT framework.';
  }

  return narrative;
}

export function generateEffectivenessNarrative(effectivenessResult) {
  const { rating, percentage } = effectivenessResult;

  let narrative = '';

  if (rating === 'Effective') {
    narrative = `The firm demonstrates **strong operational effectiveness** (${percentage}%) in implementing its AML/CFT controls. `;
    narrative += 'There is clear evidence of risk-based decision-making, proactive identification of suspicious activities, ';
    narrative += 'timely STR submissions, and effective sanctions screening. The firm shows a mature approach to AML/CFT implementation.';
  } else if (rating === 'Partially Effective') {
    narrative = `The firm demonstrates **moderate operational effectiveness** (${percentage}%) in implementing its AML/CFT controls. `;
    narrative += 'While suspicious activity monitoring exists and some STRs have been filed, evidence of consistent risk-based ';
    narrative += 'decision-making, structured detection processes, and comprehensive documentation of professional judgement could be strengthened. ';
    narrative += 'The firm should focus on embedding controls more consistently in daily operations.';
  } else if (rating === 'Weak') {
    narrative = `The firm demonstrates **weak operational effectiveness** (${percentage}%) in implementing its AML/CFT controls. `;
    narrative += 'While policies may exist on paper, there is limited evidence of systematic application in practice. ';
    narrative += 'STR quality, documentation of risk assessments, and escalation procedures require significant improvement. ';
    narrative += 'The firm should prioritize translating policy into consistent operational practice.';
  } else {
    narrative = `The firm demonstrates **ineffective implementation** (${percentage}%) of its AML/CFT controls. `;
    narrative += 'There is minimal evidence of controls working in practice, with limited suspicious activity detection, ';
    narrative += 'inadequate risk-based decision-making, and weak documentation. This represents a **critical weakness** ';
    narrative += 'requiring immediate attention to avoid regulatory enforcement action.';
  }

  return narrative;
}

export function generateMaturityNarrative(maturityResult, tier) {
  const { rating, percentage } = maturityResult;

  let narrative = `The firm demonstrates a **${rating.toUpperCase()}** AML/CFT maturity level (${percentage}%). `;

  if (rating === 'Advanced') {
    narrative += 'The firm shows strong governance integration with AML/CFT embedded in strategic planning, ';
    narrative += 'robust risk culture, effective use of technology and data management, and systematic continuous improvement. ';
    narrative += 'This level of maturity positions the firm well for TLS inspections and demonstrates commitment to financial crime prevention.';
  } else if (rating === 'Developing') {
    narrative += 'Governance structures are in place and staff show awareness of AML/CFT obligations. However, ';
    narrative += 'integration of AML/CFT into strategic decision-making, performance metrics, and technology adoption remains limited. ';
    narrative += 'The firm should focus on embedding AML/CFT more systematically into business processes and enhancing data management capabilities.';
  } else {
    narrative += 'AML/CFT is managed primarily as a compliance obligation rather than integrated into firm governance. ';
    narrative += 'Limited partner engagement, basic documentation systems, and reactive rather than proactive risk management ';
    narrative += 'indicate opportunities for significant enhancement. The firm should prioritize building governance structures, ';
    narrative += 'strengthening risk culture, and implementing more systematic control processes.';
  }

  return narrative;
}

export function generateResidualRiskNarrative(residualResult) {
  const { score, rating, inherentScore, overallControlEffectiveness, hasRedFlags } = residualResult;

  let narrative = `After considering control effectiveness, the firm's **overall residual ML/TF risk** is assessed as **${rating.toUpperCase()}** `;
  narrative += `(score: ${score.toFixed(2)} on FATF 1-5 scale). `;

  if (rating === 'Low') {
    narrative += `The firm's strong controls (${overallControlEffectiveness}% effective) have successfully mitigated the inherent risks to a low level. `;
    narrative += 'The firm demonstrates a mature and effective AML/CFT framework appropriate for its risk profile.';
  } else if (rating === 'Moderate') {
    narrative += `While controls are partially effective (${overallControlEffectiveness}% effective), some inherent risks remain inadequately mitigated. `;

    if (hasRedFlags) {
      narrative += '**Critical control gaps identified** mean certain high-risk areas lack adequate mitigation. ';
    }

    narrative += 'The firm should prioritize strengthening controls in identified gap areas to reduce residual risk further.';
  } else {
    narrative += `**Controls are insufficiently effective** (${overallControlEffectiveness}% effective) to adequately mitigate the firm's inherent risks. `;

    if (hasRedFlags) {
      narrative += '**Critical control deficiencies** leave the firm exposed to significant ML/TF risk and potential regulatory sanctions. ';
    }

    narrative += 'Urgent action is required to strengthen the AML/CFT framework and reduce exposure to an acceptable level. ';
    narrative += 'The firm should implement immediate remediation measures and consider seeking external AML/CFT expertise.';
  }

  return narrative;
}

export function generateExecutiveSummary(inherentResult, complianceResult, effectivenessResult, maturityResult, residualResult, tier, organizationName) {
  const summary = {
    title: `AML/CFT INSTITUTIONAL RISK ASSESSMENT - ${organizationName}`,
    assessmentDate: fmtDate(new Date()),
    tier: lawFirmsTierProfiles[tier].name,

    overallRiskRating: residualResult.rating,
    overallRiskScore: residualResult.score.toFixed(2),

    keyFindings: {
      inherentRisk: {
        rating: inherentResult.rating,
        score: inherentResult.score.toFixed(2),
        narrative: generateInherentRiskNarrative(inherentResult, {}, tier)
      },
      compliance: {
        rating: complianceResult.rating,
        percentage: complianceResult.percentage,
        narrative: generateComplianceNarrative(complianceResult, tier)
      },
      effectiveness: {
        rating: effectivenessResult.rating,
        percentage: effectivenessResult.percentage,
        narrative: generateEffectivenessNarrative(effectivenessResult)
      },
      maturity: {
        rating: maturityResult.rating,
        percentage: maturityResult.percentage,
        narrative: generateMaturityNarrative(maturityResult, tier)
      },
      residualRisk: {
        rating: residualResult.rating,
        score: residualResult.score.toFixed(2),
        narrative: generateResidualRiskNarrative(residualResult)
      }
    },

    criticalActions: complianceResult.hasRedFlags ? complianceResult.redFlags : [],

    tlsInspectionReadiness: {
      riskUnderstanding: inherentResult.rating !== 'Low' && complianceResult.percentage >= 60 ? 'Adequate' : 'Needs Improvement',
      policyFramework: complianceResult.percentage >= 80 ? 'Strong' : complianceResult.percentage >= 60 ? 'Adequate' : 'Weak',
      operationalEffectiveness: effectivenessResult.percentage >= 75 ? 'Strong' : effectivenessResult.percentage >= 55 ? 'Adequate' : 'Weak',
      governanceMaturity: maturityResult.rating === 'Advanced' ? 'Strong' : maturityResult.rating === 'Developing' ? 'Adequate' : 'Basic',
      overallReadiness: residualResult.rating === 'Low' ? 'Strong' : residualResult.rating === 'Moderate' ? 'Adequate' : 'Requires Urgent Attention'
    },

    recommendations: generateRecommendations(inherentResult, complianceResult, effectivenessResult, maturityResult, residualResult, tier)
  };

  return summary;
}

function generateRecommendations(inherentResult, complianceResult, effectivenessResult, maturityResult, residualResult, tier) {
  const recommendations = [];

  // Priority 1: Critical gaps
  if (complianceResult.hasRedFlags) {
    recommendations.push({
      priority: 'CRITICAL',
      area: 'Technical Compliance',
      action: 'Address critical control deficiencies immediately',
      details: complianceResult.criticalGaps.map(g => g.text).join('; '),
      timeline: 'Immediate (within 30 days)'
    });
  }

  // Priority 2: Compliance gaps
  if (complianceResult.percentage < 80) {
    recommendations.push({
      priority: 'HIGH',
      area: 'Policy Framework',
      action: 'Enhance AML/CFT policy documentation and implementation',
      details: 'Complete missing policies, enhance documentation standards, and ensure consistent application across the firm',
      timeline: 'Within 90 days'
    });
  }

  // Priority 3: Effectiveness issues
  if (effectivenessResult.percentage < 75) {
    recommendations.push({
      priority: 'HIGH',
      area: 'Operational Effectiveness',
      action: 'Strengthen implementation and operational application of controls',
      details: 'Improve STR quality, enhance risk-based decision documentation, and strengthen escalation procedures',
      timeline: 'Within 6 months'
    });
  }

  // Priority 4: Maturity enhancements
  if (maturityResult.rating === 'Basic') {
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Governance Maturity',
      action: 'Develop AML/CFT governance framework and risk culture',
      details: 'Enhance partner engagement, implement performance metrics, and establish continuous improvement processes',
      timeline: 'Within 12 months'
    });
  }

  // Priority 5: Tier escalation considerations
  if (tier === 1 && inherentResult.rating === 'High') {
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Risk Profile Management',
      action: 'Consider tier escalation due to elevated risk profile',
      details: 'Current risk profile suggests firm complexity exceeds Tier 1 assumptions. Consider adopting Tier 2 controls.',
      timeline: 'Review within 3 months'
    });
  }

  // Priority 6: Technology and data management
  if (tier >= 2 && maturityResult.percentage < 60) {
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Technology and Data Management',
      action: 'Implement structured AML/CFT monitoring tools',
      details: 'Consider case management systems, central registers, and automated monitoring to enhance efficiency and consistency',
      timeline: 'Within 12 months'
    });
  }

  return recommendations;
}

// AUTOMATIC TIER DETERMINATION

export function determineAutomaticTier(responses) {
  // Tier 3 triggers (highest priority) - Offshore, international, and private wealth
  const tier3Triggers = [
    responses['A1.12'] === 'Yes', // International tax structuring (Service)
    responses['A1.9'] === 'Yes',  // Cross-border structuring/offshore (Service)
    responses['A2.12'] === 'Yes', // Offshore entities or secrecy jurisdictions (Client)
    responses['A2.13'] === 'Yes', // Global private wealth clients (Client)
    responses['A3.7'] === 'Yes'   // Multi-jurisdictional structuring (Geographic)
  ];

  if (tier3Triggers.some(t => t)) {
    return {
      tier: 3,
      reason: 'Offshore structures, multinational clients, or private wealth structuring detected',
      automatic: true
    };
  }

  // Tier 2 triggers - Corporate complexity and foreign exposure
  const tier2Triggers = [
    responses['A1.9'] === 'Yes',  // Cross-border structuring services (Service)
    responses['A1.10'] === 'Yes', // Insolvency/restructuring (Service)
    responses['A1.11'] === 'Yes', // Tax planning (Service)
    responses['A2.10'] === 'Yes', // Multinational corporate groups (Client)
    responses['A2.11'] === 'Yes', // Clients linked to high-risk jurisdictions (Client)
    responses['A3.1'] === 'Yes',  // FATF-listed jurisdictions (Geographic)
    responses['A3.5'] === 'Yes'   // Offshore/secrecy jurisdictions (Geographic)
  ];

  if (tier2Triggers.some(t => t)) {
    return {
      tier: 2,
      reason: 'Corporate clients, foreign exposure, or complex transactions detected',
      automatic: true
    };
  }

  // Additional tier 2 triggers - multiple tier 1 high-risk factors
  const tier1HighRiskFactors = [
    responses['A1.1'] === 'Yes',  // Real estate (Service)
    responses['A1.3'] === 'Yes',  // Trust and estate planning (Service)
    responses['A1.6'] === 'Yes',  // Client funds handling (Service)
    responses['A2.1'] === 'Yes',  // PEPs (Client)
    responses['A2.4'] === 'Yes',  // Complex ownership (Client)
    responses['A2.5'] === 'Yes',  // Trusts/foundations (Client)
    responses['A3.4'] === 'Yes'   // Cross-border transactions (Geographic)
  ];

  const highRiskCount = tier1HighRiskFactors.filter(t => t).length;

  if (highRiskCount >= 3) {
    return {
      tier: 2,
      reason: 'Multiple high-risk exposure factors detected',
      automatic: true
    };
  }

  // Default to Tier 1
  return {
    tier: 1,
    reason: 'Domestic focus with limited complex exposure',
    automatic: false
  };
}

// Export the law firms assessment data as the primary export
export const lawFirmsAssessmentData = {
  framework: lawFirmsFramework,
  modules: lawFirmsModules,
  categories: lawFirmsCategories,
  tierProfiles: lawFirmsTierProfiles,
  getQuestionsForTier: getLawFirmsQuestionsForTier,
  generateInherentRiskNarrative,
  generateComplianceNarrative,
  generateEffectivenessNarrative,
  generateMaturityNarrative,
  generateResidualRiskNarrative,
  generateExecutiveSummary,
  determineAutomaticTier
};
