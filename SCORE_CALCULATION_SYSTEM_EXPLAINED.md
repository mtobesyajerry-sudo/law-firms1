# Assessment Score Calculation System - Complete Guide

## Overview

The AML Risk Assessment system calculates scores at TWO levels:
1. **Section-level scores** (shown in Section Risk Summary tables)
2. **Assessment-level module scores** (overall risk metrics)

## Current System Status

### ✅ What's Working Now

**Automatic Score Calculation Trigger**
- When you answer questions and save responses, scores are **automatically calculated**
- A database trigger (`trigger_auto_recalculate_scores`) runs after every section save
- All module scores and risk ratings are computed in real-time

### 📊 Score Calculation Flow

```
User Answers Questions
    ↓
AssessmentForm saves responses
    ↓
section_scores table updated
    ↓
TRIGGER: trigger_auto_recalculate_scores
    ↓
FUNCTION: recalculate_assessment_risk_scores()
    ↓
assessments table updated with:
    - module_1_score (Inherent Risk)
    - module_2_score (Technical Compliance)
    - module_3_score (Residual Risk)
    - module_4_score (Institutional Maturity)
    - overall_risk_score
    - overall_risk_rating
```

## Understanding the Scores

### Section-Level Scores (from section_scores table)

These appear in the "Section Risk Summary" table in reports:

| Column | Description | Scale | Calculation |
|--------|-------------|-------|-------------|
| **section_code** | MODULE_1, MODULE_2, MODULE_3, MODULE_4 | - | Section identifier |
| **answered_questions** | How many questions answered | 0-N | Count of responses |
| **risk_score** | Section risk score | 1.0-5.0 | Calculated from responses |
| **risk_level** | Low/Moderate/High | Text | Based on risk_score thresholds |

**Display Logic:**
- If `answered_questions = 0` → Display "N/A" and "Not Assessed"
- If `answered_questions > 0` → Display actual scores

### Assessment-Level Module Scores (from assessments table)

These are the OVERALL scores for the entire assessment:

| Column | Meaning | Scale | Source |
|--------|---------|-------|--------|
| **module_1_score** | Inherent Risk | 1.0-5.0 | Calculated from Module 1 responses |
| **module_2_score** | Technical Compliance | 1.0-5.0 | Calculated from Module 2 responses |
| **module_3_score** | Residual Risk (Final) | 1.0-5.0 | IR × (1 - Control Effectiveness) |
| **module_4_score** | Institutional Maturity | 1.0-5.0 | From control assessments |
| **overall_risk_score** | Final Risk Rating | 1.0-5.0 | Same as module_3_score |
| **overall_risk_rating** | Risk Classification | Text | Low/Moderate/High |

## Score Calculation Details

### Module 1: Inherent Risk (IR)
**Function:** `calculate_inherent_risk(assessment_id)`

Calculates risk exposure BEFORE considering controls:
- Customer risk factors
- Geographic risk
- Product/service risk
- Transaction complexity
- Delivery channels

**Scale:** 1.0 (Low) to 5.0 (High)

### Module 2: Technical Compliance (TC)
**Function:** `calculate_control_effectiveness(assessment_id)` → Converted

Measures whether AML controls exist and are documented:
- Policies and procedures
- KYC/CDD frameworks
- Transaction monitoring rules
- Sanctions screening
- SAR/STR reporting

**Calculation:** `5 - (control_effectiveness * 4)`
- Higher compliance = Lower risk score
- Lower compliance = Higher risk score

### Module 3: Residual Risk (RR)
**Formula:** `IR × (1 - Control Effectiveness)`

The FINAL risk after applying controls:
- Takes inherent risk (Module 1)
- Reduces it based on control effectiveness (Module 2)
- Applies governance overrides if critical controls missing

**This is your FINAL RISK SCORE**

### Module 4: Institutional Maturity
**Function:** `calculate_module_scores_from_controls()`

Measures organizational sophistication:
- Process maturity levels (1-5 scale)
- Control library assessments
- Evidence-based evaluations

**Scale:** 1 (Initial) to 5 (Optimized)

## When Scores Show "N/A" or "Not Assessed"

### Section Risk Summary Table

Shows "N/A" when:
```sql
answered_questions = 0 OR risk_score IS NULL
```

This is CORRECT behavior because:
- No questions answered = No data to calculate score
- NULL values prevent false "0.0" scores
- Clear visual feedback: assessment incomplete

### Expected Display Behavior

**For Unanswered Sections:**
```
Questions:      0 / 45
Module Score:   N/A
Risk Level:     Not Assessed
```

**For Answered Sections:**
```
Questions:      23 / 40
Module Score:   2.3
Risk Level:     Moderate
```

## Testing Score Calculation

### SQL Query to Check Scores

```sql
-- Check section-level scores
SELECT
  ss.section_code,
  ss.answered_questions,
  ss.total_questions,
  ss.risk_score,
  ss.risk_level
FROM section_scores ss
WHERE ss.assessment_id = 'YOUR_ASSESSMENT_ID'
ORDER BY ss.section_code;

-- Check assessment-level scores
SELECT
  a.module_1_score,
  a.module_2_score,
  a.module_3_score,
  a.module_4_score,
  a.overall_risk_score,
  a.overall_risk_rating
FROM assessments a
WHERE a.id = 'YOUR_ASSESSMENT_ID';
```

### Trigger Verification

```sql
-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_recalculate_scores';
```

## Manual Recalculation (If Needed)

If scores seem incorrect, you can manually recalculate:

```sql
-- Recalculate single assessment
SELECT recalculate_assessment_risk_scores('assessment_id_here');

-- Recalculate ALL assessments
SELECT * FROM recalculate_all_assessment_scores();
```

## Frontend Display Components

### Components That Show Scores

1. **AssessmentReport.jsx**
   - Overall risk summary
   - Section risk breakdown
   - EDD requirements

2. **DetailedAssessmentReport.jsx**
   - Module score table
   - Risk level badges
   - Key findings

3. **PrintableAssessmentReport.jsx**
   - Print-friendly versions of above

### Null Safety Checks

All components now include null checks:
```jsx
{score.risk_score ? `${score.risk_score.toFixed(2)} / 5.0` : 'N/A'}
```

This prevents errors when scores are NULL.

## Troubleshooting

### Problem: Scores Not Calculating

**Check 1:** Verify trigger exists
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_recalculate_scores';
```

**Check 2:** Manually trigger recalculation
```sql
SELECT recalculate_assessment_risk_scores('your_assessment_id');
```

**Check 3:** Check for errors in logs
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Problem: Scores Show NULL When They Shouldn't

This happens when:
- No questions have been answered yet (EXPECTED)
- Trigger didn't fire (check trigger exists)
- Function failed (check logs)

### Problem: Scores Show "0.0" Instead of NULL

This was a bug that has been FIXED:
- Database migration removed default values
- Unanswered sections now correctly show NULL
- Frontend displays "N/A" for NULL values

## Summary

**Key Points:**
1. ✅ Automatic calculation is now enabled via trigger
2. ✅ Scores calculate in real-time as you answer questions
3. ✅ NULL values display as "N/A" / "Not Assessed"
4. ✅ No manual recalculation needed (but available if needed)
5. ✅ All null safety checks in place to prevent crashes

**The system correctly distinguishes between:**
- Not assessed (NULL → "N/A")
- Low risk (1.0-2.4)
- Moderate risk (2.5-3.4)
- High risk (3.5-5.0)
