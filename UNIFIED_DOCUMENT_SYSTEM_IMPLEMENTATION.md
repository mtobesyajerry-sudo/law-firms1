# Unified Document Handling System - Implementation Complete

## Overview
Successfully standardized all document upload, view, download, verify, and delete operations across the entire system to use secure signed URLs instead of public URLs.

## Root Problem
The system had inconsistent document handling methods:
- Some components used `getPublicUrl()` which failed because buckets are private
- Pre-generated signed URLs that expired
- Inconsistent upload patterns
- Different verification and deletion workflows

## Solution Implemented
Unified all document operations to follow the **SOF/SOW Templates pattern**:
1. No `file_url` storage - only `storage_path`
2. Generate signed URLs on-demand (1-hour expiration)
3. Consistent upload, view, download, verify, and delete functions
4. Uniform UI/UX across all components

---

## Components Updated

### 1. SOF/SOW Templates (`SOFSOWTemplates.jsx`)
**Status**: ✅ Already Fixed (Initial Fix)

**Changes**:
- Removed `file_url` from upload records
- Added `handleViewDocument()` - generates signed URLs on-demand
- Added `handleDownloadDocument()` - generates signed URLs for downloads
- Updated buttons to use `storage_path` instead of `file_url`

**Functions**:
```javascript
- handleFileUpload() - uploads to storage, saves only storage_path
- handleViewDocument(storagePath) - creates signed URL and opens in new tab
- handleDownloadDocument(storagePath, fileName) - creates signed URL and downloads
- handleVerifyDocument(documentId) - verifies document
- handleDeleteDocument(documentId, storagePath) - deletes from storage and database
```

---

### 2. EDD Document Templates (`EDDDocumentTemplates.jsx`)
**Status**: ✅ Updated

**Changes**:
- Removed pre-loading of signed URLs (removed `documentUrls` state)
- Removed `refreshDocumentUrl()` and `generateSignedUrl()` functions
- Updated `handleUpload()` to match SOF/SOW pattern
  - Uses `organization_id/filename` path structure
  - No longer stores `file_url`
  - Only stores `storage_path`
- Added `handleViewDocument(storagePath)` - on-demand signed URLs
- Added `handleDownloadDocument(storagePath, fileName)` - on-demand downloads
- Added `handleDeleteDocument(documentId, storagePath)` - complete deletion
- Updated UI buttons to use new handlers with `storage_path`
- Added delete button for staff users
- Added `deleteButton` style

**Functions**:
```javascript
- handleUpload() - standardized upload matching SOF/SOW pattern
- handleViewDocument(storagePath) - creates signed URL and opens
- handleDownloadDocument(storagePath, fileName) - creates signed URL and downloads
- handleVerifyDocument(documentId, newStatus) - verify/reject documents
- handleDeleteDocument(documentId, storagePath) - delete document completely
```

---

### 3. Client Document Management (`ClientDocumentManagement.jsx`)
**Status**: ✅ Completely Rewritten

**Previous State**: Only showed security notice and document checklist (no upload functionality)

**New Implementation**: Full-featured document management system

**Changes**:
- Complete rewrite of the component
- Added `useAuth` hook for user/profile access
- Added `uploadedDocs` state to track uploaded documents
- Added `uploading` state for upload feedback
- Integrated with `document_types` and `document_requirements` tables
- Shows upload button for missing documents
- Shows uploaded document details with actions for existing documents

**Functions**:
```javascript
- loadDocuments() - loads both requirements and uploaded documents
- handleFileUpload(event, documentTypeId, documentTypeName, category) - uploads documents
- handleViewDocument(storagePath) - creates signed URL and opens
- handleDownloadDocument(storagePath, fileName) - creates signed URL and downloads
- handleVerifyDocument(documentId) - verifies document (staff only)
- handleDeleteDocument(documentId, storagePath) - deletes document (staff only)
- getUploadedDocForType(documentTypeId) - finds uploaded doc for requirement
```

**UI Features**:
- Collapsible categories (Identity, Address, Corporate, etc.)
- Upload button for each missing document
- Uploaded document display with:
  - Document name and upload date
  - Verification status badge (verified/pending/rejected)
  - View button (👁️)
  - Download button (⬇️)
  - Verify button (✓) - staff only
  - Delete button (🗑️) - staff only
- File type hint: "PDF, JPG, PNG (max 10MB)"

---

## Standard Pattern

### Upload Pattern
```javascript
const fileExt = file.name.split('.').pop();
const fileName = `${clientId}_${docType}_${Date.now()}.${fileExt}`;
const filePath = `${organizationId}/${fileName}`;

await supabase.storage
  .from('client-documents')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

// Store only storage_path, NO file_url
await supabase
  .from('client_documents')
  .insert({
    storage_path: filePath,
    // ... other fields
  });
```

### View Pattern
```javascript
const handleViewDocument = async (storagePath) => {
  const { data, error } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) throw error;
  window.open(data.signedUrl, '_blank');
};
```

### Download Pattern
```javascript
const handleDownloadDocument = async (storagePath, fileName) => {
  const { data, error } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;

  const response = await fetch(data.signedUrl);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### Delete Pattern
```javascript
const handleDeleteDocument = async (documentId, storagePath) => {
  if (!confirm('Are you sure?')) return;

  // Delete from storage
  await supabase.storage
    .from('client-documents')
    .remove([storagePath]);

  // Delete from database
  await supabase
    .from('client_documents')
    .delete()
    .eq('id', documentId);
};
```

### Verify Pattern
```javascript
const handleVerifyDocument = async (documentId) => {
  await supabase
    .from('client_documents')
    .update({
      verification_status: 'verified',
      verified_by: user?.id,
      verification_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', documentId);
};
```

---

## Security Benefits

### Before
- Attempted to use public URLs on private buckets → "Bucket not found" errors
- Pre-generated signed URLs stored in database → potential security risk
- Long-lived URLs (31536000 seconds = 1 year) → security vulnerability

### After
- All documents stored in private buckets with RLS policies
- Signed URLs generated on-demand only when needed
- Short-lived URLs (3600 seconds = 1 hour) → enhanced security
- URLs expire automatically after use
- No permanent URLs exposed
- Authentication required for all access

---

## Database Schema

The system uses the following key fields in `client_documents`:

```sql
CREATE TABLE client_documents (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES kyc_clients(id),
  organization_id UUID REFERENCES organizations(id),
  document_type_id UUID REFERENCES document_types(id),
  document_type TEXT,
  document_category TEXT,
  document_name TEXT,
  file_name TEXT,
  storage_path TEXT NOT NULL,  -- THIS IS THE KEY FIELD
  file_size BIGINT,
  mime_type TEXT,
  verification_status TEXT DEFAULT 'pending',
  verified_by UUID,
  verification_date DATE,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_mandatory BOOLEAN,
  is_current BOOLEAN
);
```

**Note**: `file_url` column may exist but is NO LONGER USED.

---

## Storage Bucket Configuration

**Bucket**: `client-documents`
- **Public**: NO (private bucket)
- **File Size Limit**: Configured at application level (10MB)
- **Allowed Types**: PDF, JPG, JPEG, PNG

**RLS Policies** (on storage.objects):
- Authenticated users can INSERT (upload)
- Authenticated users can SELECT (list/view)
- Authenticated users can UPDATE (metadata)
- Authenticated users can DELETE (remove)

---

## UI Consistency

All components now have consistent buttons:

| Action | Icon | Color | Access |
|--------|------|-------|--------|
| View | 👁️ | Blue (#3b82f6) | All authenticated |
| Download | ⬇️ | Blue (#3b82f6) | All authenticated |
| Verify | ✓ | Green (#10b981) | Staff only |
| Delete | 🗑️ | Red (#ef4444) | Staff only |

---

## Testing Checklist

✅ All three components updated
✅ Build successful (no compilation errors)
✅ Consistent upload pattern across all components
✅ Consistent view pattern (signed URLs)
✅ Consistent download pattern (signed URLs)
✅ Consistent verify pattern (staff only)
✅ Consistent delete pattern (staff only, storage + database)
✅ No `file_url` stored during uploads
✅ All operations use `storage_path`

---

## Future Maintenance

### When adding new document upload features:
1. Always use `createSignedUrl()` for private buckets
2. Never use `getPublicUrl()` unless bucket is truly public
3. Store only `storage_path` in database
4. Generate signed URLs on-demand with 1-hour expiry
5. Follow the patterns in `SOFSOWTemplates.jsx`

### When debugging document access issues:
1. Check if `storage_path` exists in database
2. Verify bucket RLS policies allow the operation
3. Ensure signed URL is being generated (check console logs)
4. Check signed URL expiry (default 3600 seconds)

---

## Summary

The document handling system is now **fully unified and secure**:
- ✅ SOF/SOW Templates
- ✅ EDD Document Templates
- ✅ Client Document Management (Document Checklist)

All components use the same secure, on-demand signed URL pattern for viewing and downloading documents from private storage buckets.
