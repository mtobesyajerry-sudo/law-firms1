# Tanzania Customer Due Diligence (CDD) Implementation Guide

## Overview

This document describes the comprehensive Customer Due Diligence (CDD) system implemented for Tanzania legal professionals (advocates), aligned with:
- **Tanzania Anti-Money Laundering Act**
- **Financial Intelligence Unit (FIU) Guidelines**
- **FATF Recommendations**
- **Risk-Based Approach to AML/CFT**

## 1. Three-Tier Due Diligence Framework

### Simplified Due Diligence (SDD)
**Risk Level:** Low
**Applied When:** National, institutional, and client risk assessments all indicate low risk

#### Key Features
- Basic identification and verification
- Limited information on purpose (may be inferred from transaction type)
- Reduced monitoring frequency (annual reviews)
- Lower scrutiny of transactions
- Verification may be completed later
- **MANDATORY:** Documented justification required

#### Requirements
1. Full name, nationality, occupation
2. Residential address
3. Date and place of birth
4. ID details
5. Tax identification (if applicable)
6. **Justification documentation** explaining why simplified approach was applied

#### Document Requirements
**For Individuals:**
- National ID (NIDA) or Passport
- One proof of address (utility bill or bank statement)
- TIN Certificate (optional)

**For Legal Entities:**
- Certificate of Incorporation
- Valid Business License
- Register of Directors
- Basic Beneficial Ownership Declaration

#### When Simplified DD Must Stop
- If suspicion arises
- If risk changes to medium/high
- Must escalate immediately if red flags appear

#### Monitoring
- **Frequency:** Annual review
- **Status Tracking:** System automatically tracks next review date

---

### Standard Due Diligence (Default Level)
**Risk Level:** Medium
**Applied To:** Most clients (default approach)

#### Key Features
- Full customer identification and verification
- Understanding purpose and nature of relationship
- Occupation and source of income verification
- Beneficial ownership identification (25%+ threshold for legal entities)
- Third-party identification where applicable
- Ongoing monitoring and information updates

#### Requirements
1. Full identity verification using reliable documents
2. Purpose and expected transactions documented
3. Occupation and source of income recorded
4. Beneficial owners identified and verified
5. Regular monitoring and updates (quarterly)

#### Document Requirements
**For Individuals:**
- National ID (NIDA) or Passport (mandatory)
- Proof of address - utility bill, bank statement, or tenancy agreement (mandatory, max 3 months old)
- TIN Certificate (mandatory)
- Source of Funds Declaration (mandatory)
- Payslips/Employment Confirmation (mandatory)
- Bank Reference (optional)

**For Legal Entities:**
- Certificate of Incorporation (mandatory)
- Memorandum & Articles of Association (mandatory)
- Valid Business License (mandatory)
- Certificate of Compliance from BRELA (mandatory)
- Register of Directors with full details (mandatory)
- Register of Members/Shareholders (mandatory)
- Beneficial Ownership Declaration - 25%+ threshold (mandatory)
- Organizational Structure Chart (mandatory)
- Board Resolution authorizing relationship (mandatory)
- Source of Funds for transaction (mandatory)
- Financial Statements (optional but recommended)

#### Monitoring
- **Frequency:** Quarterly review
- **Ongoing:** Transaction monitoring and information updates

---

### Enhanced Due Diligence (EDD)
**Risk Level:** High / Very High
**Applied When:** High-risk indicators present

#### Automatic Triggers
1. **Geographic Risk**
   - High-risk jurisdictions (FIU/FATF identified)
   - Offshore involvement
   - Sanctioned countries

2. **Client Risk**
   - Politically Exposed Persons (PEPs)
   - Complex beneficial ownership structures
   - Large transaction values

3. **Transaction Risk**
   - Complex or unusual transactions
   - No clear economic rationale
   - Power of attorney transactions (non-residents)

4. **Delivery Channel Risk**
   - Non-face-to-face relationships
   - Remote onboarding
   - Multiple unexplained intermediaries

5. **Behavioral Risk**
   - Suspicious behavior
   - Reluctance to provide information
   - Inconsistent information

#### MANDATORY Requirements for Enhanced DD

##### 1. Senior Management Approval
- **REQUIRED BEFORE ONBOARDING**
- Must be approved by senior partner or management
- System tracks approval status, approver, date, and notes
- Cannot proceed without approval

##### 2. Source of Wealth (MANDATORY)
- Complete documentation of wealth accumulation
- Evidence required (inheritance documents, business records, asset valuations)
- Must be verified before onboarding

##### 3. Source of Funds (MANDATORY)
- Detailed source of funds for specific transaction
- Supporting evidence required
- Transaction path and flow of funds documented

##### 4. First Payment Verification
- First payment must be through regulated financial institution
- Ensures traceability
- System tracks verification status

##### 5. Enhanced Monitoring
- **Monthly reviews** for Very High risk clients
- **Quarterly reviews** for High risk clients
- More frequent updates of KYC information
- Enhanced transaction scrutiny

#### Document Requirements
**All Standard DD documents PLUS:**

**For Individuals:**
- Source of Wealth Documentation (mandatory)
- Enhanced Source of Funds with evidence (mandatory)
- PEP Declaration (mandatory)
- Enhanced DD Questionnaire (mandatory)
- Public Records Search/Adverse Media Screening (mandatory)
- Senior Management Approval Form (mandatory)
- Ongoing Monitoring Checklist (mandatory)
- Bank Reference Letter (recommended)
- Tax Returns (recommended)
- Asset Valuation Reports (for significant holdings)
- PEP Assessment Form (if applicable)
- Country Risk Assessment (for high-risk jurisdictions)
- Economic Rationale Statement (for complex transactions)

**For Legal Entities:**
- All individual requirements apply to beneficial owners
- Source of Wealth for all beneficial owners (mandatory)
- Audited Financial Statements (mandatory)
- Complete ownership structure to natural persons (mandatory)
- Enhanced beneficial ownership verification (mandatory)
- PEP Declarations for all directors and beneficial owners (mandatory)
- Screening for entity and all beneficial owners (mandatory)
- Enhanced monitoring framework with increased frequency (mandatory)

#### Workflow Status Tracking
The system tracks:
- Senior approval status (not_required/pending/approved/rejected)
- Source of funds verification status
- Source of wealth verification status
- First payment verification status
- Approval notes and dates
- Approver information

---

## 2. Continuous Monitoring

### Core Principle
**Customer due diligence is NOT a one-time process.** Advocates must:
- Monitor clients continuously
- Update information regularly
- Detect suspicious transactions
- Escalate when risk changes

### Review Frequencies
- **Simplified DD:** Annual review
- **Standard DD:** Quarterly review
- **Enhanced DD (High Risk):** Quarterly review
- **Enhanced DD (Very High Risk):** Monthly review

### System Features
1. **Automatic Review Scheduling**
   - Next review date automatically calculated based on DD level and risk
   - System sends alerts for upcoming reviews

2. **Overdue Detection**
   - Automatically marks clients as "overdue" when review date passes
   - Status changes from "active" to "overdue"

3. **Review Log**
   - Complete audit trail of all monitoring activities
   - Tracks findings, actions taken, risk changes
   - Documents screening results

4. **Status Tracking**
   - Active: Monitoring on schedule
   - Overdue: Review date passed
   - Suspended: Monitoring temporarily paused
   - Closed: Relationship ended

---

## 3. Database Implementation

### New Tables Created

#### 1. document_types
Master list of all document types that can be requested for CDD.

**Key Fields:**
- code: Unique identifier (e.g., 'nida', 'passport')
- name: Display name
- category: identity, address, financial, corporate, ownership, regulatory
- client_type: individual, legal_entity, both
- validity_months: Document expiry period
- is_active: Whether document type is currently in use

**Seeded with 30+ Tanzania-specific document types**

#### 2. dd_level_document_requirements
Maps document types to DD levels (simplified, standard, enhanced).

**Key Fields:**
- dd_level: simplified, standard, enhanced
- client_type: individual, legal_entity
- document_type_id: Reference to document_types
- is_mandatory: Whether document is required
- priority: Display order
- description: Guidance for document requirement

**Comprehensive mappings for all three DD levels**

#### 3. client_documents
Stores uploaded documents for each client.

**Key Fields:**
- client_id: Reference to kyc_clients
- document_type_id: Type of document
- file_name, file_path, file_size, mime_type
- document_number, issue_date, expiry_date, issuing_authority
- status: pending, verified, rejected, expired
- verification_notes
- verified_by, verified_at
- uploaded_by

**Features:**
- Automatic logging of all document changes
- Expiry tracking
- Verification workflow

#### 4. document_verification_log
Complete audit trail of document verification activities.

**Actions Tracked:**
- uploaded, verified, rejected, expired, deleted, updated

#### 5. kyc_clients (Enhanced Fields)

**Senior Management Approval:**
- senior_approval_status
- approved_by
- approved_at
- approval_notes

**Simplified DD:**
- simplified_dd_justification
- simplified_dd_risk_factors (JSON)

**Continuous Monitoring:**
- next_review_date
- last_review_date
- review_frequency
- monitoring_status

**Source of Funds/Wealth:**
- source_of_funds
- source_of_funds_verified
- source_of_wealth
- source_of_wealth_verified

**Relationship Purpose:**
- legal_service_type
- expected_transaction_volume
- economic_rationale

**First Payment:**
- first_payment_verified
- first_payment_details (JSON)

#### 6. kyc_monitoring_reviews
Audit trail of continuous monitoring activities.

**Key Fields:**
- client_id
- review_date
- reviewed_by
- review_type: scheduled, triggered, ad_hoc
- findings, actions_taken
- risk_change: increased, decreased, unchanged, escalated
- overall_status: satisfactory, concerns, high_concern, exit_recommended

### Automated Functions

#### 1. set_next_review_date()
Automatically calculates next review date when DD level or risk changes.

**Logic:**
- Simplified DD → Annual (12 months)
- Standard DD → Quarterly (3 months)
- Enhanced DD (High) → Quarterly (3 months)
- Enhanced DD (Very High) → Monthly (1 month)

Also automatically sets senior_approval_status to 'pending' when upgraded to Enhanced DD.

#### 2. check_overdue_reviews()
Scans all active clients and marks as 'overdue' if review date has passed.

#### 3. check_expired_documents()
Automatically marks documents as expired when expiry_date passes.

#### 4. log_document_change()
Automatically logs all document status changes to audit trail.

---

## 4. Frontend Implementation

### KYC Client Management Component

**Enhanced Features:**

1. **New Tabs:**
   - Enhanced DD tab - Shows all Enhanced DD clients
   - Pending Approval tab - Shows clients awaiting senior approval
   - Existing tabs maintained (All, Active, High Risk, PEP)

2. **DD Level Column:**
   - Shows DD level with color coding
   - Green for Simplified
   - Yellow for Standard
   - Red for Enhanced

3. **Visual Indicators:**
   - Clear color coding for DD levels
   - Risk level badges
   - PEP indicators
   - Status badges

### KYC Client Details Component

**Redesigned with Comprehensive Unified Layout:**

#### Page Structure
All client information is now organized in a single **Overview** tab with a clean two-column layout that eliminates duplication and provides a professional, corporate appearance.

#### Two-Column Professional Layout

**Left Column - Client Identity & Business:**

1. **Basic Information Card** (👤 icon)
   - Client Type
   - ID Number
   - Date of Birth / Incorporation Date
   - Nationality
   - Country of Residence
   - Client Status
   - Clean row-based layout with labels and values

2. **Business & Financial Card** (💼 icon)
   - Business Activity
   - Source of Funds
   - Source of Wealth
   - Estimated Annual Turnover
   - Purpose of Relationship
   - Organized information rows

**Right Column - Due Diligence & Compliance:**

3. **Due Diligence & Risk Profile Card** (🔒 icon)
   - **Header:** DD Level badge with color coding
   - **DD Controls:** Dropdown to change DD level and Risk Rating badge
   - **Description:** Plain-language explanation of current DD level
   - **Key Requirements:** Complete list of all features for the DD level with bullet points
   - **Enhanced DD Status** (when enhanced level is active):
     - Senior Approval status
     - Source of Funds verification (YES/NO)
     - Source of Wealth verification (YES/NO)
     - Compact badge-based status indicators
   - **Simplified DD Justification** (when simplified level is active):
     - Justification text or warning if missing

4. **Continuous Monitoring Card** (🔄 icon)
   - Review Frequency
   - Next Review Date (with countdown and overdue alerts)
   - Last Review Date
   - Monitoring Status
   - Color-coded status indicators

#### Design Principles

**Unified Information Architecture:**
- Single comprehensive view eliminates navigation between sections
- No duplication of information
- Logical grouping: Identity/Business on left, Compliance/Risk on right
- All critical DD information integrated in one card

**Professional Corporate Styling:**
- Consistent light gray card backgrounds (#fafafa)
- Icon-based section headers for quick visual identification
- Clean borders and proper spacing
- Compact yet readable typography
- Color-coded badges with transparency (15% opacity backgrounds)

**Visual Hierarchy:**
- Card headers (16px, bold, with icons)
- Section titles (13px, bold, uppercase)
- Labels (13px, semi-bold, gray)
- Values (14px, medium weight, dark)
- Badges (10-12px, bold, color-coded)

**Color Coding:**
- Simplified DD: Green (#10b981)
- Standard DD: Orange (#f59e0b)
- Enhanced DD: Red (#ef4444)
- Active/Good: Green (#10b981)
- Warning: Orange (#f59e0b)
- Alert/Overdue: Red (#ef4444)

**Spacing & Layout:**
- Card padding: 20px
- Gap between cards: 20px
- Row padding: 12px vertical
- Consistent 1px borders (#e5e7eb)
- 10px rounded corners

**Responsive Design:**
- Two-column grid (min 450px per column)
- Stacks to single column on tablets/mobile
- All content readable and accessible at any viewport size
- Proper text wrapping and overflow handling

**Key Improvements:**
- Eliminated the separate large DD section above the tabs
- Integrated all DD information into the Overview tab
- Removed duplicate DD level, risk rating, and review date fields
- Cleaner page flow with no congestion
- More professional and corporate appearance
- Easier to scan and find information

### Helper Functions (kycData.js)

**New Tanzania-Specific Functions:**

```javascript
// Get DD level requirements and information
getDDLevelRequirements(ddLevel)
dueDiligenceLevelInfo[level]

// Check requirements
requiresSeniorApproval(ddLevel)
requiresSourceOfWealth(ddLevel)
requiresSimplifiedJustification(ddLevel)

// Calculate dates
getReviewFrequencyFromDDLevel(ddLevel, riskLevel)
calculateNextReviewDate(frequency)
isReviewOverdue(nextReviewDate)
getDaysUntilReview(nextReviewDate)

// Get colors for status indicators
getApprovalStatusColor(status)
getMonitoringStatusColor(status)
```

**New Data Structures:**
- legalServiceTypes - Types of legal services with risk scores
- transactionVolumeOptions - Transaction volume ranges
- pepCategories - Types of PEPs
- highRiskJurisdictions - High-risk countries
- approvalStatuses - Senior approval statuses
- monitoringStatuses - Monitoring statuses

---

## 5. Compliance Features

### Automatic Triggers
The system automatically:
1. Identifies Enhanced DD triggers
2. Calculates risk scores
3. Recommends appropriate DD level
4. Tracks workflow requirements
5. Alerts for missing documentation

### Audit Trail
Complete logging of:
- All DD level changes
- Document uploads and verifications
- Approval decisions
- Monitoring reviews
- Risk assessments

### Security
- Row Level Security (RLS) on all tables
- Organization-based data isolation
- Role-based access control
- Admin oversight capabilities

### Reporting
System supports:
- Client risk profiles
- DD level distribution
- Overdue review alerts
- Missing documentation reports
- Approval workflow status

---

## 6. Best Practices for Tanzania Advocates

### Simplified DD
1. ✅ Always document justification
2. ✅ Ensure low risk confirmed by all assessments
3. ✅ Monitor for risk changes
4. ❌ Never use if any suspicion exists
5. ❌ Never delay if risk increases

### Standard DD
1. ✅ Default level for most clients
2. ✅ Complete all mandatory documents
3. ✅ Verify beneficial ownership (25%+ threshold)
4. ✅ Maintain quarterly reviews
5. ✅ Update information regularly

### Enhanced DD
1. ✅ MANDATORY senior approval before onboarding
2. ✅ MANDATORY source of wealth documentation
3. ✅ MANDATORY source of funds documentation
4. ✅ First payment through regulated FI
5. ✅ Enhanced monitoring (monthly/quarterly)
6. ✅ Document economic rationale for complex transactions
7. ❌ Cannot proceed without senior approval
8. ❌ Cannot skip source of wealth/funds requirements

### Continuous Monitoring
1. ✅ Set review calendar based on risk
2. ✅ Document all reviews
3. ✅ Update client information
4. ✅ Screen for adverse media
5. ✅ Escalate if risk increases
6. ❌ Never let reviews become overdue

---

## 7. Document Validity Periods

The system tracks document expiry based on Tanzania requirements:

- **National ID (NIDA):** 120 months (10 years)
- **Passport:** 120 months
- **Utility Bills:** 3 months
- **Bank Statements:** 3 months
- **Business License:** 12 months
- **Certificate of Compliance (BRELA):** 12 months
- **Financial Statements:** 12 months
- **Source of Funds/Wealth:** 12-24 months
- **PEP Declarations:** 12 months
- **Monitoring Checklists:** 6 months

System automatically:
- Alerts when documents are approaching expiry
- Marks documents as expired when date passes
- Requires document renewal

---

## 8. Integration with Existing System

### Backward Compatibility
- Existing clients default to 'standard' DD level
- All existing features maintained
- Risk assessment integration preserved
- Document management enhanced, not replaced

### Gradual Rollout
Organizations can:
1. Review existing clients
2. Assign appropriate DD levels
3. Complete missing documentation
4. Establish monitoring schedules
5. Train staff on new workflow

### Admin Controls
Administrators can:
- View all clients across organizations
- Monitor compliance across firm
- Generate reports
- Override DD levels when justified
- Approve Enhanced DD relationships

---

## 9. Summary

This implementation provides Tanzania legal professionals with a comprehensive, automated, and compliant Customer Due Diligence system that:

✅ Implements all three DD levels per Tanzania law
✅ Automates document requirements based on risk
✅ Enforces mandatory Enhanced DD workflows
✅ Tracks continuous monitoring obligations
✅ Provides complete audit trail
✅ Ensures regulatory compliance
✅ Reduces manual compliance work
✅ Protects against ML/TF risks

The system is designed to be intuitive, automated where possible, and compliant with Tanzania's regulatory framework for DNFBPs (Designated Non-Financial Businesses and Professions).

---

## 10. Technical Details

### Database Migrations Applied
1. `add_tanzania_specific_dd_document_requirements` - Seeds document types and requirements
2. `add_dd_workflow_and_monitoring_fields` - Adds workflow tracking fields

### Files Modified
1. `src/data/kycData.js` - Added Tanzania-specific helpers and data
2. `src/components/KYCClientManagement.jsx` - Enhanced with DD level display and filtering
3. `src/components/KYCClientDetails.jsx` - Comprehensive DD level information display

### New Database Tables
- document_types
- dd_level_document_requirements
- client_documents
- document_verification_log
- kyc_monitoring_reviews

### Enhanced Tables
- kyc_clients (15+ new fields for DD workflow)

---

**Implementation Date:** February 16, 2026
**Compliance Framework:** Tanzania AML Act, FIU Guidelines, FATF Recommendations
**Target Users:** Tanzania Legal Professionals (Advocates)
