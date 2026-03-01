# Assessment Document Upload Fix

## Issue Description
When Compliance Officers uploaded documents during risk assessments, they received a "document uploaded successfully" prompt, but the display showed "No documents uploaded in this category yet". The documents were being uploaded but not retrieved or displayed.

## Root Cause Analysis

The issue had two main causes:

1. **Stubbed Upload Method**: The `uploadAssessmentDocument` method in `DocumentService.js` was returning a deprecation error instead of actually uploading documents to the `assessment_attachments` table.

2. **Empty Retrieval Method**: The `getAssessmentDocuments` method was simply returning an empty array `[]` instead of querying the database.

## Changes Made

### 1. DocumentService.js - uploadAssessmentDocument Method

**Before:**
```javascript
static async uploadAssessmentDocument({...}) {
  return { success: false, error: 'Assessment attachments deprecated - use client_documents instead' };
}
```

**After:**
- Implemented full document upload workflow
- Validates file before upload
- Uploads file to Supabase Storage at path: `{orgId}/assessments/{assessmentId}/{category}/{timestamp}_{filename}`
- Creates record in `assessment_attachments` table with:
  - `assessment_id`
  - `question_code` (used for category)
  - `file_name`, `file_path`, `file_size`, `file_type`
  - `uploaded_by` (current user)
  - `metadata` (checksum, classification, category, public_url)
- Logs document access for audit trail
- Returns success with document ID and storage path

### 2. DocumentService.js - getAssessmentDocuments Method

**Before:**
```javascript
static async getAssessmentDocuments(assessmentId) {
  return [];
}
```

**After:**
- Queries `assessment_attachments` table for all documents linked to the assessment
- Fetches uploader information from `user_profiles` table
- Formats data to match the expected structure with:
  - Document metadata (id, file_name, file_size, file_type, dates)
  - Uploader information (full_name)
  - Secure document reference for viewing/downloading
- Returns properly formatted array of documents
- Gracefully handles errors by returning empty array

### 3. Enhanced Download/View/Delete Methods

Updated these methods to support both `client_documents` and `assessment_attachments`:

- **downloadDocument**: Checks both tables and uses appropriate storage path
- **viewDocument**: Supports both document types with proper formatting
- **deleteDocument**: Deletes from correct table and removes from storage

## Database Structure

The `assessment_attachments` table has the following key columns:
- `id` (uuid, primary key)
- `assessment_id` (uuid, foreign key to assessments)
- `question_code` (text) - Used to store document category
- `file_name` (text)
- `file_path` (text) - Storage path
- `storage_path` (text) - Alternative storage path
- `file_size` (bigint)
- `file_type` (text)
- `uploaded_by` (uuid, foreign key to auth.users)
- `uploaded_at` (timestamptz)
- `metadata` (jsonb)

## RLS Policies

The following RLS policies are in place for Compliance Officers:

- **SELECT**: Can view assessment attachments for assessments in their organization
- **INSERT**: Can upload attachments to assessments in their organization
- **UPDATE**: Can update attachments for assessments in their organization
- **DELETE**: Can delete attachments from assessments in their organization

All policies verify:
1. User has `compliance_officer` or `mlro` role
2. Assessment belongs to user's organization

## Testing Recommendations

1. **Upload Test**: Upload a document in each category and verify it appears immediately
2. **View Test**: Click "View" on an uploaded document to ensure it opens correctly
3. **Download Test**: Click "Download" to verify file downloads properly
4. **Delete Test**: Delete a document and verify it's removed from display
5. **Multi-Category Test**: Upload documents to multiple categories and verify organization
6. **Error Handling**: Try uploading invalid file types or oversized files

## Related Files Modified

1. `/src/services/documentService.js` - Fixed upload and retrieval methods
2. `/src/components/AssessmentDocumentUpload.jsx` - Already using correct methods (no changes needed)

## Storage Structure

Documents are organized in Supabase Storage as:
```
secure-documents/
  └── {organization_id}/
      └── assessments/
          └── {assessment_id}/
              ├── compliance/
              ├── risk_assessment/
              ├── audit/
              ├── governance/
              ├── sanctions/
              ├── licensing/
              ├── inspection/
              ├── evidence/
              └── other/
```

## Security Notes

- All documents are stored in the `secure-documents` bucket with RLS protection
- File checksums are calculated using SHA-256 for integrity verification
- Document access is logged in `document_access_logs` for audit trail
- Files are validated for size (max 50MB) and allowed MIME types
- Storage paths are sanitized to prevent directory traversal attacks
