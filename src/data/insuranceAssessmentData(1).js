// INSTITUTIONAL AML/CFT RISK ASSESSMENT FOR INSURERS IN TANZANIA
// Tiered Questionnaire Framework (2026)
// Regulator-Ready | Risk-Based | TIRA & FIU-Aligned
// Structural twin of the Law Firms framework; content adapted to the insurance sector.

export const insurersFramework = {
  name: 'Insurers and Insurance Intermediaries',
  code: 'insurers_tanzania',
  description: 'AML/CFT/CPF Risk Assessment for Insurers and Insurance Intermediaries in Tanzania',
  supervisor: 'Tanzania Insurance Regulatory Authority (TIRA) & Financial Intelligence Unit (FIU)',
  legislation: 'Anti-Money Laundering Act (Cap. 423), AML Regulations 2022 (as amended 2023) & TIRA Guidelines to Insurers',
  tiers: {
    1: {
      name: 'Tier 1 – Small / General-Lines Insurer',
      description: 'Domestic, predominantly general (non-life) business, simple products, limited cross-border or investment-linked exposure',
      questionCount: 35
    },
    2: {
      name: 'Tier 2 – Medium / Composite Insurer or Intermediary',
      description: 'Life and general business, distribution through brokers/agents, some foreign or higher-net-worth clients, savings/endowment products',
      questionCount: 50
    },
    3: {
      name: 'Tier 3 – Large / Life & Investment / Cross-Border Insurer',
      description: 'Significant life and investment-linked business, single-premium and unit-linked products, cross-border premiums/payouts, private-wealth and offshore exposure',
      questionCount: 62
    }
  }
};

// MODULE 1: INHERENT RISK ASSESSMENT - "What ML/TF/PF exposure exists BEFORE controls?"
// Maps to the FIU report's risk categories: Product/Service, Customer, Geographic, Channel/Transaction (+ sector vulnerability).

const module1Questions = {
  'A1': {
    title: '1A. PRODUCT & SERVICE LINE RISK',
    description: 'Inherent risk from insurance products written. Life, investment-linked and cash-value products are internationally recognised as more vulnerable to ML/TF misuse than pure-protection general lines.',
    questions: [
      {
        code: 'A1.1',
        text: 'Does the insurer write life insurance or other investment-linked insurance business?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Life and investment-linked policies are the primary insurance ML/TF vector - TIRA Guidelines to Insurers; FATF life-insurance guidance'
      },
      {
        code: 'A1.2',
        text: 'Does the insurer offer single-premium policies?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Single-premium contracts allow large lump-sum placement - flagged as vulnerable in the Insurers Guide'
      },
      {
        code: 'A1.3',
        text: 'Does the insurer offer unit-linked or with-profit policies that build a cash/surrender value?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cash-value products can be used to store and later extract value - Insurers Guide vulnerable-product list'
      },
      {
        code: 'A1.4',
        text: 'Does the insurer offer savings, endowment, or investment/annuity products?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Savings/investment features increase placement and layering opportunity'
      },
      {
        code: 'A1.5',
        text: 'Do any products permit early surrender, partial withdrawal, or policy loans?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Surrender/withdrawal enables rapid extraction of placed funds - a key insurance red flag'
      },
      {
        code: 'A1.6',
        text: 'Do any products allow assignment, or designation of third-party beneficiaries or payers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Third-party assignment/benefit obscures the source and destination of funds'
      },
      {
        code: 'A1.7',
        text: 'Can policies be funded by lump-sum, top-up, or overpayment beyond scheduled premiums?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Overpayment-and-refund is a recognised insurance laundering technique'
      },
      {
        code: 'A1.8',
        text: 'Does the insurer write high-value or bespoke commercial/specialty cover?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'High-value bespoke cover raises transaction-value and valuation-manipulation risk'
      },
      {
        code: 'A1.9',
        text: 'Does the insurer write investment-linked products with flexible premium/withdrawal features?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Flexible investment wrappers heighten layering risk'
      },
      {
        code: 'A1.10',
        text: 'Does the insurer accept or arrange reinsurance/fronting that introduces external risk carriers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Reinsurance/fronting can mask ultimate counterparties and fund flows'
      },
      {
        code: 'A1.11',
        text: 'Does the insurer offer portable/cross-border policies (premiums or payouts across jurisdictions)?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Cross-border premium/payout flows compound geographic risk'
      },
      {
        code: 'A1.12',
        text: 'Does the insurer offer private-wealth, offshore-linked, or large-case life/investment solutions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Private-wealth and offshore-linked life business is the highest-risk product segment'
      }
    ]
  },
  'A2': {
    title: '1B. CUSTOMER & BENEFICIARY RISK',
    description: 'Inherent risk arising from policyholder, payer and beneficiary characteristics - FATF customer risk factors plus the insurance-specific beneficiary dimension.',
    questions: [
      {
        code: 'A2.1',
        text: 'Does the insurer write business for politically exposed persons (PEPs) or their associates?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'PEPs present heightened corruption risk - mandatory PEP determination under reg 8(4) (Nov 2023)'
      },
      {
        code: 'A2.2',
        text: 'Are policies ever paid for by a third party other than the policyholder?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Third-party premium payers require additional CDD - Insurers Guide non-policyholder measures'
      },
      {
        code: 'A2.3',
        text: 'Can beneficiaries be changed during the life of a policy, or be designated by class/characteristics?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Beneficiary CDD is required as soon as the beneficiary is identified/designated - reg 8(g) (Jan 2023)'
      },
      {
        code: 'A2.4',
        text: 'Does the insurer write business for legal persons or arrangements with complex/opaque ownership?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Opaque ownership obscures the beneficial owner - enhanced UBO rules reg 8B (Nov 2023)'
      },
      {
        code: 'A2.5',
        text: 'Does the insurer onboard occasional or one-off customers (non-recurring relationships)?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Occasional transactions trigger CDD above USD 15,000 - reg 8(2) (Nov 2023)'
      },
      {
        code: 'A2.6',
        text: 'Does the insurer write business for cash-intensive or high-risk customer sectors?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cash-intensive customers raise placement risk'
      },
      {
        code: 'A2.7',
        text: 'Does the insurer write business for high-net-worth individuals?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'HNW clients concentrate value and frequently use complex structures'
      },
      {
        code: 'A2.8',
        text: 'Are any customers onboarded without face-to-face contact?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Non-face-to-face onboarding is a recognised higher-risk channel'
      },
      {
        code: 'A2.9',
        text: 'Does the insurer rely on intermediaries to identify and onboard customers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Intermediary-introduced business shifts CDD reliance - Insurers Guide intermediary reliance; reg 13'
      },
      {
        code: 'A2.10',
        text: 'Does the insurer write business for multinational corporate groups or foreign-controlled entities?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Multinational/foreign-controlled clients heighten ownership and jurisdiction risk'
      },
      {
        code: 'A2.11',
        text: 'Does the insurer write business for customers linked to high-risk jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Links to FATF-listed/high-risk countries require enhanced measures - reg 10'
      },
      {
        code: 'A2.12',
        text: 'Does the insurer write business connected to offshore entities or secrecy jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Offshore/secrecy-jurisdiction links are the highest customer-risk indicator'
      },
      {
        code: 'A2.13',
        text: 'Does the insurer serve global private-wealth or large-case life clients?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Global private-wealth clients combine high value, complexity and cross-border exposure'
      }
    ]
  },
  'A3': {
    title: '1C. GEOGRAPHIC RISK',
    description: 'Inherent risk arising from the jurisdictions connected to the insurer\u2019s customers, premiums, payouts and intermediaries - FATF geographic risk factors.',
    questions: [
      {
        code: 'A3.1',
        text: 'Does the insurer have customers or counterparties in FATF-listed high-risk jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'FATF-listed jurisdictions require counter-measures - reg 10 (Jan 2023)'
      },
      {
        code: 'A3.2',
        text: 'Does the insurer receive premiums from, or pay claims/benefits to, foreign jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cross-border premium/benefit flows raise geographic exposure'
      },
      {
        code: 'A3.3',
        text: 'Does the insurer operate in or through regions with elevated corruption or weak AML controls?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Operations in weak-control regions raise inherent risk'
      },
      {
        code: 'A3.4',
        text: 'Does the insurer conduct cross-border transactions as part of normal business?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Routine cross-border activity compounds layering risk'
      },
      {
        code: 'A3.5',
        text: 'Does the insurer have exposure to offshore or secrecy jurisdictions?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Offshore/secrecy exposure is a strong tier-escalation indicator'
      },
      {
        code: 'A3.6',
        text: 'Does the insurer rely on foreign intermediaries, brokers, or reinsurers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Foreign intermediaries import jurisdiction and reliance risk'
      },
      {
        code: 'A3.7',
        text: 'Does the insurer structure multi-jurisdictional programmes or master policies?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Multi-jurisdictional structuring is the highest geographic-risk indicator'
      }
    ]
  },
  'A4': {
    title: '1D. DISTRIBUTION CHANNEL & TRANSACTION RISK',
    description: 'Inherent risk arising from how products are distributed and how premiums/benefits are transacted - the FIU report\u2019s transaction & delivery-channel category.',
    questions: [
      {
        code: 'A4.1',
        text: 'Does the insurer accept cash premium payments?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Cash premiums are the clearest placement channel'
      },
      {
        code: 'A4.2',
        text: 'Does the insurer distribute through brokers, agents, or bancassurance?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Intermediated distribution distances the insurer from the customer'
      },
      {
        code: 'A4.3',
        text: 'Does the insurer sell or service policies online or through non-face-to-face channels?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Non-face-to-face distribution favours anonymity'
      },
      {
        code: 'A4.4',
        text: 'Are refunds, surrenders, or claims ever paid to an account/party other than the original payer?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Payment to a different party is a core insurance laundering red flag'
      },
      {
        code: 'A4.5',
        text: 'Are large or unusual single-premium / lump-sum transactions accepted?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Large lump sums concentrate placement risk'
      },
      {
        code: 'A4.6',
        text: 'Does the insurer permit early cancellation with premium refund shortly after inception?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Buy-and-cancel-for-refund is a classic insurance layering method - Insurers Guide refund trigger'
      },
      {
        code: 'A4.7',
        text: 'Does the insurer accept premiums via third-party or international wire transfers?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'Third-party/international transfers obscure source of funds'
      },
      {
        code: 'A4.8',
        text: 'Does the insurer use multiple or complex payment intermediaries for collections/payouts?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 3,
        weight: 1,
        guidance: 'Complex payment chains heighten layering and traceability risk'
      }
    ]
  },
  'A5': {
    title: '1E. INSURANCE-SPECIFIC VULNERABILITY',
    description: 'Residual sector-specific vulnerabilities that do not fit the four standard categories - equivalent to the FIU report\u2019s optional "Others" risk factor.',
    questions: [
      {
        code: 'A5.1',
        text: 'Is there evidence of policies being purchased and surrendered for early cash value with little insurance purpose?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Insurance-as-investment-only behaviour signals laundering intent'
      },
      {
        code: 'A5.2',
        text: 'Are policies used as collateral or security for lending arrangements?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Policy-backed lending can integrate illicit value'
      },
      {
        code: 'A5.3',
        text: 'Is there frequent policy churn (rapid take-up and cancellation) among any customer segment?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 1,
        weight: 1,
        guidance: 'Churn patterns are a monitoring red flag'
      },
      {
        code: 'A5.4',
        text: 'Do any products or arrangements involve new technologies, virtual assets, or anonymous payment methods?',
        type: 'risk',
        options: ['Yes', 'Partially', 'No'],
        minTier: 2,
        weight: 1,
        guidance: 'New technologies and virtual assets are expressly flagged as high-risk in the DNFBP Guide'
      }
    ]
  }
};

// MODULE 2: COMPLIANCE RISK (TECHNICAL COMPLIANCE) - "Do legally required AML/CFT controls EXIST?"
// Common-core obligations (identical across DNFBPs) with insurance-specific CDD content.

const module2Questions = {
  'B1': {
    title: '2A. GOVERNANCE',
    description: 'Existence of AML/CFT governance arrangements required by the AML Act and Regulations 2022 (as amended).',
    questions: [
      {
        code: 'B1.1',
        text: 'Is an AML/CFT compliance officer appointed at management level?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Appointment Letter / Job Description',
        acceptableEvidence: 'Official appointment letter or board resolution appointing the AML/CFT compliance officer at management level',
        importanceNote: 'Compliance officer at management level is mandatory - reg 9(n)(i) (Nov 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B1.2',
        text: 'Are AML/CFT roles and responsibilities documented across the business?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'AML Roles & Responsibilities Document',
        acceptableEvidence: 'Documented allocation of AML/CFT responsibilities',
        importanceNote: 'Clear accountability is a baseline governance requirement',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B1.3',
        text: 'Has the board or senior management approved the AML/CFT policy?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Approved AML/CFT Policy',
        acceptableEvidence: 'Board/management-approved AML/CFT policy with approval date',
        importanceNote: 'Senior-management ownership of the programme is required',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B1.4',
        text: 'Is there an employee screening procedure applied on hiring?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Employee Screening Procedure',
        acceptableEvidence: 'Documented pre-recruitment screening procedure',
        importanceNote: 'Employee screening on hiring is required - reg 9(n)(ii) (Nov 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B1.5',
        text: 'Is there an ongoing AML/CFT training programme for staff and intermediaries?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Training Plan / Records',
        acceptableEvidence: 'Training plan and attendance/completion records',
        importanceNote: 'Ongoing training is required - reg 9(n)(iii) (Nov 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B1.6',
        text: 'Is there an independent audit function that tests the AML/CFT system?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Independent Audit Report / Terms of Reference',
        acceptableEvidence: 'Independent internal or external audit report covering AML/CFT',
        importanceNote: 'Independent audit function is required - reg 9(n)(iv) (Nov 2023)',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      }
    ]
  },
  'B2': {
    title: '2B. BUSINESS-WIDE RISK ASSESSMENT',
    description: 'Existence of a documented institutional ML/TF/PF risk assessment - Act s.15; Regs 2022 reg 3 (as amended).',
    questions: [
      {
        code: 'B2.1',
        text: 'Has the insurer conducted a documented institutional ML/TF/PF risk assessment?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Institutional Risk Assessment Report',
        acceptableEvidence: 'Documented institutional risk assessment in the FIU report format',
        importanceNote: 'Institutional RA is mandatory - reg 3',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B2.2',
        text: 'Does the risk assessment cover customer, product/service, geographic and channel risk?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'The RA must address all four FIU risk categories',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B2.3',
        text: 'Is the risk assessment kept up to date (reviewed at least every three years and on major changes)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Minimum update cadence is every three years - reg 3(2) (Nov 2023); update on new products/channels',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B2.4',
        text: 'Do the assessed risks demonstrably inform the controls applied?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Risk-based approach requires controls proportionate to assessed risk',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      }
    ]
  },
  'B3': {
    title: '2C. CUSTOMER DUE DILIGENCE',
    description: 'Existence of CDD/EDD controls - Act s.15A; Regs 2022 reg 8/8A/8B (as amended 2023), including insurance-specific beneficiary measures.',
    questions: [
      {
        code: 'B3.1',
        text: 'Are documented CDD procedures in place to identify and verify the policyholder?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'CDD Procedure',
        acceptableEvidence: 'Documented CDD procedure covering identification and verification',
        importanceNote: 'CDD is mandatory - Act s.15A; reg 8',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.2',
        text: 'Is CDD performed for occasional transactions above the USD 15,000 threshold (including linked operations)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Occasional-transaction CDD threshold is USD 15,000 - reg 8(2) (Nov 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.3',
        text: 'Are beneficial owners identified and verified (ultimate control, including for legal persons/arrangements)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Ultimate UBO identification required - reg 8B (Nov 2023); 20% threshold and control fallbacks',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.4',
        text: 'Is CDD performed on the beneficiary of life/investment policies once identified or designated?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Beneficiary CDD is required as soon as identified/designated - reg 8(g) (Jan 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.5',
        text: 'Are customers and beneficial owners screened to determine PEP status, with source of wealth/funds and senior-management approval for PEPs?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'PEP determination + source of wealth/funds + senior-management approval - reg 8(4), 8(m),(n)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.6',
        text: 'Is ongoing monitoring of business relationships performed (transaction scrutiny and record refresh)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Ongoing monitoring is required - reg 8A (Jan 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.7',
        text: 'Are simplified-CDD criteria (e.g. low-premium life policies) applied only within the permitted thresholds?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Simplified CDD limited to e.g. annual premium <= TZS 1.5m/USD 1,000 or single premium <= TZS 4m - Insurers Guide',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B3.8',
        text: 'Where reliance is placed on intermediaries for CDD, are documented reliance controls in place?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Third-party/intermediary reliance must be controlled; responsibility retained - reg 13; Insurers Guide',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      }
    ]
  },
  'B4': {
    title: '2D. SANCTIONS & TFS',
    description: 'Existence of targeted financial sanctions and screening controls - POTA Regulations and AML Regulations.',
    questions: [
      {
        code: 'B4.1',
        text: 'Are policyholders, payers and beneficiaries screened against UN and national sanctions/TFS lists?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'Sanctions Screening Procedure',
        acceptableEvidence: 'Documented screening procedure and evidence of list coverage',
        importanceNote: 'Sanctions/TFS screening is mandatory',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B4.2',
        text: 'Are there documented asset-freezing and reporting procedures for confirmed matches?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'TFS obligations require freeze-without-delay and reporting',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B4.3',
        text: 'Is screening repeated on list updates and at key policy events (payout, surrender, beneficiary change)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Ongoing re-screening is needed to remain effective',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      }
    ]
  },
  'B5': {
    title: '2E. SUSPICIOUS TRANSACTION REPORTING',
    description: 'Existence of suspicious transaction reporting controls - Act; Regs reg 16 (as amended Nov 2023).',
    questions: [
      {
        code: 'B5.1',
        text: 'Are documented procedures in place to identify and report suspicious transactions to the FIU?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: true,
        attachmentLabel: 'STR Procedure',
        acceptableEvidence: 'Documented STR procedure with internal escalation and FIU submission steps',
        importanceNote: 'STR reporting is mandatory - reg 16',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B5.2',
        text: 'Is there an internal escalation route to the compliance officer for suspicions?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Internal escalation underpins timely reporting',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B5.3',
        text: 'Are tipping-off controls in place (including filing an STR rather than pursuing CDD where CDD would tip off)?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 1,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Tipping-off prohibited; STR-instead-of-CDD permitted - reg 8(m) (Jan 2023)',
        tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
      },
      {
        code: 'B5.4',
        text: 'Are records of internal and external STRs maintained for the required retention period?',
        type: 'control',
        options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
        minTier: 2,
        weight: 1,
        requiresAttachment: false,
        importanceNote: 'Minimum 10-year record retention - Guide para 11.2',
        tierRequirement: { tier1: 'recommended', tier2: 'mandatory', tier3: 'mandatory' }
      }
    ]
  }
};

// MODULE 3: EFFECTIVENESS RISK - "Do AML/CFT controls WORK in practice?"

const module3Questions = {
  'C1': {
    title: 'C1. RISK-BASED DECISION-MAKING',
    description: 'Whether risk assessment outputs actually drive underwriting and onboarding decisions',
    questions: [
      { code: 'C1.1', text: 'Are risk assessments used to guide acceptance of policyholders and business?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.2', text: 'Are higher-risk cases (PEPs, large single premiums, offshore links) escalated in practice?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.3', text: 'Is the documented risk appetite applied consistently at the point of sale?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C1.4', text: 'Are declined or exited relationships recorded with reasons?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C2': {
    title: 'C2. SUSPICIOUS ACTIVITY',
    description: 'Whether suspicious activity is identified and reported in practice',
    questions: [
      { code: 'C2.1', text: 'Are insurance red flags (early surrender, overpayment/refund, third-party payers) detected in practice?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.2', text: 'Have suspicious transactions actually been escalated internally where warranted?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.3', text: 'Are STRs filed with the FIU where the threshold for suspicion is met?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C2.4', text: 'Does ongoing monitoring detect anomalies in premiums, surrenders and payouts?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C3': {
    title: 'C3. SANCTIONS EFFECTIVENESS',
    description: 'Whether sanctions/TFS screening works in practice',
    questions: [
      { code: 'C3.1', text: 'Does screening reliably catch true matches across policyholders, payers and beneficiaries?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C3.2', text: 'Are confirmed matches frozen and reported without delay?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C3.3', text: 'Are list updates applied promptly and re-screening performed?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  },
  'C4': {
    title: 'C4. GOVERNANCE & REMEDIATION',
    description: 'Whether oversight and continuous improvement function in practice',
    questions: [
      { code: 'C4.1', text: 'Does senior management review AML/CFT effectiveness and act on findings?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 1, weight: 1 },
      { code: 'C4.2', text: 'Are audit and review findings remediated within agreed timeframes?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 },
      { code: 'C4.3', text: 'Is training shown to improve staff and intermediary detection of red flags?', type: 'effectiveness', options: ['Effective', 'Weak', 'Ineffective'], minTier: 2, weight: 1 }
    ]
  }
};

// MODULE ASSEMBLY

export const insurersModules = {
  module1: { code: 'module1', title: 'CATEGORY (A): INHERENT RISK ASSESSMENT', description: 'What ML/TF/PF risk exists BEFORE controls?', sections: module1Questions },
  module2: { code: 'module2', title: 'CATEGORY (B): COMPLIANCE RISK (TECHNICAL COMPLIANCE)', description: 'Do legally required AML/CFT controls EXIST?', sections: module2Questions },
  module3: { code: 'module3', title: 'CATEGORY (C): EFFECTIVENESS RISK', description: 'Do AML/CFT controls WORK in practice?', sections: module3Questions }
};

export const insurersCategories = [
  { value: 'general_insurer', label: 'General (Non-Life) Insurer', tier: 1 },
  { value: 'life_insurer', label: 'Life Insurer', tier: 2 },
  { value: 'composite_insurer', label: 'Composite Insurer (Life & General)', tier: 2 },
  { value: 'insurance_broker', label: 'Insurance Broker / Intermediary', tier: 2 },
  { value: 'bancassurance', label: 'Bancassurance Provider', tier: 3 },
  { value: 'reinsurer', label: 'Reinsurer', tier: 3 }
];

export const insurersTierProfiles = {
  1: {
    name: 'Tier 1 – Small / General-Lines Insurer',
    description: 'Domestic, predominantly general (non-life) business, simple products, limited cross-border or investment-linked exposure',
    questionCount: 35,
    autoEscalationTriggers: ['Life/investment business', 'Single-premium products', 'PEP exposure', 'Intermediary distribution', 'Foreign clients']
  },
  2: {
    name: 'Tier 2 – Medium / Composite Insurer or Intermediary',
    description: 'Life and general business, broker/agent distribution, some foreign or higher-net-worth clients, savings/endowment products',
    questionCount: 50,
    autoEscalationTriggers: ['Offshore exposure', 'Global private wealth', 'Multi-jurisdictional programmes', 'Complex payment chains']
  },
  3: {
    name: 'Tier 3 – Large / Life & Investment / Cross-Border Insurer',
    description: 'Significant life and investment-linked business, single-premium/unit-linked products, cross-border premiums/payouts, private-wealth and offshore exposure',
    questionCount: 62,
    autoEscalationTriggers: []
  }
};

export function getInsurersQuestionsForTier(tier) {
  const questions = [];
  Object.values(insurersModules).forEach(module => {
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

// AUTOMATED TIER DETERMINATION (insurance triggers)

export function determineAutomaticTier(responses) {
  const tier3Triggers = [
    responses['A1.12'] === 'Yes', // Private-wealth/offshore-linked life
    responses['A2.12'] === 'Yes', // Offshore entities / secrecy jurisdictions
    responses['A2.13'] === 'Yes', // Global private-wealth clients
    responses['A3.7'] === 'Yes',  // Multi-jurisdictional programmes
    responses['A4.8'] === 'Yes'   // Complex payment intermediaries
  ];
  if (tier3Triggers.some(t => t)) {
    return { tier: 3, reason: 'Private-wealth, offshore, or multi-jurisdictional insurance exposure detected', automatic: true };
  }

  const tier2Triggers = [
    responses['A1.1'] === 'Yes',  // Life/investment business
    responses['A1.9'] === 'Yes',  // Flexible investment-linked products
    responses['A2.9'] === 'Yes',  // Intermediary-introduced business
    responses['A2.10'] === 'Yes', // Multinational/foreign-controlled clients
    responses['A2.11'] === 'Yes', // High-risk jurisdiction clients
    responses['A3.5'] === 'Yes',  // Offshore exposure
    responses['A3.6'] === 'Yes'   // Foreign intermediaries/reinsurers
  ];
  if (tier2Triggers.some(t => t)) {
    return { tier: 2, reason: 'Life/investment business, intermediary distribution, or foreign exposure detected', automatic: true };
  }

  const tier1HighRiskFactors = [
    responses['A1.2'] === 'Yes',  // Single-premium
    responses['A1.5'] === 'Yes',  // Surrender/withdrawal
    responses['A2.1'] === 'Yes',  // PEPs
    responses['A2.2'] === 'Yes',  // Third-party payers
    responses['A4.1'] === 'Yes',  // Cash premiums
    responses['A4.6'] === 'Yes'   // Early cancellation refund
  ];
  const highRiskCount = tier1HighRiskFactors.filter(t => t).length;
  if (highRiskCount >= 3) {
    return { tier: 2, reason: 'Multiple high-risk insurance exposure factors detected', automatic: true };
  }

  return { tier: 1, reason: 'Domestic, predominantly general-lines business with limited complex exposure', automatic: false };
}

// AUTOMATED NARRATIVE GENERATION (insurance-flavoured; mirrors the law-firm signatures)

export function generateInherentRiskNarrative(inherentResult, responses, tier) {
  const level = inherentResult?.level || inherentResult?.rating || 'Medium';
  return `Based on the institutional risk assessment, the insurer's inherent ML/TF/PF exposure before controls is assessed as ${level}. This reflects the product lines written (life, investment-linked and cash-value products carry higher inherent risk than general lines), the policyholder and beneficiary profile, the geographic footprint of premiums and payouts, and the distribution channels used. The assessment was conducted at Tier ${tier} scope.`;
}

export function generateComplianceNarrative(complianceResult, tier) {
  const level = complianceResult?.level || complianceResult?.rating || 'Medium';
  return `Technical compliance (whether legally required AML/CFT controls exist) is assessed as ${level}. This covers governance and the management-level compliance officer, the business-wide risk assessment, customer and beneficiary due diligence, sanctions/TFS screening, and suspicious transaction reporting, evaluated against the AML Act and Regulations 2022 as amended in 2023, at Tier ${tier} requirements.`;
}

export function generateEffectivenessNarrative(effectivenessResult) {
  const level = effectivenessResult?.level || effectivenessResult?.rating || 'Medium';
  return `Effectiveness (whether the controls work in practice) is assessed as ${level}. This considers whether risk-based decisions, suspicious activity detection and reporting, sanctions screening, and governance and remediation operate effectively in day-to-day insurance operations rather than existing only on paper.`;
}

export function generateMaturityNarrative(maturityResult, tier) {
  const level = maturityResult?.level || maturityResult?.rating || 'Developing';
  return `The institutional AML/CFT maturity of the insurer is assessed as ${level}. Maturity reflects the embedding, consistency and continuous improvement of the compliance programme over time, assessed at Tier ${tier} expectations.`;
}

export function generateResidualRiskNarrative(residualResult) {
  const level = residualResult?.level || residualResult?.rating || 'Medium';
  return `After applying the existing controls and accounting for their effectiveness, the insurer's residual ML/TF/PF risk is assessed as ${level}. Residual risk represents the exposure that remains once inherent risk is mitigated by the compliance programme, and should drive the prioritised action plan.`;
}

export function generateExecutiveSummary(inherentResult, complianceResult, effectivenessResult, maturityResult, residualResult, tier, organizationName) {
  const name = organizationName || 'The insurer';
  const inh = inherentResult?.level || inherentResult?.rating || 'Medium';
  const res = residualResult?.level || residualResult?.rating || 'Medium';
  return `${name} was assessed under the Tanzania AML/CFT institutional risk assessment framework for insurers (Tier ${tier}). Inherent ML/TF/PF risk is ${inh}; after controls and effectiveness, residual risk is ${res}. The assessment addresses the four FIU risk categories (customer, product/service, geographic, transaction & delivery channel) plus insurance-specific vulnerabilities, and is aligned with the TIRA Guidelines to Insurers and the AML Act and Regulations 2022 (as amended 2023). Prioritised remediation should focus on the areas rated weakest in the compliance and effectiveness modules.`;
}

// PRIMARY EXPORT (mirrors lawFirmsAssessmentData shape)
export const insurersAssessmentData = {
  framework: insurersFramework,
  modules: insurersModules,
  categories: insurersCategories,
  tierProfiles: insurersTierProfiles,
  getQuestionsForTier: getInsurersQuestionsForTier,
  generateInherentRiskNarrative,
  generateComplianceNarrative,
  generateEffectivenessNarrative,
  generateMaturityNarrative,
  generateResidualRiskNarrative,
  generateExecutiveSummary,
  determineAutomaticTier
};
