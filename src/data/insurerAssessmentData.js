export const insurerCategories = [
  { value: 'general_only', label: 'General Insurance Only' },
  { value: 'life_only', label: 'Life Insurance Only' },
  { value: 'composite', label: 'Composite Insurance (Life + General)' },
  { value: 'reinsurance', label: 'Reinsurance Company' },
  { value: 'microinsurance', label: 'Microinsurance Provider' }
];

export const insurerTierProfiles = {
  1: {
    name: 'Tier 1 — Small / Micro Insurers',
    description: 'Limited product range, mostly non-life products, domestic-only exposure, no foreign reinsurers, limited agent network, no investment-linked products',
    questionCount: 94
  },
  2: {
    name: 'Tier 2 — Medium Insurers',
    description: 'Mix of life and non-life, moderate agent network, some foreign reinsurers, some cash-value products, limited cross-border exposure',
    questionCount: 108
  },
  3: {
    name: 'Tier 3 — Composite / Large Life Insurers / Reinsurers',
    description: 'Life + Non-life composite, investment-linked products, high surrender value policies, extensive agent/broker network, foreign reinsurers, cross-border policies, significant premium volume, systemically relevant to TIRA',
    questionCount: 122
  }
};

const module1Questions = {
  '1A': {
    title: '1A. PRODUCT & CONTRACT INHERENT RISK',
    description: 'Assessment of vulnerabilities arising from insurance products and contract features (reflecting FIU Guidelines to Insurers).',
    questions: [
      {
        code: '1A.1',
        text: 'Does the insurer offer single premium life insurance policies?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.2',
        text: 'Does the insurer offer unit-linked or investment-linked products?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.3',
        text: 'Does the insurer offer products that accumulate cash value?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.4',
        text: 'Does the insurer offer annuities (fixed or variable)?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.5',
        text: 'Does the insurer allow early surrender with refund of significant value?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.6',
        text: 'Does the insurer permit policy transfers to third parties?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.7',
        text: 'Does the insurer offer endowment or second-hand policies?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.8',
        text: 'Does the insurer provide products allowing overpayments or lump-sum top-ups?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1A.9',
        text: 'Does the insurer offer products with high refund flexibility?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1B': {
    title: '1B. DISTRIBUTION & INTERMEDIARY RISK',
    description: 'Assessment of risk arising from distribution channels and intermediary relationships.',
    questions: [
      {
        code: '1B.1',
        text: 'Does the insurer rely on independent agents or brokers?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1B.2',
        text: 'Does the insurer use introducers or intermediaries for onboarding?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1B.3',
        text: 'Are commissions linked to policy volume without enhanced risk oversight?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1B.4',
        text: 'Does the insurer conduct non-face-to-face onboarding?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1B.5',
        text: 'Does the insurer use digital or online channels for policy issuance?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1B.6',
        text: 'Does the insurer rely on foreign intermediaries?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1C': {
    title: '1C. CUSTOMER PROFILE INHERENT RISK',
    description: 'Assessment of risk arising from customer types and characteristics.',
    questions: [
      {
        code: '1C.1',
        text: 'Does the insurer serve politically exposed persons (PEPs)?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.2',
        text: 'Does the insurer serve high-net-worth individuals?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.3',
        text: 'Does the insurer serve non-resident or foreign customers?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.4',
        text: 'Does the insurer insure customers operating in high-risk sectors?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.5',
        text: 'Does the insurer insure entities with complex ownership structures?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.6',
        text: 'Does the insurer insure trusts or layered legal arrangements?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1C.7',
        text: 'Does the insurer encounter frequent beneficial ownership changes?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1D': {
    title: '1D. PAYMENT & TRANSACTION INHERENT RISK',
    description: 'Assessment of risk arising from payment methods and transaction patterns.',
    questions: [
      {
        code: '1D.1',
        text: 'Does the insurer accept cash premiums?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.2',
        text: 'Does the insurer accept third-party premium payments?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.3',
        text: 'Does the insurer encounter structured or split premium payments?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.4',
        text: 'Does the insurer process large lump-sum premiums?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.5',
        text: 'Does the insurer experience early policy surrender patterns?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.6',
        text: 'Does the insurer encounter rapid policy cancellations and reissuance?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.7',
        text: 'Does the insurer encounter frequent beneficiary changes?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1D.8',
        text: 'Does the insurer process cross-border premium payments?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1E': {
    title: '1E. GEOGRAPHIC INHERENT RISK',
    description: 'Assessment of risk arising from geographic operations and cross-border exposure.',
    questions: [
      {
        code: '1E.1',
        text: 'Does the insurer operate in high-risk jurisdictions?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1E.2',
        text: 'Does the insurer insure risks located outside Tanzania?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1E.3',
        text: 'Does the insurer transact with FATF-listed jurisdictions?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1E.4',
        text: 'Does the insurer insure entities linked to sanctioned jurisdictions?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1E.5',
        text: 'Does the insurer operate foreign branches or subsidiaries?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1E.6',
        text: 'Does the insurer rely on foreign reinsurers?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1F': {
    title: '1F. SECTORAL & STRUCTURAL VULNERABILITY RISK',
    description: 'Assessment of risk arising from sectoral vulnerabilities and market environment.',
    questions: [
      {
        code: '1F.1',
        text: 'Does the insurer operate in markets with high informality?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1F.2',
        text: 'Is there sectoral history of misuse of life insurance for ML?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1F.3',
        text: 'Does the insurer face limited supervisory intensity?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      },
      {
        code: '1F.4',
        text: 'Has the insurer identified typologies specific to insurance misuse?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 1
      }
    ]
  },
  '1G': {
    title: 'TIER 2 ADD-ONS — Enhanced Exposure',
    description: 'Additional inherent risk questions for medium insurers.',
    questions: [
      {
        code: '1G.1',
        text: 'Does the insurer monitor concentration of high-net-worth clients?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 2
      },
      {
        code: '1G.2',
        text: 'Does the insurer track early surrender ratios quarterly?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 2
      },
      {
        code: '1G.3',
        text: 'Does the insurer analyse structured premium payments?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 2
      },
      {
        code: '1G.4',
        text: 'Does the insurer conduct risk assessment of intermediaries?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 2
      },
      {
        code: '1G.5',
        text: 'Does the insurer assess reinsurance counterparty AML risk?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 2
      }
    ]
  },
  '1H': {
    title: 'TIER 3 ADD-ONS — Complex Cross-Border Exposure',
    description: 'Additional inherent risk questions for composite, large life insurers, and reinsurers.',
    questions: [
      {
        code: '1H.1',
        text: 'Does the insurer provide offshore-linked policies?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 3
      },
      {
        code: '1H.2',
        text: 'Does the insurer manage cross-border asset-backed policies?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 3
      },
      {
        code: '1H.3',
        text: 'Does the insurer operate captive reinsurance structures?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
        minTier: 3
      },
      {
        code: '1H.4',
        text: 'Does the insurer issue large single-premium contracts regularly?',
        type: 'risk',
        options: ['No Exposure', 'Low Exposure', 'Moderate Exposure', 'High Exposure'],
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
        text: 'Has the insurer appointed a Compliance Officer / MLRO?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2A.2',
        text: 'Are AML/CFT responsibilities formally documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2A.3',
        text: 'Are AML/CFT policies Board-approved?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2A.4',
        text: 'Does senior management receive AML reports?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2A.5',
        text: 'Is there internal AML oversight?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
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
        text: 'Has the insurer conducted a documented ML/TF/PF risk assessment?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2B.2',
        text: 'Is it approved by senior management?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2B.3',
        text: 'Is it reviewed annually or upon material change?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2B.4',
        text: "Are risk factors aligned with Tanzania's NRA findings?",
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2C': {
    title: '2C. CUSTOMER DUE DILIGENCE (CDD)',
    description: 'Assessment of CDD procedures and documentation.',
    questions: [
      {
        code: '2C.1',
        text: 'Are CDD procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2C.2',
        text: 'Are beneficial ownership procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2C.3',
        text: 'Are PEP identification procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2C.4',
        text: 'Are enhanced due diligence procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2C.5',
        text: 'Are procedures in place for non-face-to-face verification?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2C.6',
        text: 'Are procedures in place for reliance on intermediaries?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2D': {
    title: '2D. ONGOING MONITORING',
    description: 'Assessment of ongoing monitoring and unusual transaction detection procedures.',
    questions: [
      {
        code: '2D.1',
        text: 'Are unusual transaction monitoring procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2D.2',
        text: 'Are early surrender monitoring procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2D.3',
        text: 'Are premium overpayment controls documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2D.4',
        text: 'Are beneficiary change controls documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2E': {
    title: '2E. SUSPICIOUS TRANSACTION REPORTING',
    description: 'Assessment of STR procedures and mechanisms.',
    questions: [
      {
        code: '2E.1',
        text: 'Are STR procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2E.2',
        text: 'Is internal escalation defined?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2E.3',
        text: 'Are reporting timelines documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2E.4',
        text: 'Are tipping-off prohibitions documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
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
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2F.2',
        text: 'Are freezing procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2F.3',
        text: 'Are screening conducted at onboarding and ongoing?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2F.4',
        text: 'Are sanctions escalation procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2G': {
    title: '2G. RECORD KEEPING',
    description: 'Assessment of record retention and accessibility.',
    questions: [
      {
        code: '2G.1',
        text: 'Are customer records retained for at least 10 years?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2G.2',
        text: 'Are policy and transaction records retrievable?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2G.3',
        text: 'Are beneficiary records maintained?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2H': {
    title: '2H. TRAINING & EMPLOYEE SCREENING',
    description: 'Assessment of staff training and vetting procedures.',
    questions: [
      {
        code: '2H.1',
        text: 'Is AML/CFT training documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2H.2',
        text: 'Is training conducted at induction?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2H.3',
        text: 'Is refresher training conducted?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2H.4',
        text: 'Are agents screened before appointment?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      },
      {
        code: '2H.5',
        text: 'Are staff vetting procedures documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 1
      }
    ]
  },
  '2I': {
    title: 'TIER 2 ADD-ONS — Enhanced Controls',
    description: 'Additional compliance requirements for medium insurers.',
    questions: [
      {
        code: '2I.1',
        text: 'Are intermediaries subject to AML audits?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 2
      },
      {
        code: '2I.2',
        text: 'Are product-level risk assessments conducted?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 2
      },
      {
        code: '2I.3',
        text: 'Is enhanced due diligence applied to high-surrender products?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 2
      },
      {
        code: '2I.4',
        text: 'Are foreign reinsurance AML clauses documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 2
      },
      {
        code: '2I.5',
        text: 'Are agent AML certifications required?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 2
      }
    ]
  },
  '2J': {
    title: 'TIER 3 ADD-ONS — Network Governance',
    description: 'Additional compliance requirements for composite, large life insurers, and reinsurers.',
    questions: [
      {
        code: '2J.1',
        text: 'Are group-wide AML standards applied?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 3
      },
      {
        code: '2J.2',
        text: 'Is cross-border data-sharing documented?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 3
      },
      {
        code: '2J.3',
        text: 'Are foreign branch AML controls reviewed?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 3
      },
      {
        code: '2J.4',
        text: 'Is there independent AML audit function?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
        minTier: 3
      },
      {
        code: '2J.5',
        text: 'Are sanctions screening automated enterprise-wide?',
        type: 'compliance',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not implemented'],
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
        text: 'Is the risk assessment used to determine product-level controls?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3A.2',
        text: 'Are high-risk products subject to enhanced monitoring?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3A.3',
        text: 'Are customer risk ratings updated when circumstances change?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3B': {
    title: '3B. TRANSACTION MONITORING OUTCOMES',
    description: 'Assessment of transaction monitoring effectiveness.',
    questions: [
      {
        code: '3B.1',
        text: 'Have suspicious surrender patterns been detected?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.2',
        text: 'Are unusual premium patterns investigated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.3',
        text: 'Are structured payments identified?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.4',
        text: 'Are beneficiary changes monitored?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3B.5',
        text: 'Are third-party payments scrutinized?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3C': {
    title: '3C. STR QUALITY & TIMELINESS',
    description: 'Assessment of STR quality and timeliness.',
    questions: [
      {
        code: '3C.1',
        text: 'Have STRs been submitted where required?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3C.2',
        text: 'Are STRs submitted within required timelines?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3C.3',
        text: 'Are STRs complete and analytical?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3C.4',
        text: 'Are reporting failures identified and corrected?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3D': {
    title: '3D. SANCTIONS EFFECTIVENESS',
    description: 'Assessment of sanctions controls effectiveness.',
    questions: [
      {
        code: '3D.1',
        text: 'Are sanctions matches identified promptly?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3D.2',
        text: 'Are freezing actions implemented immediately?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3D.3',
        text: 'Are near-matches escalated appropriately?',
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
        text: 'Does management review AML performance indicators?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      },
      {
        code: '3E.2',
        text: 'Are regulatory findings remediated timely?',
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
        text: 'Are emerging typologies incorporated into controls?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 1
      }
    ]
  },
  '3F': {
    title: 'TIER 2 ADD-ONS — Monitoring Depth',
    description: 'Additional effectiveness measures for medium insurers.',
    questions: [
      {
        code: '3F.1',
        text: 'Are surrender trends analysed for ML patterns?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.2',
        text: 'Are high-risk policies periodically re-approved?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.3',
        text: 'Are intermediary AML failures monitored?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      },
      {
        code: '3F.4',
        text: 'Is STR quality reviewed internally?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 2
      }
    ]
  },
  '3G': {
    title: 'TIER 3 ADD-ONS — Advanced Effectiveness',
    description: 'Additional effectiveness measures for composite, large life insurers, and reinsurers.',
    questions: [
      {
        code: '3G.1',
        text: 'Are surrender analytics automated?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.2',
        text: 'Are STRs independently quality reviewed?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.3',
        text: 'Are sanctions near-matches investigated through enhanced process?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.4',
        text: 'Are emerging FATF typologies integrated into monitoring?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      },
      {
        code: '3G.5',
        text: 'Are repeated control failures declining year-on-year?',
        type: 'effectiveness',
        options: ['Effective', 'Weak', 'Ineffective'],
        minTier: 3
      }
    ]
  }
};

export const insurerModules = {
  module1: {
    code: 'MODULE1',
    title: 'MODULE 1 — INHERENT RISK ASSESSMENT',
    description: 'What ML / TF / PF risk exists BEFORE controls? This module assesses exposure arising from insurance products, distribution channels, customers, geography, and transaction patterns — independent of AML controls.',
    sections: module1Questions
  },
  module2: {
    code: 'MODULE2',
    title: 'MODULE 2 — TECHNICAL COMPLIANCE ASSESSMENT',
    description: 'Do legally required AML/CFT/CPF controls EXIST? This module assesses existence and documentation of AML/CFT controls aligned with AMLA Cap. 423, AMLA Regulations GN 397, and FIU Guidelines to Insurers.',
    sections: module2Questions
  },
  module3: {
    code: 'MODULE3',
    title: 'MODULE 3 — EFFECTIVENESS ASSESSMENT',
    description: 'Do AML/CFT/CPF controls WORK in practice? This module evaluates whether AML/CFT controls produce measurable, consistent, and defensible outcomes.',
    sections: module3Questions
  }
};

export const insurerWeighting = {
  module1: {
    '1A': 0.25,
    '1B': 0.15,
    '1C': 0.20,
    '1D': 0.20,
    '1E': 0.10,
    '1F': 0.10,
    '1G': 0.00,
    '1H': 0.00
  }
};

export function calculateInsurerInherentRisk(responses, tier) {
  const weights = insurerWeighting.module1;
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

export function calculateInsurerCompliance(responses, tier) {
  const scoreMap = {
    'Fully implemented & documented': 2,
    'Partially implemented': 1,
    'Not implemented': 0
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

export function calculateInsurerEffectiveness(responses, tier) {
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

export function calculateInsurerResidualRisk(inherentScore, complianceRating, effectivenessRating) {
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

export function getInsurerQuestionsForTier(tier) {
  const allQuestions = {};

  ['module1', 'module2', 'module3'].forEach(moduleKey => {
    const module = insurerModules[moduleKey];
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
