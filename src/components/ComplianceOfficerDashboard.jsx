import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import KYCClientManagement from './KYCClientManagement';
import STRAlertDashboard from './STRAlertDashboard';
import ScreeningDashboard from './ScreeningDashboard';
import DataDeletionRequestsPanel from './DataDeletionRequestsPanel';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
import PageHeader from './PageHeader';
import LoadingSpinner from './LoadingSpinner';
import RoleUpgradeRequestForm from './RoleUpgradeRequestForm';
export default function ComplianceOfficerDashboard() {
  const [showRoleUpgradeForm, setShowRoleUpgradeForm] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    highRiskClients: 0,
    pepClients: 0,
    totalMatters: 0,
    activeMatters: 0,
    pendingAlerts: 0,
    overdueReviews: 0,
    activeSTRs: 0,
    redFlagIncidents: 0,
    conflictsPending: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [clientInitialFilter, setClientInitialFilter] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [kycClients, setKycClients] = useState([]);
  const [kycClientsLoading, setKycClientsLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const getBackRoute = () => {
    return '/client/dashboard';
  };

  const loadKycClients = useCallback(async () => {
    if (!profile?.organization_id) return;
    try {
      setKycClientsLoading(true);
      const { data, error } = await supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, client_type, current_risk_rating')
        .eq('organization_id', profile.organization_id)
        .order('client_name', { ascending: true });
      if (error) {
        console.error('Error loading KYC clients for dropdown:', error);
        setKycClients([]);
      } else {
        setKycClients(data || []);
      }
    } catch (err) {
      console.error('Error loading KYC clients for dropdown:', err);
      setKycClients([]);
    } finally {
      setKycClientsLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    loadKycClients();
  }, [loadKycClients]);

  useEffect(() => {
    // Only load dashboard data if we're on the overview view
    if (profile?.organization_id && activeView === 'overview') {
      loadDashboardData();
    } else if (activeView !== 'overview') {
      // Skip loading for sub-views - they load their own data
      setLoading(false);
    }
  }, [profile, activeView]);

  const createNewAssessment = async () => {
    try {
      if (!profile?.organization_id) {
        alert('Error: No organization found. Please contact support.');
        return;
      }

      const { data, error } = await supabase
        .from('assessments')
        .insert([{
          organization_id: profile.organization_id,
          created_by: profile.id,
          status: 'draft',
          assessment_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating assessment:', error);
        alert(`Failed to create assessment: ${error.message}`);
        return;
      }

      if (data) {
        navigate(`/assessment/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert('Failed to create new assessment. Please try again.');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Run all queries in parallel for much faster loading
      const [clientsRes, mattersRes, matterAlertsRes, strsRes, redFlagsRes, conflictsRes] = await Promise.all([
        supabase
          .from('kyc_clients')
          .select('id, current_risk_rating, pep_status, next_review_date')
          .eq('organization_id', profile.organization_id),

        supabase
          .from('matters')
          .select('id, status')
          .eq('organization_id', profile.organization_id),

        supabase
          .from('matter_aml_alerts')
          .select('*')
          .eq('organization_id', profile.organization_id),

        supabase
          .from('str_drafts')
          .select('id, draft_status')
          .eq('organization_id', profile.organization_id)
          .in('draft_status', ['draft', 'pending_mlro_review']),

        supabase
          .from('client_red_flag_incidents')
          .select('id, investigation_status')
          .eq('organization_id', profile.organization_id)
          .in('investigation_status', ['identified', 'under_investigation']),

        supabase
          .from('conflict_checks')
          .select('id, resolution_status')
          .eq('organization_id', profile.organization_id)
          .eq('resolution_status', 'pending')
      ]);

      const clients = clientsRes.data;
      const matters = mattersRes.data;
      const matterAlerts = matterAlertsRes.data;
      const strs = strsRes.data;
      const redFlags = redFlagsRes.data;
      const conflicts = conflictsRes.data;

      if (clientsRes.error) {
        console.error('Error loading clients:', clientsRes.error);
      }

      const alerts = [];

      const today = new Date().toISOString().split('T')[0];
      const overdueReviews = clients?.filter(c =>
        c.next_review_date && c.next_review_date < today
      ).length || 0;

      setStats({
        totalClients: clients?.length || 0,
        highRiskClients: clients?.filter(c => c.current_risk_rating === 'High' || c.current_risk_rating === 'Very High').length || 0,
        pepClients: clients?.filter(c => c.pep_status === true).length || 0,
        totalMatters: matters?.length || 0,
        activeMatters: matters?.filter(m => m.status === 'open' || m.status === 'active').length || 0,
        pendingAlerts: (matterAlerts?.length || 0) + (alerts?.length || 0),
        overdueReviews,
        activeSTRs: strs?.length || 0,
        redFlagIncidents: redFlags?.length || 0,
        conflictsPending: conflicts?.length || 0
      });

      const { data: activityRaw } = await supabase
        .from('client_red_flag_incidents')
        .select('id, incident_date, incident_description, investigation_status, client_id')
        .eq('organization_id', profile.organization_id)
        .order('incident_date', { ascending: false })
        .limit(10);

      // Fetch decrypted client names separately (FK joins can't traverse views)
      const incidentClientIds = [...new Set((activityRaw ?? []).map(r => r.client_id).filter(Boolean))];
      let incidentClientNames = {};
      if (incidentClientIds.length > 0) {
        const { data: incidentClients } = await supabase
          .from('kyc_clients_decrypted')
          .select('id, client_name')
          .in('id', incidentClientIds);
        incidentClientNames = Object.fromEntries((incidentClients ?? []).map(c => [c.id, c.client_name]));
      }
      const activity = (activityRaw ?? []).map(r => ({
        ...r,
        kyc_clients: r.client_id ? { client_name: incidentClientNames[r.client_id] ?? null } : null
      }));

      setRecentActivity(activity || []);

      // Load remaining data in parallel
      const [usersRes, assessmentDataRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role, is_active, created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('assessments')
          .select('id, entity_category, overall_risk_rating, status, created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      setOrganizationUsers(usersRes.data || []);
      setAssessments(assessmentDataRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (activeView === 'clients') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => { setClientInitialFilter(null); setActiveView('overview'); }}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>

        <div style={dashboardStyles.contentCard}>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
              Client Management
            </h3>
            {clientInitialFilter && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d'
              }}>
                {clientInitialFilter === 'high_risk' ? 'High Risk' : clientInitialFilter === 'pep' ? 'PEP' : 'Overdue Review'}
              </span>
            )}
          </div>

          {stats.totalClients === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No clients yet</div>
              <div style={{ fontSize: '14px' }}>Clients will appear here once they are added to the system</div>
            </div>
          ) : (
            <ClientsList organizationId={profile.organization_id} navigate={navigate} initialFilter={clientInitialFilter} />
          )}
        </div>
      </div>
    );
  }

  if (activeView === 'alerts') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <STRAlertDashboard />
        </div>
      </div>
    );
  }

  if (activeView === 'screening') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <div style={{ marginTop: '20px' }}>
          <ScreeningDashboard onBack={() => setActiveView('overview')} />
        </div>
      </div>
    );
  }

  if (activeView === 'erasure') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <DataDeletionRequestsPanel orgId={profile?.organization_id} />
        </div>
      </div>
    );
  }

  if (activeView === 'assessment') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>

        <div style={dashboardStyles.contentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
              Institutional Risk Assessments
            </h3>
            <button
              onClick={createNewAssessment}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              + New Assessment
            </button>
          </div>

          {assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No assessments yet</div>
              <div style={{ fontSize: '14px', marginBottom: '24px' }}>Create your first institutional risk assessment to get started</div>
              <button
                onClick={createNewAssessment}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Create Assessment
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {assessments.slice(0, 10).map(assessment => (
                <div
                  key={assessment.id}
                  style={{
                    padding: '20px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                        {assessment.assessor_name || profile?.organization_name || 'Institutional Assessment'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                        Created: {new Date(assessment.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Status: <span style={{
                          color: assessment.status === 'completed' ? '#16a34a' : '#f59e0b',
                          fontWeight: '600'
                        }}>
                          {assessment.status === 'draft' ? 'Draft' :
                           assessment.status === 'in_progress' ? 'In Progress' :
                           assessment.status === 'completed' ? 'Completed' : assessment.status}
                        </span>
                      </div>
                    </div>
                    {assessment.overall_risk_rating && (
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: assessment.overall_risk_rating === 'High' ? '#fee2e2' :
                                   assessment.overall_risk_rating === 'Medium' ? '#fef3c7' : '#dcfce7',
                        color: assessment.overall_risk_rating === 'High' ? '#dc2626' :
                               assessment.overall_risk_rating === 'Medium' ? '#f59e0b' : '#16a34a'
                      }}>
                        {assessment.overall_risk_rating}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/assessment/${assessment.id}`);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {assessment.status === 'completed' ? 'Edit Assessment' : 'Continue Assessment'}
                    </button>
                    {assessment.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/report/${assessment.id}`);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          background: 'white',
                          color: '#0a1929',
                          border: '2px solid #0a1929',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        View Report
                      </button>
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

  return (
    <div style={dashboardStyles.pageContainer}>
      <PageHeader
        eyebrow="AML/CFT Compliance System"
        title="Compliance Dashboard"
        subtitle={<>
          {profile?.first_name && (
            <p style={{ color: '#d4af37', fontSize: '16px', margin: '0 0 4px 0', fontWeight: '600' }}>
              Welcome, {profile.first_name}
            </p>
          )}
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0 }}>
            Risk assessment, STR alerts, and compliance monitoring
          </p>
        </>}
        onBack={() => navigate(getBackRoute())}
        actions={
          <button
            onClick={() => navigate('/security/settings')}
            style={{
              padding: '6px 14px', background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '8px',
              color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4af37'; e.currentTarget.style.color = '#d4af37'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          >
            Security Settings
          </button>
        }
      />

      <div style={dashboardStyles.contentCard}>
        <h2 style={dashboardStyles.sectionTitle}>Compliance Metrics</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <StatCard
          title="High Risk Clients"
          value={stats.highRiskClients}
          icon="⚠️"
          color="#ef4444"
          onClick={() => { setClientInitialFilter('high_risk'); setActiveView('clients'); }}
        />
        <StatCard
          title="PEP Clients"
          value={stats.pepClients}
          icon="👔"
          color="#f59e0b"
          onClick={() => { setClientInitialFilter('pep'); setActiveView('clients'); }}
        />
        <StatCard
          title="Pending Alerts"
          value={stats.pendingAlerts}
          icon="🚨"
          color="#ef4444"
          onClick={() => setActiveView('alerts')}
        />
        <StatCard
          title="Overdue Reviews"
          value={stats.overdueReviews}
          icon="📅"
          color="#f59e0b"
          onClick={() => { setClientInitialFilter('overdue'); setActiveView('clients'); }}
        />
        <StatCard
          title="Active STRs"
          value={stats.activeSTRs}
          icon="📝"
          color="#6366f1"
          onClick={() => setActiveView('alerts')}
        />
        <StatCard
          title="Red Flag Incidents"
          value={stats.redFlagIncidents}
          icon="🚩"
          color="#ef4444"
          onClick={() => setActiveView('alerts')}
        />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={dashboardStyles.contentCard}>
          <h3 style={dashboardStyles.sectionTitle}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setActiveView('assessment')}
              style={dashboardStyles.button}
            >
              <span style={{ fontSize: '20px' }}>📊</span>
              Institutional Risk Assessment
            </button>
            <button
              onClick={() => setActiveView('clients')}
              style={dashboardStyles.button}
            >
              <span style={{ fontSize: '20px' }}>👥</span>
              View All Clients
            </button>
            <button
              onClick={() => setActiveView('alerts')}
              style={dashboardStyles.button}
            >
              <span style={{ fontSize: '20px' }}>🚨</span>
              Review Alerts
            </button>
            <button
              onClick={() => setActiveView('screening')}
              style={dashboardStyles.button}
            >
              <span style={{ fontSize: '20px' }}>🔍</span>
              Sanctions & Screening
            </button>
            <button
              onClick={() => setActiveView('erasure')}
              style={dashboardStyles.button}
            >
              <span style={{ fontSize: '20px' }}>🗑</span>
              Data Erasure Requests
            </button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`/kyc-client/${e.target.value}`, { state: { initialTab: 'monitoring' } });
                  }
                }}
                defaultValue=""
                disabled={kycClientsLoading}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
                  border: '2px solid #d4af37',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: kycClientsLoading ? 'wait' : 'pointer',
                  opacity: kycClientsLoading ? 0.7 : 1,
                }}
              >
                <option value="" disabled>
                  {kycClientsLoading ? 'Loading clients...' : 'View Client Case File'}
                </option>
                {kycClients.map((c) => {
                  const typeLabel = c.client_type === 'individual' ? 'Ind' : c.client_type === 'legal_entity' ? 'Ent' : c.client_type ? c.client_type.slice(0, 3) : '';
                  const idFragment = c.id.slice(-4);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.client_name}{typeLabel ? ` (${typeLabel} …${idFragment})` : ` (…${idFragment})`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div style={dashboardStyles.contentCard}>
          <h3 style={dashboardStyles.sectionTitle}>
            Recent Red Flag Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No recent incidents</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a1929' }}>
                      {item.kyc_clients?.client_name || 'Unknown Client'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(item.incident_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#4a5568' }}>
                    {item.incident_description.substring(0, 80)}
                    {item.incident_description.length > 80 ? '...' : ''}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: item.investigation_status === 'identified' ? '#fee2e2' : '#fef3c7',
                    color: item.investigation_status === 'identified' ? '#991b1b' : '#92400e'
                  }}>
                    {item.investigation_status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #3b82f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '18px', fontWeight: '700' }}>
              Compliance Priorities
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a', lineHeight: '1.8' }}>
              {stats.overdueReviews > 0 && (
                <li>Review {stats.overdueReviews} overdue client review{stats.overdueReviews !== 1 ? 's' : ''}</li>
              )}
              {stats.pendingAlerts > 0 && (
                <li>Investigate {stats.pendingAlerts} pending transaction alert{stats.pendingAlerts !== 1 ? 's' : ''}</li>
              )}
              {stats.redFlagIncidents > 0 && (
                <li>Address {stats.redFlagIncidents} red flag incident{stats.redFlagIncidents !== 1 ? 's' : ''}</li>
              )}
              {stats.conflictsPending > 0 && (
                <li>Resolve {stats.conflictsPending} pending conflict check{stats.conflictsPending !== 1 ? 's' : ''}</li>
              )}
              {stats.activeSTRs > 0 && (
                <li>Review {stats.activeSTRs} draft STR{stats.activeSTRs !== 1 ? 's' : ''}</li>
              )}
              {stats.overdueReviews === 0 && stats.pendingAlerts === 0 && stats.redFlagIncidents === 0 &&
               stats.conflictsPending === 0 && stats.activeSTRs === 0 && (
                <li>No urgent compliance tasks at this time</li>
              )}
            </ul>
          </div>
        </div>
      </div>


      {/* Role Upgrade Request Form Modal */}
      {showRoleUpgradeForm && (
        <RoleUpgradeRequestForm
          onClose={() => setShowRoleUpgradeForm(false)}
          onSuccess={() => {
            setShowRoleUpgradeForm(false);
            alert('Your role access request has been submitted successfully!');
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        flex: '1',
        minWidth: '150px'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '28px' }}>{icon}</span>
        <div style={{ fontSize: '32px', fontWeight: '700', color }}>{value}</div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{title}</div>
    </div>
  );
}

function ClientsList({ organizationId, navigate, initialFilter }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        let query = supabase
          .from('kyc_clients')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (initialFilter === 'high_risk') {
          query = query.eq('risk_level', 'high');
        } else if (initialFilter === 'pep') {
          query = query.eq('is_pep', true);
        } else if (initialFilter === 'overdue') {
          query = query.lt('next_review_date', new Date().toISOString().split('T')[0]);
        }

        const { data } = await query;
        setClients(data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      loadClients();
    }
  }, [organizationId, initialFilter]);

  if (loading) {
    return <LoadingSpinner minHeight="300px" />;
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {clients.map(client => (
        <div
          key={client.id}
          onClick={() => navigate(`/kyc-client/${client.id}`)}
          style={{
            padding: '20px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = '#d4af37';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                {client.client_name || client.full_name}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                {client.client_type === 'individual' ? 'Individual Client' : 'Legal Entity'}
              </div>
              {client.email && (
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {client.email}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                background: client.risk_rating === 'high' ? '#fee2e2' : client.risk_rating === 'medium' ? '#fef3c7' : '#dcfce7',
                color: client.risk_rating === 'high' ? '#dc2626' : client.risk_rating === 'medium' ? '#f59e0b' : '#16a34a'
              }}>
                {client.risk_rating?.toUpperCase() || 'UNRATED'}
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                background: client.kyc_status === 'approved' ? '#dcfce7' : '#fef3c7',
                color: client.kyc_status === 'approved' ? '#16a34a' : '#f59e0b'
              }}>
                {client.kyc_status ? client.kyc_status.replace('_', ' ').toUpperCase() : 'PENDING'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #f9fafb, #ffffff)',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    transition: 'all 0.3s ease',
    width: '100%',
    textAlign: 'left'
  }
};
