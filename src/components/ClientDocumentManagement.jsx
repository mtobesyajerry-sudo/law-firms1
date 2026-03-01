import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  getRequiredDocuments,
  getDocumentCategoryColor
} from '../utils/documentUtils';

export default function ClientDocumentManagement({ client, onUpdate }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    loadDocuments();
  }, [client]);

  const loadDocuments = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const required = await getRequiredDocuments(supabase, client.current_dd_level || 'standard', client.client_type);
      setRequiredDocs(required);

      const { data: uploaded, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          document_types (
            id,
            name,
            code,
            category
          )
        `)
        .eq('client_id', client.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setUploadedDocs(uploaded || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      alert('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleFileUpload = async (event, documentTypeId, documentTypeName, category) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${client.id}_${documentTypeName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `${client.organization_id}/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, fileSize: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const documentRecord = {
        client_id: client.id,
        organization_id: client.organization_id,
        document_type_id: documentTypeId,
        document_type: documentTypeName,
        document_category: category,
        document_name: file.name,
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        mime_type: file.type,
        storage_path: filePath,
        verification_status: 'pending',
        is_mandatory: true,
        is_current: true,
        uploaded_by: user?.id
      };

      console.log('Inserting document record:', documentRecord);

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert(documentRecord);

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      alert(`${documentTypeName} uploaded successfully`);
      await loadDocuments();
      if (onUpdate) {
        await onUpdate();
      }
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (storagePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document: ' + error.message);
    }
  };

  const handleDownloadDocument = async (storagePath, fileName) => {
    try {
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
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document: ' + error.message);
    }
  };

  const handleVerifyDocument = async (documentId) => {
    if (!confirm('Verify this document as compliant?')) return;

    try {
      const { error } = await supabase
        .from('client_documents')
        .update({
          verification_status: 'verified',
          verified_by: user?.id,
          verification_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', documentId);

      if (error) throw error;

      alert('Document verified successfully');
      await loadDocuments();
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to verify document');
    }
  };

  const handleDeleteDocument = async (documentId, storagePath) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([storagePath]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      alert('Document deleted successfully');
      await loadDocuments();
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const getUploadedDocForType = (documentTypeId) => {
    return uploadedDocs.find(doc => doc.document_type_id === documentTypeId);
  };

  if (loading) {
    return <div style={styles.loading}>Loading document requirements...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Required Documents Checklist */}
      <div style={styles.documentsSection}>
        <h3 style={styles.sectionTitle}>
          Required Documents Checklist
          <span style={styles.ddLevelBadge}>
            {client.current_dd_level || 'standard'} DD
          </span>
        </h3>

        {requiredDocs.length > 0 ? (
          <div style={styles.categoriesList}>
            {['identity', 'address', 'corporate', 'ownership', 'financial', 'regulatory', 'other'].map(category => {
              const categoryDocs = requiredDocs.filter(
                req => req.document_types.category === category
              );

              if (categoryDocs.length === 0) return null;

              const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
              const isExpanded = expandedCategories[category];

              return (
                <div key={category} style={styles.categoryItem}>
                  <div
                    style={{
                      ...styles.categoryHeaderCollapsible,
                      background: getDocumentCategoryColor(category)
                    }}
                    onClick={() => toggleCategory(category)}
                  >
                    <div style={styles.categoryHeaderContent}>
                      <span style={styles.categoryName}>{displayCategory}</span>
                      <span style={styles.documentCount}>
                        {categoryDocs.length} {categoryDocs.length === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                    <span style={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={styles.categoryDocumentsExpanded}>
                      {categoryDocs.map(req => {
                        const docType = req.document_types;
                        const description = req.description || docType.description || '';
                        const uploadedDoc = getUploadedDocForType(docType.id);

                        return (
                          <div key={req.id} style={styles.documentItem}>
                            <div style={styles.docItemHeader}>
                              <span style={styles.docItemTitle}>
                                {docType.name}
                              </span>
                              <span style={req.is_mandatory ? styles.requiredBadgeSmall : styles.optionalBadgeSmall}>
                                {req.is_mandatory ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            {description && (
                              <p style={styles.docItemDescription}>
                                {description}
                              </p>
                            )}

                            {uploadedDoc ? (
                              <div style={styles.uploadedDocSection}>
                                <div style={styles.docInfo}>
                                  <div style={styles.docName}>{uploadedDoc.document_name}</div>
                                  <div style={styles.docMeta}>
                                    Uploaded {new Date(uploadedDoc.uploaded_at).toLocaleDateString()}
                                    {' • '}
                                    <span style={{
                                      ...styles.verificationBadge,
                                      ...(uploadedDoc.verification_status === 'verified'
                                        ? styles.verificationVerified
                                        : uploadedDoc.verification_status === 'rejected'
                                        ? styles.verificationRejected
                                        : styles.verificationPending)
                                    }}>
                                      {uploadedDoc.verification_status || 'pending'}
                                    </span>
                                  </div>
                                </div>
                                <div style={styles.docActions}>
                                  {uploadedDoc.storage_path && (
                                    <>
                                      <button
                                        onClick={() => handleViewDocument(uploadedDoc.storage_path)}
                                        style={styles.actionButton}
                                        title="View Document"
                                      >
                                        👁️ View
                                      </button>
                                      <button
                                        onClick={() => handleDownloadDocument(uploadedDoc.storage_path, uploadedDoc.document_name)}
                                        style={styles.actionButton}
                                        title="Download Document"
                                      >
                                        ⬇️ Download
                                      </button>
                                    </>
                                  )}
                                  {profile?.role === 'staff' && uploadedDoc.verification_status !== 'verified' && (
                                    <button
                                      onClick={() => handleVerifyDocument(uploadedDoc.id)}
                                      style={{...styles.actionButton, ...styles.verifyButton}}
                                      title="Verify Document"
                                    >
                                      ✓ Verify
                                    </button>
                                  )}
                                  {profile?.role === 'staff' && (
                                    <button
                                      onClick={() => handleDeleteDocument(uploadedDoc.id, uploadedDoc.storage_path)}
                                      style={{...styles.actionButton, ...styles.deleteButton}}
                                      title="Delete Document"
                                    >
                                      🗑️ Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={styles.uploadSection}>
                                <label style={styles.uploadLabel}>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(e, docType.id, docType.name, category)}
                                    style={styles.fileInput}
                                    disabled={uploading}
                                  />
                                  <span style={styles.uploadButtonText}>
                                    {uploading ? 'Uploading...' : '📤 Upload Document'}
                                  </span>
                                </label>
                                <span style={styles.fileHint}>PDF, JPG, PNG (max 10MB)</span>
                              </div>
                            )}

                            {docType.validation_rules && (
                              <div style={styles.validationInfoSmall}>
                                <strong>Validation:</strong> {docType.validation_rules}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No document requirements configured for this due diligence level.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  documentsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ddLevelBadge: {
    padding: '4px 12px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'white',
  },
  categoryHeaderCollapsible: {
    padding: '16px 20px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  categoryHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: '700',
  },
  documentCount: {
    fontSize: '13px',
    fontWeight: '500',
    opacity: 0.9,
  },
  expandIcon: {
    fontSize: '14px',
    transition: 'transform 0.2s ease',
  },
  categoryDocumentsExpanded: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: '#fafafa',
    borderTop: '1px solid #e5e7eb',
  },
  documentItem: {
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  docItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },
  docItemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.4',
    flex: 1,
  },
  requiredBadgeSmall: {
    padding: '2px 6px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    flexShrink: 0,
  },
  optionalBadgeSmall: {
    padding: '2px 6px',
    background: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    flexShrink: 0,
  },
  docItemDescription: {
    margin: '0 0 12px 0',
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  validationInfoSmall: {
    marginTop: '12px',
    padding: '8px 12px',
    background: '#e0f2fe',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#0c4a6e',
    lineHeight: '1.4',
  },
  uploadSection: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  uploadLabel: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
  uploadButtonText: {
    display: 'inline-block',
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  fileHint: {
    fontSize: '11px',
    color: '#6b7280',
  },
  uploadedDocSection: {
    marginTop: '12px',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  docInfo: {
    marginBottom: '8px',
  },
  docName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  docMeta: {
    fontSize: '11px',
    color: '#6b7280',
  },
  verificationBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verificationVerified: {
    background: '#d1fae5',
    color: '#065f46',
  },
  verificationRejected: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  verificationPending: {
    background: '#fef3c7',
    color: '#92400e',
  },
  docActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '6px 12px',
    background: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  verifyButton: {
    background: '#10b981',
    color: 'white',
    borderColor: '#10b981',
  },
  deleteButton: {
    background: '#dc2626',
    color: 'white',
    borderColor: '#dc2626',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
};
