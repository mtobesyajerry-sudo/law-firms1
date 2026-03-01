import React, { useState, useEffect } from 'react';
import { DocumentService } from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';

export default function AssessmentDocumentUpload({
  assessmentId,
  organizationId,
  onUploadComplete = null,
  isReadOnly = false
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentToView, setDocumentToView] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const documentCategories = [
    { value: 'compliance', label: 'AML/CFT Policies & Procedures', color: '#3b82f6' },
    { value: 'risk_assessment', label: 'Internal Risk Assessments', color: '#8b5cf6' },
    { value: 'audit', label: 'Internal Audit Reports', color: '#f59e0b' },
    { value: 'governance', label: 'Governance & Control Documents', color: '#10b981' },
    { value: 'sanctions', label: 'Sanctions Screening Procedures', color: '#ef4444' },
    { value: 'licensing', label: 'Regulatory Licenses & Certifications', color: '#6366f1' },
    { value: 'inspection', label: 'Regulatory Inspection Reports', color: '#eab308' },
    { value: 'evidence', label: 'Supporting Evidence', color: '#6b7280' },
    { value: 'other', label: 'Other Documents', color: '#9ca3af' }
  ];

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentDocuments();
    }
  }, [assessmentId]);

  const loadAssessmentDocuments = async () => {
    try {
      setLoading(true);
      const docs = await DocumentService.getAssessmentDocuments(assessmentId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading assessment documents:', err);
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

  const handleFileUpload = async (event, category) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const validation = await DocumentService.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const result = await DocumentService.uploadAssessmentDocument({
        file: file,
        assessmentId: assessmentId,
        organizationId: organizationId,
        documentCategory: category,
        classification: 'confidential',
        metadata: {
          category: category,
          uploadedFrom: 'Institutional Risk Assessment',
          uploadTimestamp: new Date().toISOString()
        }
      });

      alert('Document uploaded successfully!');
      await loadAssessmentDocuments();

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (documentId) => {
    try {
      const result = await DocumentService.viewDocument(documentId);
      setDocumentToView(result);
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      const url = await DocumentService.downloadDocument(documentId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId);
      alert('Document deleted successfully');
      await loadAssessmentDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  };

  const getDocumentsForCategory = (category) => {
    return documents.filter(doc => doc.secure_document?.document_type === category);
  };

  if (loading) {
    return <div style={styles.loading}>Loading documents...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.documentsSection}>
        <h3 style={styles.sectionTitle}>
          Supporting Documentation
        </h3>

        <div style={styles.infoBox}>
          <div style={styles.infoIcon}>ℹ️</div>
          <div>
            <p style={styles.infoText}>
              Upload supporting documents to strengthen your institutional risk assessment. Documents are organized by category for easy management.
            </p>
          </div>
        </div>

        <div style={styles.categoriesList}>
          {documentCategories.map(category => {
            const categoryDocs = getDocumentsForCategory(category.value);
            const isExpanded = expandedCategories[category.value];

            return (
              <div key={category.value} style={styles.categoryItem}>
                <div
                  style={{
                    ...styles.categoryHeaderCollapsible,
                    background: category.color
                  }}
                  onClick={() => toggleCategory(category.value)}
                >
                  <div style={styles.categoryHeaderContent}>
                    <span style={styles.categoryName}>{category.label}</span>
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
                    {!isReadOnly && (
                      <div style={styles.uploadSection}>
                        <label style={styles.uploadLabel}>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt,.zip"
                            onChange={(e) => handleFileUpload(e, category.value)}
                            style={styles.fileInput}
                            disabled={uploading}
                          />
                          <span style={styles.uploadButtonText}>
                            {uploading ? 'Uploading...' : '📤 Upload Document'}
                          </span>
                        </label>
                        <span style={styles.fileHint}>PDF, JPG, PNG, DOCX, XLSX, TXT, ZIP (max 50MB)</span>
                      </div>
                    )}

                    {categoryDocs.length > 0 ? (
                      <div style={styles.documentsList}>
                        {categoryDocs.map(doc => (
                          <div key={doc.id} style={styles.documentItem}>
                            <div style={styles.docInfo}>
                              <div style={styles.docName}>{doc.file_name}</div>
                              <div style={styles.docMeta}>
                                Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                {' • '}
                                {DocumentService.formatFileSize(doc.file_size)}
                              </div>
                            </div>
                            <div style={styles.docActions}>
                              <button
                                onClick={() => handleViewDocument(doc.secure_document_id)}
                                style={styles.actionButton}
                                title="View Document"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(doc.secure_document_id)}
                                style={styles.actionButton}
                                title="Download Document"
                              >
                                ⬇️ Download
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleDeleteDocument(doc.secure_document_id)}
                                  style={{...styles.actionButton, ...styles.deleteButton}}
                                  title="Delete Document"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyDocuments}>
                        <p style={styles.emptyText}>No documents uploaded in this category yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {documentToView && (
        <div style={styles.modalOverlay} onClick={() => setDocumentToView(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {documentToView.document.document_name}
              </h3>
              <button
                onClick={() => setDocumentToView(null)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              {documentToView.document.mime_type.startsWith('image/') ? (
                <img
                  src={documentToView.url}
                  alt={documentToView.document.document_name}
                  style={styles.modalImage}
                />
              ) : documentToView.document.mime_type === 'application/pdf' ? (
                <iframe
                  src={documentToView.url}
                  style={styles.modalIframe}
                  title={documentToView.document.document_name}
                />
              ) : (
                <div style={styles.modalNoPreview}>
                  <p style={styles.noPreviewText}>Preview not available for this file type</p>
                  <a
                    href={documentToView.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.openNewTabButton}
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
    fontWeight: '600',
  },
  documentsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },
  infoBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  infoIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  infoText: {
    margin: 0,
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.5',
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
  uploadSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '2px dashed #d1d5db',
  },
  uploadLabel: {
    position: 'relative',
    cursor: 'pointer',
    display: 'inline-block',
  },
  fileInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  uploadButtonText: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#3b82f6',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  fileHint: {
    fontSize: '12px',
    color: '#6b7280',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  documentItem: {
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
  },
  docName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  docMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  docActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    background: '#3b82f6',
    color: 'white',
    transition: 'background 0.2s ease',
  },
  deleteButton: {
    background: '#ef4444',
  },
  emptyDocuments: {
    padding: '32px',
    textAlign: 'center',
    background: 'white',
    borderRadius: '8px',
    border: '2px dashed #d1d5db',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxWidth: '80rem',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  modalClose: {
    fontSize: '32px',
    lineHeight: 1,
    border: 'none',
    background: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
  },
  modalBody: {
    padding: '16px',
  },
  modalImage: {
    maxWidth: '100%',
    height: 'auto',
    margin: '0 auto',
    display: 'block',
  },
  modalIframe: {
    width: '100%',
    height: '70vh',
    border: 'none',
  },
  modalNoPreview: {
    textAlign: 'center',
    padding: '32px',
  },
  noPreviewText: {
    color: '#6b7280',
    marginBottom: '16px',
  },
  openNewTabButton: {
    display: 'inline-block',
    background: '#3b82f6',
    color: 'white',
    padding: '8px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
