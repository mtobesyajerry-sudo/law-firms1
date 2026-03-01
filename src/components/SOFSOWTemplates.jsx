import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const SOFSOWTemplates = ({ client, onClose, onUpdate, isReadOnly = false }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();

  const templates = [
    {
      id: 'sof',
      name: 'Source of Funds Verification',
      description: 'Document and verify the specific source of funds for this relationship',
      status: client.source_of_funds_verified ? 'completed' : 'pending'
    },
    {
      id: 'sow',
      name: 'Source of Wealth Verification',
      description: 'Document and verify the overall source of wealth and asset accumulation',
      status: client.source_of_wealth_verified ? 'completed' : 'pending'
    }
  ];

  useEffect(() => {
    if (client?.id) {
      loadUploadedDocuments();
    }
  }, [client?.id]);

  const loadUploadedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', client.id)
        .in('document_category', ['financial', 'other'])
        .or('document_type.eq.Source of Funds,document_type.eq.Source of Wealth')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploadedDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (event, documentType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${client.id}_${documentType}_${Date.now()}.${fileExt}`;
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
        document_type: documentType === 'sof' ? 'Source of Funds' : 'Source of Wealth',
        document_category: 'financial',
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

      alert(`${documentType === 'sof' ? 'Source of Funds' : 'Source of Wealth'} document uploaded successfully`);
      await loadUploadedDocuments();
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const markAsCompleted = async (templateId) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates = templateId === 'sof'
        ? {
            source_of_funds_verified: true,
            sof_verification_date: new Date().toISOString(),
            sof_verified_by: user?.id
          }
        : {
            source_of_wealth_verified: true,
            sow_verification_date: new Date().toISOString(),
            sow_verified_by: user?.id
          };

      const { error } = await supabase
        .from('kyc_clients')
        .update(updates)
        .eq('id', client.id);

      if (error) throw error;

      alert(`${templateId === 'sof' ? 'Source of Funds' : 'Source of Wealth'} verified`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating verification status:', error);
      alert('Failed to update verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId) => {
    if (!confirm('Verify this document?')) return;

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
      await loadUploadedDocuments();
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to verify document');
    }
  };

  const handleDeleteDocument = async (documentId, storagePath) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([storagePath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      alert('Document deleted successfully');
      await loadUploadedDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
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

  return (
    <div style={styles.container}>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .template-content {
            page-break-after: always;
          }
          body {
            margin: 0;
            padding: 20px;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }
        }

        .template-content {
          background: white;
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .template-header {
          text-align: center;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .template-title {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
        }

        .form-section {
          margin-bottom: 30px;
        }

        .form-section-title {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-label {
          font-weight: 600;
          margin-bottom: 5px;
          display: block;
        }

        .form-line {
          border-bottom: 1px solid #000;
          min-height: 30px;
          margin-top: 5px;
        }

        .checkbox-group {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-box {
          width: 18px;
          height: 18px;
          border: 2px solid #000;
          display: inline-block;
        }

        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .signature-line {
          border-top: 1px solid #000;
          padding-top: 5px;
          margin-top: 50px;
        }

        .table-simple {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .table-simple th,
        .table-simple td {
          border: 1px solid #000;
          padding: 10px;
          text-align: left;
        }

        .table-simple th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
      `}</style>

      <div className="no-print" style={styles.noPrint}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Source of Funds/Wealth Verification Templates</h2>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.clientName}>Client: {client.client_name}</p>
          <p style={styles.infoText}>
            Select a template below to view, print, or mark as completed
          </p>
        </div>

        <div style={styles.templateGrid}>
          {templates.map((template) => {
            const isSelected = selectedTemplate === template.id;
            return (
              <div
                key={template.id}
                style={{
                  ...styles.templateCard,
                  ...(isSelected ? styles.templateCardSelected : {})
                }}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{template.name}</h3>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(template.status === 'completed'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgePending)
                    }}
                  >
                    {template.status}
                  </span>
                </div>
                <p style={styles.cardDescription}>{template.description}</p>
              </div>
            );
          })}
        </div>

        {selectedTemplate && (
          <>
            <div style={styles.actionButtons}>
              <button onClick={handlePrint} style={styles.printButton}>
                Print Template
              </button>
              {!isReadOnly && (
                <>
                  <label style={styles.uploadButton}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, selectedTemplate)}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </label>
                  <button
                    onClick={() => markAsCompleted(selectedTemplate)}
                    style={styles.completeButton}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Mark as Completed'}
                  </button>
                </>
              )}
            </div>

            {/* Show uploaded documents for this template */}
            {uploadedDocuments.filter(doc =>
              (selectedTemplate === 'sof' && doc.document_type === 'Source of Funds') ||
              (selectedTemplate === 'sow' && doc.document_type === 'Source of Wealth')
            ).length > 0 && (
              <div style={styles.uploadedDocsSection}>
                <h3 style={styles.uploadedDocsTitle}>Uploaded Documents</h3>
                <div style={styles.docsList}>
                  {uploadedDocuments
                    .filter(doc =>
                      (selectedTemplate === 'sof' && doc.document_type === 'Source of Funds') ||
                      (selectedTemplate === 'sow' && doc.document_type === 'Source of Wealth')
                    )
                    .map(doc => (
                      <div key={doc.id} style={styles.docItem}>
                        <div style={styles.docIcon}>📄</div>
                        <div style={styles.docInfo}>
                          <div style={styles.docName}>{doc.document_name}</div>
                          <div style={styles.docMeta}>
                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            {' • '}
                            <span style={{
                              ...styles.verificationBadge,
                              ...(doc.verification_status === 'verified'
                                ? styles.verificationVerified
                                : doc.verification_status === 'rejected'
                                ? styles.verificationRejected
                                : styles.verificationPending)
                            }}>
                              {doc.verification_status || 'pending'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.docActions}>
                          {doc.storage_path && (
                            <>
                              <button
                                onClick={() => handleViewDocument(doc.storage_path)}
                                style={styles.actionButton}
                                title="View Document"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(doc.storage_path, doc.document_name)}
                                style={styles.actionButton}
                                title="Download Document"
                              >
                                ⬇️ Download
                              </button>
                            </>
                          )}
                          {profile?.role === 'staff' && doc.verification_status !== 'verified' && (
                            <button
                              onClick={() => handleVerifyDocument(doc.id)}
                              style={{...styles.actionButton, ...styles.verifyButton}}
                              title="Verify Document"
                            >
                              ✓ Verify
                            </button>
                          )}
                          {profile?.role === 'staff' && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
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
              </div>
            )}
          </>
        )}
      </div>

      {selectedTemplate === 'sof' && (
        <div className="template-content">
          <SourceOfFundsTemplate client={client} />
        </div>
      )}

      {selectedTemplate === 'sow' && (
        <div className="template-content">
          <SourceOfWealthTemplate client={client} />
        </div>
      )}
    </div>
  );
};

const SourceOfFundsTemplate = ({ client }) => (
  <>
    <div className="template-header">
      <div className="template-title">SOURCE OF FUNDS VERIFICATION</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Enhanced Due Diligence Documentation</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client/Applicant Name:</div>
        <div className="form-line">{client.client_name}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Client ID Number:</div>
        <div className="form-line">{client.client_id_number || ''}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Date:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Verification Conducted By:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Definition: Source of Funds</div>
      <p style={{fontSize: '14px', lineHeight: '1.6', marginBottom: '16px'}}>
        Source of Funds refers to the specific origin of the particular funds or assets that are the subject
        of this business relationship. This is distinct from Source of Wealth (which explains overall wealth
        accumulation). SOF verification aims to ensure that funds being used in the business relationship
        originate from legitimate sources.
      </p>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section A: Declared Source of Funds</div>

      <div className="form-field">
        <div className="form-label">
          1. What is the specific source of funds for this transaction/relationship?
        </div>
        <div className="form-line">{client.source_of_funds || ''}</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          2. Estimated amount of funds:
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '10px'}}>
          <div>
            <div style={{fontSize: '13px', marginBottom: '5px'}}>Amount:</div>
            <div className="form-line"></div>
          </div>
          <div>
            <div style={{fontSize: '13px', marginBottom: '5px'}}>Currency:</div>
            <div className="form-line"></div>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          3. Select the category that best describes the source of funds:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Employment Salary/Income</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Business Profits</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Sale of Assets</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Investment Returns</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Loan/Credit</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Inheritance/Gift</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Savings</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other (specify below)</span>
          </div>
        </div>
        <div className="form-line" style={{marginTop: '12px'}}></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section B: Documentary Evidence Reviewed</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>
        Please check all documents reviewed and provide details:
      </p>

      <table className="table-simple">
        <thead>
          <tr>
            <th style={{width: '50%'}}>Document Type</th>
            <th style={{width: '15%'}}>Reviewed</th>
            <th style={{width: '35%'}}>Document Details / Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bank Statements (last 6 months)</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Payslips / Employment Contract</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Business Financial Statements</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Sale Agreement / Property Deed</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Investment Portfolio Statements</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Loan Agreement</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Will/Probate Documents</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Tax Returns</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Other (specify):</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section C: Verification Methods</div>

      <div className="form-field">
        <div className="form-label">
          Verification methods used (check all that apply):
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Document review and authentication</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Third-party verification (bank, employer, etc.)</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Client interview/questionnaire</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Public records search</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Cross-referencing with client profile</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other (describe below)</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Detailed description of verification process:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section D: Verification Findings</div>

      <div className="form-field">
        <div className="form-label">
          1. Is the declared source of funds credible and reasonable?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes - Fully Credible</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partially - Requires Clarification</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No - Not Credible</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          2. Does the source of funds align with the client's profile and stated occupation/business?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes - Consistent</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partially - Some Inconsistencies</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No - Significant Inconsistencies</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          3. Are there any red flags or concerns identified?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Concerns</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Minor Concerns (specify below)</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Significant Concerns (specify below)</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Details of concerns or inconsistencies identified:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          4. If concerns exist, what mitigation measures have been applied?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section E: Verification Decision</div>

      <div className="form-field">
        <div className="form-label" style={{fontSize: '15px', fontWeight: '700'}}>
          Verification Status:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>VERIFIED - Source of Funds Confirmed</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>REQUIRES FURTHER INVESTIGATION</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>REJECTED - Source of Funds Not Acceptable</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Summary and recommendation:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Verified By (Name & Signature)</div>
        </div>
        <div style={{marginTop: '8px', fontSize: '13px'}}>Title: _______________________</div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '2px solid #1e40af', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '12px'}}>Senior Management Approval (Required for High-Risk Clients)</p>
      <div className="form-field">
        <div className="form-label">Approved By:</div>
        <div className="form-line"></div>
      </div>
      <div className="signature-section" style={{marginTop: '16px'}}>
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Senior Manager Signature</div>
          </div>
        </div>
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Date</div>
          </div>
        </div>
      </div>
    </div>
  </>
);

const SourceOfWealthTemplate = ({ client }) => (
  <>
    <div className="template-header">
      <div className="template-title">SOURCE OF WEALTH VERIFICATION</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Enhanced Due Diligence Documentation</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client/Applicant Name:</div>
        <div className="form-line">{client.client_name}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Client ID Number:</div>
        <div className="form-line">{client.client_id_number || ''}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Date:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Verification Conducted By:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Definition: Source of Wealth</div>
      <p style={{fontSize: '14px', lineHeight: '1.6', marginBottom: '16px'}}>
        Source of Wealth refers to the origin of a client's entire body of wealth (i.e., total assets).
        It describes the economic, business, and commercial activities that generated the client's net worth.
        This is broader than Source of Funds and explains how the client accumulated their overall wealth
        over time.
      </p>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section A: Declared Source of Wealth</div>

      <div className="form-field">
        <div className="form-label">
          1. What is the primary source of the client's total wealth and assets?
        </div>
        <div className="form-line">{client.source_of_wealth || ''}</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          2. Estimated total net worth:
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '10px'}}>
          <div>
            <div style={{fontSize: '13px', marginBottom: '5px'}}>Amount:</div>
            <div className="form-line"></div>
          </div>
          <div>
            <div style={{fontSize: '13px', marginBottom: '5px'}}>Currency:</div>
            <div className="form-line"></div>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          3. Select all categories that describe the client's source(s) of wealth:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Employment/Professional Career</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Business Ownership/Entrepreneurship</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Real Estate Investment</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Capital Markets/Investments</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Inheritance/Family Wealth</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Sale of Business</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Pension/Retirement Funds</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other (specify below)</span>
          </div>
        </div>
        <div className="form-line" style={{marginTop: '12px'}}></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section B: Wealth Accumulation Timeline</div>

      <div className="form-field">
        <div className="form-label">
          4. Please describe how the client's wealth was accumulated over time:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          5. Approximate timeframe of wealth accumulation:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>0-5 years</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>5-10 years</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>10-20 years</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>20+ years</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section C: Documentary Evidence Reviewed</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>
        Please check all documents reviewed and provide details:
      </p>

      <table className="table-simple">
        <thead>
          <tr>
            <th style={{width: '50%'}}>Document Type</th>
            <th style={{width: '15%'}}>Reviewed</th>
            <th style={{width: '35%'}}>Document Details / Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Employment History / CV</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Business Registration Documents</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Multi-year Financial Statements</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Property Ownership Records</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Investment Portfolio History</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Tax Returns (multi-year)</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Inheritance Documents / Will</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Business Sale Agreements</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Audit Reports</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Other (specify):</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section D: Verification Process</div>

      <div className="form-field">
        <div className="form-label">
          6. For business owners - provide business details:
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Business Name:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Nature of Business:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Years in Operation:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Ownership Percentage:</div>
          <div className="form-line"></div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          7. For employed individuals - employment details:
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Employer Name:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Position/Title:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Years of Employment:</div>
          <div className="form-line"></div>
        </div>
        <div style={{marginTop: '10px'}}>
          <div style={{fontSize: '13px', marginBottom: '5px'}}>Annual Salary Range:</div>
          <div className="form-line"></div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          8. Third-party verification conducted:
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Employer verification</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Business registration verification (BRELA)</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Property registry search</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Professional body verification</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Credit bureau check</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other (describe below)</span>
          </div>
        </div>
        <div className="form-line" style={{marginTop: '12px'}}></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section E: Verification Findings</div>

      <div className="form-field">
        <div className="form-label">
          9. Is the declared source of wealth credible and reasonable?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes - Fully Credible</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partially - Requires Clarification</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No - Not Credible</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          10. Is the wealth accumulation timeline realistic and consistent with the client's profile?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes - Consistent and Realistic</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partially - Some Inconsistencies</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No - Significant Concerns</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          11. Red flags or concerns identified:
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>None - No concerns identified</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Rapid wealth accumulation without clear explanation</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Inconsistent with stated occupation/business</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Insufficient documentation provided</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Unexplained gaps in wealth accumulation story</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other (describe below)</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Details of concerns or inconsistencies identified:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          12. If concerns exist, what mitigation measures have been applied?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section F: Verification Decision</div>

      <div className="form-field">
        <div className="form-label" style={{fontSize: '15px', fontWeight: '700'}}>
          Verification Status:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>VERIFIED - Source of Wealth Confirmed</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>REQUIRES FURTHER INVESTIGATION</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>REJECTED - Source of Wealth Not Acceptable</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Summary and recommendation:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Verified By (Name & Signature)</div>
        </div>
        <div style={{marginTop: '8px', fontSize: '13px'}}>Title: _______________________</div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '2px solid #1e40af', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '12px'}}>Senior Management Approval (Required for High-Risk Clients)</p>
      <div className="form-field">
        <div className="form-label">Approved By:</div>
        <div className="form-line"></div>
      </div>
      <div className="signature-section" style={{marginTop: '16px'}}>
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Senior Manager Signature</div>
          </div>
        </div>
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Date</div>
          </div>
        </div>
      </div>
    </div>
  </>
);

const styles = {
  container: {
    width: '100%',
  },
  noPrint: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  closeButton: {
    padding: '8px 16px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  clientName: {
    fontWeight: '600',
    color: '#1e3a8a',
    margin: '0 0 4px 0',
    fontSize: '15px',
  },
  infoText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  templateCard: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'white',
  },
  templateCardSelected: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
    flex: 1,
  },
  statusBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    marginLeft: '8px',
  },
  statusBadgeCompleted: {
    background: '#d1fae5',
    color: '#065f46',
  },
  statusBadgePending: {
    background: '#fef3c7',
    color: '#92400e',
  },
  cardDescription: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  printButton: {
    padding: '12px 24px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  completeButton: {
    padding: '12px 24px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  uploadButton: {
    padding: '12px 24px',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-block',
  },
  uploadedDocsSection: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  uploadedDocsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  docsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
  },
  docIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
    minWidth: 0,
  },
  docName: {
    fontSize: '14px',
    fontWeight: '500',
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
  verificationBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verificationVerified: {
    background: '#d1fae5',
    color: '#065f46',
  },
  verificationPending: {
    background: '#fef3c7',
    color: '#92400e',
  },
  verificationRejected: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  docActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  actionButton: {
    fontSize: '12px',
    padding: '6px 12px',
    background: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
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
};

export default SOFSOWTemplates;
