import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ClientDocumentManagement from './ClientDocumentManagement';
import SOFSOWTemplates from './SOFSOWTemplates';
import EDDDocumentTemplates from './EDDDocumentTemplates';
import ClientDeclarationForm from './ClientDeclarationForm';
import DocumentUploadManager from './DocumentUploadManager';
import LoadingSpinner from './LoadingSpinner';
import ClientReviewForm from './ClientReviewForm';
import {
  getRiskColor,
  dueDiligenceLevels,
  dueDiligenceLevelInfo,
  getDDLevelRequirements,
  requiresSeniorApproval,
  requiresSourceOfWealth,
  requiresSourceOfFunds,
  requiresSimplifiedJustification,
  getApprovalStatusColor,
  getMonitoringStatusColor,
  getDaysUntilReview,
  isReviewOverdue
} from '../data/kycData';
import { checkEnhancedDDTriggers } from '../utils/documentUtils';
import { isKycComplete } from '../utils/kycCompleteness';

function StandardDDStatusSection({ client }) {
  const getStatusColor = (isCompleted) => {
    return isCompleted
      ? { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✓' }
      : { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '○' };
  };

  const sofStatus = getStatusColor(client.source_of_funds_verified);
  const pendingCount = !client.source_of_funds_verified ? 1 : 0;

  return (
    <div style={unifiedStyles.container}>
      {!client.source_of_funds_verified && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#92400e', fontSize: '13px', marginBottom: '2px' }}>
              Action Required
            </div>
            <div style={{ color: '#78350f', fontSize: '12px' }}>
              Source of Funds verification is required for Standard DD. Complete the SOF template in the SOF/SOW Templates tab.
            </div>
          </div>
        </div>
      )}

      <div style={unifiedStyles.header}>
        <span style={unifiedStyles.headerTitle}>Standard DD Checklist</span>
        {pendingCount > 0 ? (
          <span style={unifiedStyles.pendingBadge}>
            {pendingCount} Pending
          </span>
        ) : (
          <span style={unifiedStyles.completedBadge}>
            All Complete
          </span>
        )}
      </div>

      <div style={unifiedStyles.grid}>
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Core Requirements</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sofStatus.bg,
              color: sofStatus.color,
              borderColor: sofStatus.border
            }}>
              {sofStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Funds</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_funds_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnhancedDDStatusSection({ client, eddDocuments = [] }) {
  const getStatusColor = (isCompleted) => {
    return isCompleted
      ? { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✓' }
      : { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '○' };
  };

  const getEDDDocumentStatus = (documentName) => {
    const doc = eddDocuments.find(d => d.document_type?.name === documentName);
    return doc?.verification_status === 'verified';
  };

  const sofStatus = getStatusColor(client.source_of_funds_verified);
  const sowStatus = getStatusColor(client.source_of_wealth_verified);
  const approvalStatus = getStatusColor(
    client.senior_approval_status === 'approved'
  );
  const pepStatus = getStatusColor(getEDDDocumentStatus('PEP Declaration'));
  const screeningStatus = getStatusColor(getEDDDocumentStatus('Public Records Search'));

  const pendingCount = [
    !client.source_of_funds_verified,
    !client.source_of_wealth_verified,
    client.senior_approval_status !== 'approved',
    !getEDDDocumentStatus('PEP Declaration'),
    !getEDDDocumentStatus('Public Records Search Results')
  ].filter(Boolean).length;

  return (
    <div style={unifiedStyles.container}>
      {(!client.source_of_funds_verified || !client.source_of_wealth_verified) && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#92400e', fontSize: '13px', marginBottom: '2px' }}>
              Action Required
            </div>
            <div style={{ color: '#78350f', fontSize: '12px' }}>
              {!client.source_of_funds_verified && !client.source_of_wealth_verified
                ? 'Source of Funds and Source of Wealth verification are required for Enhanced DD. Complete both templates in the SOF/SOW Templates tab.'
                : !client.source_of_funds_verified
                ? 'Source of Funds verification is required. Complete the SOF template in the SOF/SOW Templates tab.'
                : 'Source of Wealth verification is required. Complete the SOW template in the SOF/SOW Templates tab.'
              }
            </div>
          </div>
        </div>
      )}

      <div style={unifiedStyles.header}>
        <span style={unifiedStyles.headerTitle}>Enhanced DD Checklist</span>
        {pendingCount > 0 ? (
          <span style={unifiedStyles.pendingBadge}>
            {pendingCount} Pending
          </span>
        ) : (
          <span style={unifiedStyles.completedBadge}>
            All Complete
          </span>
        )}
      </div>

      <div style={unifiedStyles.grid}>
        {/* Core Requirements */}
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Core Requirements</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sofStatus.bg,
              color: sofStatus.color,
              borderColor: sofStatus.border
            }}>
              {sofStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Funds</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_funds_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sowStatus.bg,
              color: sowStatus.color,
              borderColor: sowStatus.border
            }}>
              {sowStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Wealth</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_wealth_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: approvalStatus.bg,
              color: approvalStatus.color,
              borderColor: approvalStatus.border
            }}>
              {approvalStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Senior Approval</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.senior_approval_status === 'approved'
                  ? 'Approved'
                  : client.senior_approval_status || 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Screening Requirements */}
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Screening & Monitoring</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: pepStatus.bg,
              color: pepStatus.color,
              borderColor: pepStatus.border
            }}>
              {pepStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>PEP Declaration</div>
              <div style={unifiedStyles.statusSubtext}>
                {getEDDDocumentStatus('PEP Declaration') ? 'Completed' : 'Pending'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: screeningStatus.bg,
              color: screeningStatus.color,
              borderColor: screeningStatus.border
            }}>
              {screeningStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Public Records Screening</div>
              <div style={unifiedStyles.statusSubtext}>
                {getEDDDocumentStatus('Public Records Search') ? 'Completed' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const unifiedStyles = {
  container: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb',
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  pendingBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
  },
  completedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
  },
  statusIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    border: '2px solid',
    flexShrink: 0,
  },
  statusContent: {
    flex: 1,
    minWidth: 0,
  },
  statusLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px',
  },
  statusSubtext: {
    fontSize: '11px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export default function KYCClientDetails() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ddTriggers, setDdTriggers] = useState(null);
  const [eddDocuments, setEddDocuments] = useState([]);
  const [showDeclarationForm, setShowDeclarationForm] = useState(false);
  const [screeningResults, setScreeningResults] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionAlerts, setTransactionAlerts] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [clientReviews, setClientReviews] = useState([]);
  // Read-only access for management and compliance_officer roles
  const isReadOnly = profile?.role === 'management' || profile?.role === 'compliance_officer';
  const isPendingAssessment = client?.client_status === 'prospect' && client?.onboarding_status === 'pending';
  const isAccountantOrg = organization?.dnfbp_category === 'accountant';
  const completenessResult = client && isPendingAssessment
    ? isKycComplete({
        riskFactors:           client.customer_data?.customer_risk_factors,
        sourceOfFunds:         client.source_of_funds,
        amlTriggers:           client.suspicious_indicators || client.aml_trigger_activities,
        clientType:            client.customer_type || client.client_type,
        beneficialOwners:      client.beneficial_owners || [],
        checkBeneficialOwners: true,
      })
    : null;

  const getDashboardRoute = () => {
    if (!profile?.role) return '/client/dashboard';
    switch (profile.role) {
      case 'staff':
      case 'lawyer':
        return '/dashboard/staff';
      case 'management':
      case 'senior_partner':
        return '/dashboard/management';
      case 'compliance_officer':
      case 'mlro':
        return '/dashboard/compliance';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/client/dashboard';
    }
  };

  const loadClient = async () => {
    if (!profile?.organization_id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('kyc_clients_decrypted')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      if (!data || data.organization_id !== profile.organization_id) {
        alert('Client not found or access denied');
        navigate(getDashboardRoute());
        return;
      }

      setClient(data);

      const triggers = checkEnhancedDDTriggers(data);
      setDdTriggers(triggers);

      const { data: eddDocs } = await supabase
        .from('client_documents')
        .select('*, document_type:document_types(*)')
        .eq('client_id', clientId)
        .in('document_type.code', [
          'pep_declaration',
          'edd_questionnaire',
          'public_records_search',
          'senior_approval',
          'monitoring_checklist',
          'pep_assessment',
          'economic_rationale',
          'country_risk_assessment'
        ]);

      setEddDocuments(eddDocs || []);

      const { data: screening, error: screeningError } = await supabase
        .from('screening_results')
        .select('*')
        .eq('client_id', clientId)
        .order('screening_date', { ascending: false });

      if (screeningError) {
        console.error('Error loading screening results:', screeningError);
      }
      setScreeningResults(screening || []);

      const { data: txns, error: txnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (txnsError) {
        console.error('Error loading transactions:', txnsError);
      }
      setTransactions(txns || []);

      const { data: alerts, error: alertsError } = await supabase
        .from('transaction_alerts')
        .select('*')
        .eq('client_id', clientId)
        .order('alert_date', { ascending: false });

      if (alertsError) {
        console.error('Error loading transaction alerts:', alertsError);
      }
      setTransactionAlerts(alerts || []);

      const { data: reviews, error: reviewsError } = await supabase
        .from('client_reviews')
        .select('*')
        .eq('client_id', clientId)
        .order('review_date', { ascending: false });

      if (reviewsError) {
        console.error('Error loading reviews:', reviewsError);
      }
      setClientReviews(reviews || []);
    } catch (error) {
      console.error('Error loading client:', error);
      alert('Failed to load client details');
      navigate(getDashboardRoute());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.organization_id && clientId) {
      loadClient();
    }
  }, [clientId, profile?.organization_id]);

  const updateDDLevel = async (newLevel) => {
    if (!confirm(`Change due diligence level to ${newLevel}?`)) return;

    try {
      const { error } = await supabase
        .from('kyc_clients')
        .update({ current_dd_level: newLevel })
        .eq('id', clientId);

      if (error) throw error;

      let message = 'Due diligence level updated';

      if (newLevel === 'standard') {
        message += '\n\nSource of Funds verification is now required. Please complete the SOF template in the SOF/SOW Templates tab.';
      } else if (newLevel === 'enhanced') {
        message += '\n\nSource of Funds and Source of Wealth verification are now required. Please complete both templates in the SOF/SOW Templates tab.';
      }

      alert(message);
      loadClient();
    } catch (error) {
      console.error('Error updating DD level:', error);
      alert('Failed to update DD level');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>Client not found</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Corporate Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={() => navigate(getDashboardRoute())} style={styles.backButton}>
            ← Back
          </button>
          <div style={styles.headerTitleSection}>
            <h1 style={styles.title}>{client.client_name}</h1>
            <div style={styles.headerMeta}>
              <span>{client.client_type === 'individual' ? 'Individual Client' : 'Legal Entity'}</span>
              {client.is_pep && <span>• PEP Status</span>}
            </div>
          </div>
          <div style={styles.headerBadges}>
            {isPendingAssessment && (
              <span style={{
                ...styles.badge,
                background: '#fef3c725',
                color: '#92400e',
                borderColor: '#fbbf24'
              }}>
                PENDING ASSESSMENT
              </span>
            )}
            <span style={{
              ...styles.badge,
              background: getRiskColor(client.current_risk_rating) + '25',
              color: getRiskColor(client.current_risk_rating),
              borderColor: getRiskColor(client.current_risk_rating)
            }}>
              {isPendingAssessment ? 'PROVISIONAL' : ''} {client.current_risk_rating?.toUpperCase()} RISK
            </span>
            {isPendingAssessment && !isReadOnly && !isAccountantOrg && (
              <button
                onClick={() => navigate(`/kyc-form/${clientId}`)}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Complete KYC Assessment
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div style={styles.content}>
        {/* Pending Assessment Banner */}
        {isPendingAssessment && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#92400e', fontSize: '14px', marginBottom: '6px' }}>
                KYC Assessment Incomplete
              </div>
              {completenessResult && completenessResult.missing.length > 0 && (
                <ul style={{ margin: '0 0 10px', paddingLeft: '18px' }}>
                  {completenessResult.missing.map((item, i) => (
                    <li key={i} style={{ color: '#78350f', fontSize: '13px', marginBottom: '2px' }}>{item}</li>
                  ))}
                </ul>
              )}
              {isAccountantOrg ? (
                <div style={{ color: '#78350f', fontSize: '13px' }}>
                  To complete this record, use the Accountant KYC form from the dashboard.
                </div>
              ) : !isReadOnly && (
                <button
                  onClick={() => navigate(`/kyc-form/${clientId}`)}
                  style={{
                    padding: '7px 14px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Complete KYC Assessment
                </button>
              )}
            </div>
          </div>
        )}

        {/* DD Triggers Alert */}
        {ddTriggers && ddTriggers.isTriggered && (
          <div style={styles.alertCard}>
            <div style={styles.alertHeader}>
              <span>⚠️</span>
              <h3 style={styles.alertTitle}>Enhanced Due Diligence Triggers Detected</h3>
            </div>
            <p style={styles.alertDescription}>
              This client has {ddTriggers.triggers.length} trigger(s) that may require enhanced due diligence:
            </p>
            <ul style={styles.triggerList}>
              {ddTriggers.triggers.map((trigger, idx) => (
                <li key={idx} style={styles.triggerItem}>
                  <strong>{trigger.type?.toUpperCase() || 'UNKNOWN'}:</strong> {trigger.description}
                </li>
              ))}
            </ul>
            {!isReadOnly && client.current_dd_level !== 'enhanced' && (
              <button
                onClick={() => updateDDLevel('enhanced')}
                style={styles.upgradeButton}
              >
                Upgrade to Enhanced DD
              </button>
            )}
          </div>
        )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{...styles.tab, ...(activeTab === 'overview' && styles.activeTab)}}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          style={{...styles.tab, ...(activeTab === 'risk' && styles.activeTab)}}
        >
          Risk Assessment
        </button>
        {!isReadOnly && (
          <button
            onClick={() => setActiveTab('documents')}
            style={{...styles.tab, ...(activeTab === 'documents' && styles.activeTab)}}
          >
            Documents
          </button>
        )}
        {!isReadOnly && (
          <button
            onClick={() => setShowDeclarationForm(true)}
            style={{...styles.tab}}
          >
            Client Declaration
          </button>
        )}
        {!isReadOnly && (client.current_dd_level === 'standard' || client.current_dd_level === 'enhanced') && (
          <button
            onClick={() => setActiveTab('sof-sow-templates')}
            style={{...styles.tab, ...(activeTab === 'sof-sow-templates' && styles.activeTab)}}
          >
            SOF/SOW Templates
          </button>
        )}
        {!isReadOnly && (
          <button
            onClick={() => setActiveTab('edd-templates')}
            style={{...styles.tab, ...(activeTab === 'edd-templates' && styles.activeTab)}}
          >
            EDD Templates
          </button>
        )}
        <button
          onClick={() => setActiveTab('monitoring')}
          style={{...styles.tab, ...(activeTab === 'monitoring' && styles.activeTab)}}
        >
          Monitoring & Alerts
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <div style={styles.overviewSection}>
            {/* Comprehensive Client Profile */}
            <div style={styles.profileGrid}>
              {/* Left Column - Client Information */}
              <div style={styles.profileColumn}>
                {/* Basic Information */}
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>
                    <span style={styles.cardIcon}>👤</span>
                    Basic Information
                  </h3>
                  <div style={styles.infoRows}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Client Type:</span>
                      <span style={styles.infoValue}>
                        {client.client_type === 'individual' ? 'Individual' : 'Legal Entity'}
                      </span>
                    </div>
                    {client.id_number && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>ID Number:</span>
                        <span style={styles.infoValue}>{client.id_number}</span>
                      </div>
                    )}
                    {client.date_of_birth && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Date of Birth:</span>
                        <span style={styles.infoValue}>
                          {new Date(client.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {client.incorporation_date && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Incorporation Date:</span>
                        <span style={styles.infoValue}>
                          {new Date(client.incorporation_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {client.nationality && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Nationality:</span>
                        <span style={styles.infoValue}>{client.nationality}</span>
                      </div>
                    )}
                    {client.country_of_residence && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Country of Residence:</span>
                        <span style={styles.infoValue}>{client.country_of_residence}</span>
                      </div>
                    )}
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Client Status:</span>
                      <span style={{...styles.infoValue, fontWeight: '600'}}>
                        {client.client_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Business/Financial Information */}
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>
                    <span style={styles.cardIcon}>💼</span>
                    Business & Financial
                  </h3>
                  <div style={styles.infoRows}>
                    {client.business_activity && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Business Activity:</span>
                        <span style={styles.infoValue}>{client.business_activity}</span>
                      </div>
                    )}
                    {client.industry_sector && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Industry Sector:</span>
                        <span style={styles.infoValue}>{client.industry_sector}</span>
                      </div>
                    )}
                    {client.industry_risk_level && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Industry Risk Level:</span>
                        <span style={{...styles.infoValue, textTransform: 'uppercase', fontWeight: '600', color: client.industry_risk_level === 'very_high' || client.industry_risk_level === 'high' ? '#dc2626' : '#059669'}}>
                          {client.industry_risk_level.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {client.source_of_funds && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Source of Funds:</span>
                        <span style={styles.infoValue}>{client.source_of_funds}</span>
                      </div>
                    )}
                    {client.source_of_wealth && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Source of Wealth:</span>
                        <span style={styles.infoValue}>{client.source_of_wealth}</span>
                      </div>
                    )}
                    {client.estimated_annual_turnover && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Est. Annual Turnover:</span>
                        <span style={styles.infoValue}>{client.estimated_annual_turnover}</span>
                      </div>
                    )}
                    {client.expected_monthly_volume_tzs && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Expected Monthly Volume:</span>
                        <span style={styles.infoValue}>
                          TZS {parseInt(client.expected_monthly_volume_tzs).toLocaleString()}
                          {client.expected_monthly_volume_usd && ` (~ USD ${parseInt(client.expected_monthly_volume_usd).toLocaleString()})`}
                        </span>
                      </div>
                    )}
                    {client.purpose_of_relationship && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Purpose of Relationship:</span>
                        <span style={styles.infoValue}>{client.purpose_of_relationship}</span>
                      </div>
                    )}
                    {client.cash_intensive_business !== null && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Cash Intensive Business:</span>
                        <span style={{...styles.infoValue, fontWeight: '600', color: client.cash_intensive_business ? '#dc2626' : '#059669'}}>
                          {client.cash_intensive_business ? 'YES' : 'NO'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Onboarding & Verification */}
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>
                    <span style={styles.cardIcon}>✓</span>
                    Onboarding & Verification
                  </h3>
                  <div style={styles.infoRows}>
                    {client.onboarding_channel && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Onboarding Channel:</span>
                        <span style={styles.infoValue}>{client.onboarding_channel?.toUpperCase()}</span>
                      </div>
                    )}
                    {client.account_opening_date && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Account Opening Date:</span>
                        <span style={styles.infoValue}>{new Date(client.account_opening_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {client.products_services && client.products_services.length > 0 && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Products/Services:</span>
                        <span style={styles.infoValue}>{client.products_services.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compliance & Screening */}
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>
                    <span style={styles.cardIcon}>🔍</span>
                    Screening & Monitoring
                  </h3>
                  <div style={styles.infoRows}>
                    {client.screening_status && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Screening Status:</span>
                        <span style={{...styles.infoValue, color: client.screening_status === 'clear' ? '#059669' : '#dc2626', fontWeight: '600'}}>
                          {client.screening_status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    )}
                    {client.last_screening_date && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Last Screening:</span>
                        <span style={styles.infoValue}>{new Date(client.last_screening_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {client.next_screening_due && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Next Screening Due:</span>
                        <span style={styles.infoValue}>{new Date(client.next_screening_due).toLocaleDateString()}</span>
                      </div>
                    )}
                    {client.transaction_monitoring_active !== null && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Transaction Monitoring:</span>
                        <span style={{...styles.infoValue, color: client.transaction_monitoring_active ? '#059669' : '#dc2626', fontWeight: '600'}}>
                          {client.transaction_monitoring_active ? '✓ ACTIVE' : '✗ INACTIVE'}
                        </span>
                      </div>
                    )}
                    {client.enhanced_monitoring_required && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Enhanced Monitoring:</span>
                        <span style={{...styles.infoValue, color: '#dc2626', fontWeight: '600'}}>
                          ⚠️ REQUIRED
                        </span>
                      </div>
                    )}
                    {client.enhanced_monitoring_reason && (
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Monitoring Reason:</span>
                        <span style={{...styles.infoValue, fontSize: '11px', color: '#dc2626'}}>
                          {client.enhanced_monitoring_reason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Geographic & Regulatory Risk */}
                {(client.fatf_high_risk_jurisdiction || client.high_risk_countries || client.tax_residency_countries) && (
                  <div style={styles.infoCard}>
                    <h3 style={styles.infoCardTitle}>
                      <span style={styles.cardIcon}>🌍</span>
                      Geographic & Regulatory Risk
                    </h3>
                    <div style={styles.infoRows}>
                      {client.fatf_high_risk_jurisdiction !== null && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>FATF High-Risk Jurisdiction:</span>
                          <span style={{...styles.infoValue, color: client.fatf_high_risk_jurisdiction ? '#dc2626' : '#059669', fontWeight: '600'}}>
                            {client.fatf_high_risk_jurisdiction ? '⚠️ YES' : '✓ NO'}
                          </span>
                        </div>
                      )}
                      {client.high_risk_countries && client.high_risk_countries.length > 0 && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>High-Risk Countries:</span>
                          <span style={{...styles.infoValue, color: '#dc2626', fontWeight: '600'}}>
                            {client.high_risk_countries.join(', ')}
                          </span>
                        </div>
                      )}
                      {client.tax_residency_countries && client.tax_residency_countries.length > 0 && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Tax Residency:</span>
                          <span style={styles.infoValue}>
                            {client.tax_residency_countries.join(', ')}
                          </span>
                        </div>
                      )}
                      {client.regulatory_classification && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Regulatory Classification:</span>
                          <span style={styles.infoValue}>{client.regulatory_classification?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Due Diligence & Risk */}
              <div style={styles.profileColumn}>
                {/* Due Diligence Level */}
                <div style={styles.ddComprehensiveCard}>
                  <div style={styles.ddComprehensiveHeader}>
                    <h3 style={styles.infoCardTitle}>
                      <span style={styles.cardIcon}>🔒</span>
                      Due Diligence & Risk Profile
                    </h3>
                    <div style={styles.ddLevelBadgeContainer}>
                      <span style={{
                        ...styles.ddLevelBadgeCompact,
                        backgroundColor: dueDiligenceLevelInfo[client.current_dd_level || 'standard']?.color + '15',
                        color: dueDiligenceLevelInfo[client.current_dd_level || 'standard']?.color,
                        borderColor: dueDiligenceLevelInfo[client.current_dd_level || 'standard']?.color + '40'
                      }}>
                        {isPendingAssessment ? 'PROVISIONAL ' : ''}{(client.current_dd_level || 'standard').toUpperCase()} DD
                      </span>
                    </div>
                  </div>

                  <div style={styles.infoRows}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>DD Level:</span>
                      {isReadOnly || isPendingAssessment ? (
                        <span style={styles.infoValue}>
                          {(client.current_dd_level || 'standard').toUpperCase()}
                        </span>
                      ) : (
                        <select
                          value={client.current_dd_level || 'standard'}
                          onChange={(e) => updateDDLevel(e.target.value)}
                          style={styles.ddSelect}
                        >
                          <option value="simplified">Simplified</option>
                          <option value="standard">Standard</option>
                          <option value="enhanced">Enhanced</option>
                        </select>
                      )}
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Risk Rating:</span>
                      <span style={{...styles.riskBadge, background: getRiskColor(client.current_risk_rating)}}>
                        {client.current_risk_rating}
                      </span>
                    </div>
                    <div style={styles.ddDescription}>
                      {isPendingAssessment
                        ? 'Provisional — DD level confirmed after KYC assessment is completed.'
                        : dueDiligenceLevelInfo[client.current_dd_level || 'standard']?.description}
                    </div>
                  </div>

                  {/* Key Features */}
                  <div style={styles.ddFeatureSection}>
                    <h4 style={styles.ddFeatureTitle}>Key Requirements:</h4>
                    <ul style={styles.featureListCompact}>
                      {dueDiligenceLevelInfo[client.current_dd_level || 'standard']?.features.map((feature, idx) => (
                        <li key={idx} style={styles.featureItemCompact}>
                          <span style={styles.featureBulletCompact}>•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Enhanced DD Status */}
                  {!isPendingAssessment && client.current_dd_level === 'enhanced' && (
                    <div style={styles.enhancedWorkflowSection}>
                      <h4 style={styles.ddFeatureTitle}>Enhanced DD Status:</h4>
                      <EnhancedDDStatusSection client={client} eddDocuments={eddDocuments} />
                    </div>
                  )}

                  {/* Standard DD Status */}
                  {!isPendingAssessment && client.current_dd_level === 'standard' && (
                    <div style={styles.enhancedWorkflowSection}>
                      <h4 style={styles.ddFeatureTitle}>Standard DD Status:</h4>
                      <StandardDDStatusSection client={client} />
                    </div>
                  )}

                  {/* Pending assessment placeholder */}
                  {isPendingAssessment && (
                    <div style={styles.enhancedWorkflowSection}>
                      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                        DD verification checklist available once KYC assessment is completed.
                      </p>
                    </div>
                  )}

                  {/* Simplified DD Justification */}
                  {client.current_dd_level === 'simplified' && (
                    <div style={styles.simplifiedJustificationSection}>
                      <h4 style={styles.ddFeatureTitle}>Justification:</h4>
                      {client.simplified_dd_justification ? (
                        <div style={styles.justificationTextBox}>
                          {client.simplified_dd_justification}
                        </div>
                      ) : (
                        <div style={styles.justificationWarningBox}>
                          ⚠️ Justification required for simplified DD
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Monitoring Schedule */}
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>
                    <span style={styles.cardIcon}>🔄</span>
                    Continuous Monitoring
                  </h3>

                  {isReviewOverdue(client.next_review_date) && !isReadOnly && (
                    <div style={{
                      backgroundColor: '#fee2e2',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight: '600', color: '#991b1b', fontSize: '13px', marginBottom: '2px' }}>
                            Review Overdue
                          </div>
                          <div style={{ color: '#7f1d1d', fontSize: '12px' }}>
                            This client requires an immediate review
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Conduct Review
                      </button>
                    </div>
                  )}

                  <div style={styles.infoRows}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Review Frequency:</span>
                      <span style={styles.infoValue}>
                        {client.review_frequency ? client.review_frequency.replace('_', ' ').toUpperCase() : 'Not Set'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Next Review:</span>
                      <span style={{
                        ...styles.infoValue,
                        color: isReviewOverdue(client.next_review_date) ? '#ef4444' : '#10b981',
                        fontWeight: '600'
                      }}>
                        {client.next_review_date ? (
                          <>
                            {new Date(client.next_review_date).toLocaleDateString()}
                            {isReviewOverdue(client.next_review_date) ? (
                              <span style={{fontSize: '11px', marginLeft: '8px'}}>⚠️ OVERDUE</span>
                            ) : (
                              <span style={{fontSize: '11px', marginLeft: '8px', color: '#6b7280'}}>
                                (in {getDaysUntilReview(client.next_review_date)} days)
                              </span>
                            )}
                          </>
                        ) : 'Not Scheduled'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Last Review:</span>
                      <span style={styles.infoValue}>
                        {client.last_review_date ? new Date(client.last_review_date).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Monitoring Status:</span>
                      <span style={{
                        ...styles.infoValue,
                        color: getMonitoringStatusColor(client.monitoring_status),
                        fontWeight: '600'
                      }}>
                        {client.monitoring_status ? client.monitoring_status.toUpperCase() : 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        📋 Conduct Client Review
                      </button>
                    </div>
                  )}

                  {clientReviews.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                        Recent Reviews ({clientReviews.length})
                      </div>
                      {clientReviews.slice(0, 3).map((review) => (
                        <div key={review.id} style={{
                          padding: '10px 12px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#111827' }}>
                              {new Date(review.review_date).toLocaleDateString()}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: review.outcome === 'no_issues' ? '#d1fae5' : '#fef3c7',
                              color: review.outcome === 'no_issues' ? '#065f46' : '#92400e'
                            }}>
                              {review.outcome?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>
                          <div style={{ color: '#6b7280' }}>
                            {review.review_notes ? review.review_notes.substring(0, 100) + (review.review_notes.length > 100 ? '...' : '') : 'No notes'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <DocumentUploadManager
              clientId={client.id}
              organizationId={client.organization_id}
              mode="kyc"
              onUploadComplete={() => loadClient()}
              isReadOnly={isReadOnly}
            />
          </div>
        )}

        {activeTab === 'risk' && (
          <div style={styles.riskSection}>
            <div style={styles.riskCard}>
              <h3 style={styles.riskCardTitle}>Risk Assessment Summary</h3>
              <div style={styles.riskScoreDisplay}>
                <div style={styles.riskScoreLabel}>Overall Risk Score</div>
                <div style={styles.riskScoreValue}>{client.base_risk_score || 0}</div>
                <div style={{...styles.riskRatingBadge, background: getRiskColor(client.current_risk_rating)}}>
                  {client.current_risk_rating}
                </div>
              </div>

              {client.is_pep && (
                <div style={styles.riskAlert}>
                  <strong>PEP Status:</strong> This client is a Politically Exposed Person
                </div>
              )}

              {client.sanctions_screening_result && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Sanctions Screening:</span>
                  <span style={styles.infoValue}>{client.sanctions_screening_result}</span>
                </div>
              )}

              {client.adverse_media_findings && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Adverse Media:</span>
                  <span style={styles.infoValue}>{client.adverse_media_findings}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sof-sow-templates' && (
          <SOFSOWTemplates
            client={client}
            onClose={() => setActiveTab('overview')}
            onUpdate={loadClient}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'edd-templates' && (
          <EDDDocumentTemplates
            clientId={client.id}
            clientName={client.client_name}
            client={client}
            onClose={() => setActiveTab('overview')}
            onUpdate={loadClient}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'monitoring' && (
          <div style={{padding: '20px'}}>
            <h2 style={{fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#111827'}}>
              Monitoring & Alerts Dashboard
            </h2>

            {/* Screening Results */}
            <div style={{marginBottom: '32px'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>🔍</span> Screening Results ({screeningResults.length})
              </h3>
              {screeningResults.length > 0 ? (
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Type</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Date</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Status</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Risk Level</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Matches</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screeningResults.map((result) => (
                        <tr key={result.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                          <td style={{padding: '12px', textTransform: 'uppercase', fontWeight: '600'}}>{result.screening_type}</td>
                          <td style={{padding: '12px'}}>{new Date(result.screening_date).toLocaleDateString()}</td>
                          <td style={{padding: '12px'}}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                              backgroundColor: result.screening_status === 'cleared' ? '#d1fae5' : result.screening_status === 'pending' ? '#fef3c7' : '#e0e7ff',
                              color: result.screening_status === 'cleared' ? '#065f46' : result.screening_status === 'pending' ? '#92400e' : '#3730a3'
                            }}>
                              {result.screening_status}
                            </span>
                          </td>
                          <td style={{padding: '12px'}}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                              backgroundColor: result.risk_level === 'low' ? '#d1fae5' : result.risk_level === 'high' || result.risk_level === 'critical' ? '#fee2e2' : '#fef3c7',
                              color: result.risk_level === 'low' ? '#065f46' : result.risk_level === 'high' || result.risk_level === 'critical' ? '#991b1b' : '#92400e'
                            }}>
                              {result.risk_level}
                            </span>
                          </td>
                          <td style={{padding: '12px'}}>{result.match_count || 0}</td>
                          <td style={{padding: '12px', fontSize: '11px', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {result.clearance_notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db'}}>
                  <p style={{color: '#6b7280'}}>No screening results available</p>
                </div>
              )}
            </div>

            {/* Transaction Alerts */}
            <div style={{marginBottom: '32px'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>⚠️</span> Transaction Alerts ({transactionAlerts.length})
              </h3>
              {transactionAlerts.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {transactionAlerts.map((alert) => (
                    <div key={alert.id} style={{
                      border: '1px solid ' + (alert.alert_severity === 'high' || alert.alert_severity === 'critical' ? '#fca5a5' : '#fde68a'),
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: alert.alert_severity === 'high' || alert.alert_severity === 'critical' ? '#fef2f2' : '#fffbeb'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px'}}>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              backgroundColor: alert.alert_severity === 'high' || alert.alert_severity === 'critical' ? '#dc2626' : '#f59e0b',
                              color: 'white'
                            }}>
                              {alert.alert_severity} SEVERITY
                            </span>
                            <span style={{fontSize: '11px', color: '#6b7280'}}>
                              Alert #{alert.alert_number}
                            </span>
                          </div>
                          <h4 style={{fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px'}}>
                            {alert.alert_type?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Alert'}
                          </h4>
                          <p style={{fontSize: '13px', color: '#374151', marginBottom: '8px'}}>
                            {alert.alert_description}
                          </p>
                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px', color: '#6b7280'}}>
                            <div>
                              <strong>Transaction:</strong> {alert.transaction_reference}
                            </div>
                            <div>
                              <strong>Date:</strong> {new Date(alert.transaction_date).toLocaleDateString()}
                            </div>
                            <div>
                              <strong>Amount:</strong> {alert.transaction_currency} {parseInt(alert.transaction_amount).toLocaleString()}
                            </div>
                            <div>
                              <strong>Status:</strong>
                              <span style={{
                                marginLeft: '6px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: alert.investigation_status === 'new' ? '#fef3c7' : '#e0e7ff',
                                color: alert.investigation_status === 'new' ? '#92400e' : '#3730a3',
                                textTransform: 'uppercase',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}>
                                {alert.investigation_status}
                              </span>
                            </div>
                          </div>
                          {alert.suspicious_indicators && alert.suspicious_indicators.length > 0 && (
                            <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb'}}>
                              <div style={{fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '6px'}}>
                                Suspicious Indicators:
                              </div>
                              <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                {alert.suspicious_indicators.map((indicator, idx) => (
                                  <span key={idx} style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    fontWeight: '500'
                                  }}>
                                    {indicator.split('_').join(' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db'}}>
                  <p style={{color: '#6b7280'}}>No transaction alerts</p>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div style={{marginBottom: '32px'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>💳</span> Recent Transactions (Last 10)
              </h3>
              {transactions.length > 0 ? (
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Ref</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Date</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Type</th>
                        <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#6b7280'}}>Amount</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Counterparty</th>
                        <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280'}}>Description</th>
                        <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280'}}>Risk</th>
                        <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280'}}>Flagged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                          <td style={{padding: '12px', fontSize: '11px', fontWeight: '600', color: '#6b7280'}}>{txn.transaction_ref}</td>
                          <td style={{padding: '12px', fontSize: '11px'}}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                          <td style={{padding: '12px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '600'}}>{txn.transaction_type}</td>
                          <td style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>
                            {txn.currency} {parseInt(txn.amount).toLocaleString()}
                            {txn.amount_usd && <div style={{fontSize: '10px', color: '#6b7280'}}>~${parseInt(txn.amount_usd).toLocaleString()}</div>}
                          </td>
                          <td style={{padding: '12px', fontSize: '12px'}}>{txn.counterparty_name}</td>
                          <td style={{padding: '12px', fontSize: '11px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {txn.transaction_description}
                          </td>
                          <td style={{padding: '12px', textAlign: 'center'}}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: txn.risk_score > 60 ? '#fee2e2' : txn.risk_score > 30 ? '#fef3c7' : '#d1fae5',
                              color: txn.risk_score > 60 ? '#991b1b' : txn.risk_score > 30 ? '#92400e' : '#065f46'
                            }}>
                              {txn.risk_score}
                            </span>
                          </td>
                          <td style={{padding: '12px', textAlign: 'center'}}>
                            {txn.alert_triggered ? (
                              <span style={{fontSize: '16px', color: '#dc2626'}}>🚩</span>
                            ) : (
                              <span style={{fontSize: '16px', color: '#10b981'}}>✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db'}}>
                  <p style={{color: '#6b7280'}}>No transactions available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {showDeclarationForm && !isReadOnly && (
        <ClientDeclarationForm
          clientType={client.client_type}
          onClose={() => setShowDeclarationForm(false)}
        />
      )}

      {showReviewForm && !isReadOnly && (
        <ClientReviewForm
          client={client}
          onReviewComplete={() => {
            setShowReviewForm(false);
            loadClient();
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#718096',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  backButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#ffffff',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  headerTitleSection: {
    flex: 1,
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  headerMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  headerBadges: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badge: {
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    border: '2px solid',
  },
  typeBadge: {
    padding: '6px 14px',
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    border: '2px solid #60a5fa',
  },
  pepBadge: {
    padding: '6px 14px',
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    border: '2px solid #fbbf24',
  },
  alertCard: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  alertTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#92400e',
  },
  alertDescription: {
    margin: '0 0 12px 0',
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  triggerList: {
    margin: '0 0 16px 0',
    paddingLeft: '20px',
    color: '#92400e',
  },
  triggerItem: {
    marginBottom: '8px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  upgradeButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
    transition: 'all 0.3s ease',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
  activeTab: {
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },
  tabContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  overviewSection: {
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '24px',
  },
  profileColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  infoCard: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
  },
  infoCardTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardIcon: {
    fontSize: '18px',
  },
  infoRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%',
  },
  ddComprehensiveCard: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  ddComprehensiveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37',
  },
  ddLevelBadgeContainer: {
    display: 'flex',
  },
  ddLevelBadgeCompact: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    border: '2px solid',
  },
  ddDescription: {
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginTop: '12px',
    border: '1px solid #e5e7eb',
  },
  ddFeatureSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  ddFeatureTitle: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  featureListCompact: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  featureItemCompact: {
    marginBottom: '8px',
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  featureBulletCompact: {
    color: '#10b981',
    fontSize: '16px',
    lineHeight: '1.3',
    fontWeight: '700',
  },
  enhancedWorkflowSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  verificationButton: {
    marginTop: '12px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },
  statusGridCompact: {
    display: 'grid',
    gap: '10px',
  },
  statusItemCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  statusLabelCompact: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
  },
  statusBadgeCompact: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    border: '1.5px solid',
  },
  simplifiedJustificationSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  justificationTextBox: {
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.6',
    border: '1px solid #e5e7eb',
  },
  justificationWarningBox: {
    padding: '12px',
    background: '#fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
    fontWeight: '600',
    border: '1px solid #f59e0b',
  },
  ddSelect: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    cursor: 'pointer',
  },
  riskBadge: {
    padding: '4px 12px',
    borderRadius: '999px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
  },
  riskSection: {
  },
  riskCard: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  riskCardTitle: {
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37',
  },
  riskScoreDisplay: {
    textAlign: 'center',
    padding: '32px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  riskScoreLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  riskScoreValue: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  riskRatingBadge: {
    display: 'inline-block',
    padding: '8px 24px',
    borderRadius: '999px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
  },
  riskAlert: {
    padding: '12px',
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    color: '#92400e',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
