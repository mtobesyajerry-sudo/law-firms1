import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getComplianceAction, redFlags } from '../data/kycCddData';
import { checkSuspiciousActivity } from '../utils/kycRiskCalculator';
import { useAuth } from '../contexts/AuthContext';
import { fmtDate, fmtDateTime } from '../utils/dateFormat';

export default function KycCddReport({ recordId: propRecordId, onClose }) {
  const { id: paramId } = useParams();
  const recordId = propRecordId || paramId;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [eddDocuments, setEddDocuments] = useState([]);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (user && profile && recordId && !fetchedRef.current) {
      fetchedRef.current = true;
      loadRecord();
    } else if (user === null) {
      setLoading(false);
    }
  }, [recordId, user?.id, profile?.id]);

  const loadRecord = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_clients_decrypted')
        .select('*, organizations(name)')
        .eq('id', recordId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        alert('KYC/CDD record not found');
        navigate('/dashboard');
        return;
      }

      setRecord(data);

      const alerts = checkSuspiciousActivity({
        policy_information: data.policy_information,
        source_of_funds: data.source_of_funds,
        ongoing_monitoring: data.ongoing_monitoring,
        suspicious_indicators: data.suspicious_indicators
      });
      setSuspiciousAlerts(alerts);

      // Load EDD documents
      const { data: eddDocs, error: eddError } = await supabase
        .from('edd_documents')
        .select(`
          *,
          document_type:edd_document_types(*)
        `)
        .eq('client_id', recordId)
        .order('created_at', { ascending: false });

      if (!eddError && eddDocs) {
        setEddDocuments(eddDocs);
      }
    } catch (error) {
      console.error('Error loading KYC record:', error);
      alert('Failed to load KYC record');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApprovalAction = (action) => {
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();

      const updateData = {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      };

      if (approvalAction === 'reject') {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('kyc_clients')
        .update(updateData)
        .eq('id', recordId);

      if (error) throw error;

      alert(`KYC record ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      setShowApprovalModal(false);

      if (onClose) {
        onClose();
      } else {
        navigate('/dashboard/compliance');
      }
    } catch (error) {
      console.error('Error updating KYC record:', error);
      alert('Failed to update KYC record: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = profile && profile.role === 'compliance_officer';

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!record) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Record not found</div>;
  }

  const customerData = record.customer_data || {};
  const policyInfo = record.policy_information || {};
  const sourceOfFunds = record.source_of_funds || {};
  const pepDeclaration = record.pep_declaration || {};
  const riskAssessment = record.risk_assessment || {};
  const complianceApproval = record.compliance_approval || {};

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canApprove && record.onboarding_status === 'pending_approval' && (
            <>
              <button
                onClick={() => handleApprovalAction('approve')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Approve KYC
              </button>
              <button
                onClick={() => handleApprovalAction('reject')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Reject KYC
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Print Report
          </button>
          {onClose ? (
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard/compliance')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px', color: '#2c3e50' }}>
          KYC / CDD Assessment Report
        </h1>
        <p style={{ textAlign: 'center', color: '#7f8c8d', marginBottom: '30px' }}>
          Insurance Customer Due Diligence
        </p>

        <div style={{ borderBottom: '2px solid #3498db', marginBottom: '30px' }}></div>

        <section style={{ marginBottom: '20px', padding: '16px 20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>Organization Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>Organization Name</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{record.organizations?.name || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>Customer Type</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{record.customer_type === 'natural_person' ? 'Natural Person' : 'Legal Entity'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>Record Status</span>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: record.senior_approval_status === 'approved' ? '#d4edda' : record.onboarding_status === 'pending_approval' ? '#fff3cd' : '#f8d7da',
                color: record.senior_approval_status === 'approved' ? '#155724' : record.onboarding_status === 'pending_approval' ? '#856404' : '#721c24',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block',
                width: 'fit-content'
              }}>
                {(record.senior_approval_status || record.onboarding_status || 'draft').replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>Created</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{fmtDate(record.created_at)}</span>
            </div>
          </div>
        </section>

        {record.customer_type === 'natural_person' && (
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Customer Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><strong>Full Name:</strong> {customerData.full_name}</div>
              <div><strong>Nationality:</strong> {customerData.nationality}</div>
              <div><strong>Date of Birth:</strong> {customerData.date_of_birth}</div>
              <div><strong>Occupation:</strong> {customerData.occupation}</div>
              <div><strong>Email:</strong> {customerData.email}</div>
              <div><strong>Telephone:</strong> {customerData.telephone}</div>
            </div>
          </section>
        )}

        {record.customer_type === 'legal_entity' && (
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Company Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><strong>Registered Name:</strong> {customerData.registered_name}</div>
              <div><strong>Registration Number:</strong> {customerData.registration_number}</div>
              <div><strong>Country:</strong> {customerData.country_of_incorporation}</div>
              <div><strong>Nature of Business:</strong> {customerData.nature_of_business}</div>
            </div>
          </section>
        )}

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Policy Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><strong>Policy Type:</strong> {policyInfo.policy_type}</div>
            <div><strong>Policy Number:</strong> {policyInfo.policy_number}</div>
            <div><strong>Premium Amount:</strong> TZS {parseFloat(policyInfo.premium_amount || 0).toLocaleString()}</div>
            <div><strong>Payment Method:</strong> {policyInfo.premium_payment_method}</div>
            <div><strong>Premium Frequency:</strong> {policyInfo.premium_frequency}</div>
            <div><strong>Policy Start Date:</strong> {policyInfo.policy_start_date}</div>
          </div>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Source of Funds</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><strong>Source of Premium:</strong> {sourceOfFunds.source_of_premium}</div>
            <div><strong>Expected Annual Premium:</strong> TZS {parseFloat(sourceOfFunds.expected_annual_premium || 0).toLocaleString()}</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Source of Wealth:</strong> {sourceOfFunds.source_of_wealth}
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>PEP Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <strong>Is PEP:</strong>{' '}
              <span style={{ color: pepDeclaration.is_pep === 'Yes' ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                {pepDeclaration.is_pep || 'No'}
              </span>
            </div>
            <div>
              <strong>Related to PEP:</strong>{' '}
              <span style={{ color: pepDeclaration.related_to_pep === 'Yes' ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                {pepDeclaration.related_to_pep || 'No'}
              </span>
            </div>
            {pepDeclaration.is_pep === 'Yes' && (
              <>
                <div><strong>Position:</strong> {pepDeclaration.pep_position}</div>
                <div><strong>Country:</strong> {pepDeclaration.pep_country}</div>
              </>
            )}
          </div>
        </section>

        <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px solid #3498db' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Risk Assessment Summary</h2>

          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '18px' }}>Overall Risk Level:</strong>
              <span style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: record.risk_level === 'Very High' ? '#dc3545' : record.risk_level === 'High' ? '#fd7e14' : record.risk_level === 'Medium' ? '#ffc107' : '#28a745',
                color: 'white'
              }}>
                {record.risk_level}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>Total Risk Score:</strong>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{record.total_risk_score} / 100</span>
            </div>
            {record.current_dd_level && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                <strong style={{ fontSize: '18px' }}>Due Diligence Level:</strong>
                <span style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: record.current_dd_level === 'enhanced' ? '#dc3545' : record.current_dd_level === 'standard' ? '#ffc107' : '#28a745',
                  color: 'white',
                  textTransform: 'capitalize'
                }}>
                  {record.current_dd_level}
                </span>
              </div>
            )}
            {record.review_frequency && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <strong>Review Frequency:</strong>
                <span style={{ fontSize: '16px', textTransform: 'capitalize' }}>{record.review_frequency.replace('_', ' ')}</span>
              </div>
            )}
            {record.next_review_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <strong>Next Review Date:</strong>
                <span style={{ fontSize: '16px' }}>{fmtDate(record.next_review_date)}</span>
              </div>
            )}
            {record.senior_approval_status && record.senior_approval_status !== 'not_required' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <strong>Senior Approval:</strong>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: record.senior_approval_status === 'approved' ? '#28a745' : record.senior_approval_status === 'rejected' ? '#dc3545' : '#ffc107',
                  color: 'white',
                  textTransform: 'capitalize'
                }}>
                  {record.senior_approval_status.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Customer Risk:</strong> {riskAssessment.customerRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Geographic Risk:</strong> {riskAssessment.geographicRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Product Risk:</strong> {riskAssessment.productRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Transaction Risk:</strong> {riskAssessment.transactionRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Channel Risk:</strong> {riskAssessment.channelRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Beneficiary Risk:</strong> {riskAssessment.beneficiaryRisk || 0}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>Behavioural Risk:</strong> {riskAssessment.behaviouralRisk || 0}
            </div>
          </div>

          <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '4px', marginBottom: '10px' }}>
            <strong>Enhanced Due Diligence Required:</strong>{' '}
            <span style={{ color: record.enhanced_dd_required ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
              {record.enhanced_dd_required ? 'YES' : 'NO'}
            </span>
          </div>

          <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '4px', marginBottom: '10px' }}>
            <strong>Compliance Action:</strong> {getComplianceAction(record.risk_level)}
          </div>

          <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '4px' }}>
            <strong>Monitoring Frequency:</strong> {record.monitoring_frequency}
          </div>

          {record.next_review_date && (
            <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '4px', marginTop: '10px' }}>
              <strong>Next Review Date:</strong> {fmtDate(record.next_review_date)}
            </div>
          )}
        </section>

        {suspiciousAlerts.length > 0 && (
          <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
            <h2 style={{ color: '#856404', marginBottom: '15px', fontSize: '20px' }}>Suspicious Activity Alerts</h2>
            {suspiciousAlerts.map((alert, index) => (
              <div key={index} style={{
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '4px',
                borderLeft: `4px solid ${alert.severity === 'high' ? '#dc3545' : '#ffc107'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: alert.severity === 'high' ? '#dc3545' : '#ffc107',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '10px'
                  }}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <strong>{alert.message}</strong>
                </div>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>{alert.recommendation}</p>
              </div>
            ))}
          </section>
        )}

        {eddDocuments.length > 0 && (
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>Attached Documents</h2>
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {eddDocuments.map((doc, index) => (
                <div key={doc.id} style={{
                  marginBottom: index < eddDocuments.length - 1 ? '15px' : '0',
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${
                    doc.status === 'completed' ? '#28a745' :
                    doc.status === 'rejected' ? '#dc3545' :
                    doc.status === 'in_progress' ? '#007bff' : '#ffc107'
                  }`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50', marginBottom: '4px' }}>
                        {doc.document_type?.name || 'Document'}
                      </div>
                      {doc.document_type?.description && (
                        <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
                          {doc.document_type.description}
                        </div>
                      )}
                      {doc.document_type?.category && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#e9ecef',
                          color: '#495057',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {doc.document_type.category}
                        </span>
                      )}
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor:
                        doc.status === 'completed' ? '#d4edda' :
                        doc.status === 'rejected' ? '#f8d7da' :
                        doc.status === 'in_progress' ? '#d1ecf1' : '#fff3cd',
                      color:
                        doc.status === 'completed' ? '#155724' :
                        doc.status === 'rejected' ? '#721c24' :
                        doc.status === 'in_progress' ? '#0c5460' : '#856404',
                      textTransform: 'capitalize'
                    }}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>
                  {doc.notes && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '13px' }}>
                      <strong>Notes:</strong> {doc.notes}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d', display: 'flex', gap: '15px' }}>
                    <span>Created: {fmtDate(doc.created_at)}</span>
                    {doc.completed_at && (
                      <span>Completed: {fmtDate(doc.completed_at)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '20px' }}>AML Red Flags Reference</h2>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {redFlags.map((flag, index) => (
                <li key={index} style={{ marginBottom: '8px', color: '#495057' }}>{flag}</li>
              ))}
            </ul>
          </div>
        </section>

        {complianceApproval.mlro_approval && (
          <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px', border: '2px solid #28a745' }}>
            <h2 style={{ color: '#155724', marginBottom: '15px', fontSize: '20px' }}>Compliance Approval</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><strong>MLRO Approval:</strong> {complianceApproval.mlro_approval}</div>
              <div><strong>MLRO Name:</strong> {complianceApproval.mlro_name}</div>
              {complianceApproval.approval_date && (
                <div><strong>Approval Date:</strong> {complianceApproval.approval_date}</div>
              )}
              {complianceApproval.compliance_notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Notes:</strong> {complianceApproval.compliance_notes}
                </div>
              )}
            </div>
          </section>
        )}

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #dee2e6', fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
          <p>This report is generated in accordance with Tanzania AML Act, AML Regulations 2022, and FIU AML/CFT Guidelines to Insurers</p>
          <p>Generated on {fmtDateTime(new Date())}</p>
        </div>
      </div>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>

      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
              {approvalAction === 'approve' ? 'Approve KYC Record' : 'Reject KYC Record'}
            </h2>

            {approvalAction === 'approve' ? (
              <p style={{ marginBottom: '20px', color: '#495057' }}>
                Are you sure you want to approve this KYC/CDD record? This action will mark the customer as verified and approved for business operations.
              </p>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ marginBottom: '10px', color: '#495057' }}>
                  Please provide a reason for rejecting this KYC/CDD record:
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setRejectionReason('');
                }}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: approvalAction === 'approve' ? '#28a745' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Processing...' : approvalAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
