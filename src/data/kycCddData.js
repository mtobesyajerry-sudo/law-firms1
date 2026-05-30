// KYC/CDD data for the Insurance sector.
// Aligned with Tanzania AML Act, AML Regulations 2022, and FIU AML/CFT Guidelines to Insurers.

export const KYC_SECTIONS = {
  NATURAL_PERSON: 'natural_person',
  LEGAL_ENTITY: 'legal_entity',
  BENEFICIAL_OWNERSHIP: 'beneficial_ownership',
  PERSON_ACTING: 'person_acting',
  POLICY_INFO: 'policy_info',
  BENEFICIARY_INFO: 'beneficiary_info',
  SOURCE_FUNDS: 'source_funds',
  PEP_DECLARATION: 'pep_declaration',
  SANCTIONS_SCREENING: 'sanctions_screening',
  CUSTOMER_RISK: 'customer_risk',
  ONGOING_MONITORING: 'ongoing_monitoring',
  SUSPICIOUS_INDICATORS: 'suspicious_indicators',
  CUSTOMER_DECLARATION: 'customer_declaration',
  INSURER_USE: 'insurer_use',
};

export const kycSections = [
  {
    id: KYC_SECTIONS.NATURAL_PERSON,
    title: 'Customer Information – Natural Person',
    description: 'Complete this section for individual policyholders.',
    customerTypes: ['natural_person'],
    fields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true },
      { name: 'nationality', label: 'Nationality', type: 'text', required: true },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { name: 'place_of_birth', label: 'Place of Birth', type: 'text', required: true },
      { name: 'national_id', label: 'National ID / Passport Number', type: 'text', required: true },
      { name: 'id_expiry_date', label: 'ID Expiry Date', type: 'date', required: true },
      { name: 'residential_address', label: 'Residential Address', type: 'textarea', required: true },
      { name: 'occupation', label: 'Occupation / Employer', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: false },
      { name: 'telephone', label: 'Telephone', type: 'text', required: true },
      { name: 'tin_number', label: 'TIN (if applicable)', type: 'text', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.LEGAL_ENTITY,
    title: 'Customer Information – Legal Entity',
    description: 'Complete this section for corporate policyholders.',
    customerTypes: ['legal_entity'],
    fields: [
      { name: 'registered_name', label: 'Registered Name', type: 'text', required: true },
      { name: 'trading_name', label: 'Trading Name', type: 'text', required: false },
      { name: 'registration_number', label: 'Registration Number', type: 'text', required: true },
      { name: 'date_of_incorporation', label: 'Date of Incorporation', type: 'date', required: true },
      { name: 'country_of_incorporation', label: 'Country of Incorporation', type: 'select', required: true,
        options: ['Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Burundi', 'South Africa', 'United Kingdom', 'United States', 'Other'] },
      { name: 'registered_address', label: 'Registered Address', type: 'textarea', required: true },
      { name: 'nature_of_business', label: 'Nature of Business', type: 'textarea', required: true },
      { name: 'contact_phone', label: 'Contact Phone', type: 'text', required: true },
      { name: 'contact_email', label: 'Contact Email', type: 'email', required: false },
      { name: 'tin_number', label: 'Tax Identification Number', type: 'text', required: true },
      { name: 'has_beneficial_owners', label: 'Are there beneficial owners with ≥25% ownership?', type: 'select', required: true, options: ['Yes', 'No'] },
    ],
  },
  {
    id: KYC_SECTIONS.BENEFICIAL_OWNERSHIP,
    title: 'Beneficial Ownership',
    description: 'Identify all natural persons who ultimately own or control ≥25% of the entity.',
    customerTypes: ['legal_entity'],
    fields: [
      { name: 'beneficial_owners', label: 'Beneficial Owners', type: 'repeater', required: false,
        subfields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'nationality', label: 'Nationality', type: 'text', required: true },
          { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
          { name: 'id_number', label: 'ID Number', type: 'text', required: true },
          { name: 'ownership_percentage', label: 'Ownership %', type: 'number', required: true },
          { name: 'residential_address', label: 'Residential Address', type: 'textarea', required: true },
        ]
      },
    ],
  },
  {
    id: KYC_SECTIONS.PERSON_ACTING,
    title: 'Person Acting on Behalf',
    description: 'Complete if someone acts on behalf of the policyholder.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'acting_on_behalf', label: 'Is someone acting on behalf of the policyholder?', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'acting_person_name', label: 'Full Name of Acting Person', type: 'text', required: false },
      { name: 'acting_person_id', label: 'ID / Passport Number', type: 'text', required: false },
      { name: 'acting_person_authority', label: 'Authority (Power of Attorney / Board Resolution)', type: 'text', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.POLICY_INFO,
    title: 'Policy Information',
    description: 'Details of the insurance policy being underwritten.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'policy_type', label: 'Type of Insurance Policy', type: 'select', required: true,
        options: ['Life', 'General', 'Medical', 'Motor', 'Property', 'Marine', 'Liability', 'Other'] },
      { name: 'policy_number', label: 'Policy Number (if existing)', type: 'text', required: false },
      { name: 'premium_amount', label: 'Annual Premium Amount (TZS)', type: 'number', required: true },
      { name: 'premium_payment_method', label: 'Premium Payment Method', type: 'select', required: true,
        options: ['Bank Transfer', 'Mobile Money', 'Cheque', 'Cash', 'Debit Order'] },
      { name: 'premium_frequency', label: 'Premium Frequency', type: 'select', required: true,
        options: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single Premium'] },
      { name: 'policy_start_date', label: 'Policy Start Date', type: 'date', required: false },
      { name: 'sum_insured', label: 'Sum Insured / Cover Amount (TZS)', type: 'number', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.BENEFICIARY_INFO,
    title: 'Beneficiary Information',
    description: 'Identify the named beneficiaries of the policy.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'beneficiaries', label: 'Beneficiaries', type: 'repeater', required: false,
        subfields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'relationship', label: 'Relationship to Policyholder', type: 'text', required: true },
          { name: 'percentage', label: 'Benefit Share %', type: 'number', required: false },
          { name: 'id_number', label: 'ID Number', type: 'text', required: false },
        ]
      },
    ],
  },
  {
    id: KYC_SECTIONS.SOURCE_FUNDS,
    title: 'Source of Funds and Wealth',
    description: 'Understand the origin of premium payments and wealth.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'source_of_premium', label: 'Source of Premium Funds', type: 'select', required: true,
        options: ['Salary/Employment', 'Business Revenue', 'Investments', 'Inheritance', 'Rental Income', 'Other'] },
      { name: 'expected_annual_premium', label: 'Expected Annual Premium (TZS)', type: 'number', required: true },
      { name: 'source_of_wealth', label: 'Source of Wealth (brief description)', type: 'textarea', required: true },
      { name: 'estimated_net_worth', label: 'Estimated Net Worth Range (TZS)', type: 'select', required: false,
        options: ['Below 10M', '10M–50M', '50M–100M', '100M–500M', 'Above 500M'] },
    ],
  },
  {
    id: KYC_SECTIONS.PEP_DECLARATION,
    title: 'Politically Exposed Person (PEP) Declaration',
    description: 'Declare any political exposure. EDD is required for PEP customers.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'is_pep', label: 'Are you a Politically Exposed Person?', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'related_to_pep', label: 'Are you a close family member or associate of a PEP?', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'pep_position', label: 'Position / Role (if PEP)', type: 'text', required: false },
      { name: 'pep_country', label: 'Country of Office (if PEP)', type: 'text', required: false },
      { name: 'pep_end_date', label: 'Date Office Ended (leave blank if current)', type: 'date', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.SANCTIONS_SCREENING,
    title: 'Sanctions Screening',
    description: 'Confirm the customer is not subject to any sanctions.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'sanctions_checked', label: 'Has a sanctions screening been conducted?', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'sanctions_result', label: 'Screening Result', type: 'select', required: false, options: ['Clear', 'Potential Match – Investigated', 'Confirmed Match'] },
      { name: 'adverse_media_checked', label: 'Has adverse media screening been conducted?', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'adverse_media_result', label: 'Adverse Media Result', type: 'select', required: false, options: ['Clear', 'Concern Found – Investigated', 'Confirmed Adverse'] },
    ],
  },
  {
    id: KYC_SECTIONS.CUSTOMER_RISK,
    title: 'Customer Risk Assessment',
    description: 'Evaluate risk factors across the customer relationship.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'customer_risk_rating', label: 'Overall Customer Risk Rating', type: 'select', required: true,
        options: ['Low', 'Medium', 'High', 'Very High'] },
      { name: 'geographic_risk', label: 'Geographic Risk (country of origin / operations)', type: 'select', required: true,
        options: ['Low – Tanzania domestic', 'Medium – East Africa', 'High – High-risk jurisdiction', 'Very High – FATF grey/blacklisted'] },
      { name: 'product_risk', label: 'Product/Service Risk Level', type: 'select', required: true,
        options: ['Low', 'Medium', 'High'] },
      { name: 'channel_risk', label: 'Distribution Channel Risk', type: 'select', required: true,
        options: ['Direct (Low)', 'Broker (Medium)', 'Third-party (High)'] },
    ],
  },
  {
    id: KYC_SECTIONS.ONGOING_MONITORING,
    title: 'Ongoing Monitoring',
    description: 'Record commitments and schedule for ongoing review.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'review_frequency', label: 'Scheduled Review Frequency', type: 'select', required: true,
        options: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'] },
      { name: 'last_review_date', label: 'Date of Last Review', type: 'date', required: false },
      { name: 'monitoring_notes', label: 'Monitoring Notes', type: 'textarea', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.SUSPICIOUS_INDICATORS,
    title: 'Suspicious Activity Indicators',
    description: 'Flag any red flags observed during the onboarding process.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'unusual_premium_size', label: 'Unusually large premium relative to stated income', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'early_policy_surrender', label: 'Request for early surrender / cancellation with refund', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'third_party_premium_payer', label: 'Premium paid by unrelated third party', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'unusual_beneficiary', label: 'Unusual or unrelated beneficiary designation', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'reluctant_to_provide_info', label: 'Customer reluctant to provide required information', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'suspicious_details', label: 'Additional details on suspicious indicators (if any)', type: 'textarea', required: false },
    ],
  },
  {
    id: KYC_SECTIONS.CUSTOMER_DECLARATION,
    title: 'Customer Declaration',
    description: 'The customer must confirm accuracy of information provided.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'declaration_confirmed', label: 'I confirm that all information provided is accurate and complete to the best of my knowledge.', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'consent_data_processing', label: 'I consent to the processing of my personal data for AML/CFT compliance purposes.', type: 'select', required: true, options: ['Yes', 'No'] },
      { name: 'declaration_date', label: 'Declaration Date', type: 'date', required: true },
      { name: 'declarant_name', label: 'Name of Declarant / Authorised Signatory', type: 'text', required: true },
    ],
  },
  {
    id: KYC_SECTIONS.INSURER_USE,
    title: 'For Insurer Use Only – Compliance Approval',
    description: 'Internal compliance sign-off section.',
    customerTypes: ['natural_person', 'legal_entity'],
    fields: [
      { name: 'mlro_approval', label: 'MLRO / Compliance Approval', type: 'select', required: false, options: ['Approved', 'Rejected', 'Pending EDD'] },
      { name: 'mlro_name', label: 'MLRO Name', type: 'text', required: false },
      { name: 'approval_date', label: 'Approval Date', type: 'date', required: false },
      { name: 'compliance_notes', label: 'Compliance Notes', type: 'textarea', required: false },
    ],
  },
];

// Helper to get compliance action text based on risk level
export function getComplianceAction(riskLevel) {
  switch (riskLevel) {
    case 'Very High': return 'IMMEDIATE: Escalate to MLRO. Senior management approval required. Consider whether to proceed.';
    case 'High': return 'Enhanced Due Diligence mandatory. Obtain additional documentation and senior approval.';
    case 'Medium': return 'Standard Due Diligence with enhanced monitoring and periodic review.';
    case 'Low': return 'Simplified Due Diligence applicable. Maintain standard documentation.';
    default: return 'Apply standard customer due diligence measures.';
  }
}

// AML red flags relevant to the insurance sector
export const redFlags = [
  'Customer requests unusually large single premium without clear justification',
  'Early cancellation of policy with refund request shortly after inception',
  'Premium paid by unrelated third party without satisfactory explanation',
  'Customer reluctant or refuses to provide identity documents',
  'Unusual or unrelated beneficiary designation inconsistent with the customer profile',
  'Customer appears unconcerned about policy terms, only interested in refundability',
  'Multiple policies taken out simultaneously with different insurers',
  'Frequent changes of beneficiary without clear reason',
  'Customer uses cash or unusual payment methods for large premiums',
  'Customer provides inconsistent information across different applications',
  'Known PEP or close associate of PEP with no enhanced due diligence conducted',
];
