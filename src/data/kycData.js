export const clientTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate Entity' },
  { value: 'trust', label: 'Trust' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' }
];

export const riskLevels = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

export const dueDiligenceLevels = {
  SIMPLIFIED: 'simplified',
  STANDARD: 'standard',
  ENHANCED: 'enhanced'
};

// Tanzania-specific DD level descriptions
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
      'Lower scrutiny of transactions',
      'Verification may be completed later',
      'Must document justification for simplified approach'
    ],
    requirements: [
      'National Risk Assessment completed',
      'Institutional risk assessment completed',
      'Client risk assessment shows low risk',
      'No suspicion of ML/TF',
      'Documented justification required'
    ],
    triggers: [
      'Local salaried individuals',
      'Transparent ownership',
      'Low-risk banking products (savings accounts, basic deposits)',
      'Government or regulated entities'
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
    description: 'Default level applied to most clients with medium risk profile',
    riskLevel: 'Medium',
    color: '#f59e0b',
    features: [
      'Full customer identification and verification',
      'Understanding purpose and nature of relationship',
      'Source of Funds (SOF) verification required',
      'Occupation and source of income verification',
      'Beneficial ownership identification (for legal entities)',
      'Third party identification (where applicable)',
      'Ongoing monitoring and updates'
    ],
    requirements: [
      'Full identity verification using reliable documents',
      'Source of Funds verification template completed',
      'Purpose and expected transactions understood',
      'Occupation and source of income documented',
      'Beneficial owners identified and verified (25%+ threshold)',
      'Regular monitoring and information updates'
    ],
    triggers: [
      'Small to medium enterprises',
      'Corporate clients',
      'Standard loan applications',
      'Domestic wire transfers',
      'Most standard banking product engagements'
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
      'Additional information on customer (profession, wealth, assets, public records)',
      'Source of wealth and source of funds (MANDATORY)',
      'Additional information on transactions',
      'Senior management approval (MANDATORY before onboarding)',
      'Enhanced monitoring (more frequent reviews)',
      'Ongoing updates of KYC information',
      'First payment through regulated financial institution'
    ],
    requirements: [
      'All Standard DD requirements',
      'Source of wealth documentation (mandatory)',
      'Source of funds documentation (mandatory)',
      'Senior management/partner approval before onboarding',
      'Enhanced monitoring frequency',
      'First payment verification through regulated FI',
      'Detailed transaction economic rationale',
      'Enhanced beneficial ownership verification'
    ],
    triggers: [
      'High-risk jurisdictions (FIU/FATF identified)',
      'Complex or unusual transactions',
      'Non-face-to-face relationships',
      'Power of attorney or third-party transactions (non-residents)',
      'Politically Exposed Persons (PEPs)',
      'Suspicious behaviour',
      'Large transaction values',
      'Offshore involvement'
    ],
    monitoring: 'Monthly review for Very High risk, Quarterly for High risk',
    prohibited: [
      'Cannot onboard without senior approval',
      'Cannot proceed without source of wealth/funds',
      'First payment must be verified'
    ]
  }
};

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

export const serviceRiskFactors = {
  serviceType: {
    label: 'Law Firm Product/Service Type',
    options: [
      { value: 'general_legal_advice', label: 'General legal advice and consultation', score: 1 },
      { value: 'family_law', label: 'Family law and personal matters', score: 1 },
      { value: 'employment_law', label: 'Employment and labour law', score: 2 },
      { value: 'corporate_commercial', label: 'Corporate and commercial transactions', score: 3 },
      { value: 'real_estate', label: 'Real estate and property transactions', score: 4 },
      { value: 'mergers_acquisitions', label: 'Mergers, acquisitions, and business sales', score: 5 },
      { value: 'trust_estate_planning', label: 'Trust formation and estate planning', score: 5 },
      { value: 'international_transactions', label: 'International transactions and offshore structures', score: 5 }
    ]
  },
  transactionValue: {
    label: 'Expected Transaction Value',
    options: [
      { value: 'low', label: 'Low (< 10M TZS)', score: 1 },
      { value: 'medium', label: 'Medium (10M - 100M TZS)', score: 3 },
      { value: 'high', label: 'High (> 100M TZS)', score: 5 }
    ]
  },
  complexity: {
    label: 'Transaction Complexity',
    options: [
      { value: 'simple', label: 'Simple/straightforward', score: 1 },
      { value: 'moderate', label: 'Moderately complex', score: 3 },
      { value: 'complex', label: 'Highly complex/structured', score: 5 }
    ]
  }
};

export const geographicRiskFactors = {
  countryRisk: {
    label: 'Country Risk',
    options: [
      { value: 'low', label: 'Tanzania/Low-risk countries', score: 1 },
      { value: 'medium', label: 'Medium-risk jurisdictions', score: 3 },
      { value: 'high', label: 'High-risk/sanctioned jurisdictions', score: 5 }
    ]
  },
  offshoreInvolvement: {
    label: 'Offshore Involvement',
    options: [
      { value: 'none', label: 'No offshore involvement', score: 1 },
      { value: 'some', label: 'Some offshore elements', score: 3 },
      { value: 'significant', label: 'Significant offshore structures', score: 5 }
    ]
  }
};

export const behaviourRiskFactors = {
  informationProvision: {
    label: 'Information Provision',
    options: [
      { value: 'cooperative', label: 'Cooperative and transparent', score: 1 },
      { value: 'hesitant', label: 'Somewhat hesitant', score: 3 },
      { value: 'reluctant', label: 'Reluctant or evasive', score: 5 }
    ]
  },
  urgency: {
    label: 'Urgency Level',
    options: [
      { value: 'normal', label: 'Normal business pace', score: 1 },
      { value: 'rushed', label: 'Somewhat rushed', score: 3 },
      { value: 'extreme', label: 'Extreme urgency without justification', score: 5 }
    ]
  }
};

export const deliveryChannelRiskFactors = {
  meetingType: {
    label: 'Client Meeting Type',
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
      { value: 'some', label: 'Some intermediaries', score: 3 },
      { value: 'multiple', label: 'Multiple unexplained intermediaries', score: 5 }
    ]
  }
};

export const redFlags = {
  clientBehaviour: [
    'Reluctant to provide identity documents',
    'Provides inconsistent or false information',
    'Shows unusual urgency without justification',
    'Requests excessive secrecy beyond legal privilege',
    'Refuses to explain purpose of transaction',
    'Requests use of unnecessary intermediaries',
    'Uses multiple banks or financial institutions without clear reason',
    'Changes instructions frequently without explanation'
  ],
  sourceOfFunds: [
    'Funds inconsistent with client profile',
    'Complex or opaque funding structures',
    'Large cash payments',
    'Funds from high-risk jurisdictions',
    'Use of shell companies without business purpose',
    'Third-party payments without clear link'
  ],
  serviceSpecific: [
    'Loans: Requesting loans without clear business purpose',
    'Deposits: Large cash deposits inconsistent with business profile',
    'Wire transfers: Frequent international transfers without explanation',
    'Trade finance: Over or under-invoicing',
    'Correspondent banking: Complex layered transactions',
    'Accounts: Funds passing through without clear business purpose',
    'Accounts: Frequent round-tripping or circular transfers',
    'Private banking: Complex structures without economic rationale'
  ],
  geographic: [
    'Involvement of sanctioned jurisdictions',
    'Countries with weak AML frameworks',
    'Unexplained offshore financial centres'
  ],
  pep: [
    'Unexplained wealth relative to known income',
    'Complex structures without business rationale',
    'Pressure to bypass due diligence controls'
  ]
};

export const eddQuestionnaire = {
  customerBackground: {
    title: 'Customer Background',
    questions: [
      { id: 'full_identity', label: 'Full identity and documentation', required: true },
      { id: 'nationality', label: 'Nationality and citizenship history', required: true },
      { id: 'residence', label: 'Current and previous residences', required: true },
      { id: 'occupation', label: 'Occupation and employment history', required: true },
      { id: 'business_profile', label: 'Business profile and activities', required: true },
      { id: 'previous_banks', label: 'Previous banking relationships', required: false }
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
    title: 'Source of Funds',
    questions: [
      { id: 'funds_origin', label: 'Origin of funds for this transaction', required: true },
      { id: 'bank_details', label: 'Bank details and account information', required: true },
      { id: 'transaction_path', label: 'Transaction path and flow of funds', required: true }
    ]
  },
  beneficialOwnership: {
    title: 'Beneficial Ownership',
    questions: [
      { id: 'ownership_structure', label: 'Complete ownership structure', required: true },
      { id: 'control_mechanisms', label: 'Control mechanisms and voting rights', required: true },
      { id: 'nominees_trustees', label: 'Trustees, nominees, or agents', required: true }
    ]
  },
  purposeAndNature: {
    title: 'Purpose and Intended Nature',
    questions: [
      { id: 'banking_service_nature', label: 'Nature of banking products/services required', required: true },
      { id: 'transaction_volume', label: 'Expected transaction volume and frequency', required: true },
      { id: 'economic_rationale', label: 'Economic rationale and business purpose', required: true }
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
    title: 'Transaction Analysis',
    questions: [
      { id: 'transaction_value', label: 'Value and frequency of transactions', required: true },
      { id: 'transaction_complexity', label: 'Complexity and structure', required: true }
    ]
  }
};

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

export function getRiskLevel(riskScore) {
  if (riskScore <= 30) return riskLevels.LOW;
  if (riskScore <= 60) return riskLevels.MEDIUM;
  if (riskScore <= 80) return riskLevels.HIGH;
  return riskLevels.VERY_HIGH;
}

export function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case riskLevels.LOW: return '#10b981';
    case riskLevels.MEDIUM: return '#f59e0b';
    case riskLevels.HIGH: return '#ef4444';
    case riskLevels.VERY_HIGH: return '#991b1b';
    default: return '#6b7280';
  }
}

export const documentCategories = {
  identification: 'Identification',
  proof_of_address: 'Proof of Address',
  financial: 'Financial Documents',
  corporate: 'Corporate Documents',
  legal: 'Legal Documents',
  screening: 'Screening Results',
  correspondence: 'Correspondence',
  other: 'Other'
};

export const monitoringFrequencies = {
  LOW: { value: 'annual', label: 'Annual', months: 12 },
  MEDIUM: { value: 'quarterly', label: 'Quarterly', months: 3 },
  HIGH: { value: 'monthly', label: 'Monthly', months: 1 },
  VERY_HIGH: { value: 'weekly', label: 'Weekly', months: 0.25 }
};

export function getMonitoringFrequency(riskLevel) {
  return monitoringFrequencies[riskLevel] || monitoringFrequencies.MEDIUM;
}

// Tanzania-specific helper functions

export function getDDLevelRequirements(ddLevel) {
  return dueDiligenceLevelInfo[ddLevel] || dueDiligenceLevelInfo.standard;
}

export function requiresSeniorApproval(ddLevel) {
  return ddLevel === dueDiligenceLevels.ENHANCED;
}

export function requiresSourceOfWealth(ddLevel) {
  return ddLevel === dueDiligenceLevels.ENHANCED;
}

export function requiresSourceOfFunds(ddLevel) {
  return ddLevel === dueDiligenceLevels.STANDARD || ddLevel === dueDiligenceLevels.ENHANCED;
}

export function requiresSimplifiedJustification(ddLevel) {
  return ddLevel === dueDiligenceLevels.SIMPLIFIED;
}

export function getReviewFrequencyFromDDLevel(ddLevel, riskLevel) {
  if (ddLevel === dueDiligenceLevels.SIMPLIFIED) {
    return 'annual';
  } else if (ddLevel === dueDiligenceLevels.ENHANCED) {
    if (riskLevel === riskLevels.VERY_HIGH) {
      return 'monthly';
    }
    return 'quarterly';
  } else {
    return 'quarterly';
  }
}

export function calculateNextReviewDate(frequency) {
  const today = new Date();
  switch (frequency) {
    case 'weekly':
      today.setDate(today.getDate() + 7);
      break;
    case 'monthly':
      today.setMonth(today.getMonth() + 1);
      break;
    case 'quarterly':
      today.setMonth(today.getMonth() + 3);
      break;
    case 'semi_annual':
      today.setMonth(today.getMonth() + 6);
      break;
    case 'annual':
      today.setFullYear(today.getFullYear() + 1);
      break;
    default:
      today.setMonth(today.getMonth() + 3);
  }
  return today.toISOString().split('T')[0];
}

export function isReviewOverdue(nextReviewDate) {
  if (!nextReviewDate) return false;
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  return reviewDate < today;
}

export function getDaysUntilReview(nextReviewDate) {
  if (!nextReviewDate) return null;
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  const diffTime = reviewDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export const bankingProductTypes = [
  { value: 'savings_accounts', label: 'Savings Accounts', risk: 1 },
  { value: 'current_accounts', label: 'Current/Checking Accounts', risk: 1 },
  { value: 'fixed_deposits', label: 'Fixed Deposits/Term Deposits', risk: 1 },
  { value: 'domestic_transfers', label: 'Domestic Wire Transfers', risk: 2 },
  { value: 'personal_loans', label: 'Personal Loans', risk: 2 },
  { value: 'business_loans', label: 'Business Loans/Credit Facilities', risk: 3 },
  { value: 'international_transfers', label: 'International Wire Transfers', risk: 4 },
  { value: 'trade_finance', label: 'Trade Finance/Letters of Credit', risk: 4 },
  { value: 'correspondent_banking', label: 'Correspondent Banking Services', risk: 5 },
  { value: 'private_banking', label: 'Private Banking/Wealth Management', risk: 5 },
  { value: 'offshore_accounts', label: 'Offshore Banking/International Structures', risk: 5 }
];

export const transactionVolumeOptions = [
  { value: 'low', label: 'Low (< 10M TZS)', risk: 1 },
  { value: 'medium', label: 'Medium (10M - 100M TZS)', risk: 3 },
  { value: 'high', label: 'High (100M - 500M TZS)', risk: 4 },
  { value: 'very_high', label: 'Very High (> 500M TZS)', risk: 5 }
];

export const pepCategories = [
  'Head of State or Government',
  'Senior Politician',
  'Senior Government Official',
  'Judicial or Military Official',
  'Senior Executive of State-Owned Enterprise',
  'Important Political Party Official',
  'Family Member of PEP',
  'Close Associate of PEP',
  'Former PEP (within last 12 months)'
];

export const highRiskJurisdictions = [
  'Countries identified by FIU Tanzania',
  'FATF high-risk jurisdictions',
  'Countries with weak AML/CFT controls',
  'Tax havens without transparency',
  'Sanctioned countries'
];

export const approvalStatuses = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const monitoringStatuses = {
  ACTIVE: 'active',
  OVERDUE: 'overdue',
  SUSPENDED: 'suspended',
  CLOSED: 'closed'
};

export function getApprovalStatusColor(status) {
  switch (status) {
    case approvalStatuses.APPROVED:
      return '#10b981';
    case approvalStatuses.PENDING:
      return '#f59e0b';
    case approvalStatuses.REJECTED:
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export function getMonitoringStatusColor(status) {
  switch (status) {
    case monitoringStatuses.ACTIVE:
      return '#10b981';
    case monitoringStatuses.OVERDUE:
      return '#ef4444';
    case monitoringStatuses.SUSPENDED:
      return '#f59e0b';
    case monitoringStatuses.CLOSED:
      return '#6b7280';
    default:
      return '#6b7280';
  }
}
