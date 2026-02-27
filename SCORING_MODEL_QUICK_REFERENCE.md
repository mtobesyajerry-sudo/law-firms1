# AML/CFT Assessment Scoring Model - Quick Reference

## Module 1: Inherent Risk (FATF 1-5 Scale)

### Question Scoring
| Response | Score | Meaning |
|----------|-------|---------|
| Yes | 5 | High exposure to risk factor |
| Partially | 3 | Moderate exposure |
| No | 1 | Low exposure (baseline risk) |

### Section Weights
```
Final Score = (A1 × 30%) + (A2 × 25%) + (A3 × 20%) + (A4 × 15%) + (A5 × 10%)
```

| Section | Weight | Focus Area |
|---------|--------|-----------|
| A1. Client Risk | 30% | Highest weight - who you serve |
| A2. Service Risk | 25% | What services you provide |
| A3. Geographic Risk | 20% | Where you operate |
| A4. Transaction Risk | 15% | How transactions are conducted |
| A5. Professional Vulnerability | 10% | Sector-specific weaknesses |

### Risk Rating Bands
| Score | Rating | Description |
|-------|--------|-------------|
| < 1.5 | **Low** | Limited inherent risk exposure |
| 1.5 - 2.49 | **Moderate** | Some risk factors present |
| ≥ 2.5 | **High** | Significant risk exposure |

---

## Module 2: Technical Compliance (0-100%)

### Question Scoring
| Response | Score | Effectiveness |
|----------|-------|---------------|
| Fully implemented & documented | 1.0 | 100% effective |
| Partially implemented | 0.5 | 50% effective |
| Not in place | 0.0 | 0% effective |

### Calculation
```
Compliance % = (Sum of all scores ÷ Number of questions) × 100
```

### Compliance Rating Bands
| Percentage | Rating | Action Required |
|------------|--------|----------------|
| ≥ 80% | **Compliant** | Maintain standards |
| 60-79% | **Partially Compliant** | Address gaps |
| 40-59% | **Weak** | Significant enhancement needed |
| < 40% | **Non-Compliant** | Urgent action required |

### Critical Controls (Red Flags)
Missing any of these triggers automatic **High Risk**:
- ❌ B1.1: AML compliance officer not appointed
- ❌ B2.1: No business-wide risk assessment
- ❌ B3.1: No CDD procedures
- ❌ B4.1: No STR procedures
- ❌ B5.1: No AML training

---

## Module 3: Effectiveness (0-100%)

### Question Scoring
| Response | Score | Effectiveness |
|----------|-------|---------------|
| Effective | 1.0 | 100% effective |
| Weak | 0.25 | 25% effective |
| Ineffective | 0.0 | 0% effective |

### Calculation
```
Effectiveness % = (Sum of all scores ÷ Number of questions) × 100
```

### Effectiveness Rating Bands
| Percentage | Rating | Evidence Level |
|------------|--------|---------------|
| ≥ 75% | **Effective** | Strong operational evidence |
| 55-74% | **Partially Effective** | Some evidence, needs improvement |
| 30-54% | **Weak** | Limited evidence |
| < 30% | **Ineffective** | Minimal evidence |

---

## Module 4: Maturity (3-Level Scale)

### Question Scoring
| Response | Score | Level |
|----------|-------|-------|
| Advanced | 3.0 | Systematic, optimized, embedded |
| Developing | 2.0 | Structured but not mature |
| Basic | 1.0 | Ad-hoc, reactive |

### Calculation
```
Maturity % = (Sum of all scores ÷ Maximum possible score) × 100
```

### Maturity Rating Bands
| Percentage | Rating | Characteristics |
|------------|--------|----------------|
| ≥ 75% | **Advanced** | Embedded in strategy, strong culture, continuous improvement |
| 50-74% | **Developing** | Structures in place, awareness present, limited integration |
| < 50% | **Basic** | Compliance-driven, reactive, limited governance |

---

## Residual Risk Calculation

### Formula
```
Residual Risk = Inherent Risk × Control Modifier

Where:
Control Modifier = max(1 - Overall Control Effectiveness, 0.2)

Overall Control Effectiveness = (Compliance × 60%) + (Effectiveness × 40%)
```

### Example Calculation

**Scenario:**
- Inherent Risk Score: 3.2 (High)
- Compliance: 75% (Partially Compliant)
- Effectiveness: 60% (Partially Effective)

**Step 1:** Calculate Overall Control Effectiveness
```
Overall = (0.75 × 0.60) + (0.60 × 0.40)
        = 0.45 + 0.24
        = 0.69 (69% effective)
```

**Step 2:** Calculate Control Modifier
```
Modifier = max(1 - 0.69, 0.2)
         = max(0.31, 0.2)
         = 0.31
```

**Step 3:** Calculate Residual Risk
```
Residual = 3.2 × 0.31 = 0.99 → Rounds to 1.0 (Low Risk)
```

### Control Strength Multipliers
| Effectiveness | Multiplier | Impact |
|---------------|------------|--------|
| Strong (≥80%) | ×0.6 | Controls mitigate 40% of inherent risk |
| Moderate (50-79%) | ×0.85 | Controls mitigate 15% of inherent risk |
| Weak (<50%) | ×1.1 | Controls ineffective, risk may increase |

### Red Flag Override Rules
1. **Critical control gaps** → Minimum residual risk = 3.5 (High)
2. **Effectiveness < 30%** → Minimum residual risk = 3.0 (High)

### Residual Risk Rating Bands
| Score | Rating | Action |
|-------|--------|--------|
| < 1.5 | **Low** | Controls effective, maintain vigilance |
| 1.5 - 2.49 | **Moderate** | Some gaps remain, strengthen controls |
| ≥ 2.5 | **High** | Urgent control enhancement required |

---

## Automatic Tier Determination

### Tier 3 Triggers (ANY = Tier 3)
```
✓ A1.11: Offshore entities
✓ A1.12: Global private wealth
✓ A2.8: International tax structuring
✓ A2.9: Offshore structuring
✓ A3.5: Multi-jurisdictional structuring
```

### Tier 2 Triggers (ANY = Tier 2)
```
✓ A1.8: Multinational corporate groups
✓ A1.9: Extractive/gaming/high-value sectors
✓ A1.10: NPOs with foreign funding
✓ A2.6: Restructuring/insolvency
✓ A2.7: Corporate governance restructuring
✓ A3.4: FATF-listed jurisdictions
```

### Multiple Risk Factors (3+ = Tier 2)
```
✓ A1.1: PEPs
✓ A1.3: Foreign clients
✓ A1.5: Opaque ownership
✓ A1.6: Trusts/foundations
✓ A2.1: Real estate
✓ A3.3: High-risk jurisdictions

If 3 or more = Yes → Automatic Tier 2
```

### Default
```
If no triggers met → Tier 1 (Small/Sole Practitioner)
```

---

## TLS Inspection Readiness Scoring

### Component Ratings

| Component | Strong | Adequate | Weak/Basic |
|-----------|--------|----------|------------|
| **Risk Understanding** | Documented risk assessment + High inherent risk awareness | Basic risk assessment completed | No risk assessment or low awareness |
| **Policy Framework** | ≥80% compliance | 60-79% compliance | <60% compliance |
| **Operational Effectiveness** | ≥75% effectiveness | 55-74% effectiveness | <55% effectiveness |
| **Governance Maturity** | Advanced maturity | Developing maturity | Basic maturity |

### Overall Readiness

| Residual Risk | Overall Readiness |
|---------------|-------------------|
| Low | **Strong** - Well prepared for inspection |
| Moderate | **Adequate** - Some improvements needed |
| High | **Requires Urgent Attention** - Significant gaps |

---

## Priority Matrix for Recommendations

| Priority | Trigger | Timeline |
|----------|---------|----------|
| **CRITICAL** | Red flags / Critical control gaps | Immediate (30 days) |
| **HIGH** | Compliance < 80% or Effectiveness < 75% | 90 days - 6 months |
| **MEDIUM** | Maturity = Basic or Tier mismatch | 6-12 months |
| **LOW** | Enhancement opportunities | 12+ months |

---

## Score Interpretation Guide

### Healthy Firm Profile
```
✓ Inherent Risk: Moderate (1.8)
✓ Compliance: 85% (Compliant)
✓ Effectiveness: 78% (Effective)
✓ Maturity: 65% (Developing)
✓ Residual Risk: Low (1.2)
```

### At-Risk Firm Profile
```
⚠ Inherent Risk: High (3.5)
⚠ Compliance: 55% (Weak)
⚠ Effectiveness: 45% (Weak)
⚠ Maturity: 35% (Basic)
⚠ Residual Risk: High (3.1)
✗ Critical control gaps identified
```

### Improvement Path Example
```
Before:
- Compliance: 65% (Partially Compliant)
- Effectiveness: 50% (Weak)
- Residual: 2.8 (High)

After 6 months:
- Compliance: 82% (Compliant) [+17%]
- Effectiveness: 68% (Partially Effective) [+18%]
- Residual: 1.8 (Moderate) [-1.0]

After 12 months:
- Compliance: 90% (Compliant) [+8%]
- Effectiveness: 80% (Effective) [+12%]
- Residual: 1.0 (Low) [-0.8]
```

---

## Common Scoring Scenarios

### Scenario 1: High Inherent, Strong Controls
```
Inherent: 3.8 (High)
Compliance: 90%
Effectiveness: 85%
→ Overall Control: 88%
→ Modifier: 0.2 (minimum)
→ Residual: 0.76 (Low)

Interpretation: High-risk firm with excellent controls
```

### Scenario 2: Moderate Inherent, Weak Controls
```
Inherent: 2.2 (Moderate)
Compliance: 55%
Effectiveness: 40%
→ Overall Control: 49%
→ Modifier: 0.51
→ Residual: 1.12 (Low, but close to Moderate)

Interpretation: Moderate risk but controls need strengthening
```

### Scenario 3: High Inherent, Critical Gaps
```
Inherent: 3.5 (High)
Compliance: 60% (Critical gaps present)
Effectiveness: 50%
→ Red Flag Override
→ Residual: 3.5 (High - forced minimum)

Interpretation: Critical gaps prevent effective mitigation
```

---

## Quick Assessment Checklist

**Before starting:**
- [ ] Determine initial tier based on firm profile
- [ ] Identify likely risk triggers
- [ ] Review critical control requirements

**During assessment:**
- [ ] Complete all applicable tier questions
- [ ] Document evidence for Module 2
- [ ] Note operational examples for Module 3
- [ ] Assess governance integration for Module 4

**After completion:**
- [ ] Review calculated scores for reasonableness
- [ ] Check for automatic tier escalation
- [ ] Identify critical gaps requiring immediate action
- [ ] Generate executive summary and narratives
- [ ] Prioritize recommendations by timeline
