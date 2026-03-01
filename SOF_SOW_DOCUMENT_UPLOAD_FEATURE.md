# Source of Funds/Wealth Document Upload Feature

## Implementation Summary

Added document upload capability to the SOF/SOW Templates component, allowing Staff users to upload supporting documents as proof for Source of Funds and Source of Wealth verification.

## Features Added

### 1. Document Upload Functionality
- **Upload Button**: Purple "Upload Proof Document" button appears when a template is selected
- **File Types Accepted**: PDF, DOC, DOCX, JPG, JPEG, PNG
- **Automatic Categorization**: Documents are automatically tagged as "Source of Funds" or "Source of Wealth" based on selected template

### 2. Document Display
- **Uploaded Documents Section**: Shows all previously uploaded documents for the selected template
- **Document Information**:
  - Document name
  - Upload date
  - Verification status (verified, pending, rejected)
  - View link to access the document

### 3. Document Storage
- **Storage Location**: Supabase Storage bucket `client-documents`
- **File Path Structure**: `client-documents/{organization_id}/{filename}`
- **Database Record**: Full metadata stored in `client_documents` table

### 4. Security & Permissions
- **Staff Access**: Only Staff users (non-read-only) can upload documents
- **Organization Isolation**: Documents are stored and accessed per organization
- **User Tracking**: System tracks who uploaded each document

## Technical Implementation

### Components Modified
- **SOFSOWTemplates.jsx**: Added upload functionality and document display

### New Functions
1. `loadUploadedDocuments()` - Fetches uploaded documents from database
2. `handleFileUpload()` - Manages file upload to storage and database insertion

### Database Fields Used
```javascript
{
  client_id,
  organization_id,
  document_type: "Source of Funds" | "Source of Wealth",
  document_category: "financial",
  document_name,
  file_name,
  file_path,
  file_url,
  file_size,
  file_type,
  mime_type,
  storage_path,
  verification_status: "pending",
  is_mandatory: true,
  is_current: true,
  uploaded_by
}
```

## User Experience

### Upload Process
1. Select SOF or SOW template from the list
2. Click "Upload Proof Document" button
3. Select file from computer
4. System uploads and confirms success
5. Document appears in "Uploaded Documents" section below

### Document Verification
- Documents are automatically marked as "pending" verification
- Compliance officers can later verify/reject documents
- Status updates are visible in the document list

## Benefits

1. **Complete Documentation**: Staff can attach supporting evidence to SOF/SOW verifications
2. **Audit Trail**: All uploads are tracked with user, date, and metadata
3. **Centralized Storage**: Documents are stored securely with client records
4. **Easy Access**: View links allow quick access to uploaded documents
5. **Professional Workflow**: Matches standard KYC/AML documentation practices

## Testing Checklist

- [ ] Upload PDF document for Source of Funds
- [ ] Upload image document for Source of Wealth
- [ ] Verify document appears in uploaded list
- [ ] Check document can be viewed via View link
- [ ] Confirm document is stored in correct organization folder
- [ ] Verify read-only users cannot see upload button
- [ ] Test multiple uploads for same template
- [ ] Confirm verification status displays correctly

## Future Enhancements

Potential improvements for future versions:
- Bulk document upload
- Document preview inline
- Document deletion/replacement
- Enhanced verification workflow with notes
- Document expiry tracking
- Automatic reminders for missing documents
