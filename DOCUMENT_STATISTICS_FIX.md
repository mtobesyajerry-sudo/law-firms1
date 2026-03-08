# Document Statistics Bug Fix

## Problem Identified

The document upload statistics were showing **incorrect uploaded counts**:

**Before Fix:**
```
6 Required
10 Optional
4 Uploaded    ← WRONG
```

**After Fix:**
```
6 Required
10 Optional
0 Uploaded    ← CORRECT
```

## Root Cause

The "Uploaded" statistic was counting **ALL** documents uploaded to a client, regardless of whether they matched the current Due Diligence (DD) level requirements.

### Example Issue

For client "High Risk International Corp" (Standard DD, Corporate):
- **Required documents for Standard DD Corporate**: 16 total (6 mandatory, 10 optional)
- **Actually uploaded**: 4 documents
  - Public Records Search (regulatory)
  - PEP Declaration (regulatory)
  - 2 other documents

**The Problem**: These 4 uploaded documents were **NOT** in the Standard DD Corporate requirements list, but were still being counted in the "Uploaded" statistic.

This created confusion because:
1. Users thought they had uploaded 4 required documents
2. The completion percentage didn't match the uploaded count
3. Documents from previous DD levels or other categories were incorrectly counted

## Technical Details

### Code Location
`src/components/DocumentUploadManager.jsx` lines 423-540

### Bug in Original Code
```javascript
// Line 538 - WRONG: Counts all uploaded documents
<div>{uploadedDocuments.length}</div>
```

This counted every document in the `client_documents` table for this client, regardless of whether it matched the current DD level requirements.

### Fix Implementation

Added filtering logic to count only relevant documents:

```javascript
// Count only uploaded documents that match current DD level requirements
const requiredDocTypeIds = new Set(requiredDocuments.map(r => r.document_type.id));
const relevantUploadedCount = uploadedDocuments.filter(doc =>
  requiredDocTypeIds.has(doc.document_type_id)
).length;

// Display the correct count
<div>{relevantUploadedCount}</div>
```

### How It Works

1. **Extract required document type IDs**: Creates a Set of all document type IDs that are required for the current DD level and client type
2. **Filter uploaded documents**: Only counts documents whose `document_type_id` exists in the requirements Set
3. **Display accurate count**: Shows only documents that are actually part of the current checklist

## Impact

### Affected Scenarios

This bug affected clients when:
1. Documents were uploaded for a different DD level (e.g., Enhanced DD documents when client is at Standard DD)
2. Documents from previous assessments remained in the system
3. Staff uploaded documents not in the current requirements list
4. Client DD level was changed after documents were uploaded

### User Experience Improvement

**Before:**
- Confusing numbers that didn't add up
- Users thought they had completed more than they actually had
- Progress bar didn't match uploaded count

**After:**
- Clear, accurate statistics
- Only shows documents relevant to current requirements
- Progress bar aligns with actual completion status

## Data Verification

### Test Case: High Risk International Corp

```sql
-- Standard DD Corporate Requirements
Required: 6 documents
Optional: 10 documents
Total Requirements: 16 documents

-- Uploaded Documents
Total in database: 4 documents
  - Public Records Search (NOT in requirements)
  - PEP Declaration (NOT in requirements)
  - 2 others (NOT in requirements)

-- Correct Count
Relevant Uploaded: 0 documents ✓ (none match requirements)
```

### SQL Verification Query

```sql
WITH client_requirements AS (
  SELECT dr.document_type_id
  FROM document_requirements dr
  WHERE dr.dd_level = 'standard'
    AND dr.client_type = 'corporate'
)
SELECT
  (SELECT COUNT(*) FROM document_requirements dr
   WHERE dr.dd_level = 'standard' AND dr.client_type = 'corporate'
   AND dr.is_mandatory = true) as required_count,
  (SELECT COUNT(*) FROM document_requirements dr
   WHERE dr.dd_level = 'standard' AND dr.client_type = 'corporate'
   AND dr.is_mandatory = false) as optional_count,
  (SELECT COUNT(*)
   FROM client_documents cd
   WHERE cd.client_id = '[client_id]') as total_uploaded,
  (SELECT COUNT(*)
   FROM client_documents cd
   INNER JOIN client_requirements cr ON cr.document_type_id = cd.document_type_id
   WHERE cd.client_id = '[client_id]') as relevant_uploaded;
```

## Related Metrics (Not Changed)

These metrics remain accurate and were not affected:
- **Required count**: Correctly counts mandatory documents for current DD level
- **Optional count**: Correctly counts non-mandatory documents for current DD level
- **Completion percentage**: Correctly calculates based on verified required documents
- **Document status badges**: Correctly show missing/pending/verified/rejected status

## Edge Cases Handled

1. **Client DD level upgrade**: When a client moves from Simplified → Standard → Enhanced DD, only documents for the current level are counted
2. **Deleted requirements**: If a document type is removed from requirements, it's no longer counted
3. **Multiple uploads of same type**: Correctly counts all instances of a required document type
4. **Empty state**: Shows 0 when no relevant documents are uploaded

## Testing Recommendations

### Manual Testing
1. Create a client at Standard DD level
2. Upload documents that are NOT in Standard DD requirements
3. Verify "Uploaded" shows 0, not the actual number uploaded
4. Upload a document that IS in the requirements
5. Verify "Uploaded" increases to 1

### Automated Testing
```javascript
// Test case
const requirements = [{ document_type: { id: 'doc1' } }];
const uploaded = [
  { document_type_id: 'doc1' }, // In requirements
  { document_type_id: 'doc2' }, // Not in requirements
  { document_type_id: 'doc3' }  // Not in requirements
];

const count = getRelevantUploadedCount(requirements, uploaded);
expect(count).toBe(1); // Should only count 'doc1'
```

## Files Changed

1. **src/components/DocumentUploadManager.jsx**
   - Added `relevantUploadedCount` calculation (lines 432-436)
   - Updated display to use `relevantUploadedCount` (line 544)

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No runtime errors
✅ Statistics now accurate

## Conclusion

The document statistics now correctly show only documents that are relevant to the client's current Due Diligence level and client type. This provides accurate, meaningful information to users about their document upload progress.

**Summary:**
- Fixed incorrect document count display
- Now shows only documents matching current DD requirements
- Improved user experience with accurate statistics
- No breaking changes to existing functionality
