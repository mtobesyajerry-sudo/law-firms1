# EDD Document Statistics Bug Fix

## Issue
"Enhanced Due Diligence Documents, 10 of 8 completed, 125%" displayed on Client Details page > EDD Templates tab.

## Root Cause

**Location:** `src/components/EDDDocumentTemplates.jsx` line 75-84

**The Bug:**
```javascript
const { data, error } = await supabase
  .from('client_documents')
  .select('...')
  .eq('client_id', clientId)
  .in('document_types.code', [...])  // ❌ This doesn't work!
```

**Why it failed:**
Supabase's `.in()` filter **does not work on joined table columns** like `document_types.code`. The filter was being ignored, so the query was returning **ALL** client documents instead of only the 8 EDD document types.

**Result:**
- `documentTypes.length` = 8 (correct - hardcoded list of EDD codes)
- `eddDocuments` = ALL uploaded docs for client (10+ documents)
- Calculation: 10 verified / 8 types = 125% ❌

## The Fix

**Changed to two-step query:**

1. First, fetch document type IDs for the EDD codes:
```javascript
const { data: docTypes } = await supabase
  .from('document_types')
  .select('id')
  .in('code', [
    'pep_declaration',
    'edd_questionnaire',
    'public_records_search',
    'senior_approval',
    'monitoring_checklist',
    'pep_assessment',
    'economic_rationale',
    'country_risk_assessment'
  ]);

const docTypeIds = docTypes.map(dt => dt.id);
```

2. Then filter documents by those IDs:
```javascript
const { data, error } = await supabase
  .from('client_documents')
  .select('...')
  .eq('client_id', clientId)
  .in('document_type_id', docTypeIds)  // ✅ This works!
```

**Result:**
- `documentTypes.length` = 8 EDD types
- `eddDocuments` = Only documents with those 8 type IDs
- Calculation: 8 verified / 8 types = 100% ✅

## Testing

### Before Fix
```
Enhanced Due Diligence Documents
10 of 8 completed
125%
```

### After Fix
```
Enhanced Due Diligence Documents
8 of 8 completed
100%
```

## Related Issue

This is similar to the bug fixed earlier in `DocumentUploadManager.jsx` where the top-level "Uploaded" count was showing all documents instead of filtering by DD level requirements.

The pattern is: **Always be careful when filtering on joined table columns in Supabase queries.**

## Files Modified
- `src/components/EDDDocumentTemplates.jsx` - Fixed fetchEDDDocuments() function

## Build Status
✅ Build successful with no errors
