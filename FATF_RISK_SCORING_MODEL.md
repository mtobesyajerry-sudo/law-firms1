# FATF-Compliant Risk Scoring Model

## Overview

The AML/CFT Risk Assessment System now implements a comprehensive FATF-compliant risk scoring methodology that accurately calculates residual risk based on inherent risk exposure and control effectiveness.

## Core Principles

### 1. Three-Pillar Assessment Model

**Module 1: Inherent Risk Assessment**
- Measures the firm's exposure to ML/TF risk factors BEFORE considering controls
- Assesses client profile, services, geography, transactions, and volume
- Uses 1-5 scale where higher scores indicate greater risk exposure

**Module 2: Control Compliance Assessment**
- Evaluates the existence and documentation of AML/CFT policies and procedures
- Measures technical compliance with regulatory requirements
- Uses 0-100% effectiveness scale

**Module 3: Operational Effectiveness Assessment**
- Evaluates how well controls operate in practice
- Measures whether policies achieve their intended risk mitigation objectives
- Uses 0-100% effectiveness scale

### 2. FATF Residual Risk Formula

```
Residual Risk = Inherent Risk × (1 - Overall Control Effectiveness)
```

Where:
- **Inherent Risk**: 1-5 scale assessment of exposure before controls
- **Overall Control Effectiveness**: Weighted combination of compliance (60%) and effectiveness (40%)
- **Residual Risk**: Final risk rating after considering control mitigation

## Detailed Scoring Methodology

### Module 1: Inherent Risk (1-5 Scale)

**Response Scoring:**
- **Yes** (to risk exposure) = 5 points (High inherent risk)
- **Partially** = 3 points (Moderate inherent risk)
- **No** (to risk exposure) = 1 point (Low inherent risk, but never zero)

**Why "No" = 1 (not zero):**
- Every financial institution has baseline inherent risk simply by operating
- Zero risk is impossible in financial services
- FATF requires minimum risk assessment even with no identified exposures

**Section Weights:**
- Service & Engagement Risk (1A): 25%
- Client Profile Risk (1B): 30% (highest weight)
- Transaction & Structural Risk (1C): 20%
- Geographic Risk (1D): 15%
- Volume & Scale Risk (1E): 10%

**Minimum Baseline:**
- Calculated inherent risk cannot fall below 1.5/5.0
- Ensures realistic minimum risk assessment

**Rating Thresholds:**
- 1.0 - 2.5: Low inherent risk
- 2.5 - 3.5: Moderate inherent risk
- 3.5 - 5.0: High inherent risk

### Module 2: Control Compliance (0-100%)

**Response Scoring:**
- **Fully implemented & documented** = 1.0 (100% effective)
- **Partially implemented** = 0.5 (50% effective)
- **Not in place** = 0.0 (0% effective)

**Critical Controls (Red Flag Triggers):**
The following controls are designated as critical. If any are "Not in place," the firm automatically receives High risk rating:

1. Compliance Officer appointed (2A.1)
2. Customer Due Diligence procedures (2B.1)
3. Suspicious Transaction Reporting system (2D.1)
4. Sanctions screening (2E.1)
5. AML/CFT training program (2F.1)

**Rating Thresholds:**
- 80-100%: Compliant
- 60-79%: Partially Compliant
- 40-59%: Weak
- 0-39%: Non-Compliant

### Module 3: Operational Effectiveness (0-100%)

**Response Scoring:**
- **Effective** = 1.0 (100% effective)
- **Weak** = 0.25 (25% effective)
- **Ineffective** = 0.0 (0% effective)

**Rating Thresholds:**
- 75-100%: Effective
- 55-74%: Partially Effective
- 30-54%: Weak
- 0-29%: Ineffective

### Residual Risk Calculation

**Step 1: Calculate Overall Control Effectiveness**
```
Overall Control Effectiveness = (Compliance × 0.60) + (Effectiveness × 0.40)
```

Example:
- Compliance = 70% (0.70)
- Effectiveness = 50% (0.50)
- Overall = (0.70 × 0.60) + (0.50 × 0.40) = 0.42 + 0.20 = 0.62 (62%)

**Step 2: Calculate Risk Multiplier**
```
Risk Multiplier = 1 - Overall Control Effectiveness
```
With minimum of 0.2 (controls can never eliminate all risk)

Example: 1 - 0.62 = 0.38

**Step 3: Calculate Residual Risk**
```
Residual Risk = Inherent Risk × Risk Multiplier
```

Example:
- Inherent Risk = 3.5
- Risk Multiplier = 0.38
- Residual Risk = 3.5 × 0.38 = 1.33 (Low)

**Step 4: Apply Red Flag Overrides**

If critical control gaps exist:
- Residual risk automatically escalated to minimum 3.5 (High)

If operational effectiveness < 30%:
- Residual risk automatically escalated to minimum 3.0 (Moderate-High)

**Final Rating Thresholds:**
- 1.0 - 2.5: Low residual risk
- 2.5 - 3.5: Moderate residual risk
- 3.5 - 5.0: High residual risk

## Worked Examples

### Example 1: High Inherent Risk, Strong Controls

**Module 1 - Inherent Risk:**
- Serves PEPs: Yes (5)
- Foreign clients: Yes (5)
- Manages client money: Yes (5)
- Cross-border work: Yes (5)
- Average inherent risk: 5.0 → **High**

**Module 2 - Compliance:**
- Compliance officer: Fully implemented (1.0)
- CDD procedures: Fully implemented (1.0)
- STR system: Fully implemented (1.0)
- Average compliance: 100% → **Compliant**

**Module 3 - Effectiveness:**
- Controls effective: Effective (1.0)
- Monitoring works: Effective (1.0)
- Average effectiveness: 100% → **Effective**

**Residual Risk Calculation:**
- Overall control effectiveness = (1.0 × 0.60) + (1.0 × 0.40) = 1.0 (100%)
- Risk multiplier = 1 - 1.0 = 0.0 → minimum 0.2 applied
- Residual risk = 5.0 × 0.2 = **1.0 (Low)**

**Interpretation:** Despite high inherent risk, comprehensive and effective controls reduce residual risk to Low.

### Example 2: Moderate Inherent Risk, Weak Controls

**Module 1 - Inherent Risk:**
- Serves PEPs: Partially (3)
- Foreign clients: No (1)
- Manages client money: Partially (3)
- Average inherent risk: 2.5 → **Moderate**

**Module 2 - Compliance:**
- Compliance officer: Not in place (0.0) ⚠️ RED FLAG
- CDD procedures: Partially implemented (0.5)
- STR system: Partially implemented (0.5)
- Average compliance: 35% → **Non-Compliant**

**Module 3 - Effectiveness:**
- Controls: Weak (0.25)
- Monitoring: Ineffective (0.0)
- Average effectiveness: 20% → **Ineffective** ⚠️ RED FLAG

**Residual Risk Calculation:**
- Overall control effectiveness = (0.35 × 0.60) + (0.20 × 0.40) = 0.29 (29%)
- Risk multiplier = 1 - 0.29 = 0.71
- Residual risk = 2.5 × 0.71 = 1.78
- **RED FLAG OVERRIDE:** No compliance officer → escalate to minimum 3.5
- **RED FLAG OVERRIDE:** Effectiveness < 30% → escalate to minimum 3.0
- Final residual risk = **3.5 (High)**

**Interpretation:** Critical control gaps trigger automatic High risk classification regardless of moderate inherent risk.

### Example 3: Low Inherent Risk, No Controls

**Module 1 - Inherent Risk:**
- Serves PEPs: No (1)
- Foreign clients: No (1)
- Only domestic litigation: No (1)
- Average inherent risk: 1.5 (minimum baseline) → **Low**

**Module 2 - Compliance:**
- Compliance officer: Not in place (0.0) ⚠️ RED FLAG
- CDD procedures: Not in place (0.0)
- STR system: Not in place (0.0)
- Average compliance: 0% → **Non-Compliant**

**Module 3 - Effectiveness:**
- All controls: Ineffective (0.0)
- Average effectiveness: 0% → **Ineffective**

**Residual Risk Calculation:**
- Overall control effectiveness = 0%
- Risk multiplier = 1.0
- Residual risk = 1.5 × 1.0 = 1.5
- **RED FLAG OVERRIDE:** No compliance officer → escalate to minimum 3.5
- Final residual risk = **3.5 (High)**

**Interpretation:** This example demonstrates the core fix. Even with low inherent risk, absence of critical controls produces High residual risk. This prevents the previous issue where weak controls + low exposure = incorrectly Low risk.

## Report Narrative Logic

Report narratives are now contextually generated based on:

1. **Module type** (Inherent Risk vs. Control Assessment)
2. **Score level** (Low, Moderate, High)
3. **Actual gap counts**

**Module 1 (Inherent Risk) Narratives:**
- Low: "Limited exposure to risk factors"
- Moderate: "Material exposure to some risk factors"
- High: "Significant exposure to multiple high-risk factors"

**Module 2 (Compliance) Narratives:**
- Low: "Strong control implementation with X% in place"
- Moderate: "Basic controls exist but gaps require attention"
- High: "Significant control gaps - immediate remediation required"

**Module 3 (Effectiveness) Narratives:**
- Low: "Controls operating as intended"
- Moderate: "Controls partially achieving objectives"
- High: "Controls not operating as intended"

This eliminates false positive narratives like "strong controls with 0% implementation."

## Red Flag System

### Automatic High Risk Triggers

The system automatically escalates to High risk when:

1. **No Compliance Officer**: Critical governance gap
2. **No CDD Procedures**: Cannot identify clients or assess risk
3. **No STR System**: Cannot report suspicious activity
4. **No Sanctions Screening**: Risk of facilitating prohibited transactions
5. **No Training Program**: Staff unaware of obligations

### Red Flag Reporting

Red flags are:
- Listed in residual risk calculation results
- Highlighted prominently in assessment reports
- Include specific control descriptions
- Trigger senior management oversight requirements

## Comparison: Old vs. New System

### Old System Issues

| Issue | Impact | Example |
|-------|--------|---------|
| "No" to risk factors = 0 inherent risk | Could produce zero risk | Sole practitioner, no PEPs, no foreign clients → 0 risk |
| Zero inherent risk × any controls = 0 residual risk | Weak controls ignored | 0 × 1.1 multiplier = still 0 |
| No minimum baseline risk | Unrealistic "perfect" scores | Professional services firm with zero ML/TF risk |
| No red flag triggers | Critical gaps not escalated | No compliance officer but Low risk rating |
| Context-free narratives | False positives | "Strong controls with 0% implemented" |

### New System Solutions

| Solution | Benefit | Example |
|----------|---------|---------|
| "No" = 1 point (minimum baseline) | Always realistic risk | Even minimal exposure = 1.5 minimum |
| Proper FATF residual formula | Controls actually matter | 1.5 × 1.0 (no controls) = 1.5, but red flags → 3.5 |
| Minimum baseline 1.5 | No unrealistic zeros | Law firms always have some risk |
| Automatic escalation for critical gaps | High risk when appropriate | Missing compliance officer → minimum 3.5 |
| Context-aware narratives | Accurate descriptions | "Low inherent risk exposure" vs. "Strong controls" |

## Validation & Testing

### Test Scenarios

1. **High risk + strong controls → Low residual** ✓
2. **Low risk + no controls → High residual** ✓
3. **Moderate risk + moderate controls → Moderate residual** ✓
4. **Any risk + critical gaps → High residual** ✓
5. **Any risk + ineffective operations → Escalated risk** ✓

### Expected Outcomes

The new system should produce:
- Realistic risk ratings that reflect actual ML/TF exposure
- Proper escalation when critical controls are missing
- Accurate recognition when strong controls mitigate high inherent risk
- No more false "Low risk" for firms with serious control gaps

## Implementation Notes

### Files Modified

1. `src/data/legalProfessionalsAssessmentData.js`
   - Updated `calculateLegalProfessionalsInherentRisk()` (1-5 scale, baseline minimum)
   - Updated `calculateLegalProfessionalsCompliance()` (0-1 effectiveness, red flags)
   - Updated `calculateLegalProfessionalsEffectiveness()` (0-1 effectiveness)
   - Rewrote `calculateLegalProfessionalsResidualRisk()` (FATF formula, red flag overrides)

2. `src/utils/frameworkUtils.js`
   - Updated `calculateLegalProfessionalsScores()` to pass full result objects

3. `src/components/DetailedAssessmentReport.jsx`
   - Removed misleading "Risk: None" individual question displays
   - Added context-aware narrative generation
   - Updated color coding for different response types

### Backward Compatibility

- Database schema unchanged (dnfbp_category, dnfbp_tier fields retained)
- Existing assessments will be recalculated with new scoring on reload
- Historic scores not modified in database
- Migration not required

## Regulatory Alignment

This implementation aligns with:

✓ FATF Recommendations (Risk-Based Approach)
✓ Tanzania Anti-Money Laundering Act
✓ GN 397 (2022) for Legal Professionals
✓ Tanganyika Law Society guidelines
✓ International best practices (Big 4, major banks)

## References

- FATF Guidance for Legal Professionals (2019)
- FATF Risk-Based Approach Guidance (2021)
- Tanzania Anti-Money Laundering Act (Cap. 423)
- GN 397 of 2022 (AML/CFT Regulations for Legal Professionals)
