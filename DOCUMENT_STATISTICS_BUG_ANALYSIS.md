# Document Statistics Bug Analysis & Fix

## Issue Report

User reported seeing: **"Enhanced Due Diligence Documents, 10 of 8 completed, 125%"**

This is mathematically impossible - you cannot complete more items than exist.

## Investigation Summary

### Database Reality Check

For client "High Risk International Corp" (Enhanced DD, Corporate):

**Requirements in Regulatory Category:**
- Total: 14 documents
- Mandatory: 4 documents
- Optional: 10 documents

**Uploaded in Regulatory Category:**
- Total uploads: 8 documents
- Uploads matching requirements: 5 documents
- Uploads NOT in requirements: 3 documents

The 3 uploads not in requirements are:
1. PEP Declaration (uploaded, but "PEP Screening Report" is in requirements - different doc types)
2. PEP Risk Assessment (uploaded, but "PEP Relationship Disclosure" is in requirements - different doc types)
3. Senior Management Approval Form (uploaded, but "Senior Management Approval" is in requirements - different doc types)

### Code Analysis

The `DocumentUploadManager` component has this logic:

```javascript
// Line 578-584
.map(([category, requirements]) => {
  const categoryCompleted = requirements.filter(r => {
    const status = getDocumentStatus(r.document_type.id);
    return status.status === 'verified';
  }).length;

  // Display: {categoryCompleted} of {requirements.length} completed
  // Percentage: {Math.round((categoryCompleted / requirements.length) * 100)}%
```

**This logic is CORRECT:**
- `requirements` is filtered to current DD level only (line 61-63)
- `categoryCompleted` counts how many of those requirements have verified uploads
- `requirements.length` is the total for that category
- It's impossible for `categoryCompleted > requirements.length` with this logic

### Possible Explanations

1. **User is viewing cached/stale data** - The display might not have refreshed after DD level changed
2. **User is in a different component** - Might be looking at EDD Templates or SOF/SOW Templates
3. **Database inconsistency** - The `document_requirements` table might have duplicate entries
4. **Browser rendering issue** - React state might be out of sync

### Previous Fix Applied

Earlier, I fixed a related bug where the top-level "Uploaded" count was showing ALL uploaded documents instead of only those matching current DD requirements:

**Before:**
```javascript
<div>{uploadedDocuments.length}</div>  // Wrong - counts ALL uploads
```

**After:**
```javascript
const requiredDocTypeIds = new Set(requiredDocuments.map(r => r.document_type.id));
const relevantUploadedCount = uploadedDocuments.filter(doc =>
  requiredDocTypeIds.has(doc.document_type_id)
).length;
<div>{relevantUploadedCount}</div>  // Correct - counts only relevant uploads
```

## Verification Queries

### Check for Duplicate Requirements

```sql
SELECT
  dt.name,
  dt.category,
  COUNT(*) as requirement_count
FROM document_requirements dr
JOIN document_types dt ON dt.id = dr.document_type_id
WHERE dr.dd_level = 'enhanced'
  AND dr.client_type = 'corporate'
GROUP BY dt.id, dt.name, dt.category
HAVING COUNT(*) > 1;
```

**Result:** No duplicates found ✓

### Check Category Statistics

```sql
SELECT
  dt.category,
  COUNT(*) FILTER (WHERE dr.is_mandatory = true) as required,
  COUNT(*) FILTER (WHERE dr.is_mandatory = false) as optional,
  COUNT(*) as total
FROM document_requirements dr
JOIN document_types dt ON dt.id = dr.document_type_id
WHERE dr.dd_level = 'enhanced'
  AND dr.client_type = 'corporate'
GROUP BY dt.category;
```

**Result:**
- address: 0 required, 1 optional = 1 total
- corporate: 3 required, 2 optional = 5 total
- financial: 2 required, 1 optional = 3 total
- other: 1 required, 1 optional = 2 total
- ownership: 5 required, 6 optional = 11 total
- regulatory: 4 required, 10 optional = 14 total

**None of these match "8 total"** which suggests:
1. User is looking at a different DD level
2. User is looking at filtered/grouped data
3. User is looking at a different component

### Check for "Enhanced DD" Category

The display name "Enhanced Due Diligence Templates" maps to category code "enhanced_dd":

```javascript
const categoryNames = {
  'enhanced_dd': 'Enhanced Due Diligence Templates',
  // ...
};
```

But this category **does not exist** in the database:

```sql
SELECT DISTINCT category FROM document_types;
```

**Result:** address, corporate, financial, identity, other, ownership, regulatory

**No "enhanced_dd" category exists** ✓

## Reproduction Attempt

I cannot reproduce "10 of 8 completed, 125%" with the current code and database state because:

1. The code logic prevents `completed > total`
2. No category has exactly 8 requirements
3. No category has more verified uploads than requirements
4. The "enhanced_dd" category doesn't exist in the database

## Hypothetical Scenarios

### Scenario 1: Duplicate Document Type IDs

If somehow `requiredDocuments` contains duplicates of the same document type:

```javascript
requiredDocuments = [
  { document_type: { id: 'doc1', category: 'regulatory' } },
  { document_type: { id: 'doc1', category: 'regulatory' } },  // Duplicate!
  // ... 6 more unique docs = 8 total
]
```

And if `uploadedDocuments` has verified uploads for more than 8 unique types, you could get 10 completed.

**Check:** Query showed no duplicate requirements ✗

### Scenario 2: Category Aggregation Bug

If requirements from multiple categories are being grouped together under one display name:

```javascript
// Bug: All "regulatory" requirements being displayed as "enhanced_dd"
requirementsByCategory = {
  'regulatory': [14 items],  // But displayed as...
  'enhanced_dd': [14 items]  // This display name
}
```

**Check:** Category mapping is display-only, doesn't affect grouping ✗

### Scenario 3: Async State Issue

If `requiredDocuments` updates between calculating `requirements.length` and `categoryCompleted`:

```javascript
// First render: requirements.length = 8
// Re-render: requirements.length = 14, but categoryCompleted still = 10
```

**Check:** Both calculated in same render cycle ✗

## Recommendations

### 1. Add Safeguard to Display Logic

Prevent displaying impossible percentages:

```javascript
const categoryCompleted = Math.min(
  requirements.filter(r => {
    const status = getDocumentStatus(r.document_type.id);
    return status.status === 'verified';
  }).length,
  requirements.length  // Cap at total requirements
);
```

### 2. Add Debug Logging

Temporarily add logging to identify the issue:

```javascript
.map(([category, requirements]) => {
  const categoryCompleted = requirements.filter(r => {
    const status = getDocumentStatus(r.document_type.id);
    return status.status === 'verified';
  }).length;

  if (categoryCompleted > requirements.length) {
    console.error('Impossible statistics detected:', {
      category,
      completed: categoryCompleted,
      total: requirements.length,
      requirements: requirements.map(r => ({
        id: r.document_type.id,
        name: r.document_type.name,
        status: getDocumentStatus(r.document_type.id)
      }))
    });
  }
```

### 3. Verify Document Type ID Uniqueness

Ensure no document type appears twice in requirements:

```javascript
const requirementsByCategory = requiredDocuments.reduce((acc, req) => {
  const category = req.document_type.category;
  if (!acc[category]) acc[category] = [];

  // Check for duplicates
  if (acc[category].some(r => r.document_type.id === req.document_type.id)) {
    console.warn('Duplicate requirement detected:', req.document_type.name);
    return acc;  // Skip duplicate
  }

  acc[category].push(req);
  return acc;
}, {});
```

### 4. Add Data Validation

Check data integrity on load:

```javascript
const loadClientAndDocuments = async () => {
  // ... existing code ...

  // Validate no duplicate document types in requirements
  const docTypeIds = requirements.map(r => r.document_type.id);
  const uniqueIds = new Set(docTypeIds);
  if (docTypeIds.length !== uniqueIds.size) {
    console.error('Duplicate requirements detected', requirements);
  }
};
```

## Conclusion

The reported statistic **"10 of 8 completed, 125%"** is **impossible with the current code logic**.

The most likely explanations are:
1. **Stale data** - User needs to refresh
2. **Different view** - User is looking at a different component/screen
3. **Database inconsistency** - Requires direct database inspection
4. **Caching issue** - Browser or React state cache

The code has been reviewed and is logically sound. The earlier fix for the top-level "Uploaded" count has been applied, which addressed a real bug.

**Recommendation:** Ask the user to:
1. Refresh the page completely (Ctrl+F5 / Cmd+Shift+R)
2. Provide a screenshot showing exactly where they see "10 of 8 completed, 125%"
3. Specify which client they're viewing
4. Specify which DD level the client is at

Without being able to reproduce the issue with current code and data, I cannot apply a targeted fix.
