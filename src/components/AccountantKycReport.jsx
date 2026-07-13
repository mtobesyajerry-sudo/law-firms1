import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { calculateAccountantKycRisk, getMonitoringFrequency, getRiskMitigationAction, calculateNextReviewDate } from '../utils/accountantKycRiskCalculator';
import { accountantKycSections } from '../data/accountantKycData';
import { fmtDate, fmtDateTime, fmtDateTimeLong } from '../utils/dateFormat';

export default function AccountantKycReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (user && profile && id && !fetchedRef.current) {
      fetchedRef.current = true;
      loadRecord();
    } else if (user === null || profile === null) {
      setLoading(false);
    }
  }, [id, user?.id, profile?.id]);

  const loadRecord = async () => {
    try {
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('kyc_clients_decrypted')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error loading KYC record:', error);
        throw error;
      }

      if (!data) {
        alert('KYC/CDD record not found or you do not have permission to view it');
        navigate('/dashboard');
        return;
      }

      setRecord(data);

      const assessment = calculateAccountantKycRisk(data.customer_data || {});
      setRiskAssessment(assessment);
    } catch (err) {
      console.error('Error loading record:', err);
      alert('Error loading KYC/CDD record: ' + err.message);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!confirm('Submit this KYC/CDD record for compliance approval?')) return;

    setSubmitting(true);
    try {
      const nextReview = calculateNextReviewDate(riskAssessment.riskLevel);

      const { error } = await supabase
        .from('kyc_clients')
        .update({
          onboarding_status: 'pending_approval',
          current_risk_rating: riskAssessment.riskLevel,
          base_risk_score: riskAssessment.totalScore,
          edd_required: riskAssessment.riskLevel === 'High Risk' || riskAssessment.riskLevel === 'Very High Risk',
          next_review_date: nextReview
        })
        .eq('id', id);

      if (error) throw error;

      alert('KYC/CDD record submitted for approval successfully!');
      fetchedRef.current = false;
      await loadRecord();
    } catch (err) {
      console.error('Error submitting record:', err);
      alert('Error submitting record: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldValue = (field, value) => {
    if (field.type === 'checkbox') {
      return value ? 'Yes' : 'No';
    }
    if (field.type === 'date' && value) {
      return fmtDate(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || 'Not provided';
  };

  if (loading) {
    return <div style={styles.loading}>Loading KYC/CDD record...</div>;
  }

  if (!record) {
    return <div style={styles.error}>Record not found</div>;
  }

  const formData = record.customer_data || {};

  return (
    <div style={styles.container}>
      <div className="no-print" style={styles.actionBar}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
        <button onClick={() => window.print()} style={styles.printButton}>
          Print Report
        </button>
      </div>

      <div style={styles.reportContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>KYC/CDD Compliance Report</h1>
          <h2 style={styles.subtitle}>Accountants & Auditors Framework</h2>
          <div style={styles.headerInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Client Name:</span>
              <span style={styles.infoValue}>{record.client_name}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Record ID:</span>
              <span style={styles.infoValue}>{record.id}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Created Date:</span>
              <span style={styles.infoValue}>{fmtDateTime(record.created_at)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Status:</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor:
                  record.senior_approval_status === 'approved' ? '#48bb78' :
                  record.senior_approval_status === 'rejected' ? '#f56565' :
                  record.onboarding_status === 'pending_approval' ? '#ed8936' : '#a0aec0'
              }}>
                {(record.senior_approval_status || record.onboarding_status || 'draft').replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {riskAssessment && (
          <div style={styles.riskSummary}>
            <h2 style={styles.sectionTitle}>Risk Assessment Summary</h2>
            <div style={styles.riskGrid}>
              <div style={styles.riskCard}>
                <div style={styles.riskLabel}>Total Risk Score</div>
                <div style={styles.riskValue}>{riskAssessment.totalScore}</div>
              </div>
              <div style={{...styles.riskCard, backgroundColor: riskAssessment.riskColor}}>
                <div style={{...styles.riskLabel, color: 'white'}}>Risk Level</div>
                <div style={{...styles.riskValue, color: 'white'}}>{riskAssessment.riskLevel}</div>
              </div>
              <div style={styles.riskCard}>
                <div style={styles.riskLabel}>Monitoring Frequency</div>
                <div style={styles.riskValue}>{getMonitoringFrequency(riskAssessment.riskLevel)}</div>
              </div>
              <div style={styles.riskCard}>
                <div style={styles.riskLabel}>EDD Required</div>
                <div style={styles.riskValue}>
                  {riskAssessment.riskLevel === 'High Risk' || riskAssessment.riskLevel === 'Very High Risk' ? 'YES' : 'NO'}
                </div>
              </div>
            </div>

            <div style={styles.breakdownSection}>
              <h3 style={styles.subsectionTitle}>Risk Breakdown</h3>
              <div style={styles.breakdownGrid}>
                {Object.entries(riskAssessment.riskBreakdown).map(([key, value]) => (
                  <div key={key} style={styles.breakdownItem}>
                    <span style={styles.breakdownLabel}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </span>
                    <span style={styles.breakdownValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.mitigationSection}>
              <h3 style={styles.subsectionTitle}>Risk Mitigation Actions</h3>
              <div style={styles.mitigationText}>
                {getRiskMitigationAction(riskAssessment.riskLevel)}
              </div>
            </div>
          </div>
        )}

        <div style={styles.content}>
          {accountantKycSections.map((section) => (
            <div key={section.id} style={styles.section}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              {section.description && (
                <p style={styles.sectionDescription}>{section.description}</p>
              )}

              {section.subsections.map((subsection) => (
                <div key={subsection.id} style={styles.subsection}>
                  <h3 style={styles.subsectionTitle}>{subsection.title}</h3>
                  {subsection.description && (
                    <p style={styles.subsectionDescription}>{subsection.description}</p>
                  )}

                  <div style={styles.fieldGrid}>
                    {subsection.fields.map((field) => {
                      const value = formData[field.id];
                      const displayValue = renderFieldValue(field, value);

                      const hasValue = field.type === 'checkbox'
                        ? value === true
                        : value && value !== '';

                      const isHighRisk =
                        (field.id === 'is_pep' && value === 'Yes') ||
                        (field.id === 'un_sanctions_list' && value === 'Yes') ||
                        (field.id === 'financial_crimes_conviction' && value === 'Yes') ||
                        (field.id === 'complex_ownership_structures' && value === 'Yes') ||
                        (field.id === 'managing_client_funds_request' && value === 'Yes');

                      return (
                        <div
                          key={field.id}
                          style={{
                            ...styles.field,
                            backgroundColor: isHighRisk ? '#fff5f5' : hasValue ? '#f7fafc' : '#fafafa',
                            borderLeft: isHighRisk ? '3px solid #f56565' : 'none'
                          }}
                        >
                          <div style={styles.fieldLabel}>
                            {field.label}
                            {field.required && <span style={styles.requiredMark}> *</span>}
                          </div>
                          <div style={{
                            ...styles.fieldValue,
                            color: isHighRisk ? '#c53030' : '#2d3748',
                            fontWeight: isHighRisk ? '600' : '400'
                          }}>
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {record.next_review_date && (
          <div style={styles.reviewSection}>
            <h3 style={styles.subsectionTitle}>Next Review Date</h3>
            <p style={styles.reviewDate}>
              {fmtDate(record.next_review_date)}
            </p>
          </div>
        )}

        {record.senior_approval_status === 'rejected' && record.senior_approval_notes && (
          <div style={styles.rejectionNotice}>
            <h3 style={styles.rejectionTitle}>Rejection Information</h3>
            <p style={styles.rejectionReason}>{record.senior_approval_notes}</p>
            <p style={styles.rejectionDate}>
              Rejected on: {fmtDateTime(record.senior_approval_date)}
            </p>
          </div>
        )}

        {record.senior_approval_status === 'approved' && (
          <div style={styles.approvalNotice}>
            <h3 style={styles.approvalTitle}>Compliance Approval Confirmation</h3>
            <p style={styles.approvalDate}>
              Approved on: {fmtDateTime(record.senior_approval_date)}
            </p>
          </div>
        )}

        {record.onboarding_status === 'draft' && record.created_by === user.id && (
          <div className="no-print" style={styles.actions}>
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Submitting...' : 'Submit for Compliance Approval'}
            </button>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            This report is generated in accordance with Tanzania AML/CFT Act, AML Regulations 2022,
            and FIU Guidelines for Designated Non-Financial Businesses and Professions (DNFBPs).
          </p>
          <p style={styles.footerDate}>
            Report Generated: {fmtDateTimeLong(new Date())}
          </p>
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
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f7fafc'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  backButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4299e1',
    backgroundColor: 'transparent',
    border: '2px solid #4299e1',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  printButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  reportContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: 'white',
    minHeight: 'calc(100vh - 56px)'
  },
  header: {
    marginBottom: '32px',
    padding: '32px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    borderLeft: '4px solid #4299e1'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#718096',
    marginBottom: '24px',
    fontWeight: '600'
  },
  headerInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '20px'
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '18px',
    color: '#718096'
  },
  error: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '18px',
    color: '#e53e3e'
  },
  riskSummary: {
    backgroundColor: '#fffaf0',
    borderRadius: '8px',
    padding: '32px',
    marginBottom: '32px',
    border: '2px solid #ed8936',
    boxShadow: '0 4px 6px rgba(237, 137, 54, 0.1)'
  },
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  riskCard: {
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: '#f7fafc',
    textAlign: 'center'
  },
  riskLabel: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '8px',
    fontWeight: '500'
  },
  riskValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748'
  },
  breakdownSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px'
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px'
  },
  subsectionDescription: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    lineHeight: '1.6',
    fontStyle: 'italic'
  },
  mitigationSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  mitigationText: {
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.6'
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '4px'
  },
  breakdownLabel: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500'
  },
  breakdownValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2d3748'
  },
  content: {
    marginBottom: '32px'
  },
  section: {
    marginBottom: '48px',
    padding: '32px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0'
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '20px',
    lineHeight: '1.6'
  },
  subsection: {
    marginBottom: '24px'
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '16px'
  },
  field: {
    padding: '14px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    border: '1px solid transparent'
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  fieldValue: {
    fontSize: '14px',
    color: '#2d3748',
    wordBreak: 'break-word',
    lineHeight: '1.5'
  },
  requiredMark: {
    color: '#f56565'
  },
  actions: {
    marginTop: '32px',
    textAlign: 'center'
  },
  submitButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px rgba(72, 187, 120, 0.3)'
  },
  reviewSection: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: '#ebf8ff',
    borderRadius: '8px',
    border: '2px solid #4299e1',
    textAlign: 'center'
  },
  reviewDate: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2c5282',
    margin: 0
  },
  footer: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '2px solid #e2e8f0',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '13px',
    color: '#718096',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  footerDate: {
    fontSize: '12px',
    color: '#a0aec0',
    fontStyle: 'italic'
  },
  rejectionNotice: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#fed7d7',
    borderRadius: '8px',
    border: '1px solid #fc8181'
  },
  rejectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#9b2c2c',
    marginBottom: '12px'
  },
  rejectionReason: {
    fontSize: '14px',
    color: '#742a2a',
    marginBottom: '8px',
    lineHeight: '1.6'
  },
  rejectionDate: {
    fontSize: '13px',
    color: '#9b2c2c',
    fontStyle: 'italic'
  },
  approvalNotice: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#c6f6d5',
    borderRadius: '8px',
    border: '1px solid #68d391'
  },
  approvalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#22543d',
    marginBottom: '12px'
  },
  approvalDate: {
    fontSize: '14px',
    color: '#22543d',
    marginBottom: '8px'
  },
  nextReview: {
    fontSize: '14px',
    color: '#22543d',
    fontWeight: '500'
  }
};
