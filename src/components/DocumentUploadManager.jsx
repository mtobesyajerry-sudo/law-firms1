import React, { useState, useEffect, useRef } from 'react';
import { DocumentService } from '../services/documentService';
import { supabase } from '../supabaseClient';

export default function DocumentUploadManager({
  clientId,
  organizationId,
  mode = 'kyc',
  onUploadComplete = null,
  isReadOnly = false
}) {
  const [client, setClient] = useState(null);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [documentToView, setDocumentToView] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const uploadSectionRef = useRef(null);

  useEffect(() => {
    loadClientAndDocuments();
  }, [clientId]);

  const loadClientAndDocuments = async () => {
    try {
      setLoading(true);

      // Load client to get DD level and client type
      const { data: clientData, error: clientError } = await supabase
        .from('kyc_clients')
        .select('id, client_name, current_dd_level, client_type')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Determine document requirement client type (individual or corporate)
      const docClientType = clientData.client_type === 'individual' ? 'individual' : 'corporate';

      // Load required documents for this DD level and client type
      const { data: requirements, error: reqError } = await supabase
        .from('document_requirements')
        .select(`
          id,
          dd_level,
          client_type,
          is_mandatory,
          description,
          document_type:document_types (
            id,
            name,
            code,
            category,
            description
          )
        `)
        .eq('dd_level', clientData.current_dd_level)
        .eq('client_type', docClientType)
        .order('is_mandatory', { ascending: false });

      if (reqError) throw reqError;
      setRequiredDocuments(requirements || []);

      // Collapse all categories by default - user must click to expand
      const categories = [...new Set(requirements.map(r => r.document_type.category))];
      const expanded = {};
      categories.forEach(cat => expanded[cat] = false);
      setExpandedCategories(expanded);

      // Load uploaded documents
      await loadClientDocuments();

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load document requirements');
    } finally {
      setLoading(false);
    }
  };

  const loadClientDocuments = async () => {
    try {
      const docs = await DocumentService.getClientDocuments(clientId);
      setUploadedDocuments(docs || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const getDocumentStatus = (documentTypeId) => {
    const uploaded = uploadedDocuments.filter(doc => doc.document_type_id === documentTypeId);
    if (uploaded.length === 0) return { status: 'missing', count: 0 };

    const verified = uploaded.filter(doc => doc.verification_status === 'verified');
    if (verified.length > 0) return { status: 'verified', count: uploaded.length };

    const rejected = uploaded.filter(doc => doc.verification_status === 'rejected');
    if (rejected.length > 0) return { status: 'rejected', count: uploaded.length };

    return { status: 'pending', count: uploaded.length };
  };

  const getStatusBadge = (status, isMandatory) => {
    const styles = {
      missing: isMandatory
        ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-gray-100 text-gray-600 border-gray-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      verified: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    const labels = {
      missing: isMandatory ? '⚠️ Required' : 'Optional',
      pending: '⏳ Pending Review',
      verified: '✓ Verified',
      rejected: '✗ Rejected'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentType) {
      setError('Please select a document type and file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');
      setUploadProgress(10);

      const validation = await DocumentService.validateFile(selectedFile);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      setUploadProgress(30);

      const result = await DocumentService.uploadDocument({
        file: selectedFile,
        documentTypeId: selectedDocumentType,
        clientId: clientId,
        organizationId: organizationId,
        classification: 'confidential',
        requiresMFA: true,
        watermarkText: `Client: ${clientId}`,
        metadata: {
          uploadedFrom: 'KYC Client Management',
          uploadTimestamp: new Date().toISOString()
        }
      });

      setUploadProgress(100);
      setSuccess('Document uploaded successfully!');
      setSelectedFile(null);
      setSelectedDocumentType('');

      document.getElementById('file-input').value = '';

      await loadClientDocuments();

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      setTimeout(() => {
        setSuccess('');
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId) => {
    try {
      console.log('Download clicked for document:', documentId);
      const url = await DocumentService.downloadDocument(documentId);
      console.log('Download URL:', url);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert(`Failed to download document: ${err.message}`);
    }
  };

  const handleView = async (documentId) => {
    try {
      console.log('View clicked for document:', documentId);
      const result = await DocumentService.viewDocument(documentId);
      console.log('View result:', result);
      setDocumentToView(result);
    } catch (err) {
      console.error('View error:', err);
      alert(`Failed to view document: ${err.message}`);
    }
  };

  const handleDelete = async (documentId) => {
    console.log('Delete clicked for document:', documentId);
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting document:', documentId);
      await DocumentService.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      await loadClientDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Failed to delete document: ${err.message}`);
    }
  };

  const handleVerify = async (documentId, status) => {
    console.log('Verify clicked for document:', documentId, 'status:', status);
    const notes = prompt(`Enter verification notes (optional):`);

    try {
      console.log('Verifying document:', documentId, 'with status:', status);
      await DocumentService.verifyDocument(documentId, status, notes || '');
      setSuccess(`Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
      await loadClientDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Verification error:', err);
      setError(`Failed to update verification status: ${err.message}`);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatCategoryName = (category) => {
    const categoryNames = {
      'enhanced_dd': 'Enhanced Due Diligence Templates',
      'identity': 'Identity Documents',
      'address': 'Address Verification',
      'corporate': 'Corporate Documents',
      'financial': 'Financial Documents',
      'ownership': 'Ownership & Control',
      'regulatory': 'Regulatory Documents',
      'other': 'Other Documents'
    };
    return categoryNames[category] || category.toUpperCase().replace(/_/g, ' ');
  };

  const handleSelectDocumentType = (documentTypeId) => {
    setSelectedDocumentType(documentTypeId);
    setSelectedFile(null);
    setError('');
    setSuccess('');

    // Scroll to upload section after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (uploadSectionRef.current) {
        uploadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Group requirements by category
  const requirementsByCategory = requiredDocuments.reduce((acc, req) => {
    const category = req.document_type.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(req);
    return acc;
  }, {});

  // Calculate completion stats
  const totalRequired = requiredDocuments.filter(r => r.is_mandatory).length;
  const totalOptional = requiredDocuments.filter(r => !r.is_mandatory).length;
  const completedRequired = requiredDocuments.filter(r => {
    if (!r.is_mandatory) return false;
    const status = getDocumentStatus(r.document_type.id);
    return status.status === 'verified';
  }).length;

  const completionPercentage = totalRequired > 0
    ? Math.round((completedRequired / totalRequired) * 100)
    : 0;

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading document requirements...</div>;
  }

  if (!client) {
    return <div className="text-center py-8 text-gray-500">Client not found</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with completion stats */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>
              Document Checklist for {client.client_name}
            </h2>
            <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
              Due Diligence Level: <strong>{client.current_dd_level?.toUpperCase()}</strong>
            </p>
          </div>
          <div style={{
            background: completionPercentage === 100 ? '#d1fae5' : '#fef3c7',
            color: completionPercentage === 100 ? '#065f46' : '#92400e',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {completionPercentage}% Complete
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '13px',
            color: '#1e40af',
            fontWeight: '500'
          }}>
            <span>Required Documents: {completedRequired} of {totalRequired}</span>
            <span>{completionPercentage}%</span>
          </div>
          <div style={{
            background: '#e0e7ff',
            height: '8px',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#3b82f6',
              height: '100%',
              width: `${completionPercentage}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <div style={{
            background: 'white',
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            padding: '12px 16px',
            flex: 1,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>{totalRequired}</div>
            <div style={{ color: '#6b7280', marginTop: '2px' }}>Required</div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            padding: '12px 16px',
            flex: 1,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>{totalOptional}</div>
            <div style={{ color: '#6b7280', marginTop: '2px' }}>Optional</div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            padding: '12px 16px',
            flex: 1,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>{uploadedDocuments.length}</div>
            <div style={{ color: '#6b7280', marginTop: '2px' }}>Uploaded</div>
          </div>
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            📋 Required Documents by Category
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Click the <strong>"+ Upload Document"</strong> button on any document card below to upload files. Required documents must be uploaded and verified.
          </p>
        </div>

        <div style={{ padding: '16px' }}>
          {Object.entries(requirementsByCategory)
            .sort(([catA], [catB]) => {
              const order = ['identity', 'address', 'corporate', 'financial', 'ownership', 'regulatory', 'enhanced_dd', 'other'];
              const indexA = order.indexOf(catA.toLowerCase());
              const indexB = order.indexOf(catB.toLowerCase());
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            })
            .map(([category, requirements]) => {
            const categoryCompleted = requirements.filter(r => {
              const status = getDocumentStatus(r.document_type.id);
              return status.status === 'verified';
            }).length;

            return (
              <div key={category} style={{
                marginBottom: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: '#f9fafb',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                        {formatCategoryName(category)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {categoryCompleted} of {requirements.length} completed
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: categoryCompleted === requirements.length ? '#065f46' : '#92400e',
                      padding: '4px 10px',
                      background: categoryCompleted === requirements.length ? '#d1fae5' : '#fef3c7',
                      borderRadius: '4px'
                    }}>
                      {Math.round((categoryCompleted / requirements.length) * 100)}%
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      transition: 'transform 0.2s',
                      transform: expandedCategories[category] ? 'rotate(180deg)' : 'rotate(0deg)',
                      display: 'inline-block'
                    }}>
                      ▼
                    </span>
                  </div>
                </button>

                {expandedCategories[category] && (
                  <div style={{
                    padding: '20px',
                    background: 'white',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px'
                  }}>
                    {requirements.map((req) => {
                      const docStatus = getDocumentStatus(req.document_type.id);
                      const docs = uploadedDocuments.filter(d => d.document_type_id === req.document_type.id);

                      return (
                        <div key={req.id} style={{
                          background: 'white',
                          border: `1px solid ${docStatus.status === 'verified' ? '#10b981' : docStatus.status === 'missing' && req.is_mandatory ? '#fca5a5' : '#d1d5db'}`,
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s',
                          position: 'relative',
                          minHeight: '180px'
                        }}>
                          {/* Status indicator badge in top right */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px'
                          }}>
                            {getStatusBadge(docStatus.status, req.is_mandatory)}
                          </div>

                          {/* Document name */}
                          <h4 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '6px',
                            marginRight: '90px',
                            lineHeight: '1.4'
                          }}>
                            {req.document_type.name}
                          </h4>

                          {/* Description */}
                          <p style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '12px',
                            lineHeight: '1.5',
                            flex: 1
                          }}>
                            {req.document_type.description}
                          </p>

                          {/* Upload count */}
                          {docStatus.count > 0 && (
                            <div style={{
                              fontSize: '11px',
                              color: '#6b7280',
                              marginBottom: '10px',
                              padding: '4px 8px',
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              alignSelf: 'flex-start'
                            }}>
                              <span>📎</span>
                              <span>{docStatus.count} document{docStatus.count > 1 ? 's' : ''} uploaded</span>
                            </div>
                          )}

                          {/* Upload button - Hidden for read-only users */}
                          {!isReadOnly && (
                            <button
                              onClick={() => handleSelectDocumentType(req.document_type.id)}
                              style={{
                                padding: '10px 16px',
                                background: selectedDocumentType === req.document_type.id ? '#10b981' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '100%',
                                marginTop: 'auto',
                                boxShadow: selectedDocumentType === req.document_type.id
                                  ? '0 0 0 3px rgba(16, 185, 129, 0.2)'
                                  : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedDocumentType !== req.document_type.id) {
                                  e.target.style.background = '#2563eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = selectedDocumentType === req.document_type.id ? '#10b981' : '#3b82f6';
                              }}
                            >
                              {selectedDocumentType === req.document_type.id ? '✓ Selected - Scroll Down to Upload' : '+ Upload Document'}
                            </button>
                          )}

                          {/* Show uploaded documents for this type */}
                          {docs.length > 0 && (
                            <div style={{
                              marginTop: '16px',
                              paddingTop: '16px',
                              borderTop: '1px solid #e5e7eb'
                            }}>
                              {docs.map(doc => (
                                <div key={doc.id} style={{
                                  padding: '12px',
                                  background: '#f9fafb',
                                  borderRadius: '8px',
                                  marginBottom: '8px',
                                  fontSize: '13px',
                                  border: '1px solid #e5e7eb'
                                }}>
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{
                                      fontWeight: '600',
                                      color: '#111827',
                                      marginBottom: '4px',
                                      wordBreak: 'break-word'
                                    }}>
                                      {DocumentService.getFileIcon(doc.mime_type)} {doc.file_name}
                                    </div>
                                    <div style={{
                                      fontSize: '11px',
                                      color: '#6b7280'
                                    }}>
                                      {DocumentService.formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                  }}>
                                    <button
                                      onClick={() => handleView(doc.secure_document_id)}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#dbeafe',
                                        color: '#1e40af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => handleDownload(doc.secure_document_id)}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Download
                                    </button>
                                    {!isReadOnly && doc.verification_status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleVerify(doc.secure_document_id, 'verified')}
                                          style={{
                                            padding: '6px 12px',
                                            background: '#d1fae5',
                                            color: '#065f46',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          ✓ Verify
                                        </button>
                                        <button
                                          onClick={() => handleVerify(doc.secure_document_id, 'rejected')}
                                          style={{
                                            padding: '6px 12px',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          ✗ Reject
                                        </button>
                                      </>
                                    )}
                                    {!isReadOnly && (
                                      <button
                                        onClick={() => handleDelete(doc.secure_document_id)}
                                        style={{
                                          padding: '6px 12px',
                                          background: '#fee2e2',
                                          color: '#991b1b',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
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
      </div>

      {/* Upload Section - Only shown when a document type is selected and user is not read-only */}
      {selectedDocumentType && !isReadOnly && (
        <div
          ref={uploadSectionRef}
          style={{
            background: 'white',
            borderRadius: '8px',
            border: '2px solid #3b82f6',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
            📤 Upload Document
          </h3>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e40af' }}>
              Selected: {requiredDocuments.find(r => r.document_type.id === selectedDocumentType)?.document_type.name}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Select File *
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
            {selectedFile && (
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                {DocumentService.getFileIcon(selectedFile.type)} {selectedFile.name} ({DocumentService.formatFileSize(selectedFile.size)})
              </p>
            )}
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
              Accepted: PDF, Images, Word, Excel, Text, ZIP. Max: 50MB
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {success}
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{
              width: '100%',
              background: '#e5e7eb',
              borderRadius: '9999px',
              height: '8px',
              marginBottom: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#3b82f6',
                height: '100%',
                width: `${uploadProgress}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                flex: 1,
                background: !selectedFile || uploading ? '#d1d5db' : '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
            <button
              onClick={() => {
                setSelectedDocumentType('');
                setSelectedFile(null);
                setError('');
                setSuccess('');
              }}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {documentToView && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {documentToView.document.document_name}
              </h3>
              <button
                onClick={() => setDocumentToView(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px' }}>
              {documentToView.content && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={documentToView.content}
                    alt="Document preview"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
