/**
 * KYC/CDD section list for LAW FIRMS (legal professionals).
 *
 * SOURCES
 *  - FATF Guidance for a Risk-Based Approach for Legal Professionals (2019)
 *      R.22 designated activities (§20); service/transaction risk factors (a)-(r);
 *      client and country risk factors.
 *  - FIU Guide to DNFBPs 2023 - §7 CDD, §8 EDD, §9 beneficial ownership,
 *      §10 PEPs, §11 record keeping, §12 STR, Annex A model policies, Annex B red flags.
 *  - Anti-Money Laundering Act, Cap. 423; AML Regulations 2022 (GN 397).
 *  - Prevention of Terrorism Act Regulations 2022 (sanctions screening).
 *
 * Service types in §5 carry the risk scores from the original serviceRiskFactors
 * taxonomy (general advice 1 -> offshore structures 5).
 */

export const lawFirmKycSections = [
  // ─────────────────────────────────────────────────────────────
  {
    id: 'client_profile_natural',
    title: '1. CLIENT PROFILE - NATURAL PERSON',
    description: 'Identify the client before establishing the retainer or carrying out any specified activity. Guide to DNFBPs 2023 §7.1(a).',
    customerTypes: ['natural_person'],
    subsections: [
      {
        id: 'personal_details',
        title: 'Personal Details',
        fields: [
          { id: 'full_name', label: 'Full name (including former names or aliases)', type: 'text', required: true },
          { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { id: 'nationality', label: 'Nationality', type: 'text', required: true },
          { id: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
          { id: 'place_of_birth', label: 'Place of birth', type: 'text', required: true },
          { id: 'residential_address', label: 'Residential address', type: 'textarea', required: true },
          { id: 'postal_address', label: 'Postal address', type: 'textarea', required: false },
          { id: 'telephone_number', label: 'Telephone number', type: 'tel', required: true },
          { id: 'email_address', label: 'Email address', type: 'email', required: false },
          { id: 'occupation', label: 'Occupation / profession', type: 'text', required: true },
          { id: 'employer_name', label: 'Employer name and address', type: 'textarea', required: false },
          { id: 'tin', label: 'Taxpayer Identification Number (TIN)', type: 'text', required: false }
        ]
      },
      {
        id: 'identification_document',
        title: 'Identification Document',
        fields: [
          { id: 'document_type', label: 'Type of document', type: 'select', options: ['National ID', 'Passport', 'Driving licence', 'Voter registration card'], required: true },
          { id: 'id_number', label: 'Identification number', type: 'text', required: true },
          { id: 'issuing_authority', label: 'Issuing authority', type: 'text', required: true },
          { id: 'date_of_issue', label: 'Date of issue', type: 'date', required: false },
          { id: 'expiry_date', label: 'Expiry date', type: 'date', required: false },
          { id: 'verification_method', label: 'How was identity verified?', type: 'select', options: ['Original document sighted', 'Certified copy', 'Electronic verification', 'Third party (see §4)'], required: true, helpText: 'Verification must use reliable, independent source documents. Guide §7.1(a).' }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'client_profile_entity',
    title: '2. CLIENT PROFILE - LEGAL ENTITY',
    description: 'Complete where the client is a company, partnership, trust or other legal arrangement. Guide §7.1; GN 397 (2022).',
    customerTypes: ['legal_entity'],
    subsections: [
      {
        id: 'entity_details',
        title: 'Entity Details',
        fields: [
          { id: 'legal_name', label: 'Registered legal name', type: 'text', required: true },
          { id: 'trading_name', label: 'Trading name (if different)', type: 'text', required: false },
          { id: 'entity_type', label: 'Type of entity', type: 'select', options: ['Private limited company', 'Public limited company', 'Partnership', 'Sole proprietorship', 'Trust', 'Foundation', 'NGO / association', 'Government body', 'Other'], required: true },
          { id: 'registration_number', label: 'Registration number (BRELA or equivalent)', type: 'text', required: true },
          { id: 'country_of_incorporation', label: 'Country of incorporation', type: 'text', required: true },
          { id: 'date_of_incorporation', label: 'Date of incorporation', type: 'date', required: true },
          { id: 'registered_address', label: 'Registered address', type: 'textarea', required: true },
          { id: 'business_address', label: 'Principal place of business', type: 'textarea', required: true },
          { id: 'nature_of_business', label: 'Nature of business', type: 'textarea', required: true },
          { id: 'entity_tin', label: 'Taxpayer Identification Number (TIN)', type: 'text', required: true }
        ]
      },
      {
        id: 'directors_officers',
        title: 'Directors and Officers',
        fields: [
          { id: 'directors_details', label: 'Names, nationalities and ID numbers of all directors / partners / trustees', type: 'textarea', required: true },
          { id: 'authorised_signatories', label: 'Authorised signatories', type: 'textarea', required: true },
          { id: 'entity_verified_docs', label: 'Verification documents obtained', type: 'checkbox-group', options: ['Certificate of incorporation', 'Memorandum and articles', 'Board resolution', 'Partnership deed', 'Trust deed', 'Register of directors', 'Register of members'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'beneficial_ownership',
    title: '3. BENEFICIAL OWNERSHIP',
    description: 'Identify the natural person(s) who ultimately own or control the client. Guide §9; FATF RBA - services capable of concealing beneficial ownership are a high-risk factor.',
    customerTypes: ['legal_entity'],
    subsections: [
      {
        id: 'bo_declaration',
        title: 'Beneficial Ownership Declaration',
        fields: [
          { id: 'has_beneficial_owners', label: 'Are there natural persons owning or controlling 25% or more?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'beneficial_owners_details', label: 'Full name, nationality, date of birth, ID number and percentage held for each beneficial owner', type: 'textarea', required: true },
          { id: 'control_other_means', label: 'Any person exercising control by other means (voting rights, board appointment, contractual)?', type: 'textarea', required: false, helpText: 'Where no natural person is identified through ownership, identify the person exercising control. Guide §9.1.' },
          { id: 'ownership_structure_verified', label: 'Has the ownership and control structure been documented and verified?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'nominee_arrangements', label: 'Does the structure involve nominee shareholders or nominee directors?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA flags ownership through nominee shareholders as a higher-risk indicator.' },
          { id: 'layered_structure', label: 'Does the structure involve multiple layers, or entities in more than one jurisdiction?', type: 'radio', options: ['Yes', 'No'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'person_acting',
    title: '4. PERSON ACTING ON BEHALF OF THE CLIENT',
    description: 'Where instructions are given by someone other than the client, identify that person and verify their authority. Guide §7.1(b).',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'representative',
        title: 'Authorised Representative',
        fields: [
          { id: 'has_representative', label: 'Is any person acting on behalf of the client?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'rep_full_name', label: 'Full name of representative', type: 'text', required: false },
          { id: 'rep_id_number', label: 'Representative identification number', type: 'text', required: false },
          { id: 'rep_relationship', label: 'Relationship to the client', type: 'text', required: false },
          { id: 'rep_authority_evidence', label: 'Evidence of authority to act', type: 'select', options: ['Power of attorney', 'Board resolution', 'Letter of authority', 'Court order', 'Other'], required: false },
          { id: 'rep_verified', label: 'Has the representative\'s identity and authority been verified?', type: 'radio', options: ['Yes', 'No'], required: false }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'matter_scope',
    title: '5. MATTER AND ENGAGEMENT SCOPE',
    description: 'Record the nature and purpose of the retainer. Service type drives the inherent risk rating.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'matter_details',
        title: 'Matter Details',
        fields: [
          { id: 'matter_reference', label: 'Matter / file reference', type: 'text', required: true },
          { id: 'service_type', label: 'Primary service type', type: 'select', required: true,
            options: [
              'General legal advice and consultation',
              'Family law and personal matters',
              'Employment and labour law',
              'Corporate and commercial transactions',
              'Real estate and property transactions',
              'Mergers, acquisitions and business sales',
              'Trust formation and estate planning',
              'International transactions and offshore structures'
            ],
            helpText: 'Risk weighting ascends from general advice (lowest) to offshore structures (highest).' },
          { id: 'matter_description', label: 'Description of the retainer and instructions received', type: 'textarea', required: true },
          { id: 'purpose_of_engagement', label: 'Purpose and intended nature of the relationship', type: 'textarea', required: true, helpText: 'Guide §7.3 requires the purpose and intended nature of the business relationship to be understood.' },
          { id: 'expected_duration', label: 'Expected duration of the retainer', type: 'select', options: ['One-off / transactional', 'Under 6 months', '6-12 months', 'Over 12 months', 'Ongoing / retainer'], required: true },
          { id: 'estimated_value', label: 'Estimated value of the transaction or matter (TZS)', type: 'number', required: false },
          { id: 'counterparties', label: 'Counterparties and other parties to the matter', type: 'textarea', required: false },
          { id: 'referral_source', label: 'How was the client introduced to the firm?', type: 'select', options: ['Existing client', 'Professional referral', 'Direct approach', 'Online enquiry', 'Intermediary / agent', 'Other'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'designated_activity',
    title: '6. DESIGNATED ACTIVITY DETERMINATION (FATF R.22)',
    description: 'CDD and record-keeping obligations attach when a legal professional prepares for or carries out any of the following activities for a client. Record the determination for this matter.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'r22_activities',
        title: 'Specified Activities',
        fields: [
          { id: 'activity_real_estate', label: 'Buying and selling of real estate', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'activity_client_money', label: 'Managing client money, securities or other assets', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'activity_accounts', label: 'Management of bank, savings or securities accounts', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'activity_company_contributions', label: 'Organisation of contributions for the creation, operation or management of companies', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'activity_entity_formation', label: 'Creation, operation or management of legal persons or arrangements, or buying and selling of business entities', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'acting_as_formation_agent', label: 'Is the firm acting as a formation agent for a legal person?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'acting_as_nominee', label: 'Will the firm or its personnel act as, or arrange for another to act as, a nominee director, shareholder or trustee?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA identifies nominee arrangements as a mechanism for concealing beneficial ownership.' },
          { id: 'scope_determination', label: 'Determination', type: 'select', options: ['Matter is within scope - full CDD applies', 'Matter is outside scope - no specified activity', 'Uncertain - escalated to MLRO'], required: true },
          { id: 'determination_notes', label: 'Basis for the determination', type: 'textarea', required: false }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'client_account',
    title: '7. CLIENT ACCOUNT AND FUND FLOWS',
    description: 'Movement of client funds through the firm is the principal ML risk for legal professionals. FATF RBA service risk factors (a)-(c) and (i).',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'fund_handling',
        title: 'Handling of Client Funds',
        fields: [
          { id: 'funds_through_client_account', label: 'Will client funds pass through the firm\'s client / trust account?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'funds_not_tied_to_activity', label: 'Are any deposits or transfers requested that are NOT tied to a specified activity in §6?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA (b): use of the trust account unconnected to underlying legal work is a recognised typology.' },
          { id: 'transactions_outside_account', label: 'Has the client requested that any transaction occur outside the client account (e.g. via the firm\'s general account or a third party)?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA (c).' },
          { id: 'firm_as_intermediary', label: 'Will the firm effectively receive and transmit funds as a financial intermediary?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA (a).' },
          { id: 'expected_inflow', label: 'Expected value of funds to be received (TZS)', type: 'number', required: false },
          { id: 'payment_method', label: 'Expected method of payment', type: 'select', options: ['Bank transfer', 'Cheque', 'Cash', 'Mobile money', 'Precious metals or stones', 'Virtual assets', 'Other'], required: true, helpText: 'FATF RBA (p),(q): virtual assets and unusual payment means are higher-risk indicators.' },
          { id: 'third_party_payer', label: 'Will any payment be received from a person other than the client?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'FATF RBA (i): payments from unassociated or unknown third parties.' },
          { id: 'third_party_payer_details', label: 'Identify the third-party payer and their relationship to the client', type: 'textarea', required: false }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'source_of_funds',
    title: '8. SOURCE OF FUNDS AND SOURCE OF WEALTH',
    description: 'Source of funds is the origin of the money used in this matter. Source of wealth is how the client accumulated their overall wealth. Guide §7.3, §8.2.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'sof_sow',
        title: 'Origin of Funds and Wealth',
        fields: [
          { id: 'source_of_funds', label: 'Source of funds for this matter', type: 'select', options: ['Salary or employment income', 'Business revenue', 'Sale of property or assets', 'Loan or financing', 'Investment income', 'Inheritance or gift', 'Court award or settlement', 'Other'], required: true },
          { id: 'source_of_funds_detail', label: 'Describe the source of funds and the evidence obtained', type: 'textarea', required: true },
          { id: 'source_of_wealth', label: 'Source of overall wealth (required for enhanced due diligence)', type: 'textarea', required: false, helpText: 'Required where the client is a PEP or otherwise high risk. Guide §8.2, §10.4.' },
          { id: 'sof_evidence_obtained', label: 'Supporting evidence obtained', type: 'checkbox-group', options: ['Bank statements', 'Payslips or employment contract', 'Audited accounts', 'Sale agreement', 'Loan agreement', 'Grant of probate', 'Court order', 'None obtained'], required: true },
          { id: 'funds_from_high_risk_jurisdiction', label: 'Do any funds originate from, or transit through, a higher-risk jurisdiction?', type: 'radio', options: ['Yes', 'No'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'pep_declaration',
    title: '9. POLITICALLY EXPOSED PERSON DECLARATION',
    description: 'PEPs are a higher-risk category. Senior management approval and source of wealth are required. Guide §10.3, §10.4.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'pep_status',
        title: 'PEP Status',
        fields: [
          { id: 'is_pep', label: 'Is the client, or any beneficial owner, a politically exposed person?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'pep_category', label: 'PEP category', type: 'select', options: ['Domestic PEP', 'Foreign PEP', 'International organisation PEP', 'Not applicable'], required: false },
          { id: 'pep_position', label: 'Position held and period', type: 'text', required: false },
          { id: 'pep_family_associate', label: 'Is the client a family member or close associate of a PEP?', type: 'radio', options: ['Yes', 'No'], required: true, helpText: 'Guide §10.2: PEPs often use family members or close associates to conceal funds.' },
          { id: 'pep_senior_approval', label: 'Has senior management approved establishing or continuing the relationship?', type: 'radio', options: ['Yes', 'No', 'Not applicable'], required: true },
          { id: 'pep_approver', label: 'Name and position of approver', type: 'text', required: false }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'sanctions_screening',
    title: '10. SANCTIONS AND WATCHLIST SCREENING',
    description: 'Screen the client, beneficial owners and counterparties before the relationship is established. Prevention of Terrorism Act Regulations 2022.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'screening',
        title: 'Screening Results',
        fields: [
          { id: 'screening_conducted', label: 'Has sanctions screening been conducted?', type: 'radio', options: ['Yes', 'No'], required: true },
          { id: 'lists_screened', label: 'Lists screened against', type: 'checkbox-group', options: ['United Nations Consolidated List', 'National designation list', 'OFAC', 'UK HMT/OFSI', 'EU Consolidated List', 'Adverse media'], required: true },
          { id: 'screening_date', label: 'Date of screening', type: 'date', required: true },
          { id: 'screening_result', label: 'Result', type: 'select', options: ['No match', 'Potential match - under review', 'Confirmed match'], required: true },
          { id: 'match_resolution', label: 'If a match was identified, describe the review and outcome', type: 'textarea', required: false },
          { id: 'counterparties_screened', label: 'Were counterparties to the matter also screened?', type: 'radio', options: ['Yes', 'No', 'Not applicable'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'client_risk_assessment',
    title: '11. CLIENT RISK ASSESSMENT',
    description: 'Assess risk across client, geographic and service dimensions. FATF RBA for Legal Professionals; Guide §5.3.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'risk_factors',
        title: 'Risk Factors',
        fields: [
          { id: 'client_risk_level', label: 'Client risk', type: 'select', options: ['Low - long-standing, transparent, domestic', 'Medium - new client, standard profile', 'High - PEP, complex structure, adverse media, reluctance to provide information'], required: true },
          { id: 'geographic_risk_level', label: 'Geographic risk', type: 'select', options: ['Low - Tanzania or equivalent jurisdiction', 'Medium - other foreign jurisdiction', 'High - jurisdiction subject to FATF call for action or increased monitoring'], required: true },
          { id: 'service_risk_level', label: 'Service risk', type: 'select', options: ['Low - advisory or litigation, no fund handling', 'Medium - transactional, limited fund handling', 'High - fund handling, entity formation, offshore or nominee arrangements'], required: true },
          { id: 'delivery_channel_risk', label: 'Delivery channel', type: 'select', options: ['Face to face', 'Remote with verified identity', 'Remote, non-face-to-face, unverified', 'Through an intermediary'], required: true },
          { id: 'overall_risk_rating', label: 'Overall client risk rating', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
          { id: 'dd_level_applied', label: 'Due diligence level applied', type: 'select', options: ['Simplified', 'Standard', 'Enhanced'], required: true, helpText: 'Simplified CDD may only be applied where lower risk is identified and documented, and never where ML/TF is suspected. Guide §8.3.' },
          { id: 'risk_rationale', label: 'Rationale for the rating', type: 'textarea', required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'red_flags',
    title: '12. RED FLAGS AND SUSPICIOUS INDICATORS',
    description: 'Indicators drawn from FATF RBA service risk factors and Guide to DNFBPs 2023 Annex B. Presence of an indicator does not itself require a report, but must be considered.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'indicators',
        title: 'Indicators Observed',
        fields: [
          { id: 'flags_observed', label: 'Select all indicators present in this matter', type: 'checkbox-group', required: false,
            options: [
              'Client reluctant to provide identification or beneficial ownership information',
              'Use of shell companies or ownership through nominee shareholders',
              'Structure or arrangement appears designed to obscure beneficial ownership',
              'Client seeks unnecessary anonymity in the transaction',
              'Instructions outside the firm\'s usual area of expertise or geography',
              'Transaction has no apparent economic or lawful purpose',
              'Unusual means of payment (precious metals or stones, virtual assets)',
              'Payment postponed for an asset or service delivered immediately',
              'Settlement of a default judgment or ADR in circumstances that appear contrived',
              'Funds received from, or transmitted to, an unassociated third party',
              'Transfer of real estate or high-value assets between parties with no commercial rationale',
              'Client requests the firm hold funds with no underlying legal work',
              'Estate administration where the deceased was known to be under investigation',
              'Rapid or unexplained change in instructions or counterparties',
              'Client willing to accept unfavourable terms without explanation'
            ]
          },
          { id: 'flags_narrative', label: 'Describe any indicator selected and the enquiries made', type: 'textarea', required: false },
          { id: 'internal_report_made', label: 'Has an internal suspicion report been made to the MLRO?', type: 'radio', options: ['Yes', 'No', 'Not applicable'], required: true, helpText: 'Annex A §10.0. Do not disclose to the client that a report has been or may be made - Guide §14.0.' },
          { id: 'str_filed', label: 'Has an STR been filed with the FIU?', type: 'radio', options: ['Yes', 'No', 'Under consideration'], required: true, helpText: 'An STR must be filed within 24 hours of identifying the transaction as suspicious. Guide §12.8.1.' }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'ongoing_monitoring',
    title: '13. ONGOING MONITORING',
    description: 'Scrutinise the relationship over its life and keep CDD information current. Guide §7.3; Annex A §11.0.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'monitoring',
        title: 'Monitoring Arrangements',
        fields: [
          { id: 'review_frequency', label: 'Review frequency', type: 'select', options: ['Annual (low risk)', 'Semi-annual (medium risk)', 'Quarterly (high risk)', 'On each new matter'], required: true },
          { id: 'next_review_date', label: 'Next scheduled review', type: 'date', required: true },
          { id: 'trigger_events', label: 'Events that will trigger an out-of-cycle review', type: 'checkbox-group', options: ['Change in beneficial ownership', 'New matter of a different service type', 'Change in jurisdiction', 'Adverse media or sanctions hit', 'Unusual fund movement', 'Client becomes a PEP'], required: false },
          { id: 'cdd_currency_confirmed', label: 'Confirm CDD information is current as at the date of this record', type: 'radio', options: ['Yes', 'No'], required: true }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: 'declaration_approval',
    title: '14. DECLARATION AND COMPLIANCE APPROVAL',
    description: 'Client attestation and internal sign-off. Records must be retained for at least ten years. Guide §11.2.1.',
    customerTypes: ['natural_person', 'legal_entity'],
    subsections: [
      {
        id: 'client_declaration',
        title: 'Client Declaration',
        fields: [
          { id: 'client_declaration_confirmed', label: 'The client confirms that the information provided is true, complete and accurate, and undertakes to notify the firm of any material change.', type: 'radio', options: ['Confirmed', 'Not confirmed'], required: true },
          { id: 'client_signature_name', label: 'Name of person signing', type: 'text', required: true },
          { id: 'client_declaration_date', label: 'Date', type: 'date', required: true }
        ]
      },
      {
        id: 'firm_approval',
        title: 'Firm Compliance Approval',
        fields: [
          { id: 'prepared_by', label: 'Prepared by (fee earner)', type: 'text', required: true },
          { id: 'reviewed_by', label: 'Reviewed by (Compliance Officer / MLRO)', type: 'text', required: true },
          { id: 'approval_decision', label: 'Decision', type: 'select', options: ['Approved - proceed', 'Approved with conditions', 'Escalated to senior management', 'Declined - relationship not established'], required: true, helpText: 'Where CDD cannot be completed, the firm must not act, must consider terminating the relationship, and must consider filing an STR. Guide §7.5, §7.6.' },
          { id: 'approval_conditions', label: 'Conditions or notes', type: 'textarea', required: false },
          { id: 'approval_date', label: 'Date of approval', type: 'date', required: true }
        ]
      }
    ]
  }
];

export default lawFirmKycSections;
