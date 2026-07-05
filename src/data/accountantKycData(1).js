// ACCOUNTANTS & AUDITORS KYC / CDD CONFIGURATION FOR TANZANIA
// Structural twin of the law-firm/insurance kycData; shared scoring/DD logic is identical.
// Sector-specific content (service risk factors, red flags, EDD emphasis) is grounded in the
// FATF (2019) Risk-Based Approach for the Accounting Profession and the Tanzanian AML framework
// (AML Act Cap.423, AML Regulations 2022 GN 397, Guide to DNFBPs 2023, NBAA scope).

export const clientTypes = [
  { value: 'individual', label: 'Individual Client' },
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

export const dueDiligenceLevelInfo = {
  simplified: {
    name: 'Simplified Due Diligence',
    description: 'Applied to low-risk clients after national, institutional, and client risk assessment',
    riskLevel: 'Low',
    color: '#10b981',
    features: [
      'Basic identification and verification',
      'Limited information on purpose (may be inferred)',
      'Reduced monitoring frequency',
      'Verification may be completed later',
      'Must document justification for simplified approach'
    ],
    requirements: [
      'National Risk Assessment completed',
      'Institutional risk assessment completed',
      'Client risk assessment shows low risk',
      'No suspicion of ML/TF',
      'Engagement is not a specified R.22 activity, or is clearly low-risk',
      'Documented justification required'
    ],
    triggers: [
      'Routine statutory audit of a transparent, regulated client',
      'Payroll or general bookkeeping with no fund handling',
      'Clients supervised for a full range of AML/CFT requirements',
      'No company/trust formation, fund handling, or cross-border element'
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
    description: 'Default level applied to most clients with a medium risk profile',
    riskLevel: 'Medium',
    color: '#f59e0b',
    features: [
      'Full client identification and verification',
      'Understanding purpose and nature of the engagement',
      'Source of Funds (SOF) understanding for relevant engagements',
      'Beneficial ownership identification (for legal entities and arrangements)',
      'Ongoing monitoring and updates'
    ],
    requirements: [
      'Full identity verification using reliable documents',
      'Understanding of the engagement and expected activity',
      'Beneficial owners identified and verified (20%+ controlling interest)',
      'Nominee/control arrangements understood',
      'Regular monitoring and information updates'
    ],
    triggers: [
      'Company or trust formation and management engagements',
      'Handling or administering client funds or assets',
      'Corporate structuring or restructuring advice',
      'Real estate or business-sale transactions on the client\'s behalf',
      'Standard engagements above the simplified threshold'
    ],
    monitoring: 'Quarterly review',
    prohibited: []
  },
  enhanced: {
    name: 'Enhanced Due Diligence',
    description: 'Deeper investigation and monitoring for high-risk clients',
    riskLevel: 'High/Very High',
    color: '#ef4444',
    features: [
      'All Standard DD requirements PLUS:',
      'Additional information on client (profession, wealth, assets, public records)',
      'Source of wealth AND source of funds (MANDATORY - distinct concepts)',
      'Beneficial-owner and nominee-arrangement enhanced verification',
      'Senior management approval (MANDATORY before onboarding)',
      'Enhanced ongoing monitoring'
    ],
    requirements: [
      'All Standard DD requirements',
      'Source of wealth documentation (mandatory) - how total net worth was accumulated',
      'Source of funds documentation (mandatory) - origin of funds for this engagement',
      'Senior partner / managing partner / CEO approval before onboarding (PEPs)',
      'Enhanced beneficial-ownership and nominee verification',
      'Detailed economic/business rationale for the structure or transaction'
    ],
    triggers: [
      'High-risk jurisdictions (FIU/FATF identified)',
      'Company/trust formation with opaque or cross-border structures',
      'Politically Exposed Persons (PEPs) as client or beneficial owner',
      'Non-face-to-face onboarding',
      'Nominee shareholders/directors or bearer-share arrangements',
      'Cash-intensive business clients',
      'Unexplained third-party funding of the entity',
      'Structures inconsistent with the client\'s known business'
    ],
    monitoring: 'Monthly review for Very High risk, Quarterly for High risk',
    prohibited: [
      'Cannot onboard without senior approval (PEPs)',
      'Cannot proceed without source of wealth AND source of funds',
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

// SECTOR-SPECIFIC SERVICE RISK FACTORS (accountants & auditors)
// Risk weighting grounded in FATF RBA: company/trust formation & management and fund handling
// are the highest-vulnerability activities; audit/bookkeeping/payroll are lower.
export const serviceRiskFactors = {
  serviceType: {
    label: 'Accounting Service / Engagement Type',
    options: [
      { value: 'company_trust_formation', label: 'Company or trust formation and management', score: 5 },
      { value: 'offshore_structuring', label: 'Offshore / international tax structuring', score: 5 },
      { value: 'client_fund_handling', label: 'Handling or administering client funds/assets', score: 5 },
      { value: 'nominee_registered_office', label: 'Acting as nominee director/shareholder or registered office', score: 5 },
      { value: 'real_estate_services', label: 'Real estate transaction services for a client', score: 4 },
      { value: 'business_sale_purchase', label: 'Buying/selling of business entities', score: 4 },
      { value: 'cash_intensive_audit', label: 'Audit/accounting for cash-intensive business', score: 4 },
      { value: 'tax_advisory', label: 'Tax planning and advisory', score: 3 },
      { value: 'insolvency_liquidation', label: 'Insolvency / liquidation services', score: 3 },
      { value: 'fi_introductions', label: 'Introductions to financial institutions', score: 3 },
      { value: 'bookkeeping', label: 'General bookkeeping / accounting', score: 2 },
      { value: 'statutory_audit', label: 'Statutory audit (transparent client)', score: 2 },
      { value: 'payroll', label: 'Payroll services', score: 1 },
      { value: 'forensic_accounting', label: 'Forensic accounting / investigation', score: 1 }
    ]
  },
  engagementValue: {
    label: 'Engagement / Transaction Value',
    options: [
      { value: 'low', label: 'Low (< 50M TZS)', score: 1 },
      { value: 'medium', label: 'Medium (50M - 500M TZS)', score: 3 },
      { value: 'high', label: 'High (> 500M TZS)', score: 5 }
    ]
  },
  complexity: {
    label: 'Structure / Engagement Complexity',
    options: [
      { value: 'simple', label: 'Simple/straightforward', score: 1 },
      { value: 'moderate', label: 'Moderately complex', score: 3 },
      { value: 'complex', label: 'Highly complex (multi-entity, cross-border, nominee)', score: 5 }
    ]
  }
};

// SHARED GEOGRAPHIC RISK FACTORS
export const geographicRiskFactors = {
  jurisdiction: {
    label: 'Client/Transaction Jurisdiction',
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
    label: 'Client Cooperation',
    options: [
      { value: 'cooperative', label: 'Cooperative and transparent', score: 1 },
      { value: 'hesitant', label: 'Somewhat hesitant', score: 3 },
      { value: 'reluctant', label: 'Reluctant or evasive', score: 5 }
    ]
  },
  urgency: {
    label: 'Engagement Urgency',
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
    label: 'Use of Intermediaries',
    options: [
      { value: 'none', label: 'Direct client relationship', score: 1 },
      { value: 'some', label: 'Introduced via intermediary', score: 3 },
      { value: 'multiple', label: 'Multiple/unexplained intermediaries', score: 5 }
    ]
  }
};

export const redFlags = {
  clientBehaviour: [
    'Reluctant to provide identity or beneficial-ownership documents',
    'Provides inconsistent or false information',
    'Shows unusual urgency without justification',
    'Requests excessive secrecy',
    'Refuses to explain the purpose of a structure or engagement',
    'Client accustomed to acting on the instructions of an undisclosed third party'
  ],
  sourceOfFunds: [
    'Source of funds inconsistent with the client profile',
    'Source of wealth inconsistent with the value/nature of assets held',
    'Funds into or out of the entity from/to unidentified third parties',
    'Complex or opaque funding with no clear economic rationale',
    'Use of shell companies without business purpose'
  ],
  serviceSpecific: [
    'Requests to form companies or trusts with no clear business/economic rationale',
    'Unexplained use of shell, shelf, or front companies',
    'Nominee shareholders/directors or bearer shares without legitimate explanation',
    'Director/shareholder profile inconsistent with the company\'s activities',
    'Individual holding numerous appointments to unconnected companies',
    'Client maintains incomplete or inconsistent accounting records',
    'Splitting incorporation and asset administration across countries without rationale',
    'Requests for introductions to financial institutions that appear to layer funds',
    'Instructions subject to minimal or no scrutiny by the beneficial owner'
  ],
  geographic: [
    'Involvement of sanctioned jurisdictions',
    'Countries with weak AML frameworks',
    'Unexplained offshore involvement in the structure or funds'
  ],
  pep: [
    'Unexplained wealth relative to known income (modest salary, substantial funds)',
    'Complex structures without business rationale',
    'Pressure to bypass due diligence controls',
    'Access to or control over public funds/procurement'
  ]
};

export const eddQuestionnaire = {
  customerBackground: {
    title: 'Client Background',
    questions: [
      { id: 'full_identity', label: 'Full identity and documentation', required: true },
      { id: 'nationality', label: 'Nationality and citizenship history', required: true },
      { id: 'residence', label: 'Current and previous residences', required: true },
      { id: 'occupation', label: 'Occupation and employment history', required: true },
      { id: 'business_profile', label: 'Business profile and activities', required: true }
    ]
  },
  sourceOfWealth: {
    title: 'Source of Wealth (how total net worth was accumulated)',
    questions: [
      { id: 'wealth_origin', label: 'Origin of overall wealth (business ownership, inheritance, investments)', required: true },
      { id: 'wealth_evidence', label: 'Documentary evidence of wealth', required: true },
      { id: 'asset_profile', label: 'Asset profile and holdings', required: true }
    ]
  },
  sourceOfFunds: {
    title: 'Source of Funds (origin of funds for this engagement)',
    questions: [
      { id: 'funds_origin', label: 'Activity generating the funds (salary, trading revenue, trust payout)', required: true },
      { id: 'bank_details', label: 'Bank/account evidence (statements)', required: true },
      { id: 'transaction_path', label: 'Flow of funds for the engagement', required: true }
    ]
  },
  beneficialOwnership: {
    title: 'Beneficial Ownership & Nominee Detection',
    questions: [
      { id: 'ownership_structure', label: 'Complete ownership structure (legal-person clients)', required: true },
      { id: 'control_mechanisms', label: 'Control mechanisms and voting rights', required: true },
      { id: 'nominee_check', label: 'Nominee/bearer-share arrangements and their rationale', required: true },
      { id: 'profile_consistency', label: 'Whether director/shareholder profile matches company activity', required: true }
    ]
  },
  purposeAndNature: {
    title: 'Purpose and Intended Nature',
    questions: [
      { id: 'engagement_nature', label: 'Nature of the engagement / structure required', required: true },
      { id: 'economic_rationale', label: 'Economic/business rationale for the structure', required: true },
      { id: 'expected_activity', label: 'Expected activity and fund flows', required: true }
    ]
  },
  politicalExposure: {
    title: 'Political Exposure',
    questions: [
      { id: 'pep_status', label: 'PEP status (current or former)', required: true },
      { id: 'family_associates', label: 'Family members or close associates who are PEPs', required: true },
      { id: 'public_funds_access', label: 'Access to or control over public funds/procurement', required: true }
    ]
  },
  geographicExposure: {
    title: 'Geographic Exposure',
    questions: [
      { id: 'countries_involved', label: 'All countries involved in the structure/relationship', required: true },
      { id: 'offshore_structures', label: 'Offshore structures and their purpose', required: true }
    ]
  },
  transactionAnalysis: {
    title: 'Engagement & Fund-Flow Analysis',
    questions: [
      { id: 'engagement_value', label: 'Value and nature of the engagement', required: true },
      { id: 'third_party_funds', label: 'Any third-party funding into/out of the entity', required: true }
    ]
  }
};

// SHARED SCORING (identical to the law-firm/insurance model)
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
