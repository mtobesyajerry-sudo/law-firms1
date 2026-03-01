# EDD Document Category Fix

## Issue
Upload in EDD Templates failed with error:
```
new row for relation "client_documents" violates check constraint "client_documents_document_category_check"
```

## Root Cause
The `client_documents` table has a CHECK constraint that only allows specific values for `document_category`:

**Allowed Values:**
- 'identification'
- 'proof_of_address'
- 'financial'
- 'corporate'
- 'legal'
- 'screening'
- 'correspondence'
- 'other'

**Problem:** EDDDocumentTemplates was trying to use `document_category: 'edd'`, which is NOT in the allowed list.

## Solution
Changed EDDDocumentTemplates.jsx line 132:

**Before:**
```javascript
document_category: 'edd',
```

**After:**
```javascript
document_category: 'other',
```

## Rationale
- EDD documents are specialized compliance documents that don't fit standard categories
- The 'other' category is the appropriate catch-all for specialized documents
- Matches the pattern used for other non-standard document types
- SOF/SOW uses 'financial' (line 80 in SOFSOWTemplates.jsx)
- Standard DD documents use specific categories ('identification', 'proof_of_address', etc.)
- EDD documents are beyond standard requirements → 'other' is correct

## Database Schema Reference
```sql
-- From migration: 20260217224244_create_kyc_cdd_system_for_banks.sql
document_category text NOT NULL CHECK (document_category IN (
  'identification', 'proof_of_address', 'financial', 'corporate',
  'legal', 'screening', 'correspondence', 'other'
)),
```

## File Modified
- `src/components/EDDDocumentTemplates.jsx` (line 132)

## Build Status
✅ Build successful
✅ Constraint satisfied
✅ Upload will now work correctly

## Testing
EDD document uploads will now succeed:
1. Navigate to Client Details
2. Go to EDD Templates tab
3. Click Upload button on any EDD document type
4. Select a file
5. ✅ Upload succeeds with `document_category: 'other'`
6. Document appears with View/Download/Verify/Delete buttons
