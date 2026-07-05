// INSURANCE KYC / CDD CONFIGURATION FOR TANZANIA
// Structural twin of the law-firm kycData.js; shared scoring/DD logic is identical,
// the sector-specific service factors and red flags are insurance-specific, and an
// insurance-specific beneficiary dimension is added (TIRA Guidelines to Insurers; AML Regs 2022 as amended).

export const clientTypes = [
  { value: 'individual', label: 'Individual Policyholder' },
  { value: 'corporate', label: 'Corporate Entity' },
  { value: 'trust', label: 'Trust' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' }
];

export const riskLevels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  SUBSTANTIAL: 'Substantial',
  HIGH: 'High',
  VERY_HIGH: 'Very High'
};

export const dueDiligenceLevels = {
  SIMPLIFIED: 'simplified',
  STANDARD: 'standard',
  ENHANCED: 'enhanced'
};

// Tanzania-specific DD level descriptions (insurance-flavoured)
export const dueDiligenceLevelInfo = {
  simplified: {
    name: 'Simplified Due Diligence',
    description: 'Applied to low-risk policyholders after national, institutional, and client risk assessment',
    riskLevel: 'Low',
    color: '#10b981',
    features: [
      'Basic identification and verification',
      'Limited information on purpose (may be inferred)',
      'Reduced monitoring frequency',
      'Lower scrutiny of premiums and payouts',
      'Verification may be completed later',
      'Must document justification for simplified approach'
    ],
    requirements: [
      'National Risk Assessment completed',
      'Institutional risk assessment completed',
      'Client risk assessment shows low risk',
      'No suspicion of ML/TF',
      'Within permitted premium thresholds',
      'Documented justification required'
    ],
    triggers: [
      'Low-premium life policies (annual premium <= TZS 1.5m / USD 1,000, or single premium <= TZS 4m)',
      'Pension schemes with no surrender clause',
      'Counterparties supervised by BoT/CMSA/TIRA',
      'General (non-life) protection cover with transparent policyholder'
    ],
    monitoring: 'Annual review',
    prohibited: [
      'Cannot use if suspicion arises',
      'Cannot use if risk changes to medium/high',
      'Must escalate immediately if red flags appear'
    ]
  },
  standard: {
    name: 'Standard Due Diligence',
    description: 'Default level applied to most policyholders with a medium risk profile',
    riskLevel: 'Medium',
    color: '#f59e0b',
    features: [
      'Full policyholder identification and verification',
      'Understanding purpose and nature of the policy',
      'Source of Funds (SOF) verification for premiums',
      'Beneficiary identification (life/investment policies)',
      'Beneficial ownership identification (for legal entities)',
      'Third-party payer identification (where applicable)',
      'Ongoing monitoring and updates'
    ],
    requirements: [
      'Full identity verification using reliable documents',
      'Source of Funds verification for premium payments',
      'Purpose and expected premium/claim activity understood',
      'Beneficiary identified once designated',
      'Beneficial owners identified and verified (20%+ controlling interest)',
      'Regular monitoring and information updates'
    ],
    triggers: [
      'Life and investment-linked policies',
      'Corporate or group policyholders',
      'Endowment/savings products',
      'Intermediary-introduced business',
      'Standard insurance engagements above the simplified thresholds'
    ],
    monitoring: 'Quarterly review',
    prohibited: []
  },
  enhanced: {
    name: 'Enhanced Due Diligence',
    description: 'Deeper investigation and monitoring for high-risk policyholders',
    riskLevel: 'High/Very High',
    color: '#ef4444',
    features: [
      'All Standard DD requirements PLUS:',
      'Additional information on policyholder (profession, wealth, assets, public records)',
      'Source of wealth and source of funds (MANDATORY)',
      'Beneficiary and beneficial-owner enhanced verification',
      'Senior management approval (MANDATORY before onboarding)',
      'Enhanced monitoring (more frequent reviews)',
      'Ongoing updates of KYC information'
    ],
    requirements: [
      'All Standard DD requirements',
      'Source of wealth documentation (mandatory)',
      'Source of funds documentation (mandatory)',
      'Senior management approval before onboarding (PEPs - reg 8(4),(m),(n))',
      'Enhanced monitoring frequency',
      'Enhanced beneficiary and beneficial-ownership verification',
      'Detailed economic rationale for the policy and premium'
    ],
    triggers: [
      'High-risk jurisdictions (FIU/FATF identified)',
      'Single-premium or unit-linked/investment-linked policies of significant value',
      'Non-face-to-face onboarding',
      'Third-party premium payers or assignees',
      'Politically Exposed Persons (PEPs)',
      'Suspicious behaviour (early surrender, overpayment/refund)',
      'Large premium values',
      'Offshore involvement'
    ],
    monitoring: 'Monthly review for Very High risk, Quarterly for High risk',
    prohibited: [
      'Cannot onboard without senior approval (PEPs)',
      'Cannot proceed without source of wealth/funds',
      'Must file an STR where suspicion is not dispelled'
    ]
  }
};

// SHARED CUSTOMER RISK FACTORS (sector-agnostic)
export const clientRiskFactors = {
  occupation: {
    label: 'Occupation/Business Type',
    options: [
      { value: 'low', label: 'Low Risk (Salaried employee, public servant)', score: 1 },
      { value: 'medium', label: 'Medium Risk (Self-employed, trader)', score: 3 },
      { value: 'high', label: 'High Risk (Cash-intensive business, PEP)', score: 5 }
    ]
  },
  netWorth: {
    label: 'Net Worth/Annual Turnover',
    options: [
      { value: 'low', label: 'Low (< 50M TZS)', score: 1 },
      { value: 'medium', label: 'Medium (50M - 500M TZS)', score: 3 },
      { value: 'high', label: 'High (> 500M TZS)', score: 5 }
    ]
  },
  pepStatus: {
    label: 'PEP Status',
    options: [
      { value: 'no', label: 'Not a PEP', score: 1 },
      { value: 'family', label: 'Family member or close associate of PEP', score: 4 },
      { value: 'yes', label: 'PEP (current or former)', score: 5 }
    ]
  }
};

// SECTOR-SPECIFIC SERVICE RISK FACTORS (insurance)
export const serviceRiskFactors = {
  productType: {
    label: 'Insurance Product Type',
    options: [
      { value: 'general_non_life', label: 'General / non-life cover (motor, property, liability)', score: 1 },
      { value: 'health_medical', label: 'Health / medical insurance', score: 1 },
      { value: 'term_life', label: 'Term life (pure protection, no cash value)', score: 2 },
      { value: 'group_pension', label: 'Group / pension scheme (no surrender clause)', score: 2 },
      { value: 'endowment_savings', label: 'Endowment / savings policy (builds cash value)', score: 3 },
      { value: 'whole_life_cashvalue', label: 'Whole-of-life with cash/surrender value', score: 4 },
      { value: 'single_premium', label: 'Single-premium policy', score: 4 },
      { value: 'unit_linked_investment', label: 'Unit-linked / investment-linked policy', score: 5 },
      { value: 'private_wealth_life', label: 'Private-wealth / large-case life solution', score: 5 }
    ]
  },
  premiumValue: {
    label: 'Premium Value',
    options: [
      { value: 'low', label: 'Low (single premium < 4M TZS / annual < 1.5M TZS)', score: 1 },
      { value: 'medium', label: 'Medium (4M - 50M TZS)', score: 3 },
      { value: 'high', label: 'High (> 50M TZS)', score: 5 }
    ]
  },
  productComplexity: {
    label: 'Product / Arrangement Complexity',
    options: [
      { value: 'simple', label: 'Simple/straightforward', score: 1 },
      { value: 'moderate', label: 'Moderately complex', score: 3 },
      { value: 'complex', label: 'Highly complex/structured (assignment, third-party benefit)', score: 5 }
    ]
  }
};

// SHARED GEOGRAPHIC RISK FACTORS
export const geographicRiskFactors = {
  jurisdiction: {
    label: 'Customer/Payment Jurisdiction',
    options: [
      { value: 'low', label: 'Tanzania/Low-risk countries', score: 1 },
      { value: 'medium', label: 'Medium-risk jurisdictions', score: 3 },
      { value: 'high', label: 'High-risk/sanctioned jurisdictions', score: 5 }
    ]
  },
  offshore: {
    label: 'Offshore Involvement',
    options: [
      { value: 'none', label: 'No offshore involvement', score: 1 },
      { value: 'some', label: 'Some offshore elements', score: 3 },
      { value: 'significant', label: 'Significant offshore structures', score: 5 }
    ]
  }
};

// SHARED BEHAVIOUR RISK FACTORS
export const behaviourRiskFactors = {
  cooperation: {
    label: 'Customer Cooperation',
    options: [
      { value: 'cooperative', label: 'Cooperative and transparent', score: 1 },
      { value: 'hesitant', label: 'Somewhat hesitant', score: 3 },
      { value: 'reluctant', label: 'Reluctant or evasive', score: 5 }
    ]
  },
  urgency: {
    label: 'Transaction Urgency',
    options: [
      { value: 'normal', label: 'Normal business pace', score: 1 },
      { value: 'rushed', label: 'Somewhat rushed', score: 3 },
      { value: 'extreme', label: 'Extreme urgency without justification', score: 5 }
    ]
  }
};

// SHARED DELIVERY CHANNEL RISK FACTORS
export const deliveryChannelRiskFactors = {
  contactMethod: {
    label: 'Onboarding Channel',
    options: [
      { value: 'face_to_face', label: 'Face-to-face', score: 1 },
      { value: 'video', label: 'Video conference', score: 2 },
      { value: 'remote', label: 'Fully remote/no meeting', score: 4 }
    ]
  },
  intermediaries: {
    label: 'Use of Intermediaries (brokers/agents)',
    options: [
      { value: 'none', label: 'Direct customer relationship', score: 1 },
      { value: 'some', label: 'Broker/agent introduced', score: 3 },
      { value: 'multiple', label: 'Multiple/unexplained intermediaries', score: 5 }
    ]
  }
};

// INSURANCE-SPECIFIC BENEFICIARY DIMENSION (the key insurance KYC addition)
export const beneficiaryRiskFactors = {
  beneficiaryType: {
    label: 'Beneficiary Designation',
    options: [
      { value: 'named_natural', label: 'Specifically named natural person', score: 1 },
      { value: 'named_legal', label: 'Named legal person / arrangement', score: 3 },
      { value: 'class', label: 'Designated by class or characteristics', score: 4 },
      { value: 'changed', label: 'Changed shortly before payout', score: 5 }
    ]
  },
  beneficiaryRelationship: {
    label: 'Beneficiary Relationship to Policyholder',
    options: [
      { value: 'immediate_family', label: 'Immediate family', score: 1 },
      { value: 'related', label: 'Other related party', score: 2 },
      { value: 'unrelated', label: 'Unrelated third party', score: 4 },
      { value: 'pep', label: 'Beneficiary is a PEP/associate', score: 5 }
    ]
  },
  payer: {
    label: 'Premium Payer',
    options: [
      { value: 'policyholder', label: 'Policyholder pays own premiums', score: 1 },
      { value: 'related_third_party', label: 'Related third party pays', score: 3 },
      { value: 'unrelated_third_party', label: 'Unrelated third party pays', score: 5 }
    ]
  }
};

export const redFlags = {
  clientBehaviour: [
    'Reluctant to provide identity documents',
    'Provides inconsistent or false information',
    'Shows unusual urgency without justification',
    'Requests excessive secrecy',
    'Refuses to explain purpose of the policy',
    'Requests use of unnecessary intermediaries',
    'Changes instructions or beneficiaries frequently without explanation'
  ],
  sourceOfFunds: [
    'Premiums inconsistent with the policyholder profile',
    'Complex or opaque funding of premiums',
    'Large cash premium payments',
    'Premiums from high-risk jurisdictions',
    'Use of shell companies without business purpose',
    'Third-party premium payments without clear link'
  ],
  serviceSpecific: [
    'Early surrender or cancellation shortly after a single-premium payment',
    'Premium overpayment followed by a refund request (especially to a third party)',
    'Premiums paid by a third party with no clear relationship to the policyholder',
    'Frequent policy take-up and cancellation (churn)',
    'Beneficiary changed shortly before a claim or payout',
    'Large single-premium lump sum inconsistent with the customer profile',
    'Surrender/claim proceeds requested to an account other than the premium payer',
    'Policy assigned as collateral with no clear economic rationale'
  ],
  geographic: [
    'Involvement of sanctioned jurisdictions',
    'Countries with weak AML frameworks',
    'Unexplained offshore involvement in premiums or payouts'
  ],
  pep: [
    'Unexplained wealth relative to known income',
    'Complex structures without business rationale',
    'Pressure to bypass due diligence controls'
  ]
};

export const eddQuestionnaire = {
  customerBackground: {
    title: 'Policyholder Background',
    questions: [
      { id: 'full_identity', label: 'Full identity and documentation', required: true },
      { id: 'nationality', label: 'Nationality and citizenship history', required: true },
      { id: 'residence', label: 'Current and previous residences', required: true },
      { id: 'occupation', label: 'Occupation and employment history', required: true },
      { id: 'business_profile', label: 'Business profile and activities', required: true }
    ]
  },
  sourceOfWealth: {
    title: 'Source of Wealth',
    questions: [
      { id: 'wealth_origin', label: 'Origin of wealth (salary, inheritance, business, etc.)', required: true },
      { id: 'wealth_evidence', label: 'Documentary evidence of wealth', required: true },
      { id: 'asset_profile', label: 'Asset profile and holdings', required: true }
    ]
  },
  sourceOfFunds: {
    title: 'Source of Premium Funds',
    questions: [
      { id: 'funds_origin', label: 'Origin of funds for the premium(s)', required: true },
      { id: 'bank_details', label: 'Bank/account details for premium payment', required: true },
      { id: 'transaction_path', label: 'Flow of funds for premiums', required: true }
    ]
  },
  beneficialOwnership: {
    title: 'Beneficial Ownership',
    questions: [
      { id: 'ownership_structure', label: 'Complete ownership structure (for legal-person policyholders)', required: true },
      { id: 'control_mechanisms', label: 'Control mechanisms and voting rights', required: true },
      { id: 'nominees_trustees', label: 'Trustees, nominees, or agents', required: true }
    ]
  },
  beneficiaryDueDiligence: {
    title: 'Beneficiary Due Diligence',
    questions: [
      { id: 'beneficiary_identity', label: 'Identity of the beneficiary (name or class/characteristics)', required: true },
      { id: 'beneficiary_relationship', label: 'Relationship of the beneficiary to the policyholder', required: true },
      { id: 'beneficiary_pep', label: 'Whether the beneficiary is a PEP or associate', required: true },
      { id: 'beneficiary_verification_timing', label: 'Verification at designation and at payout', required: true }
    ]
  },
  purposeAndNature: {
    title: 'Purpose and Intended Nature',
    questions: [
      { id: 'policy_nature', label: 'Nature of the insurance product/cover required', required: true },
      { id: 'premium_volume', label: 'Expected premium volume and frequency', required: true },
      { id: 'economic_rationale', label: 'Economic rationale for the policy', required: true }
    ]
  },
  politicalExposure: {
    title: 'Political Exposure',
    questions: [
      { id: 'pep_status', label: 'PEP status (current or former)', required: true },
      { id: 'family_associates', label: 'Family members or close associates who are PEPs', required: true },
      { id: 'public_office', label: 'Public office held (current or former)', required: true }
    ]
  },
  geographicExposure: {
    title: 'Geographic Exposure',
    questions: [
      { id: 'countries_involved', label: 'All countries involved in the relationship', required: true },
      { id: 'offshore_structures', label: 'Offshore structures and their purpose', required: true }
    ]
  },
  transactionAnalysis: {
    title: 'Premium & Payout Analysis',
    questions: [
      { id: 'premium_value', label: 'Value and frequency of premiums', required: true },
      { id: 'payout_arrangements', label: 'Surrender, refund and payout arrangements', required: true }
    ]
  }
};

// SHARED SCORING (identical to the law-firm model)
export function calculateRiskScore(riskFactors) {
  const weights = {
    client: 0.30,
    service: 0.25,
    geography: 0.20,
    behaviour: 0.15,
    delivery: 0.10
  };

  const clientScore = calculateCategoryScore(riskFactors.client || {});
  const serviceScore = calculateCategoryScore(riskFactors.service || {});
  const geographyScore = calculateCategoryScore(riskFactors.geography || {});
  const behaviourScore = calculateCategoryScore(riskFactors.behaviour || {});
  const deliveryScore = calculateCategoryScore(riskFactors.delivery || {});

  const baseScore =
    (clientScore * weights.client) +
    (serviceScore * weights.service) +
    (geographyScore * weights.geography) +
    (behaviourScore * weights.behaviour) +
    (deliveryScore * weights.delivery);

  return Math.round(baseScore * 20);
}

function calculateCategoryScore(categoryFactors) {
  if (Object.keys(categoryFactors).length === 0) return 0;
  const scores = Object.values(categoryFactors).filter(s => typeof s === 'number');
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function getDueDiligenceLevel(riskScore, institutionalMultiplier = 1.0) {
  const adjustedScore = riskScore * institutionalMultiplier;
  if (adjustedScore <= 30) return dueDiligenceLevels.SIMPLIFIED;
  if (adjustedScore <= 60) return dueDiligenceLevels.STANDARD;
  return dueDiligenceLevels.ENHANCED;
}
