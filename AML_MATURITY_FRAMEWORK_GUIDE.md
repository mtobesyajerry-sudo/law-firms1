# AML/CFT Institutional Maturity and Risk Assessment System
## Complete Implementation Guide for Banks and Financial Institutions

**Version:** 1.0
**Date:** February 21, 2026
**Framework:** FATF Recommendations & Risk-Based Supervision
**Target Users:** Banks, Financial Institutions, DNFBPs

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Maturity Framework](#2-maturity-framework)
3. [Domain Structure](#3-domain-structure)
4. [Control Library](#4-control-library)
5. [Assessment Process](#5-assessment-process)
6. [Scoring Methodology](#6-scoring-methodology)
7. [Gap Analysis](#7-gap-analysis)
8. [Remediation Management](#8-remediation-management)
9. [Dashboard and Reporting](#9-dashboard-and-reporting)
10. [Technical Architecture](#10-technical-architecture)

---

## 1. System Overview

### 1.1 Purpose

This system provides a comprehensive, risk-based approach to assessing AML/CFT maturity and compliance for banks and financial institutions. It aligns with FATF recommendations and implements a 5-level capability maturity model across 9 weighted AML/CFT domains.

### 1.2 Key Features

- **5-Level Maturity Assessment**: Initial → Developing → Defined → Managed → Optimised
- **9 Weighted AML Domains**: Covering all aspects of AML/CFT compliance
- **60+ Controls**: Comprehensive control library with regulatory references
- **Document-to-Control Mapping**: Link evidence directly to controls
- **Automated Gap Identification**: AI-powered gap analysis with severity classification
- **Remediation Planning**: Structured action plans with progress tracking
- **Trend Analysis**: Historical snapshots for maturity trending
- **Benchmarking**: Compare against peer institutions and industry standards

### 1.3 Benefits

**For Management:**
- Clear visibility into AML/CFT compliance maturity
- Prioritized remediation roadmap
- Board-level reporting and MI
- Regulatory examination preparedness

**For Compliance Teams:**
- Structured assessment methodology
- Evidence management and tracking
- Gap identification and remediation tracking
- Audit trail for all assessments

**For Auditors:**
- Independent validation framework
- Control effectiveness testing
- Historical trend analysis
- Comprehensive reporting

---

## 2. Maturity Framework

### 2.1 Five Maturity Levels

The system uses a 5-level capability maturity model adapted from CMMI and aligned with FATF risk-based supervision principles.

#### Level 1: Initial / Ad hoc

**Characteristics:**
- No formal control exists
- Processes unpredictable and reactive
- Success depends on individual effort
- No documented policies or procedures
- No management oversight

**Indicators:**
- Informal, ad hoc processes
- Reactive approach to compliance
- No evidence of implementation
- Staff unaware of requirements

**Scoring:** Control not implemented or only informal practices exist

---

#### Level 2: Developing

**Characteristics:**
- Basic control exists but incomplete
- Processes inconsistent and unpredictable
- Limited documentation and awareness
- Minimal management oversight

**Indicators:**
- Basic policies documented
- Inconsistent implementation across branches/departments
- Limited staff awareness and training
- Incomplete evidence or documentation gaps

**Scoring:** Control partially implemented with significant gaps

---

#### Level 3: Defined

**Characteristics:**
- Control formally defined and implemented
- Processes documented, standardized, and understood
- Staff trained and aware of requirements
- Management oversight established

**Indicators:**
- Formal policies and procedures in place
- Consistent implementation across the institution
- Staff trained and competent
- Complete documentation and evidence
- Regular management reporting

**Scoring:** Control fully implemented and documented

**Note:** Level 3 is the **minimum acceptable maturity** for mandatory controls.

---

#### Level 4: Managed

**Characteristics:**
- Control monitored, measured, and reviewed
- Performance metrics and KRIs established
- Management actively oversees effectiveness
- Issues identified and addressed promptly

**Indicators:**
- Regular monitoring and testing programs
- Performance metrics tracked and reported
- Issues escalated and remediated
- Quality assurance reviews conducted
- Management information dashboards

**Scoring:** Control implemented, monitored, and regularly reviewed

---

#### Level 5: Optimised

**Characteristics:**
- Control continuously improved based on metrics and best practices
- Proactive risk management
- Technology and automation utilized
- Industry-leading practices adopted

**Indicators:**
- Continuous improvement program
- Benchmarking against best practices
- Proactive risk identification (predictive analytics)
- Advanced automation and technology
- Regular independent validation
- Innovation and optimization culture

**Scoring:** Control optimised with continuous improvement

---

### 2.2 Maturity Progression

Organizations typically progress through maturity levels as follows:

1. **Initial → Developing (6-12 months)**
   - Document policies and procedures
   - Implement basic controls
   - Train staff on requirements

2. **Developing → Defined (12-24 months)**
   - Standardize processes across organization
   - Complete documentation and evidence
   - Establish management oversight

3. **Defined → Managed (12-18 months)**
   - Implement monitoring and testing
   - Establish KRIs and metrics
   - Regular quality assurance

4. **Managed → Optimised (18-24 months)**
   - Continuous improvement programs
   - Advanced technology and automation
   - Industry benchmarking

**Total journey from Initial to Optimised: 3-5 years**

---

## 3. Domain Structure

The system assesses maturity across 9 weighted AML/CFT domains that cover all aspects of an effective AML/CFT program.

### 3.1 Domain Weights

| Domain | Code | Weight | Rationale |
|--------|------|--------|-----------|
| **Governance and Oversight** | GOV | 15% | Foundation of AML program - Board oversight, MLRO, governance structure |
| **Enterprise ML/TF Risk Assessment** | ERA | 15% | Risk-based approach mandated by FATF - institutional risk assessment |
| **Customer Due Diligence and KYC** | CDD | 15% | Core preventive measure - know your customer and beneficial owners |
| **Transaction Monitoring** | TM | 15% | Primary detective control - identify suspicious activity |
| **Sanctions and Screening** | SAN | 10% | Critical compliance requirement - sanctions, PEPs, watchlists |
| **Suspicious Activity Reporting** | SAR | 10% | Regulatory obligation - STR/SAR filing and escalation |
| **Internal Controls and Compliance Monitoring** | ICC | 10% | Second line of defense - monitoring program and control testing |
| **Independent Audit and Assurance** | AUD | 5% | Third line of defense - independent validation |
| **Training and Awareness** | TRN | 5% | Foundational requirement - staff awareness and competence |
| **Total** | | **100%** | |

### 3.2 Domain Descriptions

#### GOV: Governance and Oversight (15%)

**Purpose:** Establish tone from the top and accountability framework

**Key Elements:**
- Board of Directors AML oversight
- MLRO appointment and independence
- AML governance structure (committees, reporting lines)
- Resource allocation (budget, staff, technology)
- Approved AML/CFT policy

**Why 15%:** Governance failures are root cause of most AML breakdowns. Strong governance is foundation of effective program.

---

#### ERA: Enterprise ML/TF Risk Assessment (15%)

**Purpose:** Understand institution's ML/TF risk profile

**Key Elements:**
- Institution-wide risk assessment
- Customer risk classification
- Product and service risk
- Geographic risk
- Delivery channel risk
- Periodic risk assessment updates

**Why 15%:** Risk-based approach is cornerstone of FATF standards. Risk assessment drives all other controls.

---

#### CDD: Customer Due Diligence and KYC (15%)

**Purpose:** Know who your customers are and verify their identity

**Key Elements:**
- Customer identification and verification (CIP)
- Beneficial ownership identification
- Customer risk classification
- Purpose and nature of business relationship
- Enhanced due diligence (EDD) for high-risk
- Ongoing due diligence and customer refresh

**Why 15%:** CDD is primary preventive control. Customers are the institution's exposure to ML/TF risk.

---

#### TM: Transaction Monitoring (15%)

**Purpose:** Detect unusual and suspicious activity

**Key Elements:**
- Transaction monitoring framework
- Scenario design and typology coverage
- Alert review and investigation
- Threshold and parameter tuning
- Model validation
- Backlog management

**Why 15%:** Transaction monitoring is primary detective control. Critical for identifying suspicious activity before funds leave the institution.

---

#### SAN: Sanctions and Screening (10%)

**Purpose:** Comply with sanctions and prevent dealings with prohibited parties

**Key Elements:**
- Sanctions screening program
- List management (OFAC, UN, EU, etc.)
- Screening at onboarding
- Ongoing screening
- Payment screening (SWIFT)
- Hit investigation and escalation
- Asset freezing procedures

**Why 10%:** Sanctions violations carry severe penalties. Clear regulatory obligation with zero tolerance.

---

#### SAR: Suspicious Activity Reporting (10%)

**Purpose:** File timely STRs/SARs with Financial Intelligence Unit

**Key Elements:**
- Internal escalation procedures
- STR/SAR review and filing process
- Timely filing within regulatory deadlines
- Record keeping (5-year retention)
- Tipping-off prevention
- STR quality assurance

**Why 10%:** Core regulatory obligation. FIU relies on STRs for financial intelligence. Quality and timeliness critical.

---

#### ICC: Internal Controls and Compliance Monitoring (10%)

**Purpose:** Second line of defense - monitor and test AML controls

**Key Elements:**
- Compliance monitoring program
- Control testing and validation
- Key risk indicators (KRIs)
- Management information reporting
- Issue remediation tracking
- Three lines of defense model

**Why 10%:** Compliance function must independently verify effectiveness. Early issue identification prevents regulatory findings.

---

#### AUD: Independent Audit and Assurance (5%)

**Purpose:** Third line of defense - independent validation

**Key Elements:**
- Internal audit of AML program
- External independent review
- Audit finding remediation
- Regulatory examination preparedness

**Why 5%:** Independent assurance provides objective assessment. Lower weight as periodic (annual) vs continuous controls.

---

#### TRN: Training and Awareness (5%)

**Purpose:** Ensure staff awareness and competence

**Key Elements:**
- AML training program
- New hire training
- Annual refresher training
- Role-specific training
- Training effectiveness testing
- Awareness campaigns

**Why 5%:** Foundation requirement. Well-trained staff essential but training alone doesn't prevent ML/TF without other controls.

---

## 4. Control Library

The system includes 60+ controls across 9 domains. Each control is defined with:

### 4.1 Control Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Control Code** | Unique identifier | GOV-001, CDD-003, TM-002 |
| **Control Name** | Short descriptive name | "MLRO Appointment and Independence" |
| **Control Description** | Detailed requirement | "Money Laundering Reporting Officer appointed at management level..." |
| **Regulatory Reference** | Applicable regulation | "FATF R.18, AML Act S.12" |
| **Control Type** | Preventive/Detective/Corrective | Preventive, Detective, Corrective |
| **Automation Level** | Manual/Semi-automated/Fully-automated | Manual, Semi-automated, Fully-automated |
| **Required Evidence** | Document types needed | ["MLRO appointment letter", "Job description", "Org chart"] |
| **Testing Frequency** | How often to test | Continuous, Monthly, Quarterly, Annual |
| **Is Mandatory** | Required for all institutions | True/False |
| **Min Entity Tier** | Minimum tier requiring this control | 1 (all), 2 (medium+), 3 (large only) |

### 4.2 Sample Controls by Domain

#### Governance and Oversight (5 controls)

1. **GOV-001**: Board Oversight of AML/CFT
2. **GOV-002**: Approved AML/CFT Policy
3. **GOV-003**: MLRO Appointment and Independence
4. **GOV-004**: AML Governance Structure
5. **GOV-005**: Adequate Resources

#### Enterprise Risk Assessment (6 controls)

1. **ERA-001**: Enterprise ML/TF Risk Assessment
2. **ERA-002**: Customer Risk Assessment
3. **ERA-003**: Product and Service Risk Assessment
4. **ERA-004**: Geographic Risk Assessment
5. **ERA-005**: Delivery Channel Risk Assessment
6. **ERA-006**: Risk Assessment Review and Update

#### Customer Due Diligence (8 controls)

1. **CDD-001**: Customer Identification Program
2. **CDD-002**: Beneficial Ownership Identification
3. **CDD-003**: Customer Risk Classification
4. **CDD-004**: Purpose and Nature of Business Relationship
5. **CDD-005**: Enhanced Due Diligence
6. **CDD-006**: Simplified Due Diligence
7. **CDD-007**: Ongoing Due Diligence
8. **CDD-008**: PEP Procedures

#### Transaction Monitoring (6 controls)

1. **TM-001**: Transaction Monitoring Framework
2. **TM-002**: Transaction Monitoring Scenarios
3. **TM-003**: Alert Review and Investigation
4. **TM-004**: Threshold and Parameter Tuning
5. **TM-005**: Model Validation and Testing
6. **TM-006**: Backlog Management

#### Sanctions and Screening (7 controls)

1. **SAN-001**: Sanctions Screening Program
2. **SAN-002**: Sanctions List Management
3. **SAN-003**: Screening at Onboarding
4. **SAN-004**: Ongoing Screening
5. **SAN-005**: Payment Screening
6. **SAN-006**: Hit Investigation and Escalation
7. **SAN-007**: Asset Freezing and Reporting

#### Suspicious Activity Reporting (6 controls)

1. **SAR-001**: Internal Suspicious Activity Escalation
2. **SAR-002**: STR/SAR Review and Filing
3. **SAR-003**: Timely STR/SAR Filing
4. **SAR-004**: STR/SAR Record Keeping
5. **SAR-005**: Tipping-Off Prevention
6. **SAR-006**: STR/SAR Quality Assurance

#### Internal Controls (6 controls)

1. **ICC-001**: Compliance Monitoring Program
2. **ICC-002**: Control Testing and Validation
3. **ICC-003**: Key Risk Indicators (KRIs)
4. **ICC-004**: Management Information Reporting
5. **ICC-005**: Issue Remediation Tracking
6. **ICC-006**: Three Lines of Defense Model

#### Independent Audit (4 controls)

1. **AUD-001**: Internal Audit of AML Program
2. **AUD-002**: External Independent Review
3. **AUD-003**: Audit Finding Remediation
4. **AUD-004**: Regulatory Examination Preparedness

#### Training and Awareness (6 controls)

1. **TRN-001**: AML Training Program
2. **TRN-002**: New Hire AML Training
3. **TRN-003**: Annual Refresher Training
4. **TRN-004**: Role-Specific Training
5. **TRN-005**: Training Effectiveness Testing
6. **TRN-006**: AML Awareness Campaigns

---

## 5. Assessment Process

### 5.1 Assessment Workflow

```
1. Assessment Initiation
   ↓
2. Control Assessment (for each control)
   - Rate implementation status
   - Assess evidence quality
   - Record testing results
   - Map supporting documents
   ↓
3. Automated Scoring
   - Calculate control maturity (1-5)
   - Aggregate domain scores
   - Calculate overall maturity
   ↓
4. Gap Analysis
   - Identify gaps per control
   - Classify severity (Critical/High/Medium/Low)
   - Calculate priority scores
   ↓
5. Remediation Planning
   - Generate action plans
   - Assign responsibilities
   - Set target dates and milestones
   ↓
6. Reporting
   - Generate maturity dashboard
   - Create gap analysis report
   - Export remediation roadmap
   ↓
7. Monitoring & Trending
   - Track remediation progress
   - Create periodic snapshots
   - Trend maturity over time
```

### 5.2 Control Assessment Steps

For each applicable control:

#### Step 1: Assess Implementation Status

Select one:
- **Not Implemented**: Control does not exist
- **Partial**: Control exists but incomplete
- **Implemented**: Control fully implemented
- **Optimised**: Control continuously improved

#### Step 2: Assess Evidence Quality

If implemented, rate evidence:
- **Poor**: Inadequate or missing documentation
- **Fair**: Basic documentation with gaps
- **Good**: Complete and appropriate documentation
- **Excellent**: Comprehensive documentation with validation

#### Step 3: Record Testing Results

If tested:
- **Not Tested**: No testing performed
- **Failed**: Control not operating as designed
- **Partial**: Control partially effective
- **Passed**: Control operating effectively

#### Step 4: Map Evidence

Upload and link supporting documents:
- Policy documents
- Procedures
- Records (transactions, reports, logs)
- System outputs
- Other evidence

#### Step 5: Add Assessor Notes

Document:
- Observations during assessment
- Strengths identified
- Weaknesses noted
- Recommendations

### 5.3 Entity Tier Considerations

**Tier 1 (Small Institutions):**
- Assessed against ~35 mandatory controls
- Focus on foundational controls
- Proportionate requirements

**Tier 2 (Medium Institutions):**
- Assessed against ~50 controls
- Includes enhanced monitoring and testing
- More robust governance expected

**Tier 3 (Large Institutions):**
- Assessed against all 60+ controls
- Comprehensive program expected
- Advanced capabilities required

---

## 6. Scoring Methodology

### 6.1 Control-Level Scoring

**Maturity Level Calculation:**

```
Base Score = Implementation Status Score
  - Not Implemented = 1
  - Partial = 2
  - Implemented = 3
  - Optimised = 5

Adjusted for Evidence Quality (if implemented):
  - Excellent: +1 level
  - Good: no change
  - Fair: -0.5 level
  - Poor: -1 level

Adjusted for Testing Results (if tested):
  - Passed: +0.5 level
  - Partial: -0.5 level
  - Failed: -1 level

Final Maturity Level = Round(Adjusted Score) [1-5]
Maturity Score = (Maturity Level / 5) * 100
```

**Example:**
- Implementation: Implemented (3)
- Evidence: Good (no change)
- Testing: Passed (+0.5)
- **Final Maturity: 4 (Managed)**

### 6.2 Domain-Level Scoring

**Average Maturity:**
```
Average Maturity = Sum of Control Maturity Levels / Number of Controls
```

**Weighted Score:**
```
Weighted Score = (Average Maturity / 5) * 100 * Domain Weight
```

**Compliance Percentage:**
```
Compliance % = (Controls at Level 3+ / Total Controls) * 100
```

**Example: CDD Domain (Weight 15%)**
- 8 controls assessed
- Maturity levels: [3, 4, 3, 5, 2, 3, 4, 4]
- Average Maturity: 3.5
- Weighted Score: (3.5/5) * 100 * 0.15 = 10.5
- Compliance: 7/8 = 87.5%

### 6.3 Overall Maturity Calculation

```
Overall Maturity = Σ (Domain Average Maturity × Domain Weight)
```

**Example:**
| Domain | Avg Maturity | Weight | Contribution |
|--------|-------------|--------|--------------|
| GOV | 3.8 | 0.15 | 0.57 |
| ERA | 3.2 | 0.15 | 0.48 |
| CDD | 3.5 | 0.15 | 0.53 |
| TM | 4.0 | 0.15 | 0.60 |
| SAN | 4.2 | 0.10 | 0.42 |
| SAR | 3.6 | 0.10 | 0.36 |
| ICC | 3.4 | 0.10 | 0.34 |
| AUD | 3.0 | 0.05 | 0.15 |
| TRN | 4.0 | 0.05 | 0.20 |
| **Total** | | **1.00** | **3.65** |

**Overall Institutional Maturity: 3.65 (Approaching "Managed")**

---

## 7. Gap Analysis

### 7.1 Gap Categories

The system identifies 4 types of gaps:

1. **Missing Control**: Mandatory control not implemented
2. **Weak Implementation**: Control partially implemented with deficiencies
3. **Inadequate Evidence**: Insufficient documentation
4. **Ineffective Testing**: Control failed effectiveness testing

### 7.2 Gap Severity Classification

Gaps are classified as Critical/High/Medium/Low based on:

**Severity Score Formula:**
```
Severity Score =
  (Domain Weight × 10) +
  (Mandatory Factor: 3 if mandatory, 1 if optional) +
  (Tier Factor: 3 for Tier 1, 2 for Tier 2, 1 for Tier 3) +
  (Maturity Gap: 6 - Current Maturity Level)
```

**Classification:**
- **Critical**: Score ≥ 8 (Immediate action required)
- **High**: Score 6-7 (Address within 3 months)
- **Medium**: Score 4-5 (Address within 6 months)
- **Low**: Score < 4 (Address within 12 months)

### 7.3 Gap Examples

#### Critical Gap Example

**Control:** GOV-003 (MLRO Appointment and Independence)
- **Status:** Not Implemented
- **Severity:** Critical
- **Gap Description:** "Mandatory control 'MLRO Appointment and Independence' is not implemented"
- **Regulatory Risk:** "Non-compliance with FATF R.18, AML Act S.12"
- **Business Impact:** "High regulatory risk and potential enforcement action"
- **Recommended Action:** "Immediately appoint MLRO at management level with documented authority and independence"
- **Priority Score:** 10/10

#### High Gap Example

**Control:** TM-003 (Alert Review and Investigation)
- **Status:** Partial
- **Maturity:** 2
- **Severity:** High
- **Gap Description:** "Alert investigation procedures incomplete and inconsistently applied"
- **Regulatory Risk:** "Partial compliance with transaction monitoring requirements"
- **Business Impact:** "Risk of missing suspicious activity"
- **Recommended Action:** "Complete alert investigation procedures and train all investigators"
- **Priority Score:** 7/10

---

## 8. Remediation Management

### 8.1 Remediation Plan Components

Each gap generates a structured remediation plan:

| Field | Description |
|-------|-------------|
| **Action Description** | Specific remediation action required |
| **Responsible Party** | Role/person responsible for execution |
| **Accountable Party** | Role/person accountable for success (typically MLRO) |
| **Target Maturity Level** | Desired maturity after remediation |
| **Estimated Cost** | Budget required |
| **Estimated Effort** | Person-days required |
| **Priority** | Critical/High/Medium/Low |
| **Status** | Planned/In Progress/Completed/Deferred/Cancelled |
| **Start Date** | When work begins |
| **Target Date** | When completion expected |
| **Progress %** | 0-100% completion |

### 8.2 Effort Estimation

**Effort Formula:**
```
Maturity Gap = Target Maturity - Current Maturity

Estimated Days = Maturity Gap × Severity Multiplier
  - Critical: 30 days per maturity level
  - High: 20 days per maturity level
  - Medium: 10 days per maturity level
  - Low: 5 days per maturity level
```

**Example:**
- Control at Level 2, target Level 4
- Gap = 2 maturity levels
- Severity = High
- Effort = 2 × 20 = 40 days

### 8.3 Progress Tracking

Remediation plans support:
- Progress percentage (0-100%)
- Status updates
- Milestone tracking
- Progress notes
- Automatic completion when 100% reached

---

## 9. Dashboard and Reporting

### 9.1 Maturity Dashboard

The dashboard provides comprehensive visualization:

**Key Metrics:**
- Overall Maturity Score (1-5)
- Compliance Rate (% of controls at Level 3+)
- Critical & High Gaps count
- Remediation Progress

**Visualizations:**
- Control maturity distribution (bar chart)
- Gap severity distribution (counts by severity)
- Domain maturity heatmap (9 domains with scores)
- Remediation progress tracker

### 9.2 Dashboard Tabs

#### Tab 1: Overview
- Key metrics summary
- Maturity distribution across 5 levels
- Gap distribution by severity
- Domain heatmap

#### Tab 2: Domain Analysis
- Detailed view per domain
- Control-by-control breakdown
- Implementation status
- Evidence quality
- Testing results

#### Tab 3: Gap Analysis
- All identified gaps
- Filterable by severity
- Regulatory risk description
- Business impact
- Recommended actions

#### Tab 4: Remediation
- All remediation plans
- Filterable by status/priority
- Progress tracking
- Quick actions (update progress, mark complete)

#### Tab 5: Trending
- Historical maturity trend (line chart)
- Snapshot comparison
- Maturity change over time
- Improvement tracking

### 9.3 Reports

The system generates:

1. **Executive Summary Report**
   - Overall maturity rating
   - Key findings
   - Top gaps by priority
   - Remediation roadmap

2. **Detailed Assessment Report**
   - Domain-by-domain analysis
   - Control assessment results
   - Evidence review
   - Gaps and recommendations

3. **Gap Analysis Report**
   - All gaps by severity
   - Regulatory risk analysis
   - Prioritized action plan

4. **Remediation Roadmap**
   - Sequenced actions
   - Resource requirements
   - Timeline (Gantt chart view)
   - Accountability matrix (RACI)

5. **Board Report**
   - High-level maturity summary
   - Risk exposure
   - Strategic recommendations
   - Investment requirements

---

## 10. Technical Architecture

### 10.1 Database Schema

**Core Tables:**

```
maturity_levels (5 levels, reference data)
├── level, name, description, criteria

aml_domains (9 domains)
├── code, name, description, weight, sort_order

aml_controls (60+ controls)
├── domain_id, control_code, control_name
├── control_description, regulatory_reference
├── control_type, automation_level
├── required_evidence[], testing_frequency
├── is_mandatory, min_entity_tier

control_assessments (per assessment)
├── assessment_id, control_id
├── maturity_level, maturity_score
├── implementation_status, evidence_quality, testing_result
├── control_owner, last_tested_date
├── assessor_notes, gaps_identified[]

control_evidence_mapping
├── control_assessment_id, document_id
├── evidence_type, coverage_percentage
├── verified_by, verification_notes

domain_scores
├── assessment_id, domain_id
├── average_maturity, weighted_score
├── compliance_percentage
├── gaps_critical, gaps_high, gaps_medium, gaps_low

gap_analysis
├── assessment_id, control_assessment_id
├── gap_category, severity
├── gap_description, regulatory_risk, business_impact
├── recommended_action, priority_score, status

remediation_plans
├── assessment_id, gap_id, control_id
├── action_description, responsible_party
├── target_maturity_level, estimated_cost, estimated_effort_days
├── priority, status, start_date, target_date
├── progress_percentage, progress_notes

assessment_snapshots (trending)
├── organization_id, assessment_id
├── snapshot_date, snapshot_type
├── overall_maturity, domain_scores{}
├── control_count_by_level{}, gap_count_by_severity{}
```

### 10.2 Services

**ControlAssessmentService:**
- `getDomainsAndControls()`
- `getMaturityLevels()`
- `initializeControlAssessments()`
- `updateControlAssessment()`
- `calculateAndUpdateDomainScores()`
- `performGapAnalysis()`
- `generateRemediationPlans()`
- `createSnapshot()`

### 10.3 Utilities

**maturityUtils.js:**
- `calculateMaturityScore()` - Control maturity calculation
- `calculateDomainScore()` - Domain aggregation
- `calculateOverallMaturity()` - Institutional maturity
- `identifyControlGaps()` - Gap identification logic
- `classifyGapSeverity()` - Severity classification
- `generateRemediationPlan()` - Remediation generation
- `generateSnapshotData()` - Snapshot creation

### 10.4 Components

**MaturityDashboard.jsx:**
- Main dashboard component
- 5 tabs (Overview, Domains, Gaps, Remediation, Trending)
- Data visualization
- Interactive controls
- Progress tracking

---

## 11. Best Practices

### 11.1 Assessment Frequency

- **Annual Comprehensive Assessment**: Full review of all controls
- **Semi-Annual Quick Assessment**: Review high-risk domains only
- **Quarterly Progress Review**: Review remediation progress
- **Ad-Hoc Assessment**: After material changes (new products, M&A, regulatory changes)

### 11.2 Evidence Management

- Upload evidence during assessment
- Map documents to specific controls
- Maintain version control
- Retain for 5+ years per regulatory requirements

### 11.3 Remediation Prioritization

1. Address all Critical gaps immediately
2. Sequence High gaps by regulatory deadline
3. Group Medium gaps by domain
4. Defer Low gaps if resources constrained

### 11.4 Continuous Improvement

- Set maturity improvement targets (e.g., +0.5 per year)
- Benchmark against peer institutions
- Adopt industry best practices
- Invest in automation and technology

---

## 12. Regulatory Alignment

### 12.1 FATF Recommendations

The framework directly addresses:

- **R.1**: Risk-based approach (ERA domain)
- **R.6-7**: Targeted financial sanctions (SAN domain)
- **R.10-11**: Customer due diligence and record keeping (CDD domain)
- **R.12-13**: PEPs and EDD (CDD domain)
- **R.16**: Wire transfers (TM, SAN domains)
- **R.18**: Internal controls and compliance function (GOV, ICC domains)
- **R.20**: Suspicious transaction reporting (SAR domain)

### 12.2 Local Regulations

The framework is designed to be customized for local regulations:

- Anti-Money Laundering Act
- Banking and Financial Institutions Act
- Central Bank AML/CFT Regulations
- FIU Guidelines

Each control includes regulatory reference field for local citation.

---

## 13. Conclusion

This AML/CFT Institutional Maturity and Risk Assessment System provides a comprehensive, structured, and automated approach to assessing and improving AML/CFT compliance maturity.

**Key Benefits:**
✓ Risk-based and proportionate
✓ Aligned with FATF recommendations
✓ Automated scoring and gap analysis
✓ Actionable remediation roadmap
✓ Trend analysis and benchmarking
✓ Regulatory examination ready

**Next Steps:**
1. Complete initial assessment
2. Review maturity dashboard
3. Prioritize critical and high gaps
4. Develop remediation roadmap
5. Track progress and monitor trends
6. Reassess periodically

---

**Document Version:** 1.0
**Last Updated:** February 21, 2026
**System Version:** 1.0
**Contact:** AML Compliance Team
