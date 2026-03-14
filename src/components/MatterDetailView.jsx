import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import MatterActivities from './MatterActivities';
import MatterMilestones from './MatterMilestones';
import MatterBillingMilestones from './MatterBillingMilestones';
import DocumentUploadManager from './DocumentUploadManager';
import LoadingSpinner from './LoadingSpinner';

export default function MatterDetailView({ matter, onClose, onUpdate, activeTab: propActiveTab, onTabChange }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [loading, setLoading] = useState(false);
  const [matterData, setMatterData] = useState(matter);
  const [relatedClients, setRelatedClients] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Sync with prop changes
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  // Helper to change tab
  const changeTab = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Management and compliance users have read-only access
  const isReadOnly = profile?.role === 'management' || profile?.role === 'compliance_officer' || profile?.role === 'mlro';

  useEffect(() => {
    loadMatterDetails();
  }, [matter.id]);

  const loadMatterDetails = async () => {
    try {
      setLoading(true);

      const { data: relationships, error: relError } = await supabase
        .from('client_matter_relationships')
        .select('*, kyc_clients(*)')
        .eq('matter_id', matter.id);

      if (relError) {
        console.error('Error loading client relationships:', relError);
      } else if (relationships) {
        setRelatedClients(relationships);
      }

      // matter_documents table doesn't exist yet, skip for now
      // const { data: docs } = await supabase
      //   .from('matter_documents')
      //   .select('*')
      //   .eq('matter_id', matter.id)
      //   .order('uploaded_at', { ascending: false });

      // setDocuments(docs || []);
      setDocuments([]);
    } catch (error) {
      console.error('Error loading matter details:', error);
    } finally {
      setLoading(false);
    }
  };

  const primaryClient = relatedClients.find(
    rel => rel.relationship_type === 'primary_client'
  );

  const getRiskColor = (level) => {
    const colors = {
      'Low': '#10b981',
      'Medium': '#f59e0b',
      'High': '#f97316',
      'Very High': '#ef4444'
    };
    return colors[level] || '#6b7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      'open': '#3b82f6',
      'active': '#10b981',
      'on_hold': '#f59e0b',
      'closed': '#6b7280',
      'conflict_pending': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getProgressStage = (stage) => {
    const stages = {
      intake: 'Intake',
      conflict_check: 'Conflict Check',
      kyc_in_progress: 'KYC In Progress',
      kyc_completed: 'KYC Completed',
      active_work: 'Active Work',
      awaiting_documents: 'Awaiting Documents',
      awaiting_court: 'Awaiting Court',
      in_negotiation: 'In Negotiation',
      closing: 'Closing',
      completed: 'Completed',
      on_hold: 'On Hold',
      archived: 'Archived'
    };
    return stages[stage] || stage;
  };

  const getAMLTriggerBadge = (triggers) => {
    if (!triggers || triggers.length === 0) return null;

    const triggerLabels = {
      real_estate: 'Real Estate',
      high_value: 'High Value',
      cash_transaction: 'Cash Transaction',
      cross_border: 'Cross Border',
      trust_formation: 'Trust/Company Formation',
      high_risk_jurisdiction: 'High Risk Jurisdiction',
      pep_involvement: 'PEP Involvement',
      complex_structure: 'Complex Structure'
    };

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {triggers.map((trigger, idx) => (
          <span
            key={idx}
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5'
            }}
          >
            {triggerLabels[trigger] || trigger.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Corporate Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <button onClick={onClose} style={styles.backButton}>
              ← Close
            </button>
            <div style={styles.headerTitleSection}>
              <h1 style={styles.title}>{matterData.matter_name}</h1>
              <div style={styles.headerMeta}>
                <span>Matter #{matterData.matter_number}</span>
                {primaryClient && <span>• {primaryClient.kyc_clients?.client_name}</span>}
              </div>
            </div>
            <div style={styles.headerBadges}>
              <span style={{
                ...styles.badge,
                background: getStatusColor(matterData.status) + '25',
                color: getStatusColor(matterData.status),
                borderColor: getStatusColor(matterData.status)
              }}>
                {matterData.status?.toUpperCase().replace('_', ' ')}
              </span>
              {matterData.progress_stage && (
                <span style={{
                  ...styles.badge,
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderColor: '#3b82f6'
                }}>
                  {getProgressStage(matterData.progress_stage)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={styles.content}>
          {/* AML Triggers Alert */}
          {matterData.aml_trigger_activities && matterData.aml_trigger_activities.length > 0 && (
            <div style={styles.alertCard}>
              <div style={styles.alertHeader}>
                <span>⚠️</span>
                <h3 style={styles.alertTitle}>AML Trigger Activities Detected</h3>
              </div>
              <p style={styles.alertDescription}>
                This matter involves {matterData.aml_trigger_activities.length} AML trigger activity(ies) that require enhanced monitoring:
              </p>
              {getAMLTriggerBadge(matterData.aml_trigger_activities)}
            </div>
          )}

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              onClick={() => changeTab('overview')}
              style={{...styles.tab, ...(activeTab === 'overview' && styles.activeTab)}}
            >
              Overview
            </button>
            <button
              onClick={() => changeTab('clients')}
              style={{...styles.tab, ...(activeTab === 'clients' && styles.activeTab)}}
            >
              Related Clients
            </button>
            <button
              onClick={() => changeTab('activities')}
              style={{...styles.tab, ...(activeTab === 'activities' && styles.activeTab)}}
            >
              Activities
            </button>
            <button
              onClick={() => changeTab('milestones')}
              style={{...styles.tab, ...(activeTab === 'milestones' && styles.activeTab)}}
            >
              Court & Milestones
            </button>
            <button
              onClick={() => changeTab('billing')}
              style={{...styles.tab, ...(activeTab === 'billing' && styles.activeTab)}}
            >
              Billing & Payments
            </button>
            <button
              onClick={() => changeTab('documents')}
              style={{...styles.tab, ...(activeTab === 'documents' && styles.activeTab)}}
            >
              Documents ({documents.length})
            </button>
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {activeTab === 'overview' && (
              <div style={styles.overviewSection}>
                <div style={styles.profileGrid}>
                  {/* Left Column */}
                  <div style={styles.profileColumn}>
                    {/* Basic Matter Information */}
                    <div style={styles.infoCard}>
                      <h3 style={styles.infoCardTitle}>
                        <span style={styles.cardIcon}>📋</span>
                        Matter Information
                      </h3>
                      <div style={styles.infoRows}>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Matter Number:</span>
                          <span style={styles.infoValue}>{matterData.matter_number}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Service Category:</span>
                          <span style={styles.infoValue}>{matterData.service_category}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Matter Type:</span>
                          <span style={styles.infoValue}>{matterData.matter_type?.replace(/_/g, ' ')}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Status:</span>
                          <span style={{
                            ...styles.infoValue,
                            fontWeight: '600',
                            color: getStatusColor(matterData.status)
                          }}>
                            {matterData.status?.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Progress Stage:</span>
                          <span style={styles.infoValue}>
                            {getProgressStage(matterData.progress_stage)}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Opened Date:</span>
                          <span style={styles.infoValue}>
                            {matterData.opened_date ? new Date(matterData.opened_date).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                        {matterData.closed_date && (
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Closed Date:</span>
                            <span style={styles.infoValue}>
                              {new Date(matterData.closed_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {matterData.matter_description && (
                      <div style={styles.infoCard}>
                        <h3 style={styles.infoCardTitle}>
                          <span style={styles.cardIcon}>📝</span>
                          Description
                        </h3>
                        <div style={styles.descriptionBox}>
                          {matterData.matter_description}
                        </div>
                      </div>
                    )}

                    {/* Financial Information */}
                    {(matterData.estimated_value || matterData.actual_value) && (
                      <div style={styles.infoCard}>
                        <h3 style={styles.infoCardTitle}>
                          <span style={styles.cardIcon}>💰</span>
                          Financial Information
                        </h3>
                        <div style={styles.infoRows}>
                          {matterData.estimated_value && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Estimated Value:</span>
                              <span style={styles.infoValue}>
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: matterData.currency || 'TZS'
                                }).format(matterData.estimated_value)}
                              </span>
                            </div>
                          )}
                          {matterData.actual_value && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Actual Value:</span>
                              <span style={styles.infoValue}>
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: matterData.currency || 'TZS'
                                }).format(matterData.actual_value)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div style={styles.profileColumn}>
                    {/* Risk Assessment */}
                    <div style={styles.infoCard}>
                      <h3 style={styles.infoCardTitle}>
                        <span style={styles.cardIcon}>⚠️</span>
                        Risk Assessment
                      </h3>
                      <div style={styles.infoRows}>
                        {matterData.risk_level && (
                          <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Risk Level:</span>
                            <span style={{
                              ...styles.riskBadge,
                              background: getRiskColor(matterData.risk_level)
                            }}>
                              {matterData.risk_level}
                            </span>
                          </div>
                        )}
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Enhanced Due Diligence:</span>
                          <span style={{
                            ...styles.infoValue,
                            fontWeight: '600',
                            color: matterData.requires_enhanced_dd ? '#dc2626' : '#059669'
                          }}>
                            {matterData.requires_enhanced_dd ? 'Required' : 'Not Required'}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Client Account Involved:</span>
                          <span style={styles.infoValue}>
                            {matterData.involves_client_account ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Cross-Border Transaction:</span>
                          <span style={{
                            ...styles.infoValue,
                            fontWeight: matterData.involves_cross_border ? '600' : '500',
                            color: matterData.involves_cross_border ? '#dc2626' : '#1f2937'
                          }}>
                            {matterData.involves_cross_border ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>High-Risk Jurisdiction:</span>
                          <span style={{
                            ...styles.infoValue,
                            fontWeight: matterData.involves_high_risk_jurisdiction ? '600' : '500',
                            color: matterData.involves_high_risk_jurisdiction ? '#dc2626' : '#1f2937'
                          }}>
                            {matterData.involves_high_risk_jurisdiction ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Team Information */}
                    {(matterData.responsible_lawyer_id || matterData.assigned_team_members) && (
                      <div style={styles.infoCard}>
                        <h3 style={styles.infoCardTitle}>
                          <span style={styles.cardIcon}>👥</span>
                          Team
                        </h3>
                        <div style={styles.infoRows}>
                          {matterData.responsible_lawyer_id && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Responsible Lawyer:</span>
                              <span style={styles.infoValue}>
                                {matterData.responsible_lawyer_id}
                              </span>
                            </div>
                          )}
                          {matterData.assigned_team_members && matterData.assigned_team_members.length > 0 && (
                            <div style={styles.infoRow}>
                              <span style={styles.infoLabel}>Team Members:</span>
                              <span style={styles.infoValue}>
                                {matterData.assigned_team_members.length} assigned
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {matterData.internal_notes && (
                      <div style={styles.infoCard}>
                        <h3 style={styles.infoCardTitle}>
                          <span style={styles.cardIcon}>📌</span>
                          Internal Notes
                        </h3>
                        <div style={styles.notesBox}>
                          {matterData.internal_notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionHeaderLeft}>
                    <div style={styles.sectionIconWrapper}>
                      <span style={styles.sectionIcon}>👥</span>
                    </div>
                    <div>
                      <h2 style={styles.sectionTitle}>Related Clients</h2>
                      <p style={styles.sectionSubtitle}>All clients associated with this matter</p>
                    </div>
                  </div>
                </div>
                {relatedClients.length > 0 ? (
                  <div style={styles.clientsGrid}>
                    {relatedClients.map((rel) => (
                      <div key={rel.id} style={styles.clientCardEnhanced}>
                        <div style={styles.clientCardHeader}>
                          <div style={styles.clientIcon}>{rel.kyc_clients?.client_type === 'individual' ? '👤' : '🏢'}</div>
                          <div style={{flex: 1}}>
                            <h3 style={styles.clientName}>
                              {rel.kyc_clients?.client_name}
                            </h3>
                            <div style={styles.clientMeta}>
                              <span style={styles.clientType}>
                                {rel.kyc_clients?.client_type === 'individual' ? 'Individual' : 'Legal Entity'}
                              </span>
                              <span style={styles.clientSeparator}>•</span>
                              <span style={styles.clientRelationship}>
                                {rel.relationship_type.replace(/_/g, ' ').charAt(0).toUpperCase() + rel.relationship_type.replace(/_/g, ' ').slice(1)}
                              </span>
                            </div>
                          </div>
                          {rel.kyc_clients?.risk_level && (
                            <span style={{
                              ...styles.riskBadge,
                              backgroundColor: getRiskColor(rel.kyc_clients.risk_level) + '20',
                              color: getRiskColor(rel.kyc_clients.risk_level),
                              borderColor: getRiskColor(rel.kyc_clients.risk_level)
                            }}>
                              {rel.kyc_clients.risk_level} Risk
                            </span>
                          )}
                        </div>
                        {rel.kyc_clients?.email && (
                          <div style={styles.clientContactInfo}>
                            <span style={styles.clientContactLabel}>Email:</span>
                            <span style={styles.clientContactValue}>{rel.kyc_clients.email}</span>
                          </div>
                        )}
                        {rel.kyc_clients?.phone_number && (
                          <div style={styles.clientContactInfo}>
                            <span style={styles.clientContactLabel}>Phone:</span>
                            <span style={styles.clientContactValue}>{rel.kyc_clients.phone_number}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyStateEnhanced}>
                    <div style={styles.emptyStateIcon}>👥</div>
                    <p style={styles.emptyStateText}>No related clients</p>
                    <p style={styles.emptyStateSubtext}>This matter has no associated clients yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activities' && (
              <MatterActivities
                matterId={matterData.id}
                organizationId={matterData.organization_id}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'milestones' && (
              <MatterMilestones
                matterId={matterData.id}
                organizationId={matterData.organization_id}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'billing' && (
              <MatterBillingMilestones
                matterId={matterData.id}
                organizationId={matterData.organization_id}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'documents' && (
              <div>
                <DocumentUploadManager
                  clientId={null}
                  matterId={matterData.id}
                  organizationId={matterData.organization_id}
                  mode="matter"
                  onUploadComplete={loadMatterDetails}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  container: {
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
    borderRadius: '16px',
    maxWidth: '1400px',
    width: '100%',
    maxHeight: '95vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  headerContent: {
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
    marginBottom: '16px'
  },
  headerTitleSection: {
    flex: 1,
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
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '32px',
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
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
  },
  tab: {
    flex: '1 1 auto',
    minWidth: '120px',
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
  overviewSection: {},
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
  infoCard: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
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
  descriptionBox: {
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.6',
    border: '1px solid #e5e7eb',
  },
  notesBox: {
    padding: '12px',
    background: '#fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.6',
    border: '1px solid #fde68a',
  },
  riskBadge: {
    padding: '4px 12px',
    borderRadius: '999px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
  },
  clientCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    paddingBottom: '20px',
    borderBottom: '2px solid #d4af37',
  },
  sectionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sectionIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  },
  sectionIcon: {
    fontSize: '24px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
  },
  sectionSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  clientsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px',
  },
  clientCardEnhanced: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
  },
  clientCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f3f4f6',
  },
  clientIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  clientName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '6px',
  },
  clientMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  clientType: {
    color: '#6b7280',
    fontWeight: '500',
  },
  clientSeparator: {
    color: '#d1d5db',
  },
  clientRelationship: {
    color: '#d4af37',
    fontWeight: '600',
  },
  clientContactInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '13px',
  },
  clientContactLabel: {
    color: '#6b7280',
    fontWeight: '600',
  },
  clientContactValue: {
    color: '#1f2937',
    fontWeight: '500',
  },
  emptyStateEnhanced: {
    textAlign: 'center',
    padding: '60px 24px',
    background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '2px dashed #d1d5db',
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyStateText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
};
