# Document Upload Pattern Unified - Complete

## Problem Solved

The "Required Documents by Category" section was using the old `DocumentService` abstraction layer with references to the deleted `secure_documents` table. This has been completely replaced with the EXACT pattern used in "Enhanced Due Diligence Templates".

## Pattern Adopted

### Direct Supabase Calls (No Service Layer)

Both systems now use the IDENTICAL approach:

1. **Upload**: Direct `supabase.storage.from('client-documents').upload()`
2. **Insert**: Direct `supabase.from('client_documents').insert()`
3. **View**: Direct `supabase.storage.createSignedUrl()` + `window.open()`
4. **Download**: Direct `supabase.storage.createSignedUrl()` + blob download
5. **Delete**: Direct storage delete + DB delete
6. **Verify**: Direct `supabase.from('client_documents').update()`

### Storage Pattern

**Bucket**: `client-documents`

**Path Pattern**:
```
{organizationId}/{clientId}_{documentName}_{timestamp}.{ext}
```

**Example**:
```
org-123/client-456_National_ID_1234567890.pdf
```

### Database Pattern

**Table**: `client_documents` (single source of truth)

**Insert Structure**:
```javascript
{
  client_id: clientId,
  organization_id: organizationId,
  document_type_id: documentTypeId,
  document_type: docType?.name,
  document_category: docType?.category,
  document_name: file.name,
  file_name: fileName,
  file_size: file.size,
  file_type: file.type,
  mime_type: file.type,
  storage_path: filePath,
  verification_status: 'pending',
  is_mandatory: true,
  is_current: true,
  uploaded_by: user.id
}
```

## Changes Made to DocumentUploadManager.jsx

### Removed
- Import of `DocumentService`
- All calls to `DocumentService.uploadDocument()`
- All calls to `DocumentService.downloadDocument()`
- All calls to `DocumentService.viewDocument()`
- All calls to `DocumentService.deleteDocument()`
- All calls to `DocumentService.verifyDocument()`
- All calls to `DocumentService.getClientDocuments()`
- References to `doc.secure_document_id`

### Added
- Direct Supabase upload logic
- Direct Supabase query logic
- Direct storage signed URL generation
- Helper functions: `formatFileSize()`, `getFileIcon()`
- Proper error handling for each operation

### Updated
- Upload flow: File validation → Storage upload → DB insert → Reload
- View flow: Get doc → Create signed URL → Open in new tab
- Download flow: Get doc → Create signed URL → Fetch blob → Download
- Delete flow: Delete from storage → Delete from DB → Reload
- Verify flow: Update status in DB → Reload

## Button References Fixed

**Before**:
```javascript
onClick={() => handleView(doc.secure_document_id)}
onClick={() => handleDownload(doc.secure_document_id)}
onClick={() => handleDelete(doc.secure_document_id)}
onClick={() => handleVerify(doc.secure_document_id, 'verified')}
```

**After**:
```javascript
onClick={() => handleView(doc)}
onClick={() => handleDownload(doc)}
onClick={() => handleDelete(doc)}
onClick={() => handleVerify(doc.id, 'verified')}
```

## Both Systems Now Identical

### EDDDocumentTemplates.jsx Pattern
✓ Direct Supabase calls
✓ Storage bucket: `client-documents`
✓ Table: `client_documents`
✓ No service layer
✓ Inline file size/icon helpers

### DocumentUploadManager.jsx Pattern
✓ Direct Supabase calls
✓ Storage bucket: `client-documents`
✓ Table: `client_documents`
✓ No service layer
✓ Inline file size/icon helpers

## Key Benefits

1. **Consistency**: Both systems work identically
2. **No Abstraction**: Direct database/storage access
3. **Simple**: No complex service layer to maintain
4. **Clear**: Easy to understand what's happening
5. **Unified**: Single source of truth (`client_documents`)

## Verification

- Build successful with no errors
- No references to `secure_documents`
- No references to `DocumentService` in upload components
- Both systems use same storage bucket
- Both systems use same database table
- Both systems use same upload/view/delete patterns
