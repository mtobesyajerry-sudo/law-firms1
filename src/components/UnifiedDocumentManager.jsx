import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function UnifiedDocumentManager({ clientId, clientName, onClose }) {
  const { profile } = useAuth();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is staff (can upload, verify, delete)
  const isStaff = profile?.role === 'staff' || profile?.role === 'compliance_officer' || profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load client info
      const { data: clientData, error: clientError } = await supabase
        .from('kyc_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Load document types
      const { data: typesData, error: typesError } = await supabase
        .from('document_types')
        .select('*')
        .order('display_order');

      if (typesError) throw typesError;
      setDocumentTypes(typesData || []);

      // Load existing documents
      await loadDocuments();

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          document_types (
            id,
            name,
            code,
            category
          ),
          verified_by_user:user_profiles!client_documents_verified_by_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, PNG, and Word documents are allowed');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentTypeId) {
      setError('Please select both a document type and a file');
      return;
    }

    if (!isStaff) {
      setError('Only Staff can upload documents');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get document type info
      const docType = documentTypes.find(dt => dt.id === selectedDocumentTypeId);
      if (!docType) throw new Error('Invalid document type');

      // Create unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}_${docType.code}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365); // 1 year

      // Insert document record
      const { error: insertError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          organization_id: profile.organization_id,
          document_type: docType.name,
          document_type_id: docType.id,
          document_category: docType.category,
          document_name: selectedFile.name,
          file_name: selectedFile.name,
          storage_path: fileName,
          file_url: urlData?.signedUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          verification_status: 'pending',
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setSuccess('Document uploaded successfully');
      setSelectedFile(null);
      setSelectedDocumentTypeId('');

      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

      await loadDocuments();

    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (documentId, status) => {
    if (!isStaff) {
      alert('Only Staff can verify documents');
      return;
    }

    const statusText = status === 'verified' ? 'verify' : 'reject';
    if (!confirm(`Are you sure you want to ${statusText} this document?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('client_documents')
        .update({
          verification_status: status,
          verified_by: user.id,
          verification_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', documentId);

      if (error) throw error;

      alert(`Document ${statusText}ed successfully`);
      await loadDocuments();

    } catch (err) {
      console.error('Error updating document:', err);
      alert('Failed to update document: ' + err.message);
    }
  };

  const handleDelete = async (documentId, storagePath) => {
    if (!isStaff) {
      alert('Only Staff can delete documents');
      return;
    }

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([storagePath]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      alert('Document deleted successfully');
      await loadDocuments();

    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document: ' + err.message);
    }
  };

  const handleView = async (storagePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Failed to view document: ' + err.message);
    }
  };

  const handleDownload = async (storagePath, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(storagePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading documents...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Document Manager</h2>
          <p style={styles.subtitle}>
            Client: {clientName || client?.client_name}
          </p>
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          ✕ Close
        </button>
      </div>

      {/* Upload Section - Staff Only */}
      {isStaff && (
        <div style={styles.uploadSection}>
          <h3 style={styles.sectionTitle}>Upload New Document</h3>

          {error && (
            <div style={styles.errorMessage}>{error}</div>
          )}

          {success && (
            <div style={styles.successMessage}>{success}</div>
          )}

          <div style={styles.uploadForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Document Type</label>
              <select
                value={selectedDocumentTypeId}
                onChange={(e) => setSelectedDocumentTypeId(e.target.value)}
                style={styles.select}
                disabled={uploading}
              >
                <option value="">Select document type...</option>
                {documentTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name} ({dt.category})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select File</label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                style={styles.fileInput}
                disabled={uploading}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {selectedFile && (
                <div style={styles.fileInfo}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedDocumentTypeId || uploading}
              style={{
                ...styles.uploadButton,
                ...((!selectedFile || !selectedDocumentTypeId || uploading) && styles.uploadButtonDisabled)
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div style={styles.documentsSection}>
        <h3 style={styles.sectionTitle}>
          Uploaded Documents ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <div style={styles.emptyState}>
            No documents uploaded yet.
          </div>
        ) : (
          <div style={styles.documentsList}>
            {documents.map(doc => (
              <div key={doc.id} style={styles.documentCard}>
                <div style={styles.documentInfo}>
                  <div style={styles.documentName}>{doc.document_name}</div>
                  <div style={styles.documentMeta}>
                    Type: {doc.document_types?.name || doc.document_type} |
                    Category: {doc.document_types?.category || doc.document_category} |
                    Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div style={styles.documentMeta}>
                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()} {new Date(doc.uploaded_at).toLocaleTimeString()}
                  </div>
                  {doc.verification_date && (
                    <div style={styles.documentMeta}>
                      Verified: {new Date(doc.verification_date).toLocaleDateString()}
                      {doc.verified_by_user && ` by ${doc.verified_by_user.first_name} ${doc.verified_by_user.last_name}`}
                    </div>
                  )}
                </div>

                <div style={styles.documentActions}>
                  {/* Status Badge */}
                  <span style={{
                    ...styles.statusBadge,
                    ...(doc.verification_status === 'verified' ? styles.statusVerified :
                        doc.verification_status === 'rejected' ? styles.statusRejected :
                        styles.statusPending)
                  }}>
                    {doc.verification_status === 'verified' ? 'Verified' :
                     doc.verification_status === 'rejected' ? 'Rejected' :
                     'Pending'}
                  </span>

                  {/* Action Buttons */}
                  <button
                    onClick={() => handleView(doc.storage_path)}
                    style={styles.actionButton}
                    title="View document"
                  >
                    👁️ View
                  </button>

                  <button
                    onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                    style={styles.actionButton}
                    title="Download document"
                  >
                    ⬇️ Download
                  </button>

                  {/* Staff-only actions */}
                  {isStaff && (
                    <>
                      {doc.verification_status !== 'verified' && (
                        <button
                          onClick={() => handleVerify(doc.id, 'verified')}
                          style={styles.verifyButton}
                          title="Verify document"
                        >
                          ✓ Verify
                        </button>
                      )}

                      {doc.verification_status !== 'rejected' && (
                        <button
                          onClick={() => handleVerify(doc.id, 'rejected')}
                          style={styles.rejectButton}
                          title="Reject document"
                        >
                          ✗ Reject
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(doc.id, doc.storage_path)}
                        style={styles.deleteButton}
                        title="Delete document"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#6b7280',
  },
  closeButton: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#374151',
  },
  uploadSection: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  errorMessage: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  successMessage: {
    background: '#d1fae5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  select: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  fileInput: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  fileInfo: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  uploadButton: {
    padding: '12px 24px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  uploadButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  documentsSection: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '14px',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  documentCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
  },
  documentMeta: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  documentActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  statusVerified: {
    background: '#d1fae5',
    color: '#065f46',
  },
  statusRejected: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  statusPending: {
    background: '#fef3c7',
    color: '#92400e',
  },
  actionButton: {
    padding: '6px 12px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#374151',
  },
  verifyButton: {
    padding: '6px 12px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  rejectButton: {
    padding: '6px 12px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    background: '#7f1d1d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
