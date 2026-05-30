export const auditFirmCategories = [
  { value: 'sole_practitioner', label: 'Sole Practitioner / Small Firm (1-5 partners)' },
  { value: 'multi_partner', label: 'Multi-Partner Firm (5-20 professionals)' },
  { value: 'network_large', label: 'Network / Large / Internationally Affiliated Firm' },
  { value: 'specialist', label: 'Specialist / Niche Practice' }
];

export const auditFirmTierProfiles = {
  1: {
    name: 'Tier 1 — Small / Sole Practitioner Firms',
    description: '≤ 5 professionals, no international network affiliation, no foreign clients, no cross-border advisory, no insolvency services, no high-risk sector concentration, no multinational audits',
    questionCount: 84
  },
  2: {
    name: 'Tier 2 — Medium Firms',
    description: '6–20 professionals, corporate clients exceeding SME threshold, tax advisory services, some foreign ownership clients, network membership (local/regional), restructuring or insolvency services',
    questionCount: 98
  },
  3: {
    name: 'Tier 3 — Network / International Firms',
    description: 'Member of international audit network, audits multinational consolidated groups, provides cross-border structuring advice, assists offshore entity formation, has foreign branches or alliances, serves multinational PEP entities, engagements exceeding TZS 10 billion, multi-jurisdiction audit teams',
    questionCount: 113
  }
};

const module1Questions = {
  '1A': {
    title: '1A. SERVICE & ENGAGEMENT INHERENT RISK',
    description: 'Assessment of inherent risk arising from the nature of audit and advisory services provided.',
    questions: [
      {
        code: '1A.1',
        text: 'Does the firm provide statutory audit services to large or complex entities?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.2',
        text: 'Does the firm audit financial institutions, DNFBPs, insurers, or high-risk reporting persons?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.3',
        text: 'Does the firm provide tax advisory or cross-border tax planning?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.4',
        text: 'Does the firm assist in corporate restructuring, mergers, or acquisitions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.5',
        text: 'Does the firm provide insolvency or liquidation services?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.6',
        text: 'Does the firm assist in company formation or restructuring?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.7',
        text: 'Does the firm provide bookkeeping or outsourced financial management services?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.8',
        text: 'Does the firm provide forensic accounting or fraud investigation services?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.9',
        text: 'Does the firm manage or temporarily control client funds?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1A.10',
        text: 'Does the firm provide valuation services affecting asset pricing?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      }
    ]
  },
  '1B': {
    title: '1B. CLIENT PROFILE INHERENT RISK',
    description: 'Assessment of inherent risk arising from the types and characteristics of clients served.',
    questions: [
      {
        code: '1B.1',
        text: 'Does the firm serve politically exposed persons (PEPs)?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.2',
        text: 'Does the firm serve cash-intensive businesses?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.3',
        text: 'Does the firm serve extractive, gaming, real estate, or precious metals sectors?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.4',
        text: 'Does the firm serve non-resident or foreign-owned entities?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.5',
        text: 'Does the firm serve clients with complex or layered ownership?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.6',
        text: 'Does the firm serve trusts, foundations, or shell entities?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.7',
        text: 'Does the firm serve newly incorporated entities with limited history?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.8',
        text: 'Does the firm serve clients linked to sanctioned jurisdictions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.9',
        text: 'Does the firm encounter frequent unexplained related-party transactions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1B.10',
        text: 'Does the firm serve NGOs receiving foreign funding?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      }
    ]
  },
  '1C': {
    title: '1C. GEOGRAPHIC INHERENT RISK',
    description: 'Assessment of inherent risk arising from geographic operations and cross-border exposure.',
    questions: [
      {
        code: '1C.1',
        text: 'Does the firm audit entities operating in high-risk jurisdictions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1C.2',
        text: 'Does the firm audit multinational groups?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1C.3',
        text: 'Does the firm conduct cross-border engagements?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1C.4',
        text: 'Does the firm rely on foreign network affiliates?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1C.5',
        text: 'Does the firm deal with jurisdictions subject to FATF monitoring?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1C.6',
        text: 'Does the firm operate in regions with high informality?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      }
    ]
  },
  '1D': {
    title: '1D. TRANSACTION & STRUCTURAL EXPOSURE RISK',
    description: 'Assessment of inherent risk arising from transaction complexity and financial flows.',
    questions: [
      {
        code: '1D.1',
        text: 'Does the firm encounter high-value or unusual transactions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.2',
        text: 'Does the firm encounter rapid asset movements across jurisdictions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.3',
        text: 'Does the firm encounter frequent ownership changes?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.4',
        text: 'Does the firm encounter structured or round-number transactions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.5',
        text: 'Does the firm encounter unexplained third-party payments?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.6',
        text: 'Does the firm encounter significant related-party transactions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1D.7',
        text: 'Does the firm encounter frequent financial restatements?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      }
    ]
  },
  '1E': {
    title: '1E. PROFESSIONAL VULNERABILITY RISK',
    description: 'Assessment of inherent risk arising from professional vulnerabilities and sectoral exposure.',
    questions: [
      {
        code: '1E.1',
        text: 'Is the firm heavily dependent on a small number of high-risk clients?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1E.2',
        text: 'Does the firm operate in a sector historically misused for ML/TF?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1E.3',
        text: 'Has the firm identified typologies involving misuse of audit services?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1E.4',
        text: 'Is there risk of misuse of audit sign-offs to legitimize falsified accounts?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      },
      {
        code: '1E.5',
        text: 'Does the firm operate in an environment with weak AML supervision?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1
      }
    ]
  },
  '1F': {
    title: 'TIER 2 ADD-ONS — Enhanced Exposure',
    description: 'Additional inherent risk questions for medium firms.',
    questions: [
      {
        code: '1F.1',
        text: 'Does the firm audit entities with turnover above national SME thresholds?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2
      },
      {
        code: '1F.2',
        text: 'Does the firm advise on cross-border tax planning?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2
      },
      {
        code: '1F.3',
        text: 'Does the firm audit subsidiaries of foreign-owned entities?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2
      },
      {
        code: '1F.4',
        text: 'Does the firm handle recurring complex beneficial ownership structures?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2
      },
      {
        code: '1F.5',
        text: 'Does the firm encounter significant inter-company transactions?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2
      }
    ]
  },
  '1G': {
    title: 'TIER 3 ADD-ONS — Complex Cross-Border Exposure',
    description: 'Additional inherent risk questions for network and international firms.',
    questions: [
      {
        code: '1G.1',
        text: 'Does the firm provide offshore structuring advice?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3
      },
      {
        code: '1G.2',
        text: 'Does the firm audit multinational consolidated groups?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3
      },
      {
        code: '1G.3',
        text: 'Does the firm participate in global tax advisory engagements?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3
      },
      {
        code: '1G.4',
        text: 'Does the firm administer complex offshore ownership chains?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3
      },
      {
        code: '1G.5',
        text: 'Does the firm provide cross-border insolvency services?',
        type: 'control',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3
      }
    ]
  }
};

const module2Questions = {
  '2A': {
    title: '2A. GOVERNANCE & RESPONSIBILITY',
    description: 'Assessment of AML/CFT governance structures and responsibility assignment.',
    questions: [
      {
        code: '2A.1',
        text: 'Has the firm appointed an AML/CFT compliance officer?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2A.2',
        text: 'Are AML/CFT roles documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2A.3',
        text: 'Are AML/CFT policies formally approved?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2A.4',
        text: 'Is AML/CFT oversight documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2A.5',
        text: 'Is there documented internal reporting procedure (Section 19 AMLA)?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2B': {
    title: '2B. BUSINESS-WIDE RISK ASSESSMENT',
    description: 'Assessment of firm-wide ML/TF/PF risk assessment procedures.',
    questions: [
      {
        code: '2B.1',
        text: 'Has the firm conducted a documented ML/TF/PF risk assessment?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2B.2',
        text: 'Is it approved by senior management?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2B.3',
        text: 'Is it reviewed annually or upon material change?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2B.4',
        text: 'Does it align with National Risk Assessment findings?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2C': {
    title: '2C. CUSTOMER DUE DILIGENCE (Section 16 AMLA)',
    description: 'Assessment of CDD procedures and documentation.',
    questions: [
      {
        code: '2C.1',
        text: 'Are client identification procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2C.2',
        text: 'Are beneficial ownership procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2C.3',
        text: 'Are PEP identification procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2C.4',
        text: 'Are enhanced due diligence procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2C.5',
        text: 'Are source-of-funds procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2C.6',
        text: 'Are ongoing monitoring procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2D': {
    title: '2D. RECORD KEEPING (Section 17 AMLA)',
    description: 'Assessment of record retention and accessibility.',
    questions: [
      {
        code: '2D.1',
        text: 'Are record retention procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2D.2',
        text: 'Are records retained for at least 10 years?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2D.3',
        text: 'Are working papers retrievable upon request?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2E': {
    title: '2E. SUSPICIOUS TRANSACTION REPORTING (Section 18 AMLA)',
    description: 'Assessment of STR procedures and mechanisms.',
    questions: [
      {
        code: '2E.1',
        text: 'Are STR procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2E.2',
        text: 'Is there internal escalation mechanism?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2E.3',
        text: 'Are reporting timelines documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2E.4',
        text: 'Are tipping-off prohibitions documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2F': {
    title: '2F. SANCTIONS & TFS',
    description: 'Assessment of sanctions and targeted financial sanctions procedures.',
    questions: [
      {
        code: '2F.1',
        text: 'Are sanctions screening procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2F.2',
        text: 'Are asset-freezing procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2F.3',
        text: 'Are escalation procedures defined?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2G': {
    title: '2G. TRAINING & STAFF INTEGRITY',
    description: 'Assessment of staff training and vetting procedures.',
    questions: [
      {
        code: '2G.1',
        text: 'Is AML/CFT training documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2G.2',
        text: 'Is induction training conducted?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2G.3',
        text: 'Is periodic refresher training conducted?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      },
      {
        code: '2G.4',
        text: 'Are staff vetting procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 1
      }
    ]
  },
  '2H': {
    title: 'TIER 2 ADD-ONS — Enhanced Controls',
    description: 'Additional compliance requirements for medium firms.',
    questions: [
      {
        code: '2H.1',
        text: 'Are clients formally risk-rated?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 2
      },
      {
        code: '2H.2',
        text: 'Are high-risk engagements approved by senior partners?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 2
      },
      {
        code: '2H.3',
        text: 'Is EDD documented for higher-risk clients?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 2
      },
      {
        code: '2H.4',
        text: 'Is internal AML review conducted annually?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 2
      },
      {
        code: '2H.5',
        text: 'Are independence conflicts integrated into AML risk evaluation?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 2
      }
    ]
  },
  '2I': {
    title: 'TIER 3 ADD-ONS — Network Governance',
    description: 'Additional compliance requirements for network and international firms.',
    questions: [
      {
        code: '2I.1',
        text: 'Are group-wide AML standards applied?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 3
      },
      {
        code: '2I.2',
        text: 'Are cross-border information-sharing procedures documented?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 3
      },
      {
        code: '2I.3',
        text: 'Is AML oversight exercised over foreign affiliates?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 3
      },
      {
        code: '2I.4',
        text: 'Are global compliance findings tracked?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 3
      },
      {
        code: '2I.5',
        text: 'Are network-level AML audits conducted?',
        type: 'compliance',
        options: ['Fully Documented & Implemented', 'Partially Implemented', 'Not in Place'],
        minTier: 3
      }
    ]
  }
};

const module3Questions = {
  '3A': {
    title: '3A. RISK ASSESSMENT USE',
    description: 'Assessment of how risk assessments are used in practice.',
    questions: [
      {
        code: '3A.1',
        text: 'Is the risk assessment used to guide engagement acceptance?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3A.2',
        text: 'Are high-risk clients subject to enhanced review?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3A.3',
        text: 'Are risk ratings updated when circumstances change?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3B': {
    title: '3B. SUSPICIOUS ACTIVITY IDENTIFICATION',
    description: 'Assessment of suspicious activity identification in practice.',
    questions: [
      {
        code: '3B.1',
        text: 'Have suspicious matters been identified during audit engagements?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.2',
        text: 'Have STRs been submitted where required?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.3',
        text: 'Are audit red flags escalated internally?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.4',
        text: 'Are unusual transactions documented in working papers?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3C': {
    title: '3C. REPORTING QUALITY',
    description: 'Assessment of STR quality and timeliness.',
    questions: [
      {
        code: '3C.1',
        text: 'Are STRs submitted within required timelines?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3C.2',
        text: 'Are STRs complete and analytical?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3C.3',
        text: 'Are reporting failures identified and corrected?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3D': {
    title: '3D. SANCTIONS & PEP EFFECTIVENESS',
    description: 'Assessment of sanctions and PEP controls effectiveness.',
    questions: [
      {
        code: '3D.1',
        text: 'Are sanctions matches escalated immediately?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3D.2',
        text: 'Are PEP engagements escalated appropriately?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3D.3',
        text: 'Are near-matches investigated thoroughly?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3E': {
    title: '3E. GOVERNANCE & LEARNING',
    description: 'Assessment of governance and remediation processes.',
    questions: [
      {
        code: '3E.1',
        text: 'Does management review AML performance?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3E.2',
        text: 'Are regulatory findings remediated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3E.3',
        text: 'Are repeat deficiencies declining?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3E.4',
        text: 'Are lessons learned incorporated into procedures?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3F': {
    title: 'TIER 2 ADD-ONS — Monitoring Depth',
    description: 'Additional effectiveness measures for medium firms.',
    questions: [
      {
        code: '3F.1',
        text: 'Are suspicious client resignations analysed?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.2',
        text: 'Are high-risk clients reassessed annually?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.3',
        text: 'Are recurring compliance deficiencies tracked?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.4',
        text: 'Is AML training updated following weaknesses?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      }
    ]
  },
  '3G': {
    title: 'TIER 3 ADD-ONS — Advanced Effectiveness',
    description: 'Additional effectiveness measures for network and international firms.',
    questions: [
      {
        code: '3G.1',
        text: 'Is STR quality independently reviewed?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.2',
        text: 'Are global typologies incorporated into procedures?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.3',
        text: 'Are high-risk engagement overrides reviewed at network level?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.4',
        text: 'Are repeat AML weaknesses declining year-on-year?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.5',
        text: 'Are engagement continuation decisions formally re-approved?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      }
    ]
  }
};

export const auditFirmModules = {
  module1: {
    code: 'MODULE1',
    title: 'MODULE 1 — INHERENT RISK ASSESSMENT',
    description: 'What ML/TF/PF risk exists BEFORE controls? This module evaluates exposure arising from nature of audit and advisory services, client base, transaction complexity, geographic footprint, and professional vulnerability — independent of AML/CFT controls.',
    sections: module1Questions
  },
  module2: {
    code: 'MODULE2',
    title: 'MODULE 2 — TECHNICAL COMPLIANCE ASSESSMENT',
    description: 'Do legally required AML/CFT/CPF controls EXIST? This module assesses the existence and documentation of AML/CFT controls aligned with AMLA Cap. 423, GN 397 (2022), and POTA Regulations 2022.',
    sections: module2Questions
  },
  module3: {
    code: 'MODULE3',
    title: 'MODULE 3 — EFFECTIVENESS ASSESSMENT',
    description: 'Do AML/CFT/CPF controls WORK in practice? This module evaluates whether AML/CFT controls produce measurable, consistent, and defensible outcomes.',
    sections: module3Questions
  }
};

export const auditFirmWeighting = {
  module1: {
    '1A': 0.25,
    '1B': 0.25,
    '1C': 0.15,
    '1D': 0.20,
    '1E': 0.15,
    '1F': 0.00,
    '1G': 0.00
  }
};

export function calculateAuditFirmInherentRisk(responses, tier) {
  const weights = auditFirmWeighting.module1;
  const scoreMap = {
    'No Exposure': 0,
    'Low Exposure': 1,
    'Moderate Exposure': 2,
    'High Exposure': 3
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.keys(module1Questions).forEach(sectionCode => {
    const section = module1Questions[sectionCode];
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    if (applicableQuestions.length === 0) return;

    let sectionScore = 0;
    let answeredCount = 0;

    applicableQuestions.forEach(question => {
      const response = responses[question.code];
      if (response && scoreMap[response] !== undefined) {
        sectionScore += scoreMap[response];
        answeredCount++;
      }
    });

    if (answeredCount > 0) {
      const avgSectionScore = sectionScore / answeredCount;
      const weight = weights[sectionCode] || 0;

      if (weight > 0) {
        totalWeightedScore += avgSectionScore * weight;
        totalWeight += weight;
      }
    }
  });

  const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  let rating;
  if (finalScore <= 1.50) rating = 'LOW';
  else if (finalScore <= 2.30) rating = 'MODERATE';
  else rating = 'HIGH';

  return { score: finalScore, rating };
}

export function calculateAuditFirmCompliance(responses, tier) {
  const scoreMap = {
    'Fully Documented & Implemented': 2,
    'Partially Implemented': 1,
    'Not in Place': 0
  };

  let totalScore = 0;
  let maxScore = 0;

  Object.keys(module2Questions).forEach(sectionCode => {
    const section = module2Questions[sectionCode];
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    applicableQuestions.forEach(question => {
      maxScore += 2;
      const response = responses[question.code];
      if (response && scoreMap[response] !== undefined) {
        totalScore += scoreMap[response];
      }
    });
  });

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let rating;
  if (percentage >= 80) rating = 'COMPLIANT';
  else if (percentage >= 60) rating = 'PARTIALLY COMPLIANT';
  else rating = 'NON-COMPLIANT';

  return { score: percentage, rating };
}

export function calculateAuditFirmEffectiveness(responses, tier) {
  const scoreMap = {
    'Effective': 2,
    'Weak': 1,
    'Ineffective': 0
  };

  let totalScore = 0;
  let maxScore = 0;

  Object.keys(module3Questions).forEach(sectionCode => {
    const section = module3Questions[sectionCode];
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    applicableQuestions.forEach(question => {
      maxScore += 2;
      const response = responses[question.code];
      if (response && scoreMap[response] !== undefined) {
        totalScore += scoreMap[response];
      }
    });
  });

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let rating;
  if (percentage >= 75) rating = 'EFFECTIVE';
  else if (percentage >= 55) rating = 'PARTIALLY EFFECTIVE';
  else rating = 'INEFFECTIVE';

  return { score: percentage, rating };
}

export function calculateAuditFirmResidualRisk(inherentScore, complianceRating, effectivenessRating) {
  let controlModifier = 1.0;

  if (complianceRating === 'COMPLIANT' && effectivenessRating === 'EFFECTIVE') {
    controlModifier = 0.60;
  } else if (complianceRating === 'PARTIALLY COMPLIANT' || effectivenessRating === 'PARTIALLY EFFECTIVE') {
    controlModifier = 0.85;
  } else {
    controlModifier = 1.10;
  }

  const residualScore = inherentScore * controlModifier;

  let rating;
  if (residualScore <= 1.50) rating = 'LOW';
  else if (residualScore <= 2.30) rating = 'MODERATE';
  else rating = 'HIGH';

  return { score: residualScore, rating };
}

export function getAuditFirmQuestionsForTier(tier) {
  const allQuestions = {};

  ['module1', 'module2', 'module3'].forEach(moduleKey => {
    const module = auditFirmModules[moduleKey];
    allQuestions[moduleKey] = {};

    Object.keys(module.sections).forEach(sectionCode => {
      const section = module.sections[sectionCode];
      const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

      if (applicableQuestions.length > 0) {
        allQuestions[moduleKey][sectionCode] = {
          ...section,
          questions: applicableQuestions
        };
      }
    });
  });

  return allQuestions;
}
