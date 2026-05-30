// Multi-Sector DNFBP Configuration System
// Provides sector-specific configurations for Insurance, Accounting, and General DNFBPs

export const SECTORS = {
  INSURANCE: 'insurance',
  ACCOUNTING: 'accounting',
  GENERAL_DNFBP: 'general_dnfbp'
};

// Sector Display Names
export const SECTOR_NAMES = {
  [SECTORS.INSURANCE]: 'Insurance Company',
  [SECTORS.ACCOUNTING]: 'Accounting & Audit Firm',
  [SECTORS.GENERAL_DNFBP]: 'General DNFBP'
};

// Terminology Mapping
export const SECTOR_TERMINOLOGY = {
  [SECTORS.INSURANCE]: {
    customer: 'Policyholder',
    customers: 'Policyholders',
    serviceUnit: 'Policy',
    serviceUnits: 'Policies',
    serviceProvider: 'Agent/Underwriter',
    serviceProviders: 'Agents/Underwriters',
    professionalBody: 'Tanzania Insurance Regulatory Authority (TIRA)',
    registration: 'TIRA License'
  },
  [SECTORS.ACCOUNTING]: {
    customer: 'Client',
    customers: 'Clients',
    serviceUnit: 'Engagement',
    serviceUnits: 'Engagements',
    serviceProvider: 'Accountant/Auditor',
    serviceProviders: 'Accountants/Auditors',
    professionalBody: 'National Board of Accountants & Auditors (NBAA)',
    registration: 'NBAA Registration'
  },
  [SECTORS.GENERAL_DNFBP]: {
    customer: 'Customer',
    customers: 'Customers',
    serviceUnit: 'Transaction',
    serviceUnits: 'Transactions',
    serviceProvider: 'Staff',
    serviceProviders: 'Staff',
    professionalBody: 'Relevant Regulatory Authority',
    registration: 'Business License'
  }
};

// Organization Types by Sector
export const ORGANIZATION_TYPES = {
  [SECTORS.INSURANCE]: [
    { value: 'life_insurance', label: 'Life Insurance Company' },
    { value: 'general_insurance', label: 'General Insurance Company' },
    { value: 'composite_insurance', label: 'Composite Insurance (Life & General)' },
    { value: 'reinsurance', label: 'Reinsurance Company' },
    { value: 'insurance_broker', label: 'Insurance Broker' },
    { value: 'insurance_agent', label: 'Insurance Agent' },
    { value: 'microinsurance', label: 'Microinsurance Provider' }
  ],
  [SECTORS.ACCOUNTING]: [
    { value: 'sole_practitioner', label: 'Sole Practitioner' },
    { value: 'small_firm', label: 'Small Firm (2-10 accountants)' },
    { value: 'medium_firm', label: 'Medium Firm (11-50 accountants)' },
    { value: 'large_firm', label: 'Large Firm (51+ accountants)' },
    { value: 'big_four_affiliate', label: 'Big Four Affiliate' },
    { value: 'audit_firm', label: 'Audit Firm' },
    { value: 'tax_advisory', label: 'Tax Advisory Firm' },
    { value: 'forensic_accounting', label: 'Forensic Accounting Firm' }
  ],
  [SECTORS.GENERAL_DNFBP]: [
    { value: 'real_estate_agent', label: 'Real Estate Agent' },
    { value: 'precious_metals_dealer', label: 'Precious Metals Dealer' },
    { value: 'precious_stones_dealer', label: 'Precious Stones Dealer' },
    { value: 'trust_service_provider', label: 'Trust Service Provider' },
    { value: 'company_service_provider', label: 'Company Service Provider' },
    { value: 'casino', label: 'Casino' },
    { value: 'other_dnfbp', label: 'Other DNFBP' }
  ]
};

// Role Hierarchies by Sector
export const SECTOR_ROLES = {
  [SECTORS.INSURANCE]: [
    { value: 'ceo', label: 'CEO', level: 'management', isManagement: true },
    { value: 'senior_management', label: 'Senior Management', level: 'management', isManagement: true },
    { value: 'management', label: 'Management Team', level: 'management', isManagement: true },
    { value: 'underwriter', label: 'Underwriter', level: 'operational', isManagement: false },
    { value: 'claims_officer', label: 'Claims Officer', level: 'operational', isManagement: false },
    { value: 'agent', label: 'Insurance Agent', level: 'operational', isManagement: false },
    { value: 'staff', label: 'General Staff', level: 'operational', isManagement: false },
    { value: 'compliance_officer', label: 'Compliance Officer', level: 'compliance', isManagement: false },
    { value: 'mlro', label: 'MLRO', level: 'compliance', isManagement: false }
  ],
  [SECTORS.ACCOUNTING]: [
    { value: 'senior_partner', label: 'Senior Partner', level: 'management', isManagement: true },
    { value: 'partner', label: 'Partner', level: 'management', isManagement: true },
    { value: 'management', label: 'Management Team', level: 'management', isManagement: true },
    { value: 'auditor', label: 'Auditor', level: 'operational', isManagement: false },
    { value: 'accountant', label: 'Accountant', level: 'operational', isManagement: false },
    { value: 'tax_advisor', label: 'Tax Advisor', level: 'operational', isManagement: false },
    { value: 'staff', label: 'Support Staff', level: 'operational', isManagement: false },
    { value: 'compliance_officer', label: 'Compliance Officer', level: 'compliance', isManagement: false },
    { value: 'mlro', label: 'MLRO', level: 'compliance', isManagement: false }
  ],
  [SECTORS.GENERAL_DNFBP]: [
    { value: 'owner', label: 'Business Owner', level: 'management', isManagement: true },
    { value: 'senior_management', label: 'Senior Management', level: 'management', isManagement: true },
    { value: 'management', label: 'Management Team', level: 'management', isManagement: true },
    { value: 'staff', label: 'Operational Staff', level: 'operational', isManagement: false },
    { value: 'advisor', label: 'Service Advisor', level: 'operational', isManagement: false },
    { value: 'compliance_officer', label: 'Compliance Officer', level: 'compliance', isManagement: false },
    { value: 'mlro', label: 'MLRO', level: 'compliance', isManagement: false }
  ]
};

// Service Unit Types (Policies/Engagements/Transactions) with AML Triggers
export const SERVICE_UNIT_TYPES = {
  [SECTORS.INSURANCE]: [
    {
      value: 'life_insurance_single_premium',
      label: 'Life Insurance - Single Premium',
      amlTriggers: ['life_insurance_single_premium'],
      riskLevel: 'very_high'
    },
    {
      value: 'life_insurance_regular',
      label: 'Life Insurance - Regular Premium',
      amlTriggers: ['life_insurance_product'],
      riskLevel: 'medium'
    },
    {
      value: 'investment_linked_insurance',
      label: 'Investment-Linked Insurance',
      amlTriggers: ['investment_linked_product'],
      riskLevel: 'very_high'
    },
    {
      value: 'endowment_policy',
      label: 'Endowment Policy',
      amlTriggers: ['endowment_product'],
      riskLevel: 'high'
    },
    {
      value: 'annuity',
      label: 'Annuity Products',
      amlTriggers: ['annuity_product'],
      riskLevel: 'medium'
    },
    {
      value: 'general_insurance',
      label: 'General Insurance (Property, Motor, etc.)',
      amlTriggers: [],
      riskLevel: 'low'
    },
    {
      value: 'health_insurance',
      label: 'Health Insurance',
      amlTriggers: [],
      riskLevel: 'low'
    },
    {
      value: 'policy_surrender',
      label: 'Policy Surrender/Early Termination',
      amlTriggers: ['early_termination'],
      riskLevel: 'very_high'
    },
    {
      value: 'beneficiary_change',
      label: 'Beneficiary Change Request',
      amlTriggers: ['beneficiary_change'],
      riskLevel: 'high'
    }
  ],
  [SECTORS.ACCOUNTING]: [
    {
      value: 'audit',
      label: 'Financial Audit',
      amlTriggers: [],
      riskLevel: 'low'
    },
    {
      value: 'tax_planning',
      label: 'Tax Planning & Advisory',
      amlTriggers: ['tax_advisory'],
      riskLevel: 'medium'
    },
    {
      value: 'trust_setup',
      label: 'Trust/Foundation Setup',
      amlTriggers: ['trust_foundation_setup'],
      riskLevel: 'very_high'
    },
    {
      value: 'company_formation',
      label: 'Company Formation & Incorporation',
      amlTriggers: ['company_formation'],
      riskLevel: 'high'
    },
    {
      value: 'offshore_structuring',
      label: 'Offshore/International Tax Structuring',
      amlTriggers: ['offshore_structuring'],
      riskLevel: 'very_high'
    },
    {
      value: 'real_estate_services',
      label: 'Real Estate Transaction Services',
      amlTriggers: ['real_estate_services'],
      riskLevel: 'high'
    },
    {
      value: 'cash_intensive_business_audit',
      label: 'Cash-Intensive Business Audit',
      amlTriggers: ['cash_intensive_audit'],
      riskLevel: 'high'
    },
    {
      value: 'bookkeeping',
      label: 'Bookkeeping Services',
      amlTriggers: [],
      riskLevel: 'low'
    },
    {
      value: 'forensic_accounting',
      label: 'Forensic Accounting Investigation',
      amlTriggers: [],
      riskLevel: 'low'
    }
  ],
  [SECTORS.GENERAL_DNFBP]: [
    {
      value: 'real_estate_sale',
      label: 'Real Estate Sale',
      amlTriggers: ['real_estate_transaction'],
      riskLevel: 'high',
      sector: 'real_estate'
    },
    {
      value: 'precious_metals_sale',
      label: 'Precious Metals Sale',
      amlTriggers: ['precious_metals_transaction'],
      threshold: 10000000,
      riskLevel: 'high',
      sector: 'precious_metals'
    },
    {
      value: 'precious_stones_sale',
      label: 'Precious Stones Sale',
      amlTriggers: ['precious_stones_transaction'],
      threshold: 10000000,
      riskLevel: 'high',
      sector: 'precious_stones'
    },
    {
      value: 'trust_services',
      label: 'Trust Services',
      amlTriggers: ['trust_services'],
      riskLevel: 'very_high',
      sector: 'trust_services'
    },
    {
      value: 'company_services',
      label: 'Company Formation/Management Services',
      amlTriggers: ['company_services'],
      riskLevel: 'high',
      sector: 'company_services'
    },
    {
      value: 'large_cash_transaction',
      label: 'Large Cash Transaction',
      amlTriggers: ['large_cash_transaction'],
      threshold: 5000000,
      riskLevel: 'very_high'
    }
  ]
};

// Tier Profiles by Sector
export const TIER_PROFILES = {
  [SECTORS.INSURANCE]: {
    1: {
      name: 'Tier 1 – General Insurance / Basic Products',
      description: 'General insurance only, domestic operations, standard products',
      questionCount: 35,
      escalationTriggers: [
        'Life insurance products',
        'Single premium policies',
        'Investment-linked products',
        'International operations'
      ]
    },
    2: {
      name: 'Tier 2 – Life Insurance / Investment Products',
      description: 'Life insurance, some investment products, growing operations',
      questionCount: 50,
      escalationTriggers: [
        'Investment-linked products',
        'Offshore policies',
        'High net worth clients',
        'Reinsurance'
      ]
    },
    3: {
      name: 'Tier 3 – Complex Products / International Operations',
      description: 'Investment-linked products, offshore policies, reinsurance',
      questionCount: 62,
      escalationTriggers: []
    }
  },
  [SECTORS.ACCOUNTING]: {
    1: {
      name: 'Tier 1 – Basic Services / Local Focus',
      description: 'Bookkeeping, basic audits, domestic clients only',
      questionCount: 35,
      escalationTriggers: [
        'Tax advisory',
        'Company formation',
        'Foreign clients',
        'High-risk industries'
      ]
    },
    2: {
      name: 'Tier 2 – Tax Advisory / Corporate Services',
      description: 'Tax planning, company formation, some international clients',
      questionCount: 50,
      escalationTriggers: [
        'Offshore structuring',
        'Trust setup',
        'High-risk jurisdictions',
        'Complex structures'
      ]
    },
    3: {
      name: 'Tier 3 – International / Complex Structures',
      description: 'Offshore structures, trusts, international tax, complex clients',
      questionCount: 62,
      escalationTriggers: []
    }
  },
  [SECTORS.GENERAL_DNFBP]: {
    1: {
      name: 'Tier 1 – Low Volume / Domestic',
      description: 'Domestic operations, low transaction volumes, standard clients',
      questionCount: 35,
      escalationTriggers: [
        'High transaction volumes',
        'Large cash transactions',
        'Foreign clients',
        'High-risk sectors'
      ]
    },
    2: {
      name: 'Tier 2 – Medium Volume / Some High-Risk',
      description: 'Higher volumes, some high-risk transactions, growing operations',
      questionCount: 50,
      escalationTriggers: [
        'Very high volumes',
        'Frequent large cash',
        'High-risk jurisdictions',
        'Precious metals/stones'
      ]
    },
    3: {
      name: 'Tier 3 – High Volume / High-Risk Sector',
      description: 'High volumes, frequent high-risk transactions, complex operations',
      questionCount: 62,
      escalationTriggers: []
    }
  }
};

// Utility Functions
export const getSectorConfig = (sector) => {
  return {
    terminology: SECTOR_TERMINOLOGY[sector],
    organizationTypes: ORGANIZATION_TYPES[sector],
    roles: SECTOR_ROLES[sector],
    serviceUnitTypes: SERVICE_UNIT_TYPES[sector],
    tierProfiles: TIER_PROFILES[sector]
  };
};

export const getSectorTerminology = (sector, term) => {
  return SECTOR_TERMINOLOGY[sector]?.[term] || term;
};

export const getServiceUnitLabel = (sector, singular = true) => {
  const term = singular ? 'serviceUnit' : 'serviceUnits';
  return getSectorTerminology(sector, term);
};

export const getCustomerLabel = (sector, singular = true) => {
  const term = singular ? 'customer' : 'customers';
  return getSectorTerminology(sector, term);
};

export const isManagementRole = (sector, role) => {
  const sectorRoles = SECTOR_ROLES[sector];
  const roleConfig = sectorRoles.find(r => r.value === role);
  return roleConfig?.isManagement || false;
};

export const getAMLTriggersForServiceType = (sector, serviceType) => {
  const serviceTypes = SERVICE_UNIT_TYPES[sector];
  const config = serviceTypes.find(st => st.value === serviceType);
  return config?.amlTriggers || [];
};

export const getServiceTypeRiskLevel = (sector, serviceType) => {
  const serviceTypes = SERVICE_UNIT_TYPES[sector];
  const config = serviceTypes.find(st => st.value === serviceType);
  return config?.riskLevel || 'medium';
};

export default {
  SECTORS,
  SECTOR_NAMES,
  SECTOR_TERMINOLOGY,
  ORGANIZATION_TYPES,
  SECTOR_ROLES,
  SERVICE_UNIT_TYPES,
  TIER_PROFILES,
  getSectorConfig,
  getSectorTerminology,
  getServiceUnitLabel,
  getCustomerLabel,
  isManagementRole,
  getAMLTriggersForServiceType,
  getServiceTypeRiskLevel
};
