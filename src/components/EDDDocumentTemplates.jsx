import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EDDDocumentTemplates = ({ clientId, clientName, onClose, onUpdate, isReadOnly = false }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [eddDocuments, setEddDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [uploadingDocumentType, setUploadingDocumentType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    fetchDocumentTypes();
    fetchEDDDocuments();
  }, [clientId]);

  const fetchDocumentTypes = async () => {
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .not('template_content', 'is', null)
      .in('code', [
        'pep_declaration',
        'edd_questionnaire',
        'public_records_search',
        'senior_approval',
        'monitoring_checklist',
        'pep_assessment',
        'economic_rationale',
        'country_risk_assessment'
      ])
      .order('display_order');

    if (error) {
      console.error('Error fetching document types:', error);
    } else if (data) {
      console.log('Document types loaded:', data);
      setDocumentTypes(data);
    }
    setLoading(false);
  };

  const fetchEDDDocuments = async () => {
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching EDD documents:', error);
    } else if (data) {
      console.log('EDD documents loaded:', data);
      setEddDocuments(data);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const markAsCompleted = async (documentTypeId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const docType = documentTypes.find(dt => dt.id === documentTypeId);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization ID not found');
      }

      const existingDoc = eddDocuments.find(doc => doc.document_type_id === documentTypeId);

      if (existingDoc) {
        const { error: updateError } = await supabase
          .from('client_documents')
          .update({
            verification_status: 'verified',
            verification_date: new Date().toISOString().split('T')[0],
            verified_by: user.id,
            verification_notes: 'Completed via EDD Templates'
          })
          .eq('id', existingDoc.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('client_documents')
          .insert({
            client_id: clientId,
            organization_id: profile.organization_id,
            document_type_id: documentTypeId,
            document_type: docType?.code || 'edd_template',
            document_category: 'other',
            document_name: docType?.name || 'EDD Template',
            verification_status: 'verified',
            verification_date: new Date().toISOString().split('T')[0],
            verified_by: user.id,
            verification_notes: 'Completed via EDD Templates',
            uploaded_by: user.id
          });

        if (insertError) throw insertError;
      }

      console.log('Document type found:', docType);

      if (docType && docType.code === 'senior_approval') {
        console.log('Setting senior approval to approved');
        const { error: clientUpdateError } = await supabase
          .from('kyc_clients')
          .update({ senior_approval_status: 'approved' })
          .eq('id', clientId);

        if (clientUpdateError) {
          console.error('Error updating client:', clientUpdateError);
          throw clientUpdateError;
        }
        console.log('Client senior approval updated successfully');
      }

      await fetchEDDDocuments();

      if (onUpdate) {
        console.log('Calling onUpdate to refresh parent');
        await onUpdate();
      }

      alert(`${docType?.name || 'Document'} completed`);
    } catch (error) {
      console.error('Error marking document as completed:', error);
      alert('Failed to mark document as completed: ' + error.message);
    }
  };

  const getDocumentStatus = (documentTypeId) => {
    const doc = eddDocuments.find(d => d.document_type_id === documentTypeId);
    return doc?.verification_status === 'verified' ? 'completed' : 'pending';
  };

  const handleFileSelect = (e, documentTypeId) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('File size must be less than 10MB');
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only PDF, JPG, JPEG, and PNG files are allowed');
        return;
      }

      setSelectedFile(file);
      setUploadingDocumentType(documentTypeId);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadingDocumentType) return;

    try {
      setUploadError('');
      setUploadSuccess('');

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization ID not found');
      }

      const docType = documentTypes.find(dt => dt.id === uploadingDocumentType);
      const fileName = `${clientId}/${docType.code}_${Date.now()}.${selectedFile.name.split('.').pop()}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      const existingDoc = eddDocuments.find(doc => doc.document_type_id === uploadingDocumentType);

      if (existingDoc) {
        const { error: updateError } = await supabase
          .from('client_documents')
          .update({
            file_name: selectedFile.name,
            file_path: uploadData.path,
            file_url: publicUrl,
            storage_path: fileName,
            mime_type: selectedFile.type,
            file_size: selectedFile.size,
            verification_status: 'pending',
            uploaded_at: new Date().toISOString(),
            uploaded_by: user.id
          })
          .eq('id', existingDoc.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('client_documents')
          .insert({
            client_id: clientId,
            organization_id: profile.organization_id,
            document_type_id: uploadingDocumentType,
            document_type: docType?.code || 'edd_template',
            document_category: 'legal',
            document_name: docType?.name || 'EDD Template',
            file_name: selectedFile.name,
            file_path: uploadData.path,
            file_url: publicUrl,
            storage_path: fileName,
            mime_type: selectedFile.type,
            file_size: selectedFile.size,
            verification_status: 'pending',
            uploaded_at: new Date().toISOString(),
            uploaded_by: user.id
          });

        if (insertError) throw insertError;
      }

      setUploadSuccess(`${docType?.name} uploaded successfully!`);
      setSelectedFile(null);
      setUploadingDocumentType(null);

      await fetchEDDDocuments();
      if (onUpdate) await onUpdate();

      setTimeout(() => setUploadSuccess(''), 5000);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError('Failed to upload document: ' + error.message);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading templates...</div>;
  }

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
          <h2 style={styles.headerTitle}>Enhanced Due Diligence Templates</h2>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.clientName}>Client: {clientName}</p>
          <p style={styles.infoText}>
            Upload completed EDD templates or select a template below to view and print
          </p>
        </div>

        {!isReadOnly && (
          <div style={styles.uploadSection}>
            <div style={styles.uploadHeader}>
              <h3 style={styles.uploadTitle}>📤 Upload Completed EDD Templates</h3>
              <button
                onClick={() => setShowUploadSection(!showUploadSection)}
                style={styles.toggleButton}
              >
                {showUploadSection ? 'Hide' : 'Show'}
              </button>
            </div>

            {showUploadSection && (
              <div style={styles.uploadContent}>
                {uploadSuccess && (
                  <div style={styles.successMessage}>
                    ✓ {uploadSuccess}
                  </div>
                )}

                {uploadError && (
                  <div style={styles.errorMessage}>
                    ✗ {uploadError}
                  </div>
                )}

                <div style={styles.uploadGrid}>
                  {documentTypes.map((docType) => {
                    const status = getDocumentStatus(docType.id);
                    const hasDocument = eddDocuments.find(d => d.document_type_id === docType.id && d.file_url);

                    return (
                      <div key={docType.id} style={styles.uploadCard}>
                        <div style={styles.uploadCardHeader}>
                          <span style={styles.uploadCardTitle}>{docType.name}</span>
                          {hasDocument && (
                            <span style={styles.uploadedBadge}>✓ Uploaded</span>
                          )}
                        </div>

                        <div style={styles.uploadCardBody}>
                          <input
                            type="file"
                            id={`file-${docType.id}`}
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect(e, docType.id)}
                            style={{ display: 'none' }}
                          />

                          <label
                            htmlFor={`file-${docType.id}`}
                            style={styles.fileSelectButton}
                          >
                            Choose File
                          </label>

                          {uploadingDocumentType === docType.id && selectedFile && (
                            <div style={styles.selectedFile}>
                              <span style={styles.fileName}>{selectedFile.name}</span>
                              <button
                                onClick={handleUpload}
                                style={styles.uploadButton}
                              >
                                Upload
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={styles.templateGrid}>
          {documentTypes.map((docType) => {
            const status = getDocumentStatus(docType.id);
            const isSelected = selectedTemplate === docType.id;
            return (
              <div
                key={docType.id}
                style={{
                  ...styles.templateCard,
                  ...(isSelected ? styles.templateCardSelected : {})
                }}
                onClick={() => setSelectedTemplate(docType.id)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{docType.name}</h3>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(status === 'completed' || status === 'reviewed' || status === 'approved'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgePending)
                    }}
                  >
                    {status}
                  </span>
                </div>
                <p style={styles.cardDescription}>{docType.description}</p>
              </div>
            );
          })}
        </div>

        {selectedTemplate && (
          <div style={styles.actionButtons}>
            <button onClick={handlePrint} style={styles.printButton}>
              Print Template
            </button>
            {!isReadOnly && (
              <button
                onClick={() => markAsCompleted(selectedTemplate)}
                style={styles.completeButton}
              >
                Mark as Completed
              </button>
            )}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="template-content">
          {selectedTemplate === documentTypes.find(dt => dt.code === 'pep_declaration')?.id && (
            <PEPDeclarationTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'edd_questionnaire')?.id && (
            <EnhancedDDQuestionnaireTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'public_records_search')?.id && (
            <PublicRecordsSearchTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'senior_approval')?.id && (
            <SeniorManagementApprovalTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'monitoring_checklist')?.id && (
            <OngoingMonitoringChecklistTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'pep_assessment')?.id && (
            <PEPAssessmentFormTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'economic_rationale')?.id && (
            <TransactionEconomicRationaleTemplate clientName={clientName} />
          )}
          {selectedTemplate === documentTypes.find(dt => dt.code === 'country_risk_assessment')?.id && (
            <CountryRiskAssessmentTemplate clientName={clientName} />
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  loading: {
    textAlign: 'center',
    padding: '32px',
    color: '#6b7280',
    fontSize: '16px',
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
  uploadSection: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  uploadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  uploadTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  toggleButton: {
    padding: '6px 12px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  uploadContent: {
    padding: '16px',
  },
  uploadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
  },
  uploadCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    background: '#fafafa',
  },
  uploadCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  uploadCardTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  uploadedBadge: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '4px',
    background: '#d1fae5',
    color: '#065f46',
    fontWeight: '600',
  },
  uploadCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileSelectButton: {
    display: 'inline-block',
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    textAlign: 'center',
    transition: 'background 0.2s',
  },
  selectedFile: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '8px',
    background: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
  },
  fileName: {
    fontSize: '12px',
    color: '#1e40af',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  uploadButton: {
    padding: '6px 12px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  successMessage: {
    padding: '12px',
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    fontWeight: '500',
  },
  errorMessage: {
    padding: '12px',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    fontWeight: '500',
  },
};

const PEPDeclarationTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">POLITICALLY EXPOSED PERSON (PEP) DECLARATION</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Anti-Money Laundering Compliance</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Full Name of Client/Applicant:</div>
        <div className="form-line">{clientName}</div>
      </div>

      <div className="form-field">
        <div className="form-label">Date of Birth:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">National ID / Passport Number:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Definition of Politically Exposed Person (PEP)</div>
      <p style={{fontSize: '14px', marginBottom: '16px'}}>
        A PEP is an individual who is or has been entrusted with a prominent public function,
        including their immediate family members and known close associates. This includes but
        is not limited to:
      </p>
      <ul style={{marginLeft: '24px', fontSize: '14px', lineHeight: '1.8'}}>
        <li>Heads of state, government ministers, senior politicians</li>
        <li>Senior government, judicial or military officials</li>
        <li>Senior executives of state-owned corporations</li>
        <li>Important political party officials</li>
        <li>Family members (spouse, parents, children, siblings)</li>
        <li>Known close associates</li>
      </ul>
    </div>

    <div className="form-section">
      <div className="form-section-title">Declaration</div>

      <div className="form-field">
        <div className="form-label">
          1. Are you currently, or have you been within the last 12 months, a Politically Exposed Person?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          If YES, please specify the position held:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          2. Are you an immediate family member of a PEP?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          If YES, please specify relationship and PEP's position:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          3. Are you a known close associate of a PEP?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          If YES, please specify nature of association:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Declaration Statement</div>
      <p style={{fontSize: '14px', marginBottom: '16px'}}>
        I hereby declare that the information provided above is true, accurate, and complete to the
        best of my knowledge. I understand that providing false information may result in the
        termination of the business relationship and may constitute a criminal offense. I undertake
        to inform you immediately of any changes to my PEP status.
      </p>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Client Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>For Official Use Only</p>
      <div className="form-field">
        <div className="form-label">PEP Screening Conducted By:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Verification Results:</div>
        <div className="form-line"></div>
      </div>
      <div className="signature-section">
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Compliance Officer Signature</div>
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

const EnhancedDDQuestionnaireTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">ENHANCED DUE DILIGENCE QUESTIONNAIRE</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Comprehensive Client Profile Assessment</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Date:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section A: Source of Wealth</div>

      <div className="form-field">
        <div className="form-label">
          1. Please describe in detail the origin of your total net worth and assets:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          2. What is/was your primary occupation or business activity?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          3. How long have you been engaged in this occupation/business?
        </div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          4. What is your estimated annual income? (Please specify currency)
        </div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          5. Do you have other sources of income? If yes, please specify:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Inheritance</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Investments</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Real Estate</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other</span>
          </div>
        </div>
        <div className="form-line" style={{marginTop: '8px'}}></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section B: Source of Funds</div>

      <div className="form-field">
        <div className="form-label">
          6. What is the specific source of funds for this transaction/relationship?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          7. Please provide supporting documentation for the source of funds:
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Bank Statements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Sale Agreements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Investment Records</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section C: Purpose of Relationship</div>

      <div className="form-field">
        <div className="form-label">
          8. What is the purpose of establishing this business relationship?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          9. What is the intended nature and level of transactions?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          10. Expected transaction volume (monthly):
        </div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section D: International Connections</div>

      <div className="form-field">
        <div className="form-label">
          11. Do you have business or financial connections with other countries?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">
          If YES, please list countries and nature of connections:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Declaration</div>
      <p style={{fontSize: '14px', marginBottom: '16px'}}>
        I hereby declare that all information provided in this questionnaire is true, accurate,
        and complete. I understand that this information is required for compliance with
        anti-money laundering regulations and I consent to verification of this information.
      </p>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Client Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>For Official Use Only</p>
      <div className="form-field">
        <div className="form-label">Interviewed By:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Additional Notes/Observations:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>
  </>
);

const PublicRecordsSearchTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">PUBLIC RECORDS SEARCH RESULTS</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Enhanced Due Diligence Verification</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Subject Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Search Conducted By:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Date of Search:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Search Sources</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>Please check all sources searched and document results below:</p>

      <table className="table-simple">
        <thead>
          <tr>
            <th style={{width: '40%'}}>Source</th>
            <th style={{width: '20%'}}>Searched</th>
            <th style={{width: '40%'}}>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BRELA (Business Registration Tanzania)</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>World-Check / PEP Database</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Google / Internet Search</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Court Records</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Land Registry</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Credit Bureau</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Adverse Media Search</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
          <tr>
            <td>Sanctions Lists (OFAC, UN, EU)</td>
            <td><span className="checkbox-box"></span></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Detailed Findings</div>

      <div className="form-field">
        <div className="form-label">1. PEP Screening Results:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Match Found</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Potential Match</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Confirmed Match</span>
          </div>
        </div>
        <div className="form-label" style={{marginTop: '12px'}}>Details:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">2. Adverse Media Findings:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>None Found</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Findings Identified</span>
          </div>
        </div>
        <div className="form-label" style={{marginTop: '12px'}}>Details:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">3. Sanctions List Screening:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Match</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Potential Match</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Confirmed Match</span>
          </div>
        </div>
        <div className="form-label" style={{marginTop: '12px'}}>Details:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">4. Business Registration Verification:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">5. Additional Findings:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Overall Assessment</div>

      <div className="form-field">
        <div className="form-label">Risk Assessment Based on Public Records:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Concerns Identified</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Minor Concerns - Manageable</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Significant Concerns - Further Investigation Required</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Summary and Recommendations:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Compliance Officer Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '24px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600'}}>Attachments:</p>
      <p>□ Copies of search results</p>
      <p>□ Screenshots of relevant findings</p>
      <p>□ Printed documentation from databases</p>
    </div>
  </>
);

const SeniorManagementApprovalTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">SENIOR MANAGEMENT APPROVAL</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>High-Risk Client Onboarding Authorization</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client/Applicant Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Date of Application:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Prepared By (Compliance Officer):</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Executive Summary</div>

      <div className="form-field">
        <div className="form-label">Type of Service/Relationship Requested:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Risk Classification:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>High Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Very High Risk</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Risk Factors Identified</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>Please check all applicable risk factors:</p>

      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Politically Exposed Person (PEP)</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>High-Risk Jurisdiction Connection</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Complex Ownership Structure</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Cash-Intensive Business</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Unusual Transaction Patterns Expected</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Limited Information Available</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>High-Value Transactions</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Other (specify below)</span>
        </div>
      </div>

      <div className="form-field" style={{marginTop: '16px'}}>
        <div className="form-label">Additional Risk Factors:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Due Diligence Completed</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>Confirm completion of the following:</p>

      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Identity Verification Documents Obtained</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>PEP Declaration Completed</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Enhanced DD Questionnaire Completed</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Source of Wealth Verified</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Source of Funds Verified</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Public Records Search Completed</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Adverse Media Check Completed</span>
        </div>
        <div className="checkbox-item">
          <span className="checkbox-box"></span>
          <span style={{fontSize: '14px'}}>Sanctions Screening Completed</span>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Proposed Risk Mitigation Measures</div>

      <div className="form-field">
        <div className="form-label">Enhanced Monitoring Frequency:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Quarterly Review</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Monthly Review</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Transaction-by-Transaction</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Additional Mitigation Measures:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Transaction Limits/Restrictions (if any):</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Compliance Officer Recommendation</div>

      <div className="form-field">
        <div className="form-label">Recommendation:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approve with Enhanced Monitoring</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Reject Application</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Justification:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Compliance Officer Name & Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div className="form-section" style={{marginTop: '32px', borderTop: '2px solid #1e40af', paddingTop: '24px'}}>
      <div className="form-section-title">Senior Management Decision</div>

      <div className="form-field">
        <div className="form-label" style={{fontWeight: '700'}}>Decision:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>APPROVED - Relationship May Proceed</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontWeight: '600'}}>REJECTED - Application Declined</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Comments/Additional Conditions:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px', fontWeight: '600'}}>Senior Manager Name & Signature</div>
        </div>
        <div style={{marginTop: '8px', fontSize: '14px'}}>Title: _______________________</div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px', fontWeight: '600'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '24px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600'}}>File Reference: _______________________</p>
      <p style={{marginTop: '8px'}}>This approval is valid subject to ongoing compliance with the mitigation measures specified above.</p>
    </div>
  </>
);

const OngoingMonitoringChecklistTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">ENHANCED ONGOING MONITORING CHECKLIST</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>High-Risk Client Review Schedule</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Risk Classification:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Review Frequency:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Quarterly</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Monthly</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other: __________</span>
          </div>
        </div>
      </div>
      <div className="form-field">
        <div className="form-label">Responsible Officer:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Monitoring Schedule</div>

      <table className="table-simple">
        <thead>
          <tr>
            <th>Review Period</th>
            <th>Due Date</th>
            <th>Completed Date</th>
            <th>Reviewed By</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q1 / Month 1</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Q2 / Month 2</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Q3 / Month 3</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Q4 / Month 4</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Review Checklist</div>
      <p style={{fontSize: '14px', marginBottom: '12px'}}>Complete the following checks during each review period:</p>

      <div style={{marginBottom: '16px'}}>
        <div style={{fontWeight: '600', marginBottom: '8px'}}>A. Transaction Monitoring</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Review transaction volume and patterns</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Compare actual vs. expected activity</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Identify unusual or suspicious transactions</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Review high-value transactions</span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '16px'}}>
        <div style={{fontWeight: '600', marginBottom: '8px'}}>B. Client Information Updates</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Verify client contact information remains current</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Check for changes in beneficial ownership</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Update business activities/occupation if changed</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Confirm PEP status remains unchanged</span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '16px'}}>
        <div style={{fontWeight: '600', marginBottom: '8px'}}>C. Ongoing Screening</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Re-screen against PEP databases</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Re-screen against sanctions lists</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Conduct adverse media search</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Check for regulatory actions or legal proceedings</span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '16px'}}>
        <div style={{fontWeight: '600', marginBottom: '8px'}}>D. Source of Funds/Wealth Re-verification</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Request updated SOW/SOF documentation (annual)</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Verify consistency with original declarations</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Document any material changes</span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '16px'}}>
        <div style={{fontWeight: '600', marginBottom: '8px'}}>E. Risk Assessment Review</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Re-assess client risk rating</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Identify any new risk factors</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Update risk mitigation measures if needed</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Review Findings</div>

      <div className="form-field">
        <div className="form-label">Date of This Review:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Overall Assessment:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Concerns - Continue Relationship</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Minor Issues - Action Required</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Significant Concerns - Escalate</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Key Findings/Issues Identified:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Actions Taken/Required:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Changes to Risk Rating:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Change</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Increased Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Decreased Risk</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Next Review Due Date:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Reviewed By (Name & Signature)</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '24px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>Escalation Required:</p>
      <div className="checkbox-item">
        <span className="checkbox-box"></span>
        <span>Yes - Escalated to Senior Management on: _______________</span>
      </div>
      <div className="checkbox-item">
        <span className="checkbox-box"></span>
        <span>No - Routine Review Completed</span>
      </div>
    </div>
  </>
);

const PEPAssessmentFormTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">PEP ASSESSMENT FORM</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Comprehensive Risk Assessment for PEP Relationships</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client/Subject Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Assessment Date:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Assessed By (Compliance Officer):</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 1: PEP Classification</div>

      <div className="form-field">
        <div className="form-label">PEP Category:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Foreign PEP</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Domestic PEP</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>International Organization PEP</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Relationship to PEP:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Direct PEP</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Family Member</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Known Close Associate</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Current or Former Position Held:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Period in Office (if former PEP):</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Country/Jurisdiction of PEP Status:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 2: Risk Factors Assessment</div>

      <table className="table-simple">
        <thead>
          <tr>
            <th style={{width: '50%'}}>Risk Factor</th>
            <th style={{width: '15%'}}>Low</th>
            <th style={{width: '15%'}}>Medium</th>
            <th style={{width: '15%'}}>High</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Level of power/influence in current/former position</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Country corruption perception index</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Transparency of source of wealth</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Transparency of source of funds</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Expected transaction volume and complexity</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Involvement in sectors prone to corruption</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Media coverage (adverse or otherwise)</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
          <tr>
            <td>Reputation and public perception</td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
            <td style={{textAlign: 'center'}}><span className="checkbox-box"></span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 3: Source of Wealth and Funds Verification</div>

      <div className="form-field">
        <div className="form-label">Source of Wealth - Summary:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Supporting Documentation Obtained:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Tax Returns</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Salary Statements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Asset Declarations</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Verification Status:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Fully Verified</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partially Verified</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Unable to Verify</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 4: Adverse Information Check</div>

      <div className="form-field">
        <div className="form-label">Adverse Media Findings:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Adverse Information</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Minor Issues</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Significant Concerns</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Details of Adverse Information (if any):</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Client's Explanation/Response:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 5: Overall Risk Assessment</div>

      <div className="form-field">
        <div className="form-label">Overall PEP Risk Rating:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>High Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Very High Risk</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Rationale for Risk Rating:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 6: Mitigation Measures</div>

      <div className="form-field">
        <div className="form-label">Proposed Enhanced Monitoring:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Quarterly Review</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Monthly Review</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Transaction-by-Transaction</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Additional Mitigation Measures:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Transaction Restrictions/Limits:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 7: Recommendation</div>

      <div className="form-field">
        <div className="form-label">Compliance Officer Recommendation:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approve with Enhanced Monitoring</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Reject Relationship</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Requires Further Investigation</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Summary and Justification:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Compliance Officer Name & Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>For Senior Management Approval</p>
      <div className="form-field">
        <div className="form-label">Decision:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approved</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Rejected</span>
          </div>
        </div>
      </div>
      <div className="signature-section">
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Senior Manager Name & Signature</div>
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

const TransactionEconomicRationaleTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">TRANSACTION ECONOMIC RATIONALE STATEMENT</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Explanation of Transaction Purpose and Economic Justification</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Date:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Transaction Reference Number:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 1: Transaction Overview</div>

      <div className="form-field">
        <div className="form-label">Type of Transaction:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Real Estate Purchase/Sale</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Business Investment</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>International Transfer</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Other</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Transaction Amount:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Currency:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Date(s) of Transaction:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Counterparty/Other Party to Transaction:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 2: Economic Purpose and Business Rationale</div>

      <div className="form-field">
        <div className="form-label">
          Please provide a detailed explanation of the economic purpose of this transaction:
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          How does this transaction relate to your business activities or personal circumstances?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          What is the expected benefit or outcome from this transaction?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 3: Source of Funds</div>

      <div className="form-field">
        <div className="form-label">Origin of funds for this specific transaction:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Supporting documentation provided:</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Bank statements showing fund accumulation</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Sale agreements (property, business, assets)</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Loan/financing agreements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Investment liquidation records</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Income/employment records</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other: ___________________________</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 4: Transaction Structure and Flow</div>

      <div className="form-field">
        <div className="form-label">
          Describe the flow of funds (from origin to final destination):
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Are there any intermediary parties or accounts involved?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">If YES, please explain the role and necessity of intermediaries:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Are multiple jurisdictions involved?</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">If YES, list countries and explain why:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 5: Commercial Reasonableness Assessment</div>

      <div className="form-field">
        <div className="form-label">
          Why is this transaction amount appropriate for the stated purpose?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Why is the transaction timing appropriate?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">
          Are there any unusual features of this transaction?
        </div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">If YES, explain:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Client Declaration</div>
      <p style={{fontSize: '14px', marginBottom: '16px'}}>
        I hereby declare that the information provided in this statement is true, accurate, and complete.
        I understand that this information is required for AML/CFT compliance purposes and that providing
        false or misleading information may result in termination of the business relationship and may
        constitute a criminal offense.
      </p>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Client Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>For Official Use Only - Compliance Assessment</p>
      <div className="form-field">
        <div className="form-label">Economic Rationale Assessment:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Clear and Reasonable</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Acceptable with Clarifications</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Unclear or Questionable</span>
          </div>
        </div>
      </div>
      <div className="form-field">
        <div className="form-label">Compliance Officer Comments:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
      <div className="signature-section">
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Compliance Officer Signature</div>
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

const CountryRiskAssessmentTemplate = ({ clientName }) => (
  <>
    <div className="template-header">
      <div className="template-title">COUNTRY RISK ASSESSMENT</div>
      <div style={{fontSize: '14px', color: '#6b7280'}}>Risk Evaluation for High-Risk Jurisdiction Involvement</div>
    </div>

    <div className="form-section">
      <div className="form-field">
        <div className="form-label">Client Name:</div>
        <div className="form-line">{clientName}</div>
      </div>
      <div className="form-field">
        <div className="form-label">Assessment Date:</div>
        <div className="form-line"></div>
      </div>
      <div className="form-field">
        <div className="form-label">Assessed By:</div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 1: Jurisdiction Identification</div>

      <div className="form-field">
        <div className="form-label">Country/Jurisdiction of Concern:</div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Nature of Connection:</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Client nationality/citizenship</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Client residence</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Business operations/activities</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Transaction destination/origin</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Counterparty location</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Ownership/beneficial owner location</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other: ___________________________</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Details of Connection:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 2: Country Risk Profile</div>

      <table className="table-simple">
        <thead>
          <tr>
            <th style={{width: '50%'}}>Risk Indicator</th>
            <th style={{width: '50%'}}>Assessment/Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{fontWeight: '600'}}>AML/CFT Regime</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>FATF Member Status</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Listed as High-Risk Jurisdiction (FATF)</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Subject to Enhanced Monitoring (FATF)</td>
            <td></td>
          </tr>
          <tr>
            <td style={{fontWeight: '600'}}>Corruption Levels</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Transparency International CPI Score</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Corruption perception level</td>
            <td></td>
          </tr>
          <tr>
            <td style={{fontWeight: '600'}}>Sanctions Status</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>UN Sanctions</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>US OFAC Sanctions</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>EU Sanctions</td>
            <td></td>
          </tr>
          <tr>
            <td style={{fontWeight: '600'}}>Banking Secrecy</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Tax haven designation</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Level of banking transparency</td>
            <td></td>
          </tr>
          <tr>
            <td style={{fontWeight: '600'}}>Geopolitical Stability</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Political stability</td>
            <td></td>
          </tr>
          <tr>
            <td style={{paddingLeft: '20px', fontSize: '13px'}}>Armed conflict or terrorism concerns</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 3: Specific Risk Factors</div>

      <div className="form-field">
        <div className="form-label">Known typologies or money laundering methods in this jurisdiction:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Relevant predicate offenses common in this jurisdiction:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Recent adverse news or developments:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Regulatory enforcement effectiveness:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Strong</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Moderate</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Weak</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Unknown</span>
          </div>
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 4: Client-Specific Context</div>

      <div className="form-field">
        <div className="form-label">
          How does the client's involvement with this jurisdiction relate to their business/activities?
        </div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Is the involvement legitimate and economically justified?</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Yes - Clearly Justified</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Partly - Some Concerns</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No - Questionable</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Explanation:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>

      <div className="form-field">
        <div className="form-label">Frequency and value of transactions involving this jurisdiction:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 5: Risk Rating and Mitigation</div>

      <div className="form-field">
        <div className="form-label">Country Risk Level:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Low Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Medium Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>High Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Prohibited</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Impact on Overall Client Risk Rating:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>No Change Required</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Increase to High Risk</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Increase to Very High Risk</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Recommended Enhanced Due Diligence Measures:</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px'}}>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Enhanced source of wealth/funds verification</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Senior management approval for transactions</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Transaction-by-transaction monitoring</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Obtain detailed purpose/rationale statements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Limit transaction amounts or frequency</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Additional documentation requirements</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>More frequent periodic reviews</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span style={{fontSize: '14px'}}>Other: ___________________________</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Additional Comments and Recommendations:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="form-section">
      <div className="form-section-title">Section 6: Decision</div>

      <div className="form-field">
        <div className="form-label">Relationship/Transaction Decision:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approve with Enhanced Monitoring</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approve with Restrictions</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Reject</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label">Justification:</div>
        <div className="form-line"></div>
        <div className="form-line"></div>
        <div className="form-line"></div>
      </div>
    </div>

    <div className="signature-section">
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Compliance Officer Name & Signature</div>
        </div>
      </div>
      <div>
        <div className="signature-line">
          <div style={{fontSize: '14px'}}>Date</div>
        </div>
      </div>
    </div>

    <div style={{marginTop: '32px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
      <p style={{fontWeight: '600', marginBottom: '8px'}}>Senior Management Review (Required for High Risk Countries)</p>
      <div className="form-field">
        <div className="form-label">Approved/Rejected:</div>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Approved</span>
          </div>
          <div className="checkbox-item">
            <span className="checkbox-box"></span>
            <span>Rejected</span>
          </div>
        </div>
      </div>
      <div className="form-field">
        <div className="form-label">Comments:</div>
        <div className="form-line"></div>
      </div>
      <div className="signature-section">
        <div>
          <div className="signature-line">
            <div style={{fontSize: '14px'}}>Senior Manager Name & Signature</div>
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

export default EDDDocumentTemplates;
