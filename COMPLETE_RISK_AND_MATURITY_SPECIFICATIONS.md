# Complete Risk Assessment and Maturity Framework Specifications

**Document Version:** 2.0
**Date:** March 14, 2026
**System:** AML/CFT Risk Assessment & Control Maturity System
**Framework:** FATF Recommendations & Risk-Based Supervision

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Risk Assessment (Modules 1-3)](#risk-assessment-modules-1-3)
3. [Module 4: Control Maturity Assessment](#module-4-control-maturity-assessment)
4. [Scoring Calculations](#scoring-calculations)
5. [Database Implementation](#database-implementation)
6. [Report Integration](#report-integration)
7. [Quick Reference Tables](#quick-reference-tables)

---

## System Overview

### Dual Assessment Approach

The system provides TWO complementary assessments:

| Assessment Type | Purpose | Scale | Output |
|----------------|---------|-------|--------|
| **Risk Assessment (Modules 1-3)** | Identify ML/TF risk exposure | 1-5 (lower = better) | Risk scores and ratings |
| **Maturity Assessment (Module 4)** | Evaluate control capability | 1-5 (higher = better) | Maturity levels and gap analysis |

### How They Work Together

```
Risk Assessment → WHERE risks exist
Maturity Assessment → HOW CAPABLE you are to manage them

Risk: 3.5 (High) + Maturity: 4.0 (Managed) = Well-controlled risk
Risk: 1.5 (Low) + Maturity: 1.0 (Initial) = Unmanaged even if low risk
```

---

## Risk Assessment (Modules 1-3)

### Module 1: Inherent Risk Assessment

**Purpose:** Measure exposure to ML/TF risk BEFORE considering controls

#### Scoring System

| Response | Score | Meaning |
|----------|-------|---------|
| **Yes** | 5 | High exposure to risk factor |
| **Partially** | 3 | Moderate exposure |
| **No** | 1 | Low exposure (baseline risk) |

**Why "No" = 1 (not zero):**
- Every financial institution has baseline inherent risk
- Zero risk is impossible in financial services
- Prevents mathematical anomalies in residual risk calculation

#### Section Weights

| Section | Weight | Focus Area |
|---------|--------|------------|
| Service & Engagement Risk (1A) | 25% | Services provided |
| Client Profile Risk (1B) | 30% | Who you serve (highest weight) |
| Transaction & Structural Risk (1C) | 20% | Transaction types |
| Geographic Risk (1D) | 15% | Where you operate |
| Volume & Scale Risk (1E) | 10% | Business volume |

#### Calculation Formula

```
Inherent Risk Score = Weighted Average of all Module 1 responses
Minimum enforced: 1.5 (even with all "No" responses)
```

#### Risk Rating Thresholds

| Score Range | Rating | Description |
|-------------|--------|-------------|
| 1.0 - 1.49 | Low | Minimal inherent risk factors |
| 1.5 - 2.49 | Low | Limited exposure to risk factors |
| 2.5 - 3.49 | Moderate | Material exposure to some risk factors |
| 3.5 - 5.0 | High | Significant exposure to multiple high-risk factors |

---

### Module 2: Technical Compliance Assessment

**Purpose:** Evaluate existence and documentation of AML/CFT controls

#### Scoring System

| Response | Internal Score | Effectiveness | Display Score (1-5) |
|----------|----------------|---------------|---------------------|
| **Fully implemented & documented** | 1.0 | 100% | 1.0 (Low Risk) |
| **Partially implemented** | 0.6 | 60% | 2.6 (Moderate Risk) |
| **Weak implementation** | 0.3 | 30% | 3.8 (High Risk) |
| **Not in place** | 0.0 | 0% | 5.0 (High Risk) |

#### Conversion Formula

```
Module 2 Score = 5 - (Control Effectiveness × 4)

Examples:
100% effectiveness → 5 - (1.0 × 4) = 1.0 (Low Risk)
60% effectiveness → 5 - (0.6 × 4) = 2.6 (Moderate Risk)
0% effectiveness → 5 - (0.0 × 4) = 5.0 (High Risk)
```

#### Critical Controls (Red Flag Triggers)

If ANY of these are "Not in place," automatic High risk rating (minimum 4.0):

1. **Compliance Officer appointed (2A.1)**
2. **Customer Due Diligence procedures (2C.1)**
3. **Suspicious Transaction Reporting system (2E.1)**
4. **Sanctions screening (2F.1)**
5. **AML/CFT training program (2G.1)**

#### Compliance Rating Thresholds

| Effectiveness % | Rating | Description |
|-----------------|--------|-------------|
| 80-100% | Compliant | Strong control framework |
| 60-79% | Partially Compliant | Basic controls with gaps |
| 40-59% | Weak | Significant control deficiencies |
| 0-39% | Non-Compliant | Critical control gaps |

---

### Module 3: Operational Effectiveness Assessment

**Purpose:** Evaluate how well controls operate in practice

#### Scoring System

| Response | Internal Score | Effectiveness | Display Score (1-5) |
|----------|----------------|---------------|---------------------|
| **Effective** | 1.0 | 100% | 1.0 (Low Risk) |
| **Weak** | 0.25 | 25% | 4.0 (High Risk) |
| **Ineffective** | 0.0 | 0% | 5.0 (High Risk) |

#### Conversion Formula

```
Module 3 Score = 5 - (Operational Effectiveness × 4)

Examples:
100% effective → 5 - (1.0 × 4) = 1.0 (Low Risk)
25% effective → 5 - (0.25 × 4) = 4.0 (High Risk)
0% effective → 5 - (0.0 × 4) = 5.0 (High Risk)
```

#### Effectiveness Rating Thresholds

| Effectiveness % | Rating | Description |
|-----------------|--------|-------------|
| 75-100% | Effective | Controls achieving objectives |
| 55-74% | Partially Effective | Some effectiveness, gaps exist |
| 30-54% | Weak | Limited effectiveness |
| 0-29% | Ineffective | Controls not working |

**Red Flag:** If operational effectiveness < 30%, residual risk automatically escalated to minimum 3.0

---

### Residual Risk Calculation (Final Risk)

#### FATF Formula

```
Residual Risk = Inherent Risk × (1 - Overall Control Effectiveness)

Where:
Overall Control Effectiveness = (Module 2 CE × 0.60) + (Module 3 CE × 0.40)
```

#### Step-by-Step Calculation

**Step 1: Calculate Overall Control Effectiveness**
```
Overall CE = (Compliance × 0.60) + (Effectiveness × 0.40)

Example:
Compliance = 70% (0.70)
Effectiveness = 50% (0.50)
Overall CE = (0.70 × 0.60) + (0.50 × 0.40) = 0.42 + 0.20 = 0.62 (62%)
```

**Step 2: Calculate Risk Multiplier**
```
Risk Multiplier = 1 - Overall Control Effectiveness
Minimum: 0.2 (controls can never eliminate all risk)

Example:
Risk Multiplier = 1 - 0.62 = 0.38
```

**Step 3: Calculate Residual Risk**
```
Residual Risk = Inherent Risk × Risk Multiplier
Minimum: 1.0
Maximum: 5.0

Example:
Inherent Risk = 3.5
Risk Multiplier = 0.38
Residual Risk = 3.5 × 0.38 = 1.33 (Low)
```

**Step 4: Apply Governance Overrides**
```
Final Risk = MAX(Calculated Residual Risk, Minimum Risk from Red Flags)

Red Flag Minimum Risks:
- Missing ANY critical control: 4.0
- Operational effectiveness < 30%: 3.0
```

#### Residual Risk Rating Thresholds

| Score Range | Rating | Color | Action Required |
|-------------|--------|-------|-----------------|
| 1.0 - 1.49 | Low | Green (#10b981) | Standard monitoring |
| 1.5 - 2.49 | Low | Green (#10b981) | Standard monitoring |
| 2.5 - 3.49 | Moderate | Orange (#f59e0b) | Enhanced review |
| 3.5 - 4.99 | High | Red (#ef4444) | EDD + senior sign-off |
| 5.0 | Very High | Red (#ef4444) | Senior management escalation |

---

## Module 4: Control Maturity Assessment

### Overview

**Purpose:** Evaluate organizational capability and sophistication of AML/CFT controls

**Scale:** 1-5 maturity levels (higher is better)

**Assessment Method:** Control-by-control evaluation across 9 domains

### Five Maturity Levels

#### Level 1: Initial / Ad hoc

**Characteristics:**
- No formal control exists
- Processes unpredictable and reactive
- Success depends on individual effort
- No documented policies or procedures
- No management oversight

**Color:** Red (#dc2626)

**Scoring:** Control not implemented or only informal practices exist

---

#### Level 2: Developing

**Characteristics:**
- Basic control exists but incomplete
- Processes inconsistent and unpredictable
- Limited documentation and awareness
- Minimal management oversight

**Color:** Orange (#ea580c)

**Scoring:** Control partially implemented with significant gaps

---

#### Level 3: Defined (Minimum Acceptable)

**Characteristics:**
- Control formally defined and implemented
- Processes documented, standardized, and understood
- Staff trained and aware of requirements
- Management oversight established

**Color:** Yellow (#ca8a04)

**Scoring:** Control fully implemented and documented

**Note:** Level 3 is the **minimum acceptable maturity** for mandatory controls.

---

#### Level 4: Managed

**Characteristics:**
- Control monitored, measured, and reviewed
- Performance metrics and KRIs established
- Management actively oversees effectiveness
- Issues identified and addressed promptly

**Color:** Green (#16a34a)

**Scoring:** Control implemented, monitored, and regularly reviewed

---

#### Level 5: Optimised

**Characteristics:**
- Control continuously improved based on metrics
- Proactive risk management
- Technology and automation utilized
- Industry-leading practices adopted

**Color:** Teal (#0891b2)

**Scoring:** Control optimised with continuous improvement

---

### Nine AML/CFT Domains

| # | Code | Domain Name | Weight | Controls | Description |
|---|------|-------------|--------|----------|-------------|
| 1 | GOV | Governance & Oversight | 15% | 3 | Board oversight, management accountability |
| 2 | ERA | Enterprise Risk Assessment | 12% | 2 | Institution-wide ML/TF risk assessment |
| 3 | CDD | Customer Due Diligence | 18% | 4 | Customer identification and verification |
| 4 | TM | Transaction Monitoring | 15% | 3 | Automated monitoring and alert management |
| 5 | STR | Suspicious Activity Reporting | 10% | 2 | SAR/STR filing and investigation quality |
| 6 | SANC | Sanctions & PEP Screening | 10% | 3 | Screening systems and ongoing monitoring |
| 7 | REC | Record Keeping | 8% | 2 | Document retention and data quality |
| 8 | TRN | Training & Awareness | 7% | 2 | Staff training and compliance culture |
| 9 | AUD | Independent Testing | 5% | 2 | Internal audit and independent reviews |
| **Total** | | | **100%** | **23** | |

### Control Assessment Dimensions

For each control, assess THREE dimensions:

#### 1. Implementation Status

| Status | Base Score | Description |
|--------|------------|-------------|
| **Not Implemented** | 1 | Control does not exist |
| **Partial** | 2 | Control exists but incomplete |
| **Implemented** | 3 | Control fully implemented |
| **Optimised** | 4-5 | Control continuously improved |

#### 2. Evidence Quality

| Quality | Adjustment | Description |
|---------|------------|-------------|
| **Poor** | -1 level | Inadequate or missing documentation |
| **Fair** | -0.5 level | Basic documentation with gaps |
| **Good** | No change | Complete and appropriate documentation |
| **Excellent** | +1 level | Comprehensive documentation with validation |

#### 3. Testing Result

| Result | Adjustment | Description |
|--------|------------|-------------|
| **Not Tested** | No change | No testing performed |
| **Failed** | -1 level | Control not operating as designed |
| **Partial** | -0.5 level | Control partially effective |
| **Passed** | +0.5 level | Control operating effectively |

### Maturity Score Calculation

#### Control-Level Maturity

```javascript
Base Score = Implementation Status Score (1-5)

Adjusted for Evidence Quality:
- Excellent: +1 level
- Good: no change
- Fair: -0.5 level
- Poor: -1 level

Adjusted for Testing Results:
- Passed: +0.5 level
- Partial: -0.5 level
- Failed: -1 level

Final Maturity Level = Round(Adjusted Score) [1-5]
Maturity Score = (Maturity Level / 5) × 100
```

**Example:**
- Implementation: Implemented (3)
- Evidence: Good (no change)
- Testing: Passed (+0.5)
- **Final Maturity: 4 (Managed)**

#### Domain-Level Maturity

```javascript
Average Maturity = Sum of Control Maturity Levels / Number of Controls

Weighted Score = (Average Maturity / 5) × 100 × Domain Weight

Compliance % = (Controls at Level 3+ / Total Controls) × 100
```

**Example: CDD Domain (Weight 18%)**
- 4 controls assessed
- Maturity levels: [3, 4, 3, 4]
- Average Maturity: 3.5
- Weighted Score: (3.5/5) × 100 × 0.18 = 12.6
- Compliance: 4/4 = 100%

#### Overall Institutional Maturity

```javascript
Overall Maturity = Σ (Domain Average Maturity × Domain Weight)
```

**Example:**
| Domain | Avg Maturity | Weight | Contribution |
|--------|-------------|--------|--------------|
| GOV | 3.8 | 0.15 | 0.57 |
| ERA | 3.2 | 0.12 | 0.38 |
| CDD | 3.5 | 0.18 | 0.63 |
| TM | 4.0 | 0.15 | 0.60 |
| STR | 3.6 | 0.10 | 0.36 |
| SANC | 4.2 | 0.10 | 0.42 |
| REC | 3.4 | 0.08 | 0.27 |
| TRN | 4.0 | 0.07 | 0.28 |
| AUD | 3.0 | 0.05 | 0.15 |
| **Total** | | **1.00** | **3.66** |

**Overall Institutional Maturity: 3.66 (Approaching "Managed")**

### Gap Analysis

#### Gap Categories

1. **Missing Control**: Mandatory control not implemented
2. **Weak Implementation**: Control partially implemented with deficiencies
3. **Inadequate Evidence**: Insufficient documentation
4. **Ineffective Testing**: Control failed effectiveness testing

#### Gap Severity Classification

```javascript
Severity Score =
  (Domain Weight × 10) +
  (Mandatory Factor: 3 if mandatory, 1 if optional) +
  (Tier Factor: 3 for Tier 1, 2 for Tier 2, 1 for Tier 3) +
  (Maturity Gap: 6 - Current Maturity Level)
```

| Severity | Score Range | Action Timeline |
|----------|-------------|-----------------|
| **Critical** | ≥ 8 | Immediate (30 days) |
| **High** | 6-7 | 3 months |
| **Medium** | 4-5 | 6 months |
| **Low** | < 4 | 12 months |

---

## Scoring Calculations

### Complete Worked Example

**Scenario:** Medium-sized financial institution

#### Module 1: Inherent Risk

**Responses:**
- Serves PEPs: Partially (3)
- Foreign clients: Yes (5)
- Complex transactions: Partially (3)
- High-risk jurisdictions: No (1)
- Large volume: Partially (3)

**Calculation:**
```
Weighted Average = (3×0.3) + (5×0.25) + (3×0.2) + (1×0.15) + (3×0.1)
                 = 0.9 + 1.25 + 0.6 + 0.15 + 0.3
                 = 3.2

Inherent Risk = 3.2 → High
```

#### Module 2: Technical Compliance

**Average Compliance:** 75% (0.75)

**Module 2 Score:** 5 - (0.75 × 4) = 2.0 → Low-Moderate Risk

#### Module 3: Operational Effectiveness

**Average Effectiveness:** 65% (0.65)

**Module 3 Score:** 5 - (0.65 × 4) = 2.4 → Moderate Risk

#### Residual Risk Calculation

**Step 1:** Overall Control Effectiveness
```
Overall CE = (0.75 × 0.60) + (0.65 × 0.40)
          = 0.45 + 0.26
          = 0.71 (71%)
```

**Step 2:** Risk Multiplier
```
Risk Multiplier = 1 - 0.71 = 0.29
```

**Step 3:** Residual Risk
```
Residual Risk = 3.2 × 0.29 = 0.93 → rounds to 1.0

Rating: Low
```

**Step 4:** Check Red Flags
```
No critical controls missing: ✓
Operational effectiveness > 30%: ✓
No override needed
```

**Final Residual Risk: 1.0 (Low)**

#### Module 4: Control Maturity

**Domain Scores:**
| Domain | Controls | Avg Maturity | Weight | Contribution |
|--------|----------|--------------|--------|--------------|
| GOV | 3 | 3.7 | 0.15 | 0.56 |
| ERA | 2 | 3.0 | 0.12 | 0.36 |
| CDD | 4 | 3.5 | 0.18 | 0.63 |
| TM | 3 | 4.0 | 0.15 | 0.60 |
| STR | 2 | 3.5 | 0.10 | 0.35 |
| SANC | 3 | 4.0 | 0.10 | 0.40 |
| REC | 2 | 3.0 | 0.08 | 0.24 |
| TRN | 2 | 4.0 | 0.07 | 0.28 |
| AUD | 2 | 3.0 | 0.05 | 0.15 |
| **Total** | 23 | | 1.00 | **3.57** |

**Overall Maturity: 3.57 → Defined (approaching Managed)**

**Interpretation:**
- **High inherent risk** (3.2) well-managed by **strong controls** (71% effective)
- **Residual risk is Low** (1.0) - controls effectively mitigate exposure
- **Maturity is Defined** (3.57) - good foundation with room for improvement
- **Organization is well-positioned** with appropriate controls for risk level

---

## Database Implementation

### Core Tables

#### assessments
```sql
Stores: module_1_score, module_2_score, module_3_score, module_4_score,
        overall_risk_score, overall_risk_rating
```

#### assessment_responses
```sql
Stores: question_code, response_value, section_code
Used for: Modules 1-3 question responses
```

#### section_scores
```sql
Stores: section_code, answered_questions, risk_score, risk_level
Used for: Section-level aggregation
```

#### control_assessments
```sql
Stores: assessment_id, control_id, maturity_level, maturity_score,
        implementation_status, evidence_quality, testing_result,
        assessor_notes, gaps_identified
Used for: Module 4 control assessments
```

#### domain_scores
```sql
Stores: assessment_id, domain_id, average_maturity, weighted_score,
        compliance_percentage, gaps_critical, gaps_high, gaps_medium, gaps_low
Used for: Module 4 domain aggregation
```

#### aml_domains
```sql
Reference table: 9 domains with codes, names, descriptions, weights
```

#### aml_controls
```sql
Reference table: 23 controls with codes, names, descriptions, regulatory refs
```

#### maturity_levels
```sql
Reference table: 5 maturity levels with definitions and criteria
```

### Automatic Score Calculation

**Trigger:** `trigger_auto_recalculate_scores`

**Function:** `recalculate_assessment_risk_scores()`

**Flow:**
```
User saves assessment responses
    ↓
section_scores table updated
    ↓
TRIGGER fires automatically
    ↓
FUNCTION recalculates:
    - module_1_score
    - module_2_score
    - module_3_score
    - overall_risk_score
    - overall_risk_rating
    ↓
assessments table updated
```

**Module 4 Calculation:**

**Manual Trigger:** User clicks "Calculate Maturity Scores" button

**Function:** `calculate_and_update_domain_scores()`

**Flow:**
```
User completes control assessments
    ↓
User clicks "Calculate Maturity Scores"
    ↓
SERVICE calculates:
    - Control maturity levels
    - Domain scores
    - Overall maturity
    - Gap analysis
    - Remediation plans
    ↓
domain_scores table updated
    ↓
gap_analysis table updated
    ↓
remediation_plans table updated
    ↓
assessment_snapshots table updated
```

---

## Report Integration

### Assessment Report Display

#### Risk Assessment Section (Modules 1-3)

**Displays:**
- Overall Risk Summary
  - Inherent Risk: X.XX / 5.0 (Rating)
  - Technical Compliance: XX% (Rating)
  - Operational Effectiveness: XX% (Rating)
  - Residual Risk: X.XX / 5.0 (Rating)

- FATF Risk Calculation Box
  ```
  INHERENT RISK: 3.20 / 5.0
  Exposure before controls

  CONTROL EFFECTIVENESS: 71%
  Technical 75% + Effectiveness 65%

  RESIDUAL RISK: 1.00 / 5.0
  Final risk after controls

  Formula: RR = IR × (1 - CE)
  ```

- Governance Override Warning (if applicable)
  ```
  ⚠️ Governance Override Applied

  Critical control gaps identified. Minimum risk level enforced per FATF
  guidelines. The calculated residual risk of 1.33 has been overridden to
  4.0 due to significant compliance deficiencies.
  ```

- Section Risk Summary Table
  | Section | Questions | Score | Risk Level |
  |---------|-----------|-------|------------|
  | MODULE_1 | 15/15 | 3.2 | High |
  | MODULE_2 | 20/20 | 2.0 | Low-Moderate |
  | MODULE_3 | 15/15 | 2.4 | Moderate |

#### Maturity Assessment Section (Module 4)

**Displays:**
- Overall Institutional Maturity
  ```
  Maturity Score: 3.57 / 5.0
  Maturity Level: Defined
  20 of 23 controls at Level 3+ (87%)
  Gaps: 0 Critical, 2 High, 4 Medium, 1 Low
  ```

- Maturity by AML/CFT Domain
  - Expandable domain cards showing:
    - Domain name and weight
    - Average maturity score and level
    - Number of controls assessed
    - Control-level details (when expanded)

- Maturity Level Reference Guide
  - Definitions of all 5 maturity levels
  - Characteristics of each level
  - Color coding

---

## Quick Reference Tables

### Module Comparison

| Module | Purpose | Scale | Direction | Questions/Controls |
|--------|---------|-------|-----------|-------------------|
| Module 1 | Inherent Risk | 1-5 | Lower = Better | ~15 questions |
| Module 2 | Technical Compliance | 1-5 | Lower = Better | ~20 questions |
| Module 3 | Operational Effectiveness | 1-5 | Lower = Better | ~15 questions |
| Module 4 | Control Maturity | 1-5 | Higher = Better | 23 controls |

### Score Interpretation

#### Risk Scores (Modules 1-3)

| Score | Risk Level | Meaning | Action |
|-------|-----------|---------|--------|
| 1.0-1.4 | Very Low | Minimal risk | Standard monitoring |
| 1.5-2.4 | Low | Limited risk | Standard monitoring |
| 2.5-3.4 | Moderate | Material risk | Enhanced review |
| 3.5-4.9 | High | Significant risk | EDD + senior oversight |
| 5.0 | Very High | Critical risk | Senior management escalation |

#### Maturity Scores (Module 4)

| Score | Maturity Level | Meaning | Characteristics |
|-------|---------------|---------|-----------------|
| 1.0-1.4 | Initial | Ad-hoc | No formal processes |
| 1.5-2.4 | Developing | Basic | Inconsistent processes |
| 2.5-3.4 | Defined | Documented | Standardized processes |
| 3.5-4.4 | Managed | Measured | Monitored and reviewed |
| 4.5-5.0 | Optimised | Innovative | Continuously improved |

### Key Formulas

```
INHERENT RISK (Module 1):
= Weighted average of risk factors (1-3-5 scale)
Minimum: 1.5

TECHNICAL COMPLIANCE (Module 2):
= 5 - (Compliance Effectiveness × 4)
Range: 1.0 (100% compliant) to 5.0 (0% compliant)

OPERATIONAL EFFECTIVENESS (Module 3):
= 5 - (Operational Effectiveness × 4)
Range: 1.0 (100% effective) to 5.0 (0% effective)

OVERALL CONTROL EFFECTIVENESS:
= (Module 2 CE × 0.60) + (Module 3 CE × 0.40)

RESIDUAL RISK (Final):
= Inherent Risk × (1 - Overall Control Effectiveness)
With red flag overrides applied

CONTROL MATURITY (Module 4):
= Implementation Status + Evidence Adjustment + Testing Adjustment
Range: 1 (Initial) to 5 (Optimised)

DOMAIN MATURITY:
= Weighted average of control maturities in domain

OVERALL MATURITY:
= Σ (Domain Average Maturity × Domain Weight)
```

---

## Regulatory Alignment

This implementation aligns with:

- ✅ FATF Recommendations (Risk-Based Approach)
- ✅ Tanzania Anti-Money Laundering Act (Cap. 423)
- ✅ GN 397 of 2022 (AML/CFT Regulations for Legal Professionals)
- ✅ Tanganyika Law Society guidelines
- ✅ International best practices (Big 4 audit firms, major international banks)
- ✅ CMMI Capability Maturity Model
- ✅ ISO 31000 Risk Management
- ✅ Basel Committee on Banking Supervision guidelines

---

## Document Control

**Version:** 2.0
**Date:** March 14, 2026
**Status:** Production Implementation
**Next Review:** Upon regulatory update or system enhancement
**Author:** System Documentation Team

**Change History:**
- v1.0 (Feb 2026): Initial risk assessment specifications
- v2.0 (Mar 2026): Added complete Module 4 maturity framework specifications

---

**END OF DOCUMENT**
