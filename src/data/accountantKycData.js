export const accountantKycSections = [
  {
    id: 'client_profile',
    title: '1. CLIENT PROFILE INFORMATION',
    description: 'Accountants must identify clients before establishing a professional relationship or performing services.',
    subsections: [
      {
        id: 'natural_person_basic',
        title: 'Basic Personal Details (Natural Persons)',
        fields: [
          { id: 'full_name', label: 'Full name (including previous names or aliases)', type: 'text', required: true },
          { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { id: 'nationality', label: 'Nationality', type: 'text', required: true },
          { id: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
          { id: 'place_of_birth', label: 'Place of birth', type: 'text', required: true },
          { id: 'residential_address', label: 'Residential address', type: 'textarea', required: true },
          { id: 'postal_address', label: 'Postal address', type: 'textarea', required: true },
          { id: 'telephone_number', label: 'Telephone number', type: 'tel', required: true },
          { id: 'email_address', label: 'Email address', type: 'email', required: true },
          { id: 'occupation', label: 'Occupation / profession', type: 'text', required: true },
          { id: 'employer_name', label: 'Employer name and address', type: 'textarea', required: true },
          { id: 'tin', label: 'Taxpayer Identification Number (TIN)', type: 'text', required: true }
        ]
      }
    ]
  },
  {
    id: 'client_identification',
    title: '2. CLIENT IDENTIFICATION DOCUMENTS',
    description: 'Verification must be conducted using reliable independent documents.',
    subsections: [
      {
        id: 'id_document',
        title: 'Identification Document Details',
        fields: [
          { id: 'document_type', label: 'Type of document', type: 'select', options: ['National ID', 'Passport', 'Driving license', 'Voter registration card'], required: true },
          { id: 'id_number', label: 'Identification number', type: 'text', required: true },
          { id: 'issuing_authority', label: 'Issuing authority', type: 'text', required: true },
          { id: 'date_of_issue', label: 'Date of issue', type: 'date', required: true },
          { id: 'expiry_date', label: 'Expiry date', type: 'date', required: true }
        ]
      }
    ]
  },
  {
    id: 'legal_entity',
    title: '3. LEGAL ENTITY CLIENT INFORMATION',
    description: 'Complete this section if the client is a legal entity.',
    subsections: [
      {
        id: 'entity_details',
        title: 'Entity Details',
        fields: [
          { id: 'legal_name', label: 'Legal name of entity', type: 'text', required: false },
          { id: 'trading_name', label: 'Trading name', type: 'text', required: false },
          { id: 'registration_number', label: 'Registration number', type: 'text', required: false },
          { id: 'date_of_incorporation', label: 'Date of incorporation', type: 'date', required: false },
          { id: 'country_of_incorporation', label: 'Country of incorporation', type: 'text', required: false },
          { id: 'registered_address', label: 'Registered address', type: 'textarea', required: false },
          { id: 'business_address', label: 'Business address', type: 'textarea', required: false },
          { id: 'nature_of_business', label: 'Nature of business', type: 'textarea', required: false },
          { id: 'industry_sector', label: 'Industry sector', type: 'text', required: false },
          { id: 'entity_tin', label: 'Taxpayer Identification Number', type: 'text', required: false }
        ]
      },
      {
        id: 'directors',
        title: 'Directors and Senior Management',
        description: 'Provide information for each director or senior officer',
        fields: [
          { id: 'directors_info', label: 'Directors and Senior Management Details (Full name, Nationality, DOB, Address, ID Document, Position)', type: 'textarea', required: false, rows: 6 }
        ]
      }
    ]
  },
  {
    id: 'beneficial_ownership',
    title: '4. BENEFICIAL OWNERSHIP',
    description: 'Identify the natural persons who ultimately control the entity.',
    subsections: [
      {
        id: 'beneficial_owners',
        title: 'Beneficial Owners',
        fields: [
          { id: 'beneficial_owners_info', label: 'For each beneficial owner provide: Full name, Nationality, DOB, Address, Occupation, Ownership %, Source of wealth, ID document', type: 'textarea', required: true, rows: 6 },
          { id: 'ownership_involves_trusts', label: 'Does the ownership structure involve trusts or nominees?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'shareholders_above_5percent', label: 'Are there shareholders holding ≥5% ownership?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'shareholders_details', label: 'If yes, provide details', type: 'textarea', required: false }
        ]
      }
    ]
  },
  {
    id: 'professional_engagement',
    title: '5. PROFESSIONAL ENGAGEMENT INFORMATION',
    description: 'AML risk arises particularly when accountants provide certain services.',
    subsections: [
      {
        id: 'services_requested',
        title: 'Type of Services Requested',
        fields: [
          { id: 'audit_services', label: 'Audit services', type: 'checkbox' },
          { id: 'accounting_services', label: 'Accounting services', type: 'checkbox' },
          { id: 'tax_advisory', label: 'Tax advisory', type: 'checkbox' },
          { id: 'company_formation', label: 'Company formation', type: 'checkbox' },
          { id: 'business_restructuring', label: 'Business restructuring', type: 'checkbox' },
          { id: 'financial_advisory', label: 'Financial advisory', type: 'checkbox' },
          { id: 'managing_client_funds', label: 'Management of client funds or assets', type: 'checkbox' },
          { id: 'opening_bank_accounts', label: 'Opening bank accounts for client', type: 'checkbox' },
          { id: 'nominee_director', label: 'Acting as nominee director or shareholder', type: 'checkbox' },
          { id: 'buying_selling_business', label: 'Buying or selling businesses', type: 'checkbox' }
        ]
      },
      {
        id: 'engagement_details',
        title: 'Engagement Details',
        fields: [
          { id: 'purpose_of_engagement', label: 'Purpose of engagement', type: 'textarea', required: true },
          { id: 'expected_duration', label: 'Expected duration of engagement', type: 'text', required: true },
          { id: 'estimated_transaction_value', label: 'Estimated value of transactions involved', type: 'text', required: true },
          { id: 'expected_countries', label: 'Expected countries involved in transactions', type: 'textarea', required: true }
        ]
      }
    ]
  },
  {
    id: 'source_of_funds',
    title: '6. SOURCE OF FUNDS AND SOURCE OF WEALTH',
    description: 'Understand the origin of funds used in transactions.',
    subsections: [
      {
        id: 'funds_wealth',
        title: 'Source Information',
        fields: [
          { id: 'source_of_funds', label: 'Source of funds for the engagement', type: 'select', options: ['Business revenue', 'Salary', 'Investments', 'Loan', 'Inheritance', 'Other'], required: true },
          { id: 'source_of_funds_other', label: 'If other, please specify', type: 'text', required: false },
          { id: 'source_of_wealth', label: 'Source of wealth', type: 'textarea', required: true },
          { id: 'main_bank_accounts', label: 'Main bank accounts used', type: 'textarea', required: true },
          { id: 'estimated_funds_value', label: 'Estimated value of funds to be handled', type: 'text', required: true }
        ]
      }
    ]
  },
  {
    id: 'pep_status',
    title: '7. POLITICALLY EXPOSED PERSON (PEP)',
    description: 'Enhanced due diligence is required for PEP clients.',
    subsections: [
      {
        id: 'pep_screening',
        title: 'PEP Assessment',
        fields: [
          { id: 'is_pep', label: 'Are you a politically exposed person?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'held_public_office', label: 'Have you held a prominent public office?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'pep_family_member', label: 'Are you a family member of a PEP?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'pep_close_associate', label: 'Are you a close associate of a PEP?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'pep_position', label: 'If yes to any above, position held', type: 'text', required: false },
          { id: 'pep_country', label: 'Country', type: 'text', required: false },
          { id: 'pep_source_of_wealth', label: 'Source of wealth', type: 'textarea', required: false },
          { id: 'pep_expected_transactions', label: 'Expected transactions', type: 'textarea', required: false }
        ]
      }
    ]
  },
  {
    id: 'sanctions_compliance',
    title: '8. SANCTIONS AND LEGAL COMPLIANCE',
    description: 'Institutions must avoid dealing with sanctioned parties.',
    subsections: [
      {
        id: 'sanctions_check',
        title: 'Sanctions Screening',
        fields: [
          { id: 'un_sanctions_list', label: 'Are you listed on any UN sanctions list?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'financial_crimes_conviction', label: 'Have you ever been convicted of financial crimes?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'regulatory_investigation', label: 'Are you subject to regulatory investigation?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'associated_with_sanctioned', label: 'Are you associated with sanctioned persons or organizations?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'sanctions_details', label: 'If yes to any above, provide details', type: 'textarea', required: false }
        ]
      }
    ]
  },
  {
    id: 'risk_factors',
    title: '9. RISK FACTORS RELATED TO ACCOUNTING SERVICES',
    description: 'Accountants may act as gatekeepers to the financial system, which increases AML risks.',
    subsections: [
      {
        id: 'risk_evaluation',
        title: 'Risk Evaluation',
        fields: [
          { id: 'complex_ownership_structures', label: 'Uses complex ownership structures', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'multiple_jurisdictions', label: 'Requests company formation in multiple jurisdictions', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'managing_client_funds_request', label: 'Requests assistance in managing client funds', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'aggressive_tax_structures', label: 'Seeks advice on tax structures that appear aggressive or unclear', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'buying_selling_businesses', label: 'Requests assistance in buying or selling businesses', type: 'radio', options: ['Yes', 'No'], required: true }
        ]
      }
    ]
  },
  {
    id: 'transaction_profile',
    title: '10. TRANSACTION AND BUSINESS ACTIVITY PROFILE',
    description: 'Expected financial transactions during engagement.',
    subsections: [
      {
        id: 'transaction_details',
        title: 'Transaction Information',
        fields: [
          { id: 'expected_transactions', label: 'Expected financial transactions during engagement', type: 'textarea', required: true },
          { id: 'transaction_countries', label: 'Expected countries involved', type: 'textarea', required: true },
          { id: 'transaction_frequency', label: 'Frequency of transactions', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad-hoc'], required: true },
          { id: 'approximate_transaction_value', label: 'Approximate transaction value', type: 'text', required: true },
          { id: 'third_party_intermediaries', label: 'Use of third-party intermediaries', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'intermediaries_details', label: 'If yes, provide details', type: 'textarea', required: false }
        ]
      }
    ]
  },
  {
    id: 'ongoing_monitoring',
    title: '11. ONGOING MONITORING',
    description: 'Accountants must maintain ongoing monitoring of clients and engagements.',
    subsections: [
      {
        id: 'monitoring_commitment',
        title: 'Monitoring Agreement',
        fields: [
          { id: 'monitoring_acknowledgment', label: 'I acknowledge that the accountant will monitor: Changes in ownership, Changes in management, Unusual transactions, Changes in client business activities', type: 'checkbox', required: true }
        ]
      }
    ]
  },
  {
    id: 'suspicious_activity',
    title: '12. SUSPICIOUS ACTIVITY INDICATORS',
    description: 'Red flags that may require a Suspicious Transaction Report (STR) to the FIU.',
    subsections: [
      {
        id: 'red_flags',
        title: 'Red Flag Assessment',
        fields: [
          { id: 'reluctant_to_provide_id', label: 'Client reluctant to provide identification documents', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'complex_structures_no_rationale', label: 'Complex corporate structures without economic rationale', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'inconsistent_transactions', label: 'Transactions inconsistent with client business profile', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'requests_fund_movement', label: 'Requests to move funds through accounting firms', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'unusual_arrangements', label: 'Unusual tax or financial arrangements', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'red_flag_details', label: 'If yes to any above, provide details', type: 'textarea', required: false }
        ]
      }
    ]
  },
  {
    id: 'client_declaration',
    title: '13. CLIENT DECLARATION',
    description: 'Client confirmation and signature.',
    subsections: [
      {
        id: 'declaration',
        title: 'Declaration',
        fields: [
          { id: 'declaration_accuracy', label: 'I confirm that the information provided is accurate', type: 'checkbox', required: true },
          { id: 'declaration_authentic', label: 'I confirm that documents submitted are authentic', type: 'checkbox', required: true },
          { id: 'declaration_verification', label: 'I acknowledge that the accountant may verify the information', type: 'checkbox', required: true },
          { id: 'declaration_notify', label: 'I will notify the firm of any changes to the information provided', type: 'checkbox', required: true },
          { id: 'signature_name', label: 'Full name (signature)', type: 'text', required: true },
          { id: 'signature_date', label: 'Date', type: 'date', required: true }
        ]
      }
    ]
  }
];

export const accountantRiskFactors = {
  customer_risk: [
    { indicator: 'is_pep', label: 'Politically Exposed Person', score: 30 },
    { indicator: 'pep_associate', label: 'PEP associate or family member', score: 25 },
    { indicator: 'high_net_worth', label: 'High net worth individual', score: 15 },
    { indicator: 'non_resident', label: 'Non-resident client', score: 15 },
    { indicator: 'complex_ownership', label: 'Complex ownership structure', score: 20 },
    { indicator: 'cash_intensive', label: 'Cash-intensive business', score: 20 },
    { indicator: 'government_entity', label: 'Government entity', score: 0 }
  ],
  geographic_risk: [
    { indicator: 'sanctioned_country', label: 'Sanctioned country', score: 40 },
    { indicator: 'fatf_high_risk', label: 'FATF high-risk jurisdiction', score: 35 },
    { indicator: 'high_corruption', label: 'High corruption index country', score: 20 },
    { indicator: 'medium_risk', label: 'Medium-risk jurisdiction', score: 10 },
    { indicator: 'low_risk', label: 'Low-risk jurisdiction', score: 0 }
  ],
  service_risk: [
    { indicator: 'company_formation', label: 'Company formation services', score: 25 },
    { indicator: 'managing_funds', label: 'Managing client funds or assets', score: 30 },
    { indicator: 'opening_accounts', label: 'Opening bank accounts for clients', score: 25 },
    { indicator: 'buying_selling', label: 'Buying or selling companies', score: 20 },
    { indicator: 'tax_advisory_complex', label: 'Tax advisory for complex offshore structures', score: 20 },
    { indicator: 'restructuring', label: 'Corporate restructuring', score: 15 },
    { indicator: 'audit_standard', label: 'Standard audit services', score: 5 },
    { indicator: 'accounting_basic', label: 'Basic accounting/bookkeeping', score: 5 }
  ],
  transaction_risk: [
    { indicator: 'large_unexplained', label: 'Large unexplained transactions', score: 25 },
    { indicator: 'inconsistent_profile', label: 'Transactions inconsistent with client profile', score: 25 },
    { indicator: 'third_party_funding', label: 'Third-party funding', score: 20 },
    { indicator: 'frequent_ownership_changes', label: 'Frequent changes in ownership', score: 20 },
    { indicator: 'cross_border', label: 'Cross-border transactions', score: 15 },
    { indicator: 'normal_transactions', label: 'Normal business transactions', score: 5 }
  ],
  delivery_channel_risk: [
    { indicator: 'non_face_to_face', label: 'Non-face-to-face client onboarding', score: 20 },
    { indicator: 'third_party_intro', label: 'Client introduced by third party', score: 15 },
    { indicator: 'online_only', label: 'Online engagement only', score: 15 },
    { indicator: 'face_to_face', label: 'Face-to-face engagement', score: 5 }
  ],
  beneficial_ownership_risk: [
    { indicator: 'owner_unknown', label: 'Beneficial owner unknown', score: 30 },
    { indicator: 'nominee_shareholders', label: 'Nominee shareholders', score: 25 },
    { indicator: 'trust_structures', label: 'Trust ownership structures', score: 20 },
    { indicator: 'layered_ownership', label: 'Multiple layered ownership', score: 20 },
    { indicator: 'transparent_ownership', label: 'Transparent ownership', score: 0 }
  ],
  behavioural_risk: [
    { indicator: 'refuses_documents', label: 'Client refuses to provide documents', score: 30 },
    { indicator: 'reluctant_disclosure', label: 'Client reluctant to disclose beneficial owners', score: 25 },
    { indicator: 'requests_secrecy', label: 'Requests secrecy in transactions', score: 25 },
    { indicator: 'unusual_urgency', label: 'Unusual urgency for financial services', score: 20 },
    { indicator: 'frequent_adviser_changes', label: 'Frequent changes in professional advisers', score: 15 }
  ]
};

export const riskCategories = [
  { label: 'Low Risk', range: '0-25', color: '#48bb78' },
  { label: 'Medium Risk', range: '26-50', color: '#ed8936' },
  { label: 'High Risk', range: '51-75', color: '#f56565' },
  { label: 'Very High Risk', range: '76-100', color: '#9b2c2c' }
];

export const monitoringFrequency = {
  'Low Risk': 'Every 3-5 years',
  'Medium Risk': 'Every 2 years',
  'High Risk': 'Annually',
  'Very High Risk': 'Continuous monitoring'
};

export const riskMitigationActions = {
  'Low Risk': 'Simplified Due Diligence',
  'Medium Risk': 'Standard CDD',
  'High Risk': 'Enhanced Due Diligence',
  'Very High Risk': 'Senior partner approval + continuous monitoring'
};
