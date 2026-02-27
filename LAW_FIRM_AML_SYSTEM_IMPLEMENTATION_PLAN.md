# Comprehensive AML/KYC System Implementation Plan for Law Firms in Tanzania

**System Name:** LegalGuard - Integrated AML Compliance Platform for Law Firms
**Target Users:** Law firms, advocates, and legal service providers in Tanzania
**Regulatory Framework:** Tanzania AML Act, FATF Recommendations, DNFBP Guidance, National Risk Assessment

---

## EXECUTIVE SUMMARY

### Current System Status

The platform currently has:
- ✅ **MODULE 1**: User management with role-based access (admin, client)
- ✅ **MODULE 2**: Institutional risk assessment (existing as assessment system)
- ✅ **MODULE 3**: Partial client onboarding (KYC system exists)
- ✅ **MODULE 5**: Risk scoring engine (FATF-aligned)
- ✅ **MODULE 6**: Basic due diligence workflows
- ✅ **MODULE 7**: Screening framework (structure exists)
- ✅ **MODULE 8**: Ongoing monitoring (alerts system exists)
- ✅ **MODULE 9**: Red flags and typologies (partially implemented)
- ✅ **MODULE 10**: Alerts and case management (transaction alerts system)
- ✅ **MODULE 11**: STR workflows (partially implemented)
- ✅ **MODULE 12**: Dashboards and reporting
- ✅ **MODULE 13**: Security (comprehensive RLS, encryption)
- ✅ **MODULE 14**: Record keeping (audit trails)

### Gap Analysis

**What Needs to Be Built:**

1. **Law Firm Specific User Roles** (Module 1 Enhancement)
   - Lawyer role
   - Compliance officer role
   - MLRO role
   - Senior partner role
   - Proper role hierarchy and permissions

2. **Legal Sector Risk Assessment** (Module 2 Enhancement)
   - Law firm-specific risk factors
   - Legal service risk assessment
   - Client account usage risk
   - Geographic exposure for legal work

3. **Legal Client Types** (Module 3 Enhancement)
   - Individual clients
   - Corporate clients
   - Trusts and estates
   - Legal arrangements (partnerships, foundations)

4. **Beneficial Ownership for Legal Clients** (Module 4 - NEW)
   - Legal entity structure mapping
   - UBO identification for legal clients
   - Visual ownership trees
   - Verification workflows specific to legal sector

5. **Legal Sector Risk Pillars** (Module 5 Enhancement)
   - Client risk (legal context)
   - Service risk (conveyancing, trusts, M&A, etc.)
   - Geographic risk (jurisdictions involved)
   - Matter complexity risk
   - Payment method risk

6. **Legal Sector Due Diligence** (Module 6 Enhancement)
   - Simplified DD for low-risk legal matters
   - Standard DD for typical legal services
   - Enhanced DD for high-risk matters (trusts, property, cross-border)

7. **Legal Sector Screening** (Module 7 Enhancement)
   - Client screening at matter opening
   - Related party screening
   - Ongoing screening for active matters

8. **Matter-Based Monitoring** (Module 8 Enhancement)
   - Client account monitoring
   - Real estate transaction monitoring
   - Trust and estate monitoring
   - Corporate transaction monitoring

9. **Legal Sector Red Flags** (Module 9 - CRITICAL)
   - Tanzania legal sector-specific typologies
   - Real estate money laundering indicators
   - Trust abuse indicators
   - Company formation red flags
   - Client account misuse indicators

10. **Legal Matter Management** (Module 10 Enhancement)
    - Matter-based case files
    - Client-matter relationship tracking
    - Alert escalation for legal context

11. **Legal Sector STR Process** (Module 11 Enhancement)
    - Legal privilege considerations
    - MLRO decision workflow
    - Tipping-off prevention (critical for legal sector)

12. **Legal Sector Dashboards** (Module 12 Enhancement)
    - Matter risk overview
    - Client risk portfolio
    - Service line risk analysis
    - Geographic exposure
    - Compliance KPIs for legal sector

---

## DETAILED MODULE IMPLEMENTATION

### MODULE 1: USER MANAGEMENT AND ACCESS CONTROL (Enhancement Required)

**Current State:** Basic admin/client roles exist
**Target State:** Legal sector-specific role hierarchy

#### New Roles Required

**1. Lawyer Role**
```javascript
{
  role: 'lawyer',
  permissions: [
    'view_own_clients',
    'create_matters',
    'update_client_kyc',
    'view_own_alerts',
    'escalate_suspicious_activity',
    'access_client_documents'
  ],
  restrictions: [
    'cannot_view_other_lawyers_clients',
    'cannot_approve_high_risk_clients',
    'cannot_file_str',
    'cannot_manage_users'
  ]
}
```

**2. Compliance Officer Role**
```javascript
{
  role: 'compliance_officer',
  permissions: [
    'view_all_clients',
    'review_alerts',
    'investigate_suspicious_activity',
    'recommend_edd',
    'access_all_documents',
    'generate_compliance_reports',
    'manage_screening_hits',
    'update_risk_ratings'
  ],
  restrictions: [
    'cannot_file_str', // Only MLRO can file
    'cannot_create_users',
    'cannot_approve_very_high_risk_clients'
  ]
}
```

**3. MLRO Role**
```javascript
{
  role: 'mlro',
  permissions: [
    'full_oversight_access',
    'approve_str_filing',
    'file_str_to_fiu',
    'approve_high_risk_clients',
    'override_risk_decisions',
    'access_all_investigations',
    'board_reporting',
    'regulatory_communication',
    'manage_aml_policies'
  ],
  restrictions: [
    'cannot_manage_users' // Admin only
  ]
}
```

**4. Senior Partner Role**
```javascript
{
  role: 'senior_partner',
  permissions: [
    'approve_high_risk_clients',
    'approve_edd_matters',
    'view_strategic_reports',
    'approve_client_exits',
    'view_str_summary', // Not detailed STRs
    'access_board_reports'
  ],
  restrictions: [
    'cannot_file_str',
    'cannot_access_detailed_investigations'
  ]
}
```

**Implementation Actions:**
1. Update `user_profiles` table with new roles
2. Create role hierarchy enforcement
3. Implement route-level permissions
4. Add component-level permission checks
5. Create role assignment UI for admins

---

### MODULE 2: INSTITUTIONAL RISK ASSESSMENT (Enhancement Required)

**Current State:** Generic DNFBP assessment exists
**Target State:** Law firm-specific risk assessment

#### Law Firm Risk Areas to Add

**1. Firm Profile Section**
- Size of firm (solo, small, medium, large)
- Number of advocates
- Practice areas (conveyancing, corporate, trusts, litigation, etc.)
- Jurisdictions of operation
- Branch structure

**2. Legal Services Risk Section**
- Conveyancing and real estate
- Trust and estate administration
- Company formation and management
- Mergers and acquisitions
- Tax advisory
- Cross-border transactions
- Litigation and arbitration

**3. Client Base Risk Section**
- Client types (% individual vs. corporate)
- High net worth individuals
- PEP clients
- Foreign clients
- Cash-intensive businesses
- High-risk jurisdictions

**4. Geographic Exposure Section**
- Jurisdictions where firm operates
- Cross-border matters handled
- High-risk jurisdiction exposure
- International client base

**5. Delivery Channels Section**
- Face-to-face vs. remote client intake
- Use of introducers or referrals
- Online legal services
- Client account usage

**6. Client Account Risk Section**
- Does firm hold client accounts?
- Volume of client funds handled
- Types of transactions
- Controls over client accounts
- Segregation of funds

**7. Governance and Culture Section**
- AML policies and procedures
- MLRO appointment and effectiveness
- Training programs
- Monitoring and controls
- Board oversight
- Compliance culture

**Implementation Actions:**
1. Create law firm-specific assessment questions
2. Map to existing assessment framework
3. Add law firm categories to dropdown
4. Update risk scoring algorithm for legal sector
5. Add legal sector-specific risk weights

---

### MODULE 3: CLIENT ONBOARDING AND KYC (Enhancement Required)

**Current State:** Basic KYC system exists
**Target State:** Legal sector client intake with matter linking

#### Law Firm Client Types

**1. Individual Clients**
- Personal clients (wills, divorce, property purchase)
- Business owners
- High net worth individuals
- Foreign nationals

**2. Corporate Clients**
- Local companies
- Foreign companies
- Listed companies
- State-owned enterprises
- Partnerships
- Joint ventures

**3. Trusts and Estates**
- Family trusts
- Testamentary trusts
- Estate administration
- Charitable trusts

**4. Legal Arrangements**
- Foundations
- Partnerships
- Unincorporated associations

#### Data Collection for Legal Clients

**Individual Clients:**
```javascript
{
  // Basic Information
  full_name: '',
  date_of_birth: '',
  nationality: '',
  id_type: '',
  id_number: '',

  // Legal Context
  client_since: '',
  matter_types: [], // Types of matters
  is_pep: false,
  pep_category: '',

  // Risk Factors
  source_of_funds: '',
  source_of_wealth: '',
  occupation: '',
  employer: '',
  expected_matter_volume: '',

  // Geographic
  country_of_residence: '',
  countries_of_interest: [], // For cross-border matters

  // References
  how_client_found_firm: '',
  referral_source: ''
}
```

**Corporate Clients:**
```javascript
{
  // Company Information
  company_name: '',
  registration_number: '',
  country_of_incorporation: '',
  business_activity: '',
  industry_sector: '',

  // Structure
  ownership_structure: 'simple|complex',
  is_listed: false,
  is_state_owned: false,

  // Beneficial Ownership
  beneficial_owners: [],
  control_structure: {},

  // Directors
  directors: [],
  authorized_signatories: [],

  // Risk Factors
  countries_of_operation: [],
  turnover_range: '',
  source_of_capital: '',

  // Legal Context
  legal_services_required: [],
  expected_transaction_volume: ''
}
```

**Implementation Actions:**
1. Extend `kyc_clients` table with legal sector fields
2. Create client type-specific forms
3. Add matter type classification
4. Implement legal service line tracking
5. Build client-matter relationship model

---

### MODULE 4: BENEFICIAL OWNERSHIP (NEW MODULE - CRITICAL)

**Status:** Partial implementation exists, needs enhancement

#### Requirements for Legal Sector

**1. Beneficial Ownership Identification**
- 25% threshold (Tanzania standard)
- Control through voting rights
- Board appointment rights
- Other means of control

**2. Visual Ownership Tree**
- Interactive ownership structure diagram
- Multi-level ownership chains
- Clear visualization of control
- Highlight UBOs (≥25%)

**3. Verification Workflow**
- UBO identification checklist
- Document collection per UBO
- Individual screening per UBO
- Risk assessment per UBO
- Senior approval for complex structures

**4. Legal Entity Types**
- Companies (private, public, foreign)
- Partnerships (general, limited)
- Trusts (various types)
- Foundations
- Joint ventures

**Database Schema:**
```sql
CREATE TABLE beneficial_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id),

  -- Individual Details
  full_name text NOT NULL,
  date_of_birth date,
  nationality text,
  id_type text,
  id_number text,
  residential_address text,

  -- Ownership
  ownership_percentage numeric(5,2),
  ownership_type text, -- direct, indirect, voting, control
  is_ubo boolean DEFAULT false, -- >=25%

  -- Structure
  ownership_level integer DEFAULT 1, -- 1=direct, 2+=indirect
  parent_entity_id uuid, -- For indirect ownership

  -- Risk
  is_pep boolean DEFAULT false,
  pep_category text,
  risk_rating text,

  -- Verification
  verification_status text DEFAULT 'pending',
  documents_collected boolean DEFAULT false,
  screening_completed boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,

  -- Screening
  sanctions_match boolean DEFAULT false,
  pep_match boolean DEFAULT false,
  adverse_media_match boolean DEFAULT false,

  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Implementation Actions:**
1. Create beneficial owners table and relationships
2. Build ownership tree visualization component
3. Implement UBO identification wizard
4. Add per-UBO screening
5. Create verification workflow
6. Add senior approval for complex structures

---

### MODULE 5: RISK SCORING ENGINE (Enhancement Required)

**Current State:** Generic risk scoring exists
**Target State:** Legal sector-specific risk pillars

#### Legal Sector Risk Pillars (25% each)

**1. Client Risk (25%)**
- Client type (individual, corporate, trust)
- PEP status
- High net worth
- Foreign national
- Cash-intensive business
- Prior relationship history
- Reputation and public profile

**2. Service Risk (25%)**
- Low Risk: Litigation, employment law, IP
- Medium Risk: Conveyancing (domestic), wills
- High Risk: Trusts, company formation, corporate
- Very High Risk: Cross-border transactions, offshore structures

**3. Geographic Risk (25%)**
- Client country of residence
- Matter jurisdiction(s)
- High-risk jurisdictions per FATF
- Offshore structures involved
- Cross-border elements

**4. Matter Complexity Risk (15%)**
- Simple matters (straightforward, single jurisdiction)
- Complex matters (multi-party, cross-border)
- Opaque structures (nominees, bearer shares)
- Speed of transaction (rushed, urgent)

**5. Payment Risk (10%)**
- Cash payments
- Third-party payments
- Unexplained source of funds
- Large retainers
- Client account usage

**Risk Calculation:**
```javascript
function calculateLegalClientRisk(client, matter) {
  const clientRisk = assessClientRisk(client) * 0.25;
  const serviceRisk = assessServiceRisk(matter) * 0.25;
  const geoRisk = assessGeographicRisk(client, matter) * 0.25;
  const complexityRisk = assessComplexityRisk(matter) * 0.15;
  const paymentRisk = assessPaymentRisk(client, matter) * 0.10;

  const overallRisk = clientRisk + serviceRisk + geoRisk + complexityRisk + paymentRisk;

  return {
    overall: overallRisk,
    level: getRiskLevel(overallRisk),
    breakdown: { clientRisk, serviceRisk, geoRisk, complexityRisk, paymentRisk }
  };
}

function getRiskLevel(score) {
  if (score <= 25) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Very High';
}
```

**Implementation Actions:**
1. Add legal service risk scoring
2. Add matter complexity assessment
3. Add payment method risk scoring
4. Update risk calculation formulas
5. Create legal sector risk matrix

---

### MODULE 6: DUE DILIGENCE WORKFLOWS (Enhancement Required)

**Current State:** Basic DD levels exist
**Target State:** Legal sector DD with service line specificity

#### Simplified Due Diligence (SDD)

**Triggers:**
- Low-risk legal services (litigation, employment)
- Government entities as clients
- Regulated financial institutions
- Listed companies
- No high-risk indicators

**Requirements:**
- Basic client identification
- Verify identity documents
- Understand purpose of relationship
- Basic conflict check
- Annual review

#### Standard Due Diligence (CDD)

**Triggers:**
- Medium-risk legal services (conveyancing, wills)
- Most individual and corporate clients
- No high-risk indicators present

**Requirements:**
- Full client identification and verification
- Beneficial ownership (for legal entities)
- Source of funds understanding
- Purpose of legal relationship
- Conflict check
- Risk assessment
- Quarterly review

#### Enhanced Due Diligence (EDD)

**Triggers:**
- High-risk legal services (trusts, offshore, M&A)
- PEP clients
- Clients from high-risk jurisdictions
- Complex ownership structures
- Large transactions (>USD 100,000)
- Cash payments
- Unusual matter circumstances

**Requirements:**
- All Standard DD requirements PLUS:
- Source of wealth verification
- Enhanced beneficial ownership verification
- Additional identity verification
- Background checks (if appropriate)
- Senior partner approval
- MLRO notification
- Enhanced ongoing monitoring (monthly)
- Additional documentation

**Legal Privilege Consideration:**
- Document what can be disclosed
- MLRO guidance on privilege boundaries
- Separate privileged and non-privileged information

**Implementation Actions:**
1. Map legal services to DD levels
2. Create service-specific DD checklists
3. Add matter-based DD workflows
4. Implement automatic DD level assignment
5. Add legal privilege handling
6. Create senior approval workflows

---

### MODULE 7: SCREENING (Enhancement Required)

**Current State:** Basic screening structure
**Target State:** Legal sector screening with matter context

#### Screening Requirements for Law Firms

**1. Client Screening (At Onboarding)**
- Sanctions lists (UN, OFAC, EU, Tanzania)
- PEP databases
- Adverse media
- Law enforcement databases (where available)

**2. Related Party Screening**
- Beneficial owners
- Directors and officers
- Family members (for PEPs)
- Associates (for PEPs)
- Transaction counterparties (for high-risk matters)

**3. Ongoing Screening**
- Annual re-screening (minimum)
- Quarterly for high-risk clients
- Event-driven (when lists update)
- Matter-based (at new matter opening)

**4. Matter-Specific Screening**
- Property transactions: screen buyer and seller
- Corporate transactions: screen all parties
- Trust administration: screen settlor, trustee, beneficiaries

**Screening Process:**
```javascript
async function screenLegalClient(client, context = 'onboarding') {
  const results = {
    sanctions: await screenSanctions(client),
    pep: await screenPEP(client),
    adverseMedia: await screenAdverseMedia(client),
    context: context, // onboarding, ongoing, matter_based
    screening_date: new Date(),
    screened_by: currentUser.id
  };

  // Auto-escalate matches
  if (results.sanctions.match || results.pep.match) {
    await createComplianceAlert({
      client_id: client.id,
      alert_type: 'screening_hit',
      severity: 'critical',
      details: results
    });
  }

  return results;
}
```

**Implementation Actions:**
1. Integrate screening providers (API)
2. Build screening workflow UI
3. Add match review workflow
4. Implement false positive tracking
5. Add ongoing screening scheduler
6. Create screening audit trail

---

### MODULE 9: RED FLAGS AND TYPOLOGIES (CRITICAL - NEW CONTENT)

**Status:** Partially implemented, needs Tanzania legal sector specifics

#### Tanzania Legal Sector Red Flags

**A. Client Behavior Red Flags**

1. **Unusual Client Behavior**
   - Client reluctant to provide information
   - Client provides false or misleading information
   - Client insists on anonymity or secrecy
   - Client has no apparent legitimate reason for services
   - Client unusually concerned about compliance questions
   - Client wants to use complex structures with no commercial rationale

2. **Transaction Red Flags**
   - Transaction structure overly complex for stated purpose
   - Transaction involves high-risk jurisdictions
   - Transaction rushed with no apparent reason
   - Consideration significantly above or below market value
   - Source of funds inconsistent with client profile
   - Use of cash when not expected
   - Third-party funding with no clear relationship

**B. Real Estate Red Flags (Critical for Law Firms)**

1. Purchase by proxy or nominee with no clear purpose
2. Property purchased in cash
3. Property purchased significantly above market value
4. Rapid buying and selling (flipping)
5. Purchase using multiple sources of funds
6. Buyer is an offshore company with no clear business
7. Property ownership transferred without consideration
8. Use of trusts or complex structures for residential property
9. Client has multiple properties but no clear income source
10. Transaction involves known high-risk areas (e.g., Dar es Salaam luxury properties)

**C. Trust and Estate Red Flags**

1. Trust or estate structure unnecessarily complex
2. Beneficiaries hidden or difficult to identify
3. Assets from unknown or suspicious sources
4. Frequent changes to beneficiaries
5. Trust used to hold assets with no clear purpose
6. Offshore trusts for clients with no international connections
7. Use of nominees as trustees
8. Settlor lacks apparent legitimate source of wealth

**D. Company Formation Red Flags**

1. Company formed with no clear business purpose
2. Nominee directors or shareholders
3. Bearer shares or similar opaque structures
4. Company in tax haven with no business rationale
5. Rapid incorporation and dissolution
6. Company used for single transaction then dormant
7. Client unclear about ultimate ownership
8. Multiple companies with similar structures

**E. Client Account (Client Funds) Red Flags**

1. Unusually large amounts held in client account
2. Funds held for no clear legal purpose
3. Funds quickly moved in and out
4. Third-party instructions to transfer funds
5. Funds transferred to unrelated parties
6. Client account used as a banking facility
7. Funds inconsistent with legal matter
8. Multiple deposits and withdrawals with no clear pattern

**F. Payment Red Flags**

1. Large cash payments (>TZS 5M)
2. Multiple payments to avoid thresholds
3. Payments from unrelated third parties
4. Payments from offshore accounts
5. Overpayment followed by refund requests
6. Use of multiple payment methods
7. Source of funds changes unexpectedly

**G. Matter-Specific Red Flags**

1. **Conveyancing:**
   - Property chain involves offshore companies
   - Multiple property purchases in short time
   - Purchase by entity with no apparent business
   - Use of cash or unusual funding

2. **Corporate/M&A:**
   - Transaction structure overly complex
   - Shell companies involved
   - Nominee directors
   - Beneficial owners unclear

3. **Litigation:**
   - Settlement funds from unusual sources
   - Funds held in client account for extended periods
   - Unexplained third-party funders

**Implementation:**
```sql
CREATE TABLE red_flag_typologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- client_behavior, real_estate, trust, company, client_account, payment, matter_specific
  typology_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  risk_level text NOT NULL, -- low, medium, high, critical
  sector text DEFAULT 'legal',
  guidance text,
  regulatory_reference text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed Tanzania legal sector red flags
INSERT INTO red_flag_typologies (category, typology_code, name, description, risk_level, guidance) VALUES
('real_estate', 'RE-001', 'Purchase by offshore company', 'Residential property purchased by offshore company with no clear business purpose', 'high', 'Verify beneficial ownership, understand business rationale, source of funds'),
('real_estate', 'RE-002', 'Cash property purchase', 'Property purchased with cash payment over TZS 5,000,000', 'critical', 'Enhanced due diligence required, verify source of cash, consider STR'),
-- ... (more red flags)
```

**Implementation Actions:**
1. Create red flag typology database
2. Seed Tanzania legal sector red flags
3. Build red flag detection engine
4. Add red flag alert UI
5. Implement red flag training module
6. Create red flag reporting

---

### MODULE 10: ALERTS AND CASE MANAGEMENT (Enhancement Required)

**Current State:** Transaction alerts exist
**Target State:** Matter-based alert and case management

#### Alert Types for Law Firms

1. **Screening Alerts**
   - Sanctions match
   - PEP match
   - Adverse media match

2. **Red Flag Alerts**
   - Client behavior red flags
   - Transaction red flags
   - Service-specific red flags

3. **Monitoring Alerts**
   - Client account unusual activity
   - Matter escalation
   - Review date approaching

4. **Compliance Alerts**
   - Missing KYC documents
   - Expired identification
   - Overdue risk review

**Case Management Workflow:**
```
Alert Generated
  ↓
Initial Triage (Compliance Officer)
  ↓
Investigation Assigned
  ↓
Evidence Gathering
  - Review client file
  - Review matter files
  - Request additional information
  - Consult with handling lawyer
  ↓
Risk Assessment
  ↓
Decision:
  - No Action (false positive, explained)
  - Enhanced Monitoring
  - Escalate to MLRO
  - Recommend STR
  ↓
If Escalated to MLRO:
  - MLRO Review
  - Senior Partner Consultation (if needed)
  - STR Filing Decision
  ↓
Resolution and Closure
```

**Implementation Actions:**
1. Create matter-based alert system
2. Build case management interface
3. Add investigation workflow
4. Implement evidence collection
5. Add MLRO escalation workflow
6. Create case closure procedures

---

### MODULE 11: STR WORKFLOWS (CRITICAL Enhancement)

**Current State:** Basic STR structure
**Target State:** Legal sector STR with privilege considerations

#### Legal Sector STR Process

**1. Internal Suspicious Activity Escalation**
```
Lawyer identifies suspicious activity
  ↓
Lawyer reports to Compliance Officer (not directly to MLRO)
  ↓
Compliance Officer investigates
  ↓
Compliance Officer prepares report for MLRO
  ↓
MLRO reviews (with consideration of legal privilege)
  ↓
MLRO makes STR decision
```

**2. Legal Professional Privilege Considerations**

**Critical Rule:** Legal advice and litigation matters may be privileged.

**Privileged Information:**
- Legal advice given to client
- Communications in contemplation of litigation
- Client's instructions and disclosures made to seek legal advice

**NOT Privileged:**
- Know your client information
- Source of funds information
- Identity information
- Information provided for non-advisory purposes (e.g., conveyancing)
- Information about criminal activity

**Guidance:**
```javascript
{
  privilegedMatters: [
    'Legal advice',
    'Litigation representation',
    'Client communications seeking legal advice'
  ],
  notPrivilegedMatters: [
    'Conveyancing',
    'Company formation',
    'Trust administration (non-advisory)',
    'Property registration',
    'Notarial services'
  ],
  ambiguousMatters: [
    'Tax advice (seek MLRO guidance)',
    'Trust creation (assess advisory vs administrative)'
  ]
}
```

**3. STR Decision Workflow**

**MLRO Decision Matrix:**
```
Does suspicion exist? → Yes → Is information privileged?
                               ↓
                             Yes → Seek legal advice on privilege boundary
                               ↓
                             No → Proceed to STR preparation
                               ↓
                           File STR with FIU Tanzania
```

**4. Tipping Off Prevention (CRITICAL)**

**Prohibitions:**
- DO NOT tell client about STR
- DO NOT tell colleagues outside need-to-know
- DO NOT document STR in client file
- DO NOT make unusual changes to client relationship
- DO NOT close matter abruptly without reason

**Safe Actions:**
- Continue normal service provision
- Complete transactions in progress
- Maintain professional relationship
- Document internally (separate from client file)

**5. STR Filing to FIU Tanzania**

**Required Information:**
- Law firm details
- MLRO details
- Client identification
- Matter description (non-privileged)
- Suspicious activity description
- Red flags identified
- Supporting documentation

**Timeline:**
- File promptly after decision (1-3 business days)
- Maximum 5 business days from suspicion

**Implementation:**
```sql
CREATE TABLE str_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),

  -- Client/Matter
  client_id uuid REFERENCES kyc_clients(id),
  matter_reference text,

  -- STR Details
  str_reference_number text UNIQUE, -- Generated
  suspicion_date date NOT NULL,
  reported_date date,
  filed_date date,

  -- Privilege Assessment
  privilege_considered boolean DEFAULT false,
  privilege_assessment_notes text,
  privilege_cleared_by uuid,

  -- Activity
  suspicious_activity_description text NOT NULL,
  red_flags_identified text[], -- Array of red flag codes
  typologies text[], -- Array of typology codes

  -- Value
  estimated_amount numeric(15,2),
  currency text DEFAULT 'TZS',

  -- Workflow
  status text DEFAULT 'draft', -- draft, mlro_review, senior_review, approved, filed, acknowledged

  -- Approvals
  prepared_by uuid,
  prepared_at timestamptz,
  mlro_approved_by uuid,
  mlro_approved_at timestamptz,
  senior_approved_by uuid,
  senior_approved_at timestamptz,

  -- FIU
  fiu_reference_number text,
  fiu_acknowledgement_date date,
  fiu_feedback text,

  -- Confidentiality
  tipping_off_risk_assessed boolean DEFAULT false,
  tipping_off_notes text,

  -- Related
  investigation_case_id uuid,
  alert_ids uuid[],

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Implementation Actions:**
1. Create STR workflow with privilege assessment
2. Build MLRO decision interface
3. Add tipping-off prevention checks
4. Implement FIU Tanzania submission format
5. Create STR audit trail
6. Add confidentiality controls

---

### MODULE 12: DASHBOARDS AND REPORTING (Enhancement Required)

**Current State:** Generic dashboards exist
**Target State:** Legal sector-specific MI and reporting

#### Law Firm Dashboards

**1. MLRO Dashboard**
- Total clients by risk rating
- Active matters by risk level
- Alerts by severity (open, under investigation, closed)
- STRs filed (monthly, yearly)
- Screening hits pending review
- EDD matters requiring approval
- Training completion rates
- Policy review status

**2. Compliance Officer Dashboard**
- Assigned alerts and cases
- Investigation workload
- Overdue KYC reviews
- Missing documentation
- Screening queue
- Red flag trends

**3. Senior Partner Dashboard**
- High-risk client portfolio
- EDD approvals pending
- Firm risk profile summary
- Compliance KPIs
- Regulatory update summary
- Strategic risk overview

**4. Lawyer Dashboard**
- Own client risk summary
- Own matter alerts
- Overdue actions
- Training requirements
- Policy updates

**Legal Sector KPIs:**
```javascript
{
  clientRiskDistribution: {
    low: count,
    medium: count,
    high: count,
    veryHigh: count
  },
  mattersByServiceLine: {
    conveyancing: count,
    corporate: count,
    trusts: count,
    litigation: count,
    other: count
  },
  geographicExposure: {
    domestic: percentage,
    crossBorder: percentage,
    highRiskJurisdictions: list
  },
  clientAccountActivity: {
    averageBalance: amount,
    monthlyTurnover: amount,
    unusualActivity: count
  },
  complianceMetrics: {
    overdueKYCReviews: count,
    pendingScreening: count,
    openAlerts: count,
    strsFiled: count
  }
}
```

**Reporting:**

1. **Monthly Compliance Report**
   - New clients onboarded
   - Risk ratings assigned
   - Alerts generated and resolved
   - STRs filed
   - Training conducted
   - Issues identified

2. **Quarterly Board Report**
   - Firm risk profile
   - Client portfolio risk
   - Key compliance metrics
   - Regulatory developments
   - Strategic recommendations

3. **Annual AML Report**
   - Comprehensive compliance summary
   - Risk assessment review
   - Policy updates
   - Training summary
   - Independent audit summary
   - Forward-looking plan

**Implementation Actions:**
1. Create legal sector dashboard templates
2. Build KPI calculation engine
3. Add service line analysis
4. Create report generators
5. Add board report templates
6. Implement automated reporting

---

## TECHNICAL IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: User Roles and Permissions**
- [ ] Add new roles to database
- [ ] Implement role hierarchy
- [ ] Add permission checks
- [ ] Create role management UI
- [ ] Test role access controls

**Week 3-4: Law Firm Assessment**
- [ ] Create legal sector assessment questions
- [ ] Add law firm categories
- [ ] Update risk scoring
- [ ] Test assessment workflow

### Phase 2: Client and Matter Management (Weeks 5-8)

**Week 5-6: Legal Client Types**
- [ ] Extend KYC client model
- [ ] Create client type forms
- [ ] Add matter management
- [ ] Build client-matter relationships

**Week 7-8: Beneficial Ownership**
- [ ] Create BO database tables
- [ ] Build ownership tree component
- [ ] Add UBO identification workflow
- [ ] Implement verification process

### Phase 3: Risk and Due Diligence (Weeks 9-12)

**Week 9-10: Legal Sector Risk Scoring**
- [ ] Implement service risk pillar
- [ ] Add matter complexity scoring
- [ ] Add payment risk scoring
- [ ] Update risk calculation

**Week 11-12: DD Workflows**
- [ ] Map services to DD levels
- [ ] Create DD checklists
- [ ] Build approval workflows
- [ ] Add privilege handling

### Phase 4: Screening and Monitoring (Weeks 13-16)

**Week 13-14: Screening Enhancement**
- [ ] Integrate screening providers
- [ ] Build screening workflow
- [ ] Add match review process
- [ ] Implement ongoing screening

**Week 15-16: Matter-Based Monitoring**
- [ ] Create alert rules for legal sector
- [ ] Build case management
- [ ] Add investigation workflow
- [ ] Implement escalation process

### Phase 5: Red Flags and STR (Weeks 17-20)

**Week 17-18: Red Flag System**
- [ ] Create red flag database
- [ ] Seed Tanzania legal red flags
- [ ] Build detection engine
- [ ] Add red flag alerts

**Week 19-20: STR Workflow**
- [ ] Create STR tables
- [ ] Build MLRO interface
- [ ] Add privilege assessment
- [ ] Implement FIU submission

### Phase 6: Dashboards and Reporting (Weeks 21-24)

**Week 21-22: Dashboards**
- [ ] Create role-specific dashboards
- [ ] Build KPI calculations
- [ ] Add visualizations
- [ ] Implement real-time updates

**Week 23-24: Reporting**
- [ ] Create report templates
- [ ] Build report generators
- [ ] Add export functionality
- [ ] Test end-to-end

---

## SUCCESS CRITERIA

**Technical Success:**
- ✅ All 16 modules implemented
- ✅ Legal sector-specific workflows
- ✅ Tanzania regulatory alignment
- ✅ Scalable architecture
- ✅ Secure and compliant

**Business Success:**
- ✅ 10+ law firms onboarded in Year 1
- ✅ 90%+ user satisfaction
- ✅ Zero data breaches
- ✅ Regulatory approval/endorsement
- ✅ Expansion ready (Kenya, Uganda, Rwanda)

**Compliance Success:**
- ✅ FATF-aligned
- ✅ Tanzania AML Act compliant
- ✅ FIU Tanzania approved
- ✅ Audit-ready
- ✅ Best practice aligned

---

## NEXT STEPS

1. **Review and Approval:** Present this plan to stakeholders
2. **Resource Allocation:** Assign development team
3. **Sprint Planning:** Break into 2-week sprints
4. **Pilot Selection:** Identify 2-3 law firms for pilot
5. **Development Start:** Begin Phase 1 implementation

---

**Document Version:** 1.0
**Date:** February 22, 2026
**Status:** Approved for Implementation
**Owner:** Development Team Lead
**Approver:** Project Sponsor
