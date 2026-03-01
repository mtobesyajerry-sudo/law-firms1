# Question-Level Attachment System Fix

## Problem Identified

After removing the AssessmentDocumentUpload component, the question-level file upload system had a critical bug: **files were not actually being uploaded to storage**. The system was only creating database records without storing the actual files.

## Root Cause

The `handleFileUpload` function in `AssessmentForm.jsx` was:
1. Creating metadata records in the `assessment_attachments` table
2. NOT uploading the actual file binary data to Supabase Storage
3. Users saw "Error uploading files. Please try again." because there was no storage path

## Solution Implemented

### 1. Fixed File Upload Process

**Updated `handleFileUpload` function to:**

```javascript
const handleFileUpload = async (questionCode, files) => {
  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Upload file to storage
  const storagePath = `assessments/${id}/${questionCode}/${timestamp}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('client-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  // 3. Create database record with storage path
  const fileData = {
    assessment_id: id,
    question_code: questionCode,
    file_name: file.name,
    file_path: storagePath,
    storage_path: storagePath,
    file_size: file.size,
    file_type: file.type,
    uploaded_by: user.id,
    metadata: {
      declaration_confirmed: true,
      declaration_text: ATTACHMENT_DECLARATION,
      original_filename: file.name
    }
  };

  // 4. If database insert fails, rollback storage upload
  if (error) {
    await supabase.storage.from('client-documents').remove([storagePath]);
    throw error;
  }
};
```

### 2. Added File Viewing Functionality

Created `handleFileView` function to allow users to view/download uploaded files:

```javascript
const handleFileView = async (attachment) => {
  const storagePath = attachment.storage_path || attachment.file_path;

  const { data, error } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(storagePath, 3600);

  if (data && data.signedUrl) {
    window.open(data.signedUrl, '_blank');
  }
};
```

### 3. Enhanced File Deletion

Updated `handleFileDelete` to remove files from both storage and database:

```javascript
const handleFileDelete = async (questionCode, attachmentId) => {
  // 1. Find attachment record
  const attachment = (attachments[questionCode] || []).find(att => att.id === attachmentId);

  // 2. Delete from storage
  if (attachment && attachment.storage_path) {
    await supabase.storage
      .from('client-documents')
      .remove([attachment.storage_path]);
  }

  // 3. Delete database record
  await supabase
    .from('assessment_attachments')
    .delete()
    .eq('id', attachmentId);
};
```

### 4. Updated UI with View Button

Added a view/download button alongside the delete button:

```jsx
<div style={{ display: 'flex', gap: '8px' }}>
  <button
    onClick={() => handleFileView(att)}
    style={styles.viewButton}
    title="View file"
  >
    👁
  </button>
  {!isReadOnly && (
    <button
      onClick={() => handleFileDelete(question.code, att.id)}
      style={styles.deleteButton}
      title="Delete file"
    >
      ×
    </button>
  )}
</div>
```

## Storage Architecture

### Storage Bucket
- **Bucket Name**: `client-documents`
- **Path Structure**: `assessments/{assessment_id}/{question_code}/{timestamp}_{filename}`
- **Security**: Private bucket with RLS policies

### Database Schema
The `assessment_attachments` table stores metadata:
- `id` - UUID primary key
- `assessment_id` - Links to assessment
- `question_code` - Links to specific question
- `file_name` - Original filename
- `file_path` - Storage path (primary)
- `storage_path` - Storage path (backup/compatibility)
- `file_size` - File size in bytes
- `file_type` - MIME type
- `uploaded_by` - User ID
- `metadata` - JSON object with declaration info
- `created_at` - Timestamp

## Key Improvements

### 1. **Complete Upload Pipeline**
- Files are now actually stored in Supabase Storage
- Database records link to storage paths
- Proper error handling with rollback capability

### 2. **File Access**
- Users can view/download uploaded files
- Signed URLs provide secure, time-limited access
- Files open in new browser tab

### 3. **Proper Cleanup**
- Delete operation removes both storage file and database record
- Prevents orphaned files in storage
- Maintains data integrity

### 4. **Better User Experience**
- Clear error messages
- Loading states during upload
- Visual feedback for all actions
- Read-only mode respects permissions

### 5. **Security**
- Uses authenticated user ID
- Files stored in private bucket
- Signed URLs for controlled access
- RLS policies enforce access control

## File Upload Flow

1. **User Action**: User confirms declaration and selects files
2. **Validation**: Check declaration confirmation
3. **Authentication**: Get current user
4. **Storage Upload**: Upload file to `client-documents` bucket
5. **Database Record**: Create metadata record with storage path
6. **Rollback on Error**: If database insert fails, remove storage file
7. **UI Update**: Add file to local state and display in UI
8. **Success Notification**: Show success alert

## File View/Download Flow

1. **User Action**: User clicks view button
2. **Path Lookup**: Get storage path from attachment record
3. **Signed URL**: Generate 1-hour signed URL
4. **Open File**: Open in new browser tab

## File Delete Flow

1. **User Action**: User confirms deletion
2. **Storage Delete**: Remove file from storage bucket
3. **Database Delete**: Remove metadata record
4. **UI Update**: Remove from local state
5. **Success Notification**: Show success alert

## Testing Checklist

- [x] Build compiles successfully
- [x] File upload stores files in storage
- [x] Database records created with correct paths
- [x] View button opens files in new tab
- [x] Delete removes both storage file and database record
- [x] Error handling works correctly
- [x] Read-only mode hides delete button
- [x] Multiple files can be uploaded
- [x] File size and type validation works

## Benefits

1. **Functional System**: Files are actually stored and retrievable
2. **Data Integrity**: Storage and database stay in sync
3. **User Control**: View and delete files as needed
4. **Security**: Private storage with controlled access
5. **Maintainability**: Clean, understandable code

## Migration Notes

**No database migration required** - the schema was already correct. This was purely a frontend bug fix.

Existing records without storage paths will need manual cleanup or re-upload, but new uploads will work correctly.
