# FATF 1-5 Scale: Complete System Specifications

## Executive Summary

This document provides comprehensive specifications for the FATF-compliant 1-5 scoring scale used throughout the AML/CFT Risk Assessment System. The system implements a mathematically rigorous three-pillar model aligned with FATF Recommendations and international best practices.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [The Three-Module Assessment Model](#the-three-module-assessment-model)
3. [Scoring Scales and Mappings](#scoring-scales-and-mappings)
4. [Risk Calculation Formulas](#risk-calculation-formulas)
5. [Risk Classification Thresholds](#risk-classification-thresholds)
6. [Governance Override Rules](#governance-override-rules)
7. [Report Implementation](#report-implementation)
8. [Worked Examples](#worked-examples)
9. [Database Implementation](#database-implementation)
10. [Frontend Implementation](#frontend-implementation)

---

## Core Principles

### FATF Risk-Based Approach

The system implements the FATF Risk-Based Approach through three fundamental principles:

1. **Inherent Risk Assessment**: Measure exposure to ML/TF risk BEFORE considering controls
2. **Control Effectiveness Assessment**: Evaluate how well controls mitigate the identified risks
3. **Residual Risk Calculation**: Determine final risk exposure AFTER control mitigation

### Mathematical Foundation

```
Residual Risk = Inherent Risk × (1 - Overall Control Effectiveness)
```

Where:
- **Inherent Risk**: 1-5 scale (Module 1)
- **Control Effectiveness**: 0-1 scale (derived from Modules 2 & 3)
- **Residual Risk**: 1-5 scale (final output)

---

## The Three-Module Assessment Model

### Module 1: Inherent Risk Assessment (1-5 Scale)

**Purpose**: Measures the organization's exposure to ML/TF risk factors BEFORE considering any controls.

**Scope**: Evaluates five risk pillars:
1. **Service & Engagement Risk (1A)**: Weight 25%
2. **Client Profile Risk (1B)**: Weight 30% (highest)
3. **Transaction & Structural Risk (1C)**: Weight 20%
4. **Geographic Risk (1D)**: Weight 15%
5. **Volume & Scale Risk (1E)**: Weight 10%

**Response Scoring**:
- **Yes** (to risk exposure) = 5 points → High inherent risk
- **Partially** = 3 points → Moderate inherent risk
- **No** (to risk exposure) = 1 point → Low inherent risk (but NEVER zero)

**Why "No" = 1 (not zero)**:
- Every financial services entity has baseline inherent risk simply by operating
- Zero risk is mathematically impossible in AML/CFT context
- FATF requires minimum risk assessment even with no identified exposures
- Prevents mathematical anomalies (0 × anything = 0)

**Minimum Baseline**:
- Calculated inherent risk cannot fall below **1.5/5.0**
- Ensures realistic minimum risk assessment
- Reflects that all DNFBPs have some inherent ML/TF exposure

**Rating Thresholds**:
| Score Range | Rating | Description |
|-------------|--------|-------------|
| 1.0 - 1.49 | Low | Minimal inherent risk factors |
| 1.5 - 2.49 | Low | Limited exposure to risk factors |
| 2.5 - 3.49 | Moderate | Material exposure to some risk factors |
| 3.5 - 5.0 | High | Significant exposure to multiple high-risk factors |

---

### Module 2: Technical Compliance Assessment (Converted to 1-5 Scale)

**Purpose**: Evaluates the existence and documentation of AML/CFT policies, procedures, and controls.

**Scope**: Assesses nine control areas:
1. **Governance & Compliance (2A)**: Weight 20%
2. **Risk Assessment (2B)**: Weight 10%
3. **Customer Due Diligence (2C)**: Weight 15%
4. **Monitoring & Review (2D)**: Weight 15%
5. **STR & Reporting (2E)**: Weight 15%
6. **Sanctions Screening (2F)**: Weight 10%
7. **Training (2G)**: Weight 5%
8. **Recordkeeping (2H)**: Weight 5%
9. **Independent Review (2I)**: Weight 5%

**Response Scoring** (Internal 0-1 Effectiveness Scale):
| Response | Effectiveness | Description |
|----------|---------------|-------------|
| Fully implemented & documented | 1.0 (100%) | Control fully in place and documented |
| Partially implemented | 0.6 (60%) | Control exists but gaps remain |
| Weak implementation | 0.3 (30%) | Control inadequate or poorly documented |
| Not in place | 0.0 (0%) | No control exists |

**Conversion to 1-5 Risk Scale**:
```
Module 2 Score = 5 - (Control Effectiveness × 4)
```

Examples:
- 100% effectiveness → 5 - (1.0 × 4) = 1.0 (Low Risk)
- 60% effectiveness → 5 - (0.6 × 4) = 2.6 (Moderate Risk)
- 0% effectiveness → 5 - (0.0 × 4) = 5.0 (High Risk)

**Critical Controls (Red Flag Triggers)**:

The following five controls are designated as CRITICAL. If ANY are "Not in place," the firm automatically receives High risk rating (minimum 4.0):

1. **Compliance Officer appointed (2A.1)**
   - Ensures governance and oversight
   - Required by all regulatory frameworks

2. **Customer Due Diligence procedures (2C.1)**
   - Core KYC requirement
   - Cannot identify/assess client risk without this

3. **Suspicious Transaction Reporting system (2E.1)**
   - Legal obligation under AML laws
   - Cannot fulfill reporting obligations without this

4. **Sanctions screening (2F.1)**
   - Prevents facilitating prohibited transactions
   - Legal and reputational risk

5. **AML/CFT training program (2G.1)**
   - Staff awareness essential
   - Cannot implement controls without trained personnel

**Rating Thresholds** (0-100% effectiveness):
| Effectiveness % | Rating | Description |
|-----------------|--------|-------------|
| 80-100% | Compliant | Strong control framework |
| 60-79% | Partially Compliant | Basic controls with gaps |
| 40-59% | Weak | Significant control deficiencies |
| 0-39% | Non-Compliant | Critical control gaps |

---

### Module 3: Operational Effectiveness Assessment (Converted to 1-5 Scale)

**Purpose**: Evaluates how well controls operate in practice and whether they achieve their intended risk mitigation objectives.

**Scope**: Assesses practical operation across same nine areas as Module 2.

**Response Scoring** (Internal 0-1 Effectiveness Scale):
| Response | Effectiveness | Description |
|----------|---------------|-------------|
| Effective | 1.0 (100%) | Controls operating as intended |
| Weak | 0.25 (25%) | Controls partially working |
| Ineffective | 0.0 (0%) | Controls not achieving objectives |

**Conversion to 1-5 Risk Scale**:
```
Module 3 Score = 5 - (Operational Effectiveness × 4)
```

Examples:
- 100% effective → 5 - (1.0 × 4) = 1.0 (Low Risk)
- 25% effective → 5 - (0.25 × 4) = 4.0 (High Risk)
- 0% effective → 5 - (0.0 × 4) = 5.0 (High Risk)

**Rating Thresholds** (0-100% effectiveness):
| Effectiveness % | Rating | Description |
|-----------------|--------|-------------|
| 75-100% | Effective | Controls achieving objectives |
| 55-74% | Partially Effective | Some effectiveness, gaps exist |
| 30-54% | Weak | Limited effectiveness |
| 0-29% | Ineffective | Controls not working |

**Red Flag Trigger**:
- If operational effectiveness < 30%, residual risk automatically escalated to minimum **3.0** (Moderate-High)

---

## Scoring Scales and Mappings

### Module 1: Inherent Risk (1-5 Direct Scale)

| Response | Points | Meaning | Risk Level |
|----------|--------|---------|------------|
| No | 1 | Minimal exposure | Baseline |
| Partially | 3 | Some exposure | Moderate |
| Yes | 5 | High exposure | High |
| N/A | 0 | Excluded from calculation | - |

**Formula**:
```
Inherent Risk = Weighted Average of all Module 1 responses
Minimum enforced: 1.5
```

### Module 2: Control Compliance (0-1 Internal, Displayed as 1-5)

| Response | Internal Score | Effectiveness | Display Score (1-5) |
|----------|----------------|---------------|---------------------|
| Fully implemented | 1.0 | 100% | 1.0 (Low Risk) |
| Partially implemented | 0.6 | 60% | 2.6 (Moderate Risk) |
| Weak | 0.3 | 30% | 3.8 (High Risk) |
| Not in place | 0.0 | 0% | 5.0 (High Risk) |

**Formula**:
```
Internal: Control Effectiveness = Weighted Average (0-1 scale)
Display: Module 2 Score = 5 - (Control Effectiveness × 4)
```

### Module 3: Operational Effectiveness (0-1 Internal, Displayed as 1-5)

| Response | Internal Score | Effectiveness | Display Score (1-5) |
|----------|----------------|---------------|---------------------|
| Effective | 1.0 | 100% | 1.0 (Low Risk) |
| Weak | 0.25 | 25% | 4.0 (High Risk) |
| Ineffective | 0.0 | 0% | 5.0 (High Risk) |

**Formula**:
```
Internal: Operational Effectiveness = Weighted Average (0-1 scale)
Display: Module 3 Score = 5 - (Operational Effectiveness × 4)
```

---

## Risk Calculation Formulas

### Step 1: Calculate Overall Control Effectiveness

Combines technical compliance (Module 2) and operational effectiveness (Module 3):

```
Overall Control Effectiveness = (Compliance × 0.60) + (Effectiveness × 0.40)
```

**Weighting Rationale**:
- **60%**: Technical Compliance (having controls documented)
- **40%**: Operational Effectiveness (controls working in practice)

**Example**:
```
Compliance = 70% (0.70)
Effectiveness = 50% (0.50)
Overall CE = (0.70 × 0.60) + (0.50 × 0.40) = 0.42 + 0.20 = 0.62 (62%)
```

### Step 2: Calculate Risk Multiplier

```
Risk Multiplier = 1 - Overall Control Effectiveness
Minimum: 0.2 (controls can never eliminate all risk)
```

**Example**:
```
Risk Multiplier = 1 - 0.62 = 0.38
```

### Step 3: Calculate Residual Risk

```
Residual Risk = Inherent Risk × Risk Multiplier
Minimum: 1.0
Maximum: 5.0
```

**Example**:
```
Inherent Risk = 3.5
Risk Multiplier = 0.38
Residual Risk = 3.5 × 0.38 = 1.33 (Low)
```

### Step 4: Apply Governance Overrides (if applicable)

If critical control gaps exist OR effectiveness is very poor:

```
Final Risk = MAX(Calculated Residual Risk, Minimum Risk from Red Flags)
```

**Red Flag Minimum Risks**:
- Missing ANY critical control (2A.1, 2C.1, 2E.1, 2F.1, 2G.1): **4.0**
- Operational effectiveness < 30%: **3.0**

---

## Risk Classification Thresholds

### Final Risk Rating Bands

| Score Range | Rating | Color | Action Required |
|-------------|--------|-------|-----------------|
| 1.0 - 1.49 | Low | 🟢 Green (#10b981) | Standard monitoring |
| 1.5 - 2.49 | Low | 🟢 Green (#10b981) | Standard monitoring |
| 2.5 - 3.49 | Moderate | 🟡 Orange (#f59e0b) | Enhanced review |
| 3.5 - 4.99 | High | 🔴 Red (#ef4444) | EDD + senior sign-off |
| 5.0 | Very High | 🔴 Red (#ef4444) | Senior management escalation |

### Classification Function

```javascript
function classifyRiskRating(score) {
  if (score < 1.5) return 'Low';
  if (score < 2.5) return 'Moderate';
  if (score < 3.5) return 'High';
  return 'Very High';
}
```

---

## Governance Override Rules

### Purpose

Governance overrides ensure that mathematical calculations cannot produce unrealistically low risk ratings when critical control failures exist.

### Override Trigger Conditions

#### Trigger 1: Missing Critical Controls

If ANY of these controls are "Not in place":
- Compliance Officer (2A.1)
- CDD Procedures (2C.1)
- STR Framework (2E.1)
- Sanctions Screening (2F.1)
- Training Program (2G.1)

**Action**: Force minimum residual risk to **4.0** (High)

**Rationale**: These controls are fundamental to any AML/CFT program. Their absence represents an unacceptable governance failure regardless of inherent risk level.

#### Trigger 2: Ineffective Operations

If operational effectiveness (Module 3) < 30%:

**Action**: Force minimum residual risk to **3.0** (Moderate-High)

**Rationale**: Controls that don't work in practice provide no risk mitigation, even if well-documented.

### Override Reporting

When a governance override is applied:

**In Assessment Report (Internal Use)**:
```
⚠️ Governance Override Applied

Critical control gaps identified. Minimum risk level enforced per FATF guidelines.
The calculated residual risk of 1.78 has been overridden to 4.0 due to significant
compliance deficiencies.
```

**In FIU Compliance Report (Regulatory Submission)**:
- Override warning NOT displayed
- Only final risk score shown
- Clean, professional presentation

---

## Report Implementation

### Assessment Report (Internal Use)

**Displays**:
1. **Module Scores**:
   - Module 1: Inherent Risk (1-5 scale)
   - Module 2: Technical Compliance (converted to 1-5 risk scale)
   - Module 3: Operational Effectiveness (converted to 1-5 risk scale)

2. **Risk Calculation Box**:
   ```
   INHERENT RISK: 3.50 / 5.0
   Exposure before controls

   CONTROL EFFECTIVENESS: 62%
   Technical 60% + Effectiveness 40%

   RESIDUAL RISK: 1.33 / 5.0
   Final risk after controls

   FATF Formula: Residual Risk = Inherent Risk × (1 - Control Effectiveness)
   ```

3. **Governance Override Warning** (if applicable):
   ```
   ⚠️ Governance Override Applied

   Critical control gaps identified. Minimum risk level enforced per FATF
   guidelines. The calculated residual risk of 1.33 has been overridden to
   4.0 due to significant compliance deficiencies.
   ```

4. **Risk Assessment Narrative**:
   - Context-aware description based on actual scores
   - Explains what the numbers mean in practical terms

### FIU Compliance Report (Regulatory Submission)

**Displays**:
1. **Overall Residual ML/TF/PF Risk**: High (example)
2. **FATF Risk Calculation**:
   ```
   RR = IR × (1 - CE) = 3.50 × (1 - 0.620) = 1.33
   ```
   - NOTE: Shows formula and calculation WITHOUT override warning
   - Clean, professional presentation for regulators

3. **Risk Mitigation Measures**: Auto-generated remediation plan

### Detailed Assessment Report

**Displays**:
- Question-by-question breakdown
- Response scores and context
- Gap analysis by section
- Remediation recommendations

---

## Worked Examples

### Example 1: High Inherent Risk, Strong Controls → Low Residual Risk

**Scenario**: International law firm with PEP clients but comprehensive AML program

**Module 1 - Inherent Risk**:
- Serves PEPs: Yes (5)
- Foreign clients: Yes (5)
- Cross-border transactions: Yes (5)
- High-risk jurisdictions: Yes (5)
- Average: **5.0** → High Inherent Risk

**Module 2 - Technical Compliance**:
- All controls: Fully implemented (1.0)
- Control effectiveness: **100%**
- Module 2 Score: 5 - (1.0 × 4) = **1.0**

**Module 3 - Operational Effectiveness**:
- All controls: Effective (1.0)
- Operational effectiveness: **100%**
- Module 3 Score: 5 - (1.0 × 4) = **1.0**

**Residual Risk Calculation**:
```
Overall Control Effectiveness = (1.0 × 0.60) + (1.0 × 0.40) = 1.0 (100%)
Risk Multiplier = 1 - 1.0 = 0.0 → minimum 0.2 applied
Residual Risk = 5.0 × 0.2 = 1.0
No red flags triggered
Final Risk = 1.0 → LOW
```

**Interpretation**: Despite very high inherent risk, comprehensive and effective controls reduce residual risk to Low. This demonstrates proper risk mitigation.

---

### Example 2: Moderate Inherent Risk, Weak Controls → High Residual Risk

**Scenario**: Medium-sized firm with some risk factors but critical control gaps

**Module 1 - Inherent Risk**:
- Serves PEPs: Partially (3)
- Foreign clients: No (1)
- Some complex transactions: Partially (3)
- Average: **2.5** → Moderate Inherent Risk

**Module 2 - Technical Compliance**:
- Compliance Officer: **Not in place (0.0)** ⚠️ RED FLAG
- CDD procedures: Partially (0.6)
- STR system: Weak (0.3)
- Average effectiveness: **35%**
- Module 2 Score: 5 - (0.35 × 4) = **3.6**

**Module 3 - Operational Effectiveness**:
- Controls: Weak (0.25)
- Monitoring: Ineffective (0.0)
- Average effectiveness: **20%** ⚠️ RED FLAG
- Module 3 Score: 5 - (0.20 × 4) = **4.2**

**Residual Risk Calculation**:
```
Overall Control Effectiveness = (0.35 × 0.60) + (0.20 × 0.40) = 0.29 (29%)
Risk Multiplier = 1 - 0.29 = 0.71
Calculated Residual Risk = 2.5 × 0.71 = 1.78

RED FLAG 1: No Compliance Officer → minimum 4.0
RED FLAG 2: Effectiveness < 30% → minimum 3.0

Final Risk = MAX(1.78, 4.0, 3.0) = 4.0 → HIGH

Governance Override Applied: YES
```

**Interpretation**: Critical control gaps trigger automatic High risk classification. The moderate inherent risk is irrelevant when fundamental controls are missing.

---

### Example 3: Low Inherent Risk, No Controls → High Residual Risk

**Scenario**: Sole practitioner doing only domestic litigation but with NO AML program

**Module 1 - Inherent Risk**:
- No PEPs: No (1)
- No foreign clients: No (1)
- No complex transactions: No (1)
- Average: **1.5** (minimum baseline) → Low Inherent Risk

**Module 2 - Technical Compliance**:
- Compliance Officer: **Not in place (0.0)** ⚠️ RED FLAG
- CDD procedures: **Not in place (0.0)** ⚠️ RED FLAG
- STR system: **Not in place (0.0)** ⚠️ RED FLAG
- All controls: **0%**
- Module 2 Score: **5.0**

**Module 3 - Operational Effectiveness**:
- All controls: Ineffective (0.0)
- Average: **0%** ⚠️ RED FLAG
- Module 3 Score: **5.0**

**Residual Risk Calculation**:
```
Overall Control Effectiveness = 0%
Risk Multiplier = 1.0
Calculated Residual Risk = 1.5 × 1.0 = 1.5

RED FLAGS: Missing 3 critical controls → minimum 4.0
RED FLAG: Effectiveness 0% → minimum 3.0

Final Risk = MAX(1.5, 4.0, 3.0) = 4.0 → HIGH

Governance Override Applied: YES
```

**Interpretation**: This demonstrates the core fix to the previous system. Even with low inherent risk, the complete absence of controls produces High residual risk. You cannot have zero controls and Low risk—that would be impossible in practice.

---

## Database Implementation

### Core Functions

#### 1. Response Mapping Functions

```sql
-- Map inherent risk responses to 1-3-5 scale
CREATE FUNCTION map_inherent_response_to_score(response text)
RETURNS numeric AS $$
BEGIN
  RETURN CASE
    WHEN LOWER(response) IN ('no', 'n', 'false') THEN 1
    WHEN LOWER(response) IN ('partially', 'partial') THEN 3
    WHEN LOWER(response) IN ('yes', 'y', 'true') THEN 5
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Map control responses to 0-1 effectiveness scale
CREATE FUNCTION map_control_response_to_score(response text)
RETURNS numeric AS $$
BEGIN
  RETURN CASE
    WHEN LOWER(response) IN ('fully implemented', 'fully') THEN 1.0
    WHEN LOWER(response) IN ('partially', 'partial') THEN 0.6
    WHEN LOWER(response) IN ('weak', 'weakly implemented') THEN 0.3
    WHEN LOWER(response) IN ('not in place', 'no') THEN 0.0
    ELSE 0.0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 2. Inherent Risk Calculation

```sql
CREATE FUNCTION calculate_inherent_risk(assessment_id uuid)
RETURNS TABLE(
  client_risk numeric,
  product_risk numeric,
  geographic_risk numeric,
  transaction_risk numeric,
  inherent_risk numeric
) AS $$
-- Calculates weighted average across four pillars
-- Returns 1-5 scale with minimum 1.5 enforced
$$ LANGUAGE plpgsql;
```

#### 3. Control Effectiveness Calculation

```sql
CREATE FUNCTION calculate_control_effectiveness(assessment_id uuid)
RETURNS numeric AS $$
-- Calculates weighted average across nine control areas
-- Returns 0-1 scale (0% to 100% effectiveness)
$$ LANGUAGE plpgsql;
```

#### 4. Residual Risk Calculation

```sql
CREATE FUNCTION calculate_residual_risk(
  inherent_risk numeric,
  control_effectiveness numeric
)
RETURNS numeric AS $$
BEGIN
  -- FATF formula: RR = IR × (1 - CE)
  residual_risk := inherent_risk * (1 - control_effectiveness);

  -- Enforce bounds
  IF residual_risk < 1.0 THEN residual_risk := 1.0; END IF;
  IF residual_risk > 5.0 THEN residual_risk := 5.0; END IF;

  RETURN residual_risk;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 5. Critical Control Checks

```sql
CREATE FUNCTION check_critical_controls(responses jsonb)
RETURNS numeric AS $$
DECLARE
  minimum_risk numeric := 1.0;
BEGIN
  -- Check if ANY critical control is missing
  IF NOT (has_compliance_officer AND has_cdd AND has_str
          AND has_sanctions AND has_training) THEN
    minimum_risk := 4.0;  -- Force High risk
  END IF;

  RETURN minimum_risk;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 6. Risk Classification

```sql
CREATE FUNCTION classify_risk_rating(risk_score numeric)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN risk_score < 1.5 THEN 'Low'
    WHEN risk_score < 2.5 THEN 'Moderate'
    WHEN risk_score < 3.5 THEN 'High'
    ELSE 'Very High'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Risk Breakdown View

```sql
CREATE VIEW assessment_risk_breakdown AS
SELECT
  a.id as assessment_id,

  -- Module scores
  a.module_1_score as inherent_risk_score,
  a.module_2_score as control_risk_score,
  a.module_3_score as residual_risk_score,

  -- Pillar scores
  (SELECT client_risk FROM calculate_inherent_risk(a.id)) as client_risk_score,
  (SELECT product_risk FROM calculate_inherent_risk(a.id)) as product_risk_score,
  (SELECT geographic_risk FROM calculate_inherent_risk(a.id)) as geographic_risk_score,
  (SELECT transaction_risk FROM calculate_inherent_risk(a.id)) as transaction_risk_score,

  -- Control effectiveness
  calculate_control_effectiveness(a.id) as control_effectiveness,

  -- Calculated vs final risk
  calculate_residual_risk(
    a.module_1_score,
    calculate_control_effectiveness(a.id)
  ) as calculated_residual_risk,

  -- Governance override detection
  CASE
    WHEN a.overall_risk_score >= 4.0 AND
         calculate_residual_risk(...) < 4.0
    THEN true
    ELSE false
  END as governance_override_applied

FROM assessments a
WHERE a.status = 'completed';
```

---

## Frontend Implementation

### Risk Color Coding

```javascript
export const riskLevels = {
  low: {
    threshold: 1.5,
    label: 'Low',
    color: '#10b981',  // Green
    action: 'Standard monitoring'
  },
  moderate: {
    threshold: 2.5,
    label: 'Moderate',
    color: '#f59e0b',  // Orange
    action: 'Enhanced review'
  },
  high: {
    threshold: 3.5,
    label: 'High',
    color: '#ef4444',  // Red
    action: 'EDD + senior sign-off'
  }
};

export function getRiskColor(level) {
  const levelLower = level?.toLowerCase();
  return riskLevels[levelLower]?.color || '#6b7280';
}

export function calculateRiskLevel(score) {
  if (score < 1.5) return 'Low';
  if (score < 2.5) return 'Moderate';
  return 'High';
}
```

### Score Display Components

```javascript
// Module 1: Show as 1-5 scale directly
<div>
  <p>Inherent Risk: {assessment.module_1_score.toFixed(2)} / 5.0</p>
  <p style={{color: getRiskColor(getRiskLevel(assessment.module_1_score))}}>
    {getRiskLevel(assessment.module_1_score)}
  </p>
</div>

// Module 2: Show as effectiveness percentage AND 1-5 risk scale
<div>
  <p>Technical Compliance: {((5 - assessment.module_2_score) / 4 * 100).toFixed(0)}%</p>
  <p>Control Risk Score: {assessment.module_2_score.toFixed(2)} / 5.0</p>
</div>

// Module 3: Show as effectiveness percentage AND 1-5 risk scale
<div>
  <p>Operational Effectiveness: {((5 - assessment.module_3_score) / 4 * 100).toFixed(0)}%</p>
  <p>Effectiveness Risk Score: {assessment.module_3_score.toFixed(2)} / 5.0</p>
</div>

// Residual Risk Calculation Display
<div>
  <h4>Residual Risk Calculation</h4>
  <p>INHERENT RISK: {assessment.module_1_score.toFixed(2)} / 5.0</p>
  <p>CONTROL EFFECTIVENESS: {overallEffectiveness.toFixed(0)}%</p>
  <p>RESIDUAL RISK: {assessment.overall_risk_score.toFixed(2)} / 5.0</p>
  <p>Formula: RR = IR × (1 - CE)</p>

  {riskBreakdown?.governance_override_applied && (
    <div style={{background: '#fff3cd', padding: '12px'}}>
      ⚠️ Governance Override Applied
      <p>Calculated: {riskBreakdown.calculated_residual_risk.toFixed(2)}</p>
      <p>Final: {riskBreakdown.residual_risk_score.toFixed(2)}</p>
    </div>
  )}
</div>
```

---

## Summary Reference Table

### Quick Reference: All Scales at a Glance

| Module | Scale | Range | Risk Direction | Display Format |
|--------|-------|-------|----------------|----------------|
| Module 1 | 1-5 direct | 1.5 - 5.0 | Higher = More Risk | X.XX / 5.0 |
| Module 2 | 0-1 → 1-5 | 1.0 - 5.0 | Higher = More Risk | X.XX / 5.0 or XX% effectiveness |
| Module 3 | 0-1 → 1-5 | 1.0 - 5.0 | Higher = More Risk | X.XX / 5.0 or XX% effectiveness |
| Overall | 1-5 | 1.0 - 5.0 | Higher = More Risk | X.XX / 5.0 |

### Key Conversion Formulas

```
Module 1 Score = Weighted Average(1, 3, 5) with minimum 1.5

Module 2 Score = 5 - (Control Effectiveness × 4)
  where Control Effectiveness = 0-1 scale

Module 3 Score = 5 - (Operational Effectiveness × 4)
  where Operational Effectiveness = 0-1 scale

Overall Control Effectiveness = (M2_CE × 0.6) + (M3_CE × 0.4)

Residual Risk = Inherent Risk × (1 - Overall CE)
  with red flag overrides applied

Final Risk Rating:
  < 1.5: Low
  1.5 - 2.49: Low
  2.5 - 3.49: Moderate
  3.5 - 4.99: High
  5.0: Very High
```

---

## Regulatory Alignment

This implementation aligns with:

✅ **FATF Recommendations** (Risk-Based Approach)
✅ **Tanzania Anti-Money Laundering Act** (Cap. 423)
✅ **GN 397 of 2022** (AML/CFT Regulations for Legal Professionals)
✅ **Tanganyika Law Society** guidelines
✅ **International best practices** (Big 4 audit firms, major international banks)

---

## Document Version

**Version**: 1.0
**Date**: February 16, 2026
**Status**: Production Implementation
**Next Review**: Upon regulatory update or system enhancement
