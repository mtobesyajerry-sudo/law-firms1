# Complete System Documentation
## Tanzania Law Firm AML/CFT Compliance System

**Generated:** 2026-03-08
**Purpose:** Complete documentation for replication in another project

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Role Hierarchy](#user-role-hierarchy)
3. [Dashboard Systems](#dashboard-systems)
4. [KYC/CDD Components](#kyccdd-components)
5. [Matter Management](#matter-management)
6. [Risk Assessment Framework](#risk-assessment-framework)
7. [Maturity Assessment System](#maturity-assessment-system)
8. [Database Schema](#database-schema)
9. [Code Examples](#code-examples)

---

## 1. System Overview

This is a comprehensive AML/CFT (Anti-Money Laundering/Counter-Terrorist Financing) compliance system designed specifically for law firms in Tanzania. It implements FATF (Financial Action Task Force) standards and TLS (Tanzania Law Society) regulations.

### Key Features

- **Four-Module Risk Assessment Framework** (Inherent Risk, Technical Compliance, Effectiveness, Institutional Maturity)
- **Three-Tier Questionnaire System** (35-62 questions based on firm size)
- **5-Level Maturity Assessment** (Initial → Developing → Defined → Managed → Optimised)
- **Role-Based Access Control** (7 roles with hierarchical permissions)
- **Multi-User Dual Approval System** (Client-level and organizational-level)
- **AML Trigger Activity Tracking** for legal matters
- **Enhanced Due Diligence (EDD)** automation
- **Beneficial Ownership Verification**
- **Source of Funds/Wealth (SOF/SOW)** tracking

### Technology Stack

- **Frontend:** React with Hooks (useState, useEffect, useNavigate)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Security:** Row-Level Security (RLS) policies
- **Routing:** React Router DOM
- **Styling:** Inline styles (no CSS framework)

---

## 2. User Role Hierarchy

### Role Structure

```
System Admin (admin)
    └── Management Users (management, senior_partner, partner) [Limited to 3]
        ├── Staff Users (staff, lawyer)
        ├── Compliance Officers (compliance_officer)
        └── MLRO (mlro)
```

### Role Definitions

| Role | Code | Access Level | Key Permissions |
|------|------|-------------|-----------------|
| System Admin | `admin` | Full | All system access, user creation, organization management |
| Senior Partner | `senior_partner` | Management | Client overview, staff oversight, read-only compliance |
| Partner | `partner` | Management | Client overview, staff oversight, read-only compliance |
| Management | `management` | Management | Client overview, staff oversight, read-only compliance |
| Staff | `staff` | Operational | Client onboarding, matter management, document handling |
| Lawyer | `lawyer` | Operational | Client onboarding, matter management, document handling |
| Compliance Officer | `compliance_officer` | Review | Assessment review, compliance monitoring (read-only) |
| MLRO | `mlro` | Review | Money Laundering Reporting Officer oversight |

### User Admission Process

1. **System Admin** approves law firm registration requests
2. **System Admin** admits only **3 management users** per organization
3. **Management users** approve role upgrade requests from staff/compliance
4. **Dual approval system** requires 2 management users to approve client access

---

## 3. Dashboard Systems

### 3.1 Client Management Dashboard

**Path:** `/dashboard/management`
**Roles:** `management`, `senior_partner`, `partner`

#### Key Features

- Organization overview with statistics
- Staff user management (read-only)
- Client portfolio overview
- Matter tracking (read-only)
- Assessment monitoring
- Compliance dashboard integration

#### Component Structure

```javascript
export default function ClientManagementDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [matters, setMatters] = useState([]);
  const [staff, setStaff] = useState([]);

  // Key metrics displayed:
  // - Total clients
  // - Active matters
  // - Staff members
  // - Pending assessments
  // - High-risk clients requiring EDD

  return (
    <div style={styles.container}>
      {/* Header with organization info */}
      <Header profile={profile} />

      {/* Statistics Grid */}
      <StatsGrid stats={stats} />

      {/* Client Management Section */}
      <ClientSection clients={clients} />

      {/* Matter Overview (Read-Only) */}
      <MatterSection matters={matters} />

      {/* Staff Overview */}
      <StaffSection staff={staff} />
    </div>
  );
}
```

#### Read-Only Enforcement

Management users have **read-only access** to:
- Matter details (cannot create/edit/delete)
- Client documents (view only)
- Assessment responses (view reports only)

---

### 3.2 Staff Dashboard

**Path:** `/dashboard/staff`
**Roles:** `staff`, `lawyer`

#### Key Features

- Client onboarding workflow
- Matter creation and management
- Document upload and verification
- Risk assessment initiation
- SOF/SOW verification forms
- Beneficial ownership tracking

#### Component Structure

```javascript
export default function StaffDashboard() {
  const [clients, setClients] = useState([]);
  const [matters, setMatters] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  // Staff can:
  // - Create new clients (pending management approval)
  // - Create and manage matters
  // - Upload client documents
  // - Initiate risk assessments
  // - Track AML trigger activities

  return (
    <div style={styles.container}>
      <Header />

      {/* Pending Tasks */}
      <TasksSection tasks={pendingTasks} />

      {/* Client Onboarding */}
      <OnboardingSection />

      {/* Active Matters */}
      <MattersSection matters={matters} />

      {/* Document Management */}
      <DocumentsSection />
    </div>
  );
}
```

#### Key Workflows

**Client Onboarding:**
1. Staff creates client profile
2. Uploads required KYC documents
3. Completes CDD questionnaire
4. Verifies beneficial owners
5. Management approves (dual approval if client-level access required)

---

### 3.3 Compliance Officer Dashboard

**Path:** `/dashboard/compliance`
**Roles:** `compliance_officer`, `mlro`

#### Key Features

- Assessment review and monitoring
- High-risk client identification
- STR (Suspicious Transaction Report) oversight
- Compliance report generation
- Audit trail review
- Risk dashboard

#### Component Structure

```javascript
export default function ComplianceOfficerDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [highRiskClients, setHighRiskClients] = useState([]);
  const [strs, setSTRs] = useState([]);

  // Compliance can:
  // - Review all assessments (read-only)
  // - Monitor high-risk clients
  // - View STR submissions
  // - Generate compliance reports
  // - Cannot modify client data or assessments

  return (
    <div style={styles.container}>
      <Header />

      {/* Risk Overview */}
      <RiskOverview clients={highRiskClients} />

      {/* Assessment Monitoring */}
      <AssessmentSection assessments={assessments} />

      {/* STR Dashboard */}
      <STRSection strs={strs} />

      {/* Compliance Reports */}
      <ReportsSection />
    </div>
  );
}
```

#### Read-Only Enforcement

Compliance officers have **read-only access** to ALL data:
- Cannot create/edit clients
- Cannot modify assessments
- Cannot upload documents
- Cannot approve requests
- Can only view and report

---

## 4. KYC/CDD Components

### 4.1 KYC Client Details Component

**Path:** `/src/components/KYCClientDetails.jsx`
**Purpose:** Comprehensive client onboarding and KYC/CDD data collection

#### Data Model

```javascript
const kycClientSchema = {
  // Basic Information
  client_name: 'string',
  client_type: 'individual | corporate | trust | partnership',
  organization_id: 'uuid',

  // Risk Classification
  risk_rating: 'low | medium | high | very_high',
  dd_level: 'simplified | standard | enhanced',
  requires_edd: 'boolean',

  // PEP Information
  is_pep: 'boolean',
  pep_details: 'text',
  pep_relationship: 'string',

  // Geographic Risk
  country_of_residence: 'string',
  country_of_incorporation: 'string',
  operates_in_high_risk_jurisdictions: 'boolean',
  high_risk_jurisdictions: 'array',

  // Business Information
  industry_sector: 'string',
  business_activities: 'text',
  annual_turnover: 'numeric',
  source_of_funds: 'string',
  source_of_wealth: 'string',

  // Beneficial Ownership
  beneficial_owners: 'jsonb', // Array of owner objects
  ownership_structure_complex: 'boolean',
  ultimate_beneficial_owner_verified: 'boolean',

  // AML Trigger Activities
  aml_trigger_activities: 'array',
  cross_border_transactions: 'boolean',
  high_value_transactions: 'boolean',

  // Verification
  identity_verified: 'boolean',
  identity_verification_date: 'date',
  identity_verification_method: 'string',
  address_verified: 'boolean',

  // SOF/SOW Verification
  sof_verification_status: 'not_started | in_progress | verified | rejected',
  sof_verification_date: 'date',
  sof_documents_uploaded: 'boolean',
  sow_verification_status: 'not_started | in_progress | verified | rejected',
  sow_verification_date: 'date',
  sow_documents_uploaded: 'boolean',

  // Document Tracking
  documents_complete: 'boolean',
  document_expiry_tracking: 'boolean',
  next_review_date: 'date',
  review_frequency: 'integer', // months

  // Relationship Management
  relationship_manager_id: 'uuid',
  relationship_start_date: 'date',
  client_status: 'prospect | active | dormant | closed',

  // Compliance Flags
  sanctions_screening_status: 'pending | cleared | matched',
  adverse_media_findings: 'boolean',
  compliance_notes: 'text'
};
```

#### Component Features

**1. Client Type-Specific Forms**
- Individual: Personal details, employment, PEP status
- Corporate: Company details, directors, beneficial owners
- Trust: Trustees, beneficiaries, settlors
- Partnership: Partners, profit-sharing arrangements

**2. Risk Assessment Integration**
- Automatic risk scoring based on client attributes
- EDD trigger identification
- Geographic risk analysis
- PEP risk weighting

**3. Document Requirements**
Based on DD level:

```javascript
const documentRequirements = {
  simplified: [
    'identity_document',
    'proof_of_address'
  ],
  standard: [
    'identity_document',
    'proof_of_address',
    'incorporation_certificate', // for corporates
    'beneficial_ownership_declaration',
    'source_of_funds_evidence'
  ],
  enhanced: [
    'identity_document',
    'proof_of_address',
    'incorporation_certificate',
    'beneficial_ownership_declaration',
    'source_of_funds_evidence',
    'source_of_wealth_evidence',
    'financial_statements',
    'board_resolution',
    'senior_management_approval',
    'enhanced_background_checks'
  ]
};
```

---

### 4.2 Due Diligence Levels

#### Simplified DD (SDD)
**Trigger Conditions:**
- Low-risk clients
- Domestic only
- No PEP involvement
- No cash-intensive business
- Low transaction values

**Requirements:**
- Basic identity verification
- Address confirmation
- Limited ongoing monitoring

#### Standard DD (CDD)
**Trigger Conditions:**
- Medium-risk clients
- Standard business relationships
- Some foreign exposure
- Moderate transaction values

**Requirements:**
- Full identity verification
- Beneficial ownership identification (>25% ownership)
- Source of funds verification
- Regular monitoring (annual review)

#### Enhanced DD (EDD)
**Trigger Conditions:**
- High/very high-risk clients
- PEPs or PEP associates
- High-risk jurisdictions
- Complex ownership structures
- Cash-intensive businesses
- Offshore entities
- Risk score ≥ 2.5/5.0

**Requirements:**
- Senior management approval
- Enhanced identity verification
- Complete beneficial ownership chain
- Source of wealth verification
- Enhanced ongoing monitoring (quarterly)
- Detailed transaction screening
- Adverse media checks
- Site visits (where applicable)

---

### 4.3 Beneficial Ownership Structure

```javascript
const beneficialOwnerSchema = {
  owner_name: 'string',
  owner_type: 'individual | corporate',
  ownership_percentage: 'numeric',
  control_type: 'ownership | voting_rights | board_appointment | other',

  // Identity Information
  identity_document_type: 'passport | national_id | drivers_license',
  identity_document_number: 'string',
  identity_document_expiry: 'date',

  // PEP Status
  is_pep: 'boolean',
  pep_category: 'domestic | foreign | international_organization',
  pep_position: 'string',

  // Address
  residential_address: 'string',
  country_of_residence: 'string',
  nationality: 'string',

  // Verification
  verified: 'boolean',
  verification_date: 'date',
  verification_method: 'string',

  // Documentation
  documents_uploaded: 'boolean',
  document_ids: 'array'
};
```

#### Verification Workflow

1. **Identification** (≥25% ownership or control)
2. **Document Collection** (ID, proof of address)
3. **PEP Screening** (automated + manual review)
4. **Sanctions Screening** (against OFAC, UN, EU lists)
5. **Adverse Media Check**
6. **Senior Management Approval** (for high-risk owners)

---

## 5. Matter Management

### 5.1 Matter Types and AML Triggers

The system automatically maps legal matter types to AML/CFT trigger activities per Tanzania regulations:

```javascript
const matterTypes = [
  {
    value: 'litigation',
    label: 'Litigation',
    amlTriggers: [] // No automatic AML triggers
  },
  {
    value: 'real_property_transaction',
    label: 'Purchase/Sale of Real Property',
    amlTriggers: ['real_property_transaction']
  },
  {
    value: 'commercial_enterprise_transaction',
    label: 'Purchase/Sale of Commercial Enterprises',
    amlTriggers: ['commercial_enterprise_transaction']
  },
  {
    value: 'client_funds_management',
    label: 'Management of Client Funds/Securities/Assets',
    amlTriggers: ['client_funds_management']
  },
  {
    value: 'bank_account_management',
    label: 'Opening/Management of Bank/Savings Accounts',
    amlTriggers: ['bank_account_management']
  },
  {
    value: 'corporation_capital_organization',
    label: 'Organizing Capital for Corporations/Legal Entities',
    amlTriggers: ['corporation_capital_organization']
  },
  {
    value: 'entity_creation_management',
    label: 'Creation/Management/Direction of Corporations/Legal Entities',
    amlTriggers: ['entity_creation_management']
  },
  {
    value: 'business_entity_transaction',
    label: 'Buying/Selling of Business Entities',
    amlTriggers: ['business_entity_transaction']
  },
  {
    value: 'financial_transaction_representation',
    label: 'Acting on Behalf of Client in Financial Transactions',
    amlTriggers: ['financial_transaction_representation']
  },
  {
    value: 'real_estate_transaction_representation',
    label: 'Acting on Behalf of Client in Real Estate Transactions',
    amlTriggers: ['real_estate_transaction_representation']
  }
];
```

### 5.2 Matter Data Model

```javascript
const matterSchema = {
  // Basic Information
  matter_name: 'string',
  matter_type: 'enum', // see matterTypes above
  matter_reference: 'string',
  client_id: 'uuid',
  organization_id: 'uuid',

  // Risk Classification
  risk_level: 'low | medium | high | very_high',
  requires_edd: 'boolean',

  // AML Trigger Tracking
  aml_trigger_activities: 'array',
  is_cross_border: 'boolean',
  involves_high_risk_jurisdiction: 'boolean',
  high_risk_jurisdictions: 'array',
  involves_cash_transactions: 'boolean',

  // Financial Information
  matter_value: 'numeric',
  currency: 'string',
  transaction_threshold_exceeded: 'boolean',

  // Parties
  opposing_parties: 'jsonb',
  third_parties: 'jsonb',

  // Dates
  matter_start_date: 'date',
  matter_end_date: 'date',
  next_review_date: 'date',

  // Compliance
  compliance_reviewed: 'boolean',
  compliance_review_date: 'date',
  str_filed: 'boolean',
  str_reference: 'string',

  // Status
  matter_status: 'open | in_progress | completed | closed',

  // Assignment
  assigned_lawyer_id: 'uuid',
  supervising_partner_id: 'uuid'
};
```

### 5.3 Matter Creation Workflow

**Component:** `MatterManagement.jsx`

```javascript
const createMatter = async (matterData) => {
  // Step 1: Validate client exists and is approved
  const client = await validateClient(matterData.client_id);

  // Step 2: Auto-populate AML trigger activities based on matter type
  const amlTriggers = matterTypeToAMLTrigger[matterData.matter_type] || [];

  // Step 3: Calculate initial risk level
  const riskLevel = calculateMatterRisk({
    clientRisk: client.risk_rating,
    matterType: matterData.matter_type,
    value: matterData.matter_value,
    isCrossBorder: matterData.is_cross_border,
    involvesHighRiskJurisdiction: matterData.involves_high_risk_jurisdiction
  });

  // Step 4: Determine if EDD required
  const requiresEDD = (
    riskLevel === 'high' ||
    riskLevel === 'very_high' ||
    amlTriggers.length > 0 ||
    client.is_pep ||
    matterData.is_cross_border
  );

  // Step 5: Create matter with automatic fields
  const { data, error } = await supabase
    .from('matters')
    .insert({
      ...matterData,
      aml_trigger_activities: amlTriggers,
      risk_level: riskLevel,
      requires_edd: requiresEDD,
      organization_id: client.organization_id,
      created_by: profile.id
    });

  // Step 6: If EDD required, create alert
  if (requiresEDD) {
    await createEDDAlert(data.id);
  }

  return data;
};
```

### 5.4 Risk Calculation Formula

```javascript
const calculateMatterRisk = ({
  clientRisk,
  matterType,
  value,
  isCrossBorder,
  involvesHighRiskJurisdiction
}) => {
  let riskScore = 0;

  // Base risk from client (0-4 points)
  const clientRiskScores = {
    'low': 0,
    'medium': 1,
    'high': 2,
    'very_high': 3
  };
  riskScore += clientRiskScores[clientRisk] || 0;

  // Matter type risk (0-2 points)
  const highRiskMatterTypes = [
    'client_funds_management',
    'entity_creation_management',
    'real_property_transaction'
  ];
  if (highRiskMatterTypes.includes(matterType)) {
    riskScore += 2;
  } else if (matterType !== 'litigation') {
    riskScore += 1;
  }

  // Financial threshold (0-1 point)
  if (value > 50000000) { // 50M TZS
    riskScore += 1;
  }

  // Geographic risk (0-2 points)
  if (involvesHighRiskJurisdiction) {
    riskScore += 2;
  } else if (isCrossBorder) {
    riskScore += 1;
  }

  // Determine risk level from score (0-10 scale)
  if (riskScore >= 7) return 'very_high';
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
};
```

---

## 6. Risk Assessment Framework

### 6.1 Four-Module Framework

The system implements a comprehensive FATF-aligned four-module assessment:

#### Module 1: Inherent Risk Assessment
**Purpose:** Measures ML/TF exposure BEFORE considering controls
**Scale:** 1.0 - 5.0 (higher = greater risk exposure)
**Sections:**
- A1: Service & Practice Area Risk
- A2: Client Risk
- A3: Geographic Risk
- A4: Transaction & Structural Risk
- A5: Professional Vulnerability

#### Module 2: Technical Compliance
**Purpose:** Measures existence and documentation of AML/CFT controls
**Scale:** 1.0 - 5.0 (higher = more control gaps)
**Auto-calculated from institutional maturity assessments**
**Sections:**
- B1: Governance
- B2: Business-Wide Risk Assessment
- B3: Client Due Diligence
- B4: Sanctions & TFS
- B5: Training & Record-Keeping

#### Module 3: Effectiveness
**Purpose:** Measures how well controls operate in practice
**Scale:** 1.0 - 5.0 (higher = less effective)
**Auto-calculated from institutional maturity assessments**
**Sections:**
- C1: Risk-Based Decision-Making
- C2: Suspicious Activity Detection
- C3: Sanctions Effectiveness
- C4: Governance & Remediation

#### Module 4: Institutional Maturity
**Purpose:** Measures sophistication of AML/CFT processes
**Scale:** 1.0 - 5.0 (1=Initial/Ad-hoc, 5=Optimised)
**Auto-calculated from 20 control assessments across 9 domains**

---

### 6.2 Three-Tier Questionnaire System

```javascript
const lawFirmsTierProfiles = {
  1: {
    name: 'Tier 1 – Small / Sole Practitioner Firms',
    description: 'Domestic focus, general legal practice, limited corporate exposure',
    questionCount: 35,
    triggers: [
      'Foreign clients',
      'PEP exposure',
      'Cross-border structuring',
      'High-risk sectors',
      'Complex ownership'
    ]
  },
  2: {
    name: 'Tier 2 – Medium / Corporate Firms',
    description: 'Real estate and corporate work, some foreign clients',
    questionCount: 50,
    triggers: [
      'Offshore entities',
      'Trusts and foundations',
      'Multinational clients',
      'Private wealth structuring'
    ]
  },
  3: {
    name: 'Tier 3 – Large / International / Specialist Firms',
    description: 'Multinational clients, complex structuring, offshore exposure',
    questionCount: 62,
    triggers: []
  }
};
```

#### Automatic Tier Escalation

```javascript
const determineAutomaticTier = (responses) => {
  // Tier 3 triggers
  const tier3Triggers = [
    responses['A1.12'] === 'Yes', // International tax structuring
    responses['A2.12'] === 'Yes', // Offshore entities
    responses['A2.13'] === 'Yes', // Global private wealth
    responses['A3.7'] === 'Yes'   // Multi-jurisdictional structuring
  ];

  if (tier3Triggers.some(t => t)) {
    return { tier: 3, reason: 'Offshore/multinational exposure detected' };
  }

  // Tier 2 triggers
  const tier2Triggers = [
    responses['A1.9'] === 'Yes',  // Cross-border services
    responses['A2.10'] === 'Yes', // Multinational corporates
    responses['A2.11'] === 'Yes', // High-risk jurisdictions
    responses['A3.5'] === 'Yes'   // Offshore exposure
  ];

  if (tier2Triggers.some(t => t)) {
    return { tier: 2, reason: 'Corporate/foreign exposure detected' };
  }

  // Check for multiple Tier 1 high-risk factors
  const tier1HighRiskFactors = [
    responses['A1.1'] === 'Yes',  // Real estate
    responses['A1.6'] === 'Yes',  // Client funds
    responses['A2.1'] === 'Yes',  // PEPs
    responses['A2.5'] === 'Yes'   // Trusts
  ];

  if (tier1HighRiskFactors.filter(t => t).length >= 3) {
    return { tier: 2, reason: 'Multiple high-risk factors detected' };
  }

  return { tier: 1, reason: 'Domestic focus with limited exposure' };
};
```

---

### 6.3 Sample Questions

#### Module 1 - Inherent Risk (A1.1)
```javascript
{
  code: 'A1.1',
  text: 'Does the firm provide real estate conveyancing or property transfer services?',
  type: 'risk',
  options: ['Yes', 'Partially', 'No'],
  minTier: 1,
  weight: 1,
  guidance: 'Real estate is a primary ML/TF vector - FATF Guidance para 19-21'
}
```

#### Module 2 - Technical Compliance (B1.1)
```javascript
{
  code: 'B1.1',
  text: 'Is an AML compliance officer appointed?',
  type: 'control',
  options: ['Fully implemented & documented', 'Partially implemented', 'Not in place'],
  minTier: 1,
  weight: 1,
  requiresAttachment: true,
  attachmentLabel: 'Appointment Letter / Job Description',
  tierRequirement: { tier1: 'mandatory', tier2: 'mandatory', tier3: 'mandatory' }
}
```

#### Module 3 - Effectiveness (C1.1)
```javascript
{
  code: 'C1.1',
  text: 'Are risk assessments used to guide client acceptance?',
  type: 'effectiveness',
  options: ['Effective', 'Weak', 'Ineffective'],
  minTier: 1,
  weight: 1
}
```

---

### 6.4 Risk Scoring Methodology

#### FATF Formula
```javascript
const calculateResidualRisk = (inherentRisk, technicalCompliance, effectiveness) => {
  // Convert 1-5 scores to effectiveness percentages
  const complianceEffectiveness = ((5 - technicalCompliance) / 4) * 100;
  const effectivenessPercent = ((5 - effectiveness) / 4) * 100;

  // Overall control effectiveness (weighted)
  const overallEffectiveness = (
    complianceEffectiveness * 0.6 +
    effectivenessPercent * 0.4
  ) / 100;

  // Residual Risk = Inherent Risk × (1 - Control Effectiveness)
  const residualRisk = inherentRisk * (1 - overallEffectiveness);

  return {
    score: residualRisk,
    rating: getRiskRating(residualRisk)
  };
};

const getRiskRating = (score) => {
  if (score >= 2.5) return 'High';
  if (score >= 1.5) return 'Moderate';
  return 'Low';
};
```

#### Thresholds
- **Low Risk:** < 1.5 - Standard monitoring
- **Moderate Risk:** 1.5 - 2.49 - Enhanced review procedures
- **High Risk:** ≥ 2.5 - EDD required with senior management approval

---

## 7. Maturity Assessment System

### 7.1 Five-Level Maturity Model

```javascript
const maturityLevels = [
  {
    level: 1,
    label: 'Initial',
    description: 'Ad-hoc, reactive, inconsistently applied',
    color: '#dc2626',
    characteristics: [
      'No documented processes',
      'Reactive approach to compliance',
      'Inconsistent control application',
      'Limited staff awareness'
    ]
  },
  {
    level: 2,
    label: 'Developing',
    description: 'Basic processes exist but not fully documented',
    color: '#ea580c',
    characteristics: [
      'Some documented procedures',
      'Basic awareness of requirements',
      'Inconsistent implementation',
      'Limited measurement'
    ]
  },
  {
    level: 3,
    label: 'Defined',
    description: 'Documented, standardized, and integrated',
    color: '#ca8a04',
    characteristics: [
      'Comprehensive documentation',
      'Standardized processes',
      'Consistent application',
      'Regular training'
    ]
  },
  {
    level: 4,
    label: 'Managed',
    description: 'Quantitatively managed with established metrics',
    color: '#16a34a',
    characteristics: [
      'Performance metrics established',
      'Quantitative monitoring',
      'Data-driven decisions',
      'Regular effectiveness reviews'
    ]
  },
  {
    level: 5,
    label: 'Optimised',
    description: 'Continuously monitored, measured, and improved',
    color: '#0891b2',
    characteristics: [
      'Continuous improvement culture',
      'Innovation and automation',
      'Industry-leading practices',
      'Proactive risk management'
    ]
  }
];
```

### 7.2 Nine AML/CFT Domains

```javascript
const maturityDomains = [
  {
    code: 'GOV',
    name: 'Governance & Risk Assessment',
    weight: 0.15,
    controls: [
      'GOV-001: AML/CFT Policy Framework',
      'GOV-002: Board & Senior Management Oversight'
    ]
  },
  {
    code: 'ERA',
    name: 'Enterprise Risk Assessment',
    weight: 0.12,
    controls: [
      'ERA-001: Business-Wide Risk Assessment',
      'ERA-002: Risk Appetite Framework'
    ]
  },
  {
    code: 'CDD',
    name: 'Customer Due Diligence (CDD/KYC)',
    weight: 0.15,
    controls: [
      'CDD-001: Client Identification Procedures',
      'CDD-002: Beneficial Ownership Verification',
      'CDD-003: Enhanced Due Diligence (EDD)'
    ]
  },
  {
    code: 'TM',
    name: 'Transaction Monitoring',
    weight: 0.10,
    controls: [
      'TM-001: Transaction Monitoring System',
      'TM-002: Alert Investigation & Escalation'
    ]
  },
  {
    code: 'SAN',
    name: 'Sanctions Screening',
    weight: 0.10,
    controls: [
      'SAN-001: Sanctions Screening Controls',
      'SAN-002: Match Resolution Process'
    ]
  },
  {
    code: 'SAR',
    name: 'Suspicious Activity Reporting (SAR/STR)',
    weight: 0.12,
    controls: [
      'SAR-001: Suspicious Activity Detection',
      'SAR-002: STR Filing Process'
    ]
  },
  {
    code: 'ICC',
    name: 'Internal Controls & Compliance',
    weight: 0.10,
    controls: [
      'ICC-001: Three Lines of Defense Model',
      'ICC-002: Compliance Monitoring & Testing'
    ]
  },
  {
    code: 'AUD',
    name: 'Audit & Quality Assurance',
    weight: 0.08,
    controls: [
      'AUD-001: Independent Audit Function',
      'AUD-002: Quality Assurance Program'
    ]
  },
  {
    code: 'TRN',
    name: 'Training & Awareness',
    weight: 0.08,
    controls: [
      'TRN-001: AML/CFT Training Program',
      'TRN-002: Training Effectiveness Measurement'
    ]
  }
];
```

### 7.3 Control Assessment Process

**Component:** `ControlAssessmentForm.jsx`

```javascript
const assessControl = (control) => {
  // Three dimensions assessed:
  return {
    implementation_status: 'not-implemented | partial | implemented | optimised',
    evidence_quality: 'poor | fair | good | excellent',
    testing_result: 'not-tested | failed | partial | passed'
  };
};

// Automatic maturity level calculation
const calculateMaturityLevel = (assessment) => {
  let score = 1; // Default: Initial

  // Implementation status (primary factor)
  const statusScores = {
    'not-implemented': 1,
    'partial': 2,
    'implemented': 3,
    'optimised': 5
  };
  score = statusScores[assessment.implementation_status] || 1;

  // Adjust based on evidence quality
  if (assessment.evidence_quality === 'excellent' && score < 5) {
    score += 0.5;
  } else if (assessment.evidence_quality === 'poor' && score > 1) {
    score -= 0.5;
  }

  // Adjust based on testing results
  if (assessment.testing_result === 'passed' && score < 5) {
    score += 0.5;
  } else if (assessment.testing_result === 'failed') {
    score = Math.max(1, score - 1);
  }

  return Math.round(score);
};
```

### 7.4 Integration with Module 2 & 3

The institutional maturity assessment **automatically calculates** Module 2 and Module 3 scores:

```javascript
const deriveModuleScores = (controlAssessments) => {
  // Module 2: Technical Compliance
  // Based on implementation_status dimension
  const module2Scores = controlAssessments.map(ca => {
    const statusScores = {
      'optimised': 1.0,
      'implemented': 1.5,
      'partial': 3.0,
      'not-implemented': 5.0
    };
    return statusScores[ca.implementation_status] || 5.0;
  });
  const module2Score = average(module2Scores);

  // Module 3: Effectiveness
  // Based on testing_result dimension
  const module3Scores = controlAssessments.map(ca => {
    const testScores = {
      'passed': 1.0,
      'partial': 2.5,
      'failed': 4.0,
      'not-tested': 3.0
    };
    return testScores[ca.testing_result] || 3.0;
  });
  const module3Score = average(module3Scores);

  return {
    module_2_score: module2Score,
    module_2_rating: getComplianceRating(module2Score),
    module_3_score: module3Score,
    module_3_rating: getEffectivenessRating(module3Score)
  };
};
```

---

## 8. Database Schema

### 8.1 Core Tables

#### user_profiles
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN (
    'admin', 'management', 'senior_partner', 'partner',
    'staff', 'lawyer', 'compliance_officer', 'mlro'
  )),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  first_name text,
  last_name text,
  position text,
  is_active boolean DEFAULT true,
  password_change_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
```

#### organizations
```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text CHECK (business_type IN ('law_firm', 'individual_practitioner')),
  law_firm_type text,
  brela_registration text,
  tls_registration text,
  practice_areas text[],
  subscription_status text DEFAULT 'trial',
  subscription_tier text DEFAULT 'basic',
  subscription_expiry_date date,
  created_at timestamptz DEFAULT now()
);
```

#### kyc_clients
```sql
CREATE TABLE kyc_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_type text CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  relationship_manager_id uuid REFERENCES auth.users(id),

  -- Risk Classification
  risk_rating text CHECK (risk_rating IN ('low', 'medium', 'high', 'very_high')),
  dd_level text CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  requires_edd boolean DEFAULT false,

  -- PEP Information
  is_pep boolean DEFAULT false,
  pep_details text,
  pep_relationship text,

  -- Geographic
  country_of_residence text,
  country_of_incorporation text,
  operates_in_high_risk_jurisdictions boolean DEFAULT false,
  high_risk_jurisdictions text[],

  -- Business
  industry_sector text,
  business_activities text,
  annual_turnover numeric,
  source_of_funds text,
  source_of_wealth text,

  -- Beneficial Ownership
  beneficial_owners jsonb,
  ownership_structure_complex boolean DEFAULT false,
  ultimate_beneficial_owner_verified boolean DEFAULT false,

  -- AML Triggers
  aml_trigger_activities text[],
  cross_border_transactions boolean DEFAULT false,
  high_value_transactions boolean DEFAULT false,

  -- Verification
  identity_verified boolean DEFAULT false,
  identity_verification_date date,
  address_verified boolean DEFAULT false,
  sof_verification_status text DEFAULT 'not_started',
  sow_verification_status text DEFAULT 'not_started',

  -- Compliance
  sanctions_screening_status text DEFAULT 'pending',
  adverse_media_findings boolean DEFAULT false,
  next_review_date date,
  review_frequency integer DEFAULT 12,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### matters
```sql
CREATE TABLE matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_name text NOT NULL,
  matter_type text NOT NULL,
  matter_reference text,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Risk
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  requires_edd boolean DEFAULT false,

  -- AML Triggers
  aml_trigger_activities text[],
  is_cross_border boolean DEFAULT false,
  involves_high_risk_jurisdiction boolean DEFAULT false,
  high_risk_jurisdictions text[],

  -- Financial
  matter_value numeric,
  currency text DEFAULT 'TZS',

  -- Assignment
  assigned_lawyer_id uuid REFERENCES auth.users(id),
  supervising_partner_id uuid REFERENCES auth.users(id),

  -- Status
  matter_status text DEFAULT 'open',
  matter_start_date date,
  matter_end_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### assessments
```sql
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  framework_type text DEFAULT 'law_firms_tanzania',
  entity_tier integer CHECK (entity_tier IN (1, 2, 3)),

  -- Module Scores
  module_1_score numeric, -- Inherent Risk
  module_1_rating text,
  module_2_score numeric, -- Technical Compliance
  module_2_rating text,
  module_3_score numeric, -- Effectiveness
  module_3_rating text,
  module_4_score numeric, -- Institutional Maturity
  module_4_rating text,

  -- Overall
  overall_risk_score numeric,
  overall_risk_rating text CHECK (overall_risk_rating IN ('Low', 'Moderate', 'High')),

  -- Metadata
  assessment_date date DEFAULT CURRENT_DATE,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### control_assessments
```sql
CREATE TABLE control_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  control_id uuid REFERENCES maturity_controls(id),

  -- Assessment Dimensions
  implementation_status text CHECK (implementation_status IN (
    'not-implemented', 'partial', 'implemented', 'optimised'
  )),
  evidence_quality text CHECK (evidence_quality IN (
    'poor', 'fair', 'good', 'excellent'
  )),
  testing_result text CHECK (testing_result IN (
    'not-tested', 'failed', 'partial', 'passed'
  )),

  -- Calculated Maturity
  maturity_level integer CHECK (maturity_level BETWEEN 1 AND 5),

  -- Notes
  assessor_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### 8.2 Key Views

#### assessment_key_findings
```sql
CREATE VIEW assessment_key_findings AS
SELECT
  a.id AS assessment_id,
  a.overall_risk_rating AS risk_rating,

  -- Module 1 Breakdown
  COUNT(CASE WHEN ar.response IN ('Yes', 'High', 'Significant')
    AND ar.section_code LIKE 'MODULE_1%' THEN 1 END) AS m1_high_risk_count,
  COUNT(CASE WHEN ar.response IN ('Partially', 'Moderate')
    AND ar.section_code LIKE 'MODULE_1%' THEN 1 END) AS m1_moderate_risk_count,
  COUNT(CASE WHEN ar.response IN ('No', 'Low', 'Minimal')
    AND ar.section_code LIKE 'MODULE_1%' THEN 1 END) AS m1_low_risk_count,

  -- Module 2 Breakdown
  COUNT(CASE WHEN ar.response = 'Not in place'
    AND ar.section_code LIKE 'MODULE_2%' THEN 1 END) AS m2_not_implemented_count,
  COUNT(CASE WHEN ar.response = 'Partially implemented'
    AND ar.section_code LIKE 'MODULE_2%' THEN 1 END) AS m2_partially_implemented_count,
  COUNT(CASE WHEN ar.response = 'Fully implemented & documented'
    AND ar.section_code LIKE 'MODULE_2%' THEN 1 END) AS m2_fully_implemented_count,

  -- Module 3 Breakdown
  COUNT(CASE WHEN ar.response = 'Ineffective'
    AND ar.section_code LIKE 'MODULE_3%' THEN 1 END) AS m3_ineffective_count,
  COUNT(CASE WHEN ar.response = 'Weak'
    AND ar.section_code LIKE 'MODULE_3%' THEN 1 END) AS m3_weak_count,
  COUNT(CASE WHEN ar.response = 'Effective'
    AND ar.section_code LIKE 'MODULE_3%' THEN 1 END) AS m3_effective_count,

  -- Module 4 Maturity Distribution
  COUNT(CASE WHEN ca.maturity_level = 1 THEN 1 END) AS m4_initial_count,
  COUNT(CASE WHEN ca.maturity_level = 2 THEN 1 END) AS m4_developing_count,
  COUNT(CASE WHEN ca.maturity_level = 3 THEN 1 END) AS m4_defined_count,
  COUNT(CASE WHEN ca.maturity_level = 4 THEN 1 END) AS m4_managed_count,
  COUNT(CASE WHEN ca.maturity_level = 5 THEN 1 END) AS m4_optimised_count,

  -- Computed Maturity Rating
  CASE
    WHEN a.module_4_score >= 4.5 THEN 'Optimised'
    WHEN a.module_4_score >= 3.5 THEN 'Managed'
    WHEN a.module_4_score >= 2.5 THEN 'Defined'
    WHEN a.module_4_score >= 1.5 THEN 'Developing'
    ELSE 'Initial'
  END AS computed_maturity_rating

FROM assessments a
LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
LEFT JOIN control_assessments ca ON a.id = ca.assessment_id
GROUP BY a.id;
```

---

## 9. Code Examples

### 9.1 Assessment Form with Auto-Save

```javascript
export default function AssessmentForm({ assessment, section }) {
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);

  const handleResponseChange = async (questionCode, value) => {
    // Optimistic update
    setResponses(prev => ({ ...prev, [questionCode]: value }));

    // Auto-save to database
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assessment_responses')
        .upsert({
          assessment_id: assessment.id,
          question_code: questionCode,
          section_code: section.code,
          response: value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Recalculate section scores
      await recalculateSectionScores(assessment.id, section.code);
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Error saving response');
    } finally {
      setSaving(false);
    }
  };

  const recalculateSectionScores = async (assessmentId, sectionCode) => {
    // Fetch all responses for this section
    const { data: sectionResponses } = await supabase
      .from('assessment_responses')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('section_code', sectionCode);

    // Calculate risk score using weighted average
    const totalWeight = sectionResponses.length;
    const totalScore = sectionResponses.reduce((sum, r) => {
      const scoreMap = {
        'Yes': 5, 'High': 5, 'Significant': 5,
        'Partially': 3, 'Moderate': 3, 'Weak': 3,
        'No': 1, 'Low': 1, 'Ineffective': 1,
        'Fully implemented & documented': 1,
        'Not in place': 5,
        'Effective': 1
      };
      return sum + (scoreMap[r.response] || 0);
    }, 0);

    const riskScore = totalScore / totalWeight;
    const riskLevel = riskScore >= 3.5 ? 'High' : riskScore >= 2.5 ? 'Medium' : 'Low';

    // Update section scores table
    await supabase
      .from('section_scores')
      .upsert({
        assessment_id: assessmentId,
        section_code: sectionCode,
        risk_score: riskScore,
        risk_level: riskLevel,
        answered_questions: sectionResponses.length,
        updated_at: new Date().toISOString()
      });
  };

  return (
    <div>
      {section.questions.map(question => (
        <QuestionCard
          key={question.code}
          question={question}
          value={responses[question.code]}
          onChange={(value) => handleResponseChange(question.code, value)}
          disabled={saving}
        />
      ))}
    </div>
  );
}
```

### 9.2 Report Generation with FATF Narratives

```javascript
const generateAssessmentReport = (assessment, responses, controlAssessments) => {
  // Calculate module scores
  const module1Score = calculateInherentRisk(responses);
  const module2Score = calculateTechnicalCompliance(controlAssessments);
  const module3Score = calculateEffectiveness(controlAssessments);
  const module4Score = calculateMaturity(controlAssessments);

  // Calculate residual risk
  const controlEffectiveness =
    (((5 - module2Score) / 4) * 0.6) +
    (((5 - module3Score) / 4) * 0.4);
  const residualRisk = module1Score * (1 - controlEffectiveness);

  // Generate narrative
  const narrative = {
    inherentRisk: `The firm's inherent ML/TF risk is assessed as ${
      module1Score >= 3.5 ? 'HIGH' : module1Score >= 2.5 ? 'MODERATE' : 'LOW'
    } (${module1Score.toFixed(2)}/5.0) based on exposure to ${
      getHighRiskFactors(responses).join(', ')
    }.`,

    technicalCompliance: `The firm has ${
      module2Score <= 1.5 ? 'established comprehensive AML/CFT controls' :
      module2Score <= 2.5 ? 'established basic AML/CFT controls with some gaps' :
      'significant control implementation gaps'
    } (${((5 - module2Score) / 4 * 100).toFixed(0)}% compliance).`,

    effectiveness: `Controls are ${
      module3Score <= 1.5 ? 'operating effectively' :
      module3Score <= 2.5 ? 'partially effective' :
      'not operating as intended'
    } (${((5 - module3Score) / 4 * 100).toFixed(0)}% effective).`,

    maturity: `The firm demonstrates ${
      module4Score >= 4.5 ? 'OPTIMISED' :
      module4Score >= 3.5 ? 'MANAGED' :
      module4Score >= 2.5 ? 'DEFINED' :
      module4Score >= 1.5 ? 'DEVELOPING' : 'INITIAL'
    } maturity (${module4Score.toFixed(2)}/5.0).`,

    residualRisk: `After considering controls, the overall residual risk is ${
      residualRisk >= 2.5 ? 'HIGH' : residualRisk >= 1.5 ? 'MODERATE' : 'LOW'
    } (${residualRisk.toFixed(2)}/5.0). ${
      residualRisk >= 2.5 ? 'Enhanced Due Diligence procedures are REQUIRED.' :
      residualRisk >= 1.5 ? 'Enhanced monitoring is recommended.' :
      'Standard monitoring procedures are appropriate.'
    }`
  };

  return {
    scores: {
      module1Score,
      module2Score,
      module3Score,
      module4Score,
      residualRisk
    },
    narrative,
    requiresEDD: residualRisk >= 2.5
  };
};
```

### 9.3 RLS Policy Example

```sql
-- User profiles: Users can only see profiles in their organization
CREATE POLICY "users_select_own_organization" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- KYC clients: Staff can access clients they manage or in their org
CREATE POLICY "clients_select_organization" ON kyc_clients
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    relationship_manager_id = auth.uid()
  );

-- Assessments: Organization members can view their assessments
CREATE POLICY "assessments_select_organization" ON assessments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Control assessments: Only linked to parent assessment
CREATE POLICY "control_assessments_select" ON control_assessments
  FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
```

---

## Conclusion

This documentation captures the complete architecture of the Tanzania Law Firm AML/CFT Compliance System, including:

- **User role hierarchy** with three-tier admission system
- **Three dashboard systems** (Management, Staff, Compliance)
- **Complete KYC/CDD framework** with beneficial ownership and SOF/SOW verification
- **Matter management** with automatic AML trigger detection
- **Four-module risk assessment** framework (Inherent Risk, Technical Compliance, Effectiveness, Maturity)
- **Three-tier questionnaire** system (35-62 questions)
- **Five-level maturity assessment** across 9 AML/CFT domains with 20 controls
- **Complete database schema** with RLS policies
- **Code examples** for implementation

All components are designed to be replicated in another project while maintaining FATF compliance standards and Tanzania-specific regulations.
