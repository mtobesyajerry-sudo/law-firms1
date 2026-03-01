# Document System Quick Start Guide

## For Staff Users

### Uploading Documents

1. Navigate to a client's details page
2. Click the "Documents" or "EDD Templates" tab
3. In the "Upload New Document" section:
   - Select document type from dropdown
   - Click "Choose File" and select your file
   - Click "Upload Document"
4. Document will appear in the list below with "Pending" status

### Verifying Documents

1. Find the document in the "Uploaded Documents" list
2. Click "👁️ View" to review the document
3. If acceptable:
   - Click "✓ Verify" button (green)
4. If not acceptable:
   - Click "✗ Reject" button (red)
5. Status badge will update immediately

### Viewing Documents

1. Click "👁️ View" on any document
2. Document opens in new browser tab
3. Works for all document types (PDF, images, etc.)

### Downloading Documents

1. Click "⬇️ Download" on any document
2. File saves to your computer
3. Original filename is preserved

### Deleting Documents

1. Click "🗑️ Delete" on the document
2. Confirm the deletion
3. Document is removed from database and storage
4. This action is permanent

## Document Status Badges

- **Pending** (Yellow) - Awaiting staff review
- **Verified** (Green) - Approved by staff
- **Rejected** (Red) - Rejected, needs replacement

## Supported File Types

- PDF documents (.pdf)
- Images (.jpg, .jpeg, .png)
- Word documents (.doc, .docx)
- Maximum size: 50MB per file

## Document Categories

Documents are organized by category:
- **Identity** - Passports, national IDs, etc.
- **Address** - Utility bills, bank statements
- **Corporate** - Articles of incorporation, certificates
- **Ownership** - Beneficial ownership documents
- **Financial** - Financial statements, bank references
- **Regulatory** - Licenses, permits, certifications
- **Other** - Miscellaneous documents

## Where Documents Are Stored

- Database: `client_documents` table
- Storage: `client-documents` bucket in Supabase Storage
- All documents linked to clients and organizations

## Access Control

### Staff Can:
- Upload documents
- Verify documents
- Reject documents
- View documents
- Download documents
- Delete documents

### Client Users Can:
- View their organization's documents
- Download their organization's documents

### Management/Compliance Can:
- View all documents in their organization
- Verify/reject documents
- All staff capabilities

## Best Practices

1. **Review before verifying** - Always view the document first
2. **Use correct document type** - Select the appropriate category
3. **Add verification notes** - Optional but helpful for audit trail
4. **Delete carefully** - Deletion is permanent
5. **Verify promptly** - Don't leave documents in "Pending" status too long

## Troubleshooting

### Upload fails
- Check file size (max 50MB)
- Verify file type is supported
- Ensure you have staff role

### Can't view document
- Check your internet connection
- Refresh the page
- Document may have been deleted

### Can't verify/delete
- Ensure you have staff/compliance officer role
- Check you're in the correct organization

## Technical Details

**Component:** `UnifiedDocumentManager.jsx`

**Database Table:** `client_documents`

**Storage Bucket:** `client-documents`

**Migration:** `consolidate_document_system_unified.sql`

## Support

For issues or questions about the document system:
1. Check this guide first
2. Verify your role and permissions
3. Contact system administrator if problems persist
