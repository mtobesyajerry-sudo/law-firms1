# Critical Bug Fix: Zero Scores for Unanswered Assessments

## Problem Statement

A critical bug was identified where assessment sections with **zero answered questions** were displaying:
- **Module Score**: 0.0
- **Risk Level**: Low

This created a false impression that:
1. The assessment had been completed
2. The organization received a perfect low-risk score
3. No compliance issues existed

In reality, **no questions had been answered at all**.

### Additional Issue (Immediate Fix Required)

After the initial fix, a runtime error was discovered:
```
TypeError: can't access property "toFixed", score.risk_score is null
```

This occurred because the code was calling `.toFixed()` on NULL risk_score values without null checks, causing application crashes when viewing assessment reports with unanswered sections.

## Root Cause Analysis

The issue stemmed from two sources:

### 1. Database Level
- The `section_scores` table had default values of `0` for `risk_score`
- When section records were created without responses, they defaulted to 0.0
- The `assessment_risk_breakdown` view used `COALESCE(score, 0)` which replaced NULL values with 0

### 2. Frontend Level
- Report components displayed scores without checking if questions were answered
- No conditional logic to show "N/A" or "Not Assessed" for incomplete sections
- The score `0.0` was treated as a valid assessment result

## Solution Implemented

### Database Fixes (Migration: `fix_zero_scores_for_unanswered_sections.sql`)

1. **Altered `section_scores` table defaults**
   ```sql
   ALTER TABLE section_scores
     ALTER COLUMN risk_score DROP DEFAULT,
     ALTER COLUMN risk_level DROP DEFAULT;
   ```

2. **Updated existing records**
   ```sql
   UPDATE section_scores
   SET
     risk_score = NULL,
     risk_level = NULL,
     technical_compliance_score = NULL,
     effectiveness_score = NULL
   WHERE answered_questions = 0 OR answered_questions IS NULL;
   ```

3. **Recreated `assessment_risk_breakdown` view**
   - Removed `COALESCE(score, 0)` patterns
   - Returns NULL when no responses exist
   - Prevents false 0.0 scores from appearing

### Frontend Fixes

#### 1. DetailedAssessmentReport.jsx
Added conditional rendering based on `answered_questions`:

```jsx
const hasResponses = score.answered_questions > 0;

// Module Score column
<td style={{...styles.tdCenter, fontWeight: '600', color: hasResponses ? scoreColor : '#94a3b8'}}>
  {hasResponses ? moduleScore.toFixed(1) : 'N/A'}
</td>

// Risk Level column
{hasResponses ? (
  <span style={{...styles.levelBadge, ...riskLevelColors}}>
    {getRiskLabel(score.risk_level)}
  </span>
) : (
  <span style={{...styles.levelBadge, background: '#f1f5f9', color: '#64748b'}}>
    Not Assessed
  </span>
)}
```

#### 2. PrintableAssessmentReport.jsx
Applied same conditional logic for print/export versions

#### 3. AssessmentReport.jsx
Added null checks for all `.toFixed()` calls:

```jsx
// Example: Overall risk score display
{assessment.overall_risk_score ? `${assessment.overall_risk_score.toFixed(2)} / 5.0` : 'N/A'}

// Example: Section risk scores
{score.risk_score ? `${score.risk_score.toFixed(2)} / 5.0` : 'N/A'}

// Example: Filter checks before mapping
{sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).map(...)}
```

All instances of `.toFixed()` calls now check for null/undefined values first

## Expected Behavior After Fix

### For Unanswered Sections (answered_questions = 0)
- **Module Score**: Displays "N/A" (gray text)
- **Risk Level**: Displays "Not Assessed" (gray badge)
- **Database Values**: NULL (not 0)

### For Partially Answered Sections (answered_questions > 0)
- **Module Score**: Displays calculated score (e.g., "2.3")
- **Risk Level**: Displays actual risk level (Low/Moderate/High)
- **Database Values**: Actual numeric scores

## Testing Verification

Verified fix with SQL query:
```sql
SELECT
  ss.section_code,
  ss.answered_questions,
  ss.risk_score,
  ss.risk_level
FROM section_scores ss
WHERE ss.answered_questions = 0;
```

**Result**: All unanswered sections now correctly show NULL values

## Impact Assessment

### Before Fix
| Section | Questions | Score | Risk Level | Issue |
|---------|-----------|-------|------------|-------|
| MODULE_1 | 0 / 45 | 0.0 | Low | FALSE - Not assessed |
| MODULE_2 | 0 / 40 | 0.0 | Low | FALSE - Not assessed |
| MODULE_3 | 0 / 27 | 0.0 | Low | FALSE - Not assessed |
| MODULE_4 | 0 / 36 | 0.0 | Low | FALSE - Not assessed |

### After Fix
| Section | Questions | Score | Risk Level | Status |
|---------|-----------|-------|------------|--------|
| MODULE_1 | 0 / 45 | N/A | Not Assessed | CORRECT |
| MODULE_2 | 0 / 40 | N/A | Not Assessed | CORRECT |
| MODULE_3 | 0 / 27 | N/A | Not Assessed | CORRECT |
| MODULE_4 | 0 / 36 | N/A | Not Assessed | CORRECT |

## Files Modified

### Database
- New migration: `supabase/migrations/fix_zero_scores_for_unanswered_sections.sql`

### Frontend (Multiple Fixes Applied)
- `src/components/DetailedAssessmentReport.jsx`
  - Added null checks in Module Score table
  - Added null checks in EDD section
  - Filter checks before mapping sections

- `src/components/PrintableAssessmentReport.jsx`
  - Added null checks in Module Score table
  - Added null checks in EDD section
  - Filter checks before mapping sections

- `src/components/AssessmentReport.jsx`
  - Added null check for overall_risk_score display
  - Added null checks for section risk_score displays
  - Added null checks in EDD section
  - Filter checks before mapping sections
  - Conditional rendering for risk action text

## Prevention Measures

To prevent this issue from recurring:

1. **Database Constraints**: NULL defaults for score fields ensure no false zeros
2. **Frontend Validation**: All report components check `answered_questions` before displaying scores
3. **View Logic**: `assessment_risk_breakdown` view returns NULL appropriately
4. **Documentation**: This report serves as reference for future scoring implementations

## Deployment Notes

This fix has been:
- ✅ Applied to the database (migration successful)
- ✅ Implemented in all report components (3 files updated)
- ✅ Added null safety checks for all `.toFixed()` calls
- ✅ Added filter checks before EDD section mapping
- ✅ Tested with existing assessments (NULL values confirmed)
- ✅ Build verified successfully (no errors)

No data loss occurred. Existing completed assessments with valid scores remain unchanged.

## Summary of Changes

**Total Locations Fixed**: 8+ instances across 3 component files

**Risk Eliminated**: Application no longer crashes when viewing assessments with unanswered sections

**User Experience**: Clear distinction between "Not Assessed" (N/A) vs actual low scores (e.g., 1.2)
