import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import KYCClientManagement from './KYCClientManagement';
import STRAlertDashboard from './STRAlertDashboard';
import ScreeningDashboard from './ScreeningDashboard';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
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
  const [assessments, setAssessments] = useState([]);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [kycClients, setKycClients] = useState([]);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const getBackRoute = () => {
    return '/client/dashboard';
  };

  useEffect(() => {
    if (profile?.organization_id) {
      loadDashboardData();
    }
  }, [profile]);

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

      const { data: activity } = await supabase
        .from('client_red_flag_incidents')
        .select(`
          id,
          incident_date,
          incident_description,
          investigation_status,
          kyc_clients (client_name)
        `)
        .eq('organization_id', profile.organization_id)
        .order('incident_date', { ascending: false })
        .limit(10);

      setRecentActivity(activity || []);

      // Load remaining data in parallel
      const [usersRes, assessmentDataRes, clientsDataRes] = await Promise.all([
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
          .limit(100),

        supabase
          .from('kyc_clients')
          .select('id, client_name, current_risk_rating, pep_status, screening_status, created_at')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(200)
      ]);

      setOrganizationUsers(usersRes.data || []);
      setAssessments(assessmentDataRes.data || []);
      setKycClients(clientsDataRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading compliance dashboard..." />
      </div>
    );
  }

  if (activeView === 'clients') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>

        <div style={dashboardStyles.contentCard}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
              Client Management
            </h3>
          </div>

          {stats.totalClients === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No clients yet</div>
              <div style={{ fontSize: '14px' }}>Clients will appear here once they are added to the system</div>
            </div>
          ) : (
            <ClientsList organizationId={profile.organization_id} navigate={navigate} />
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
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ScreeningDashboard />
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
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerContent}>
          <div>
            <div style={dashboardStyles.headerTitle}>
              AML/CFT Compliance System
            </div>
            <h1 style={dashboardStyles.headerSubtitle}>
              Compliance Dashboard
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '16px', margin: '8px 0 0 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '8px 0 0 0' }}>
              Risk assessment, STR alerts, and compliance monitoring
            </p>
          </div>
          <button
            onClick={() => navigate(getBackRoute())}
            style={dashboardStyles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div style={dashboardStyles.contentCard}>
        <h2 style={dashboardStyles.sectionTitle}>Compliance Metrics</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <StatCard
          title="High Risk Clients"
          value={stats.highRiskClients}
          icon="⚠️"
          color="#ef4444"
          onClick={() => setActiveView('clients')}
        />
        <StatCard
          title="PEP Clients"
          value={stats.pepClients}
          icon="👔"
          color="#f59e0b"
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
        />
        <StatCard
          title="Active STRs"
          value={stats.activeSTRs}
          icon="📝"
          color="#6366f1"
        />
        <StatCard
          title="Red Flag Incidents"
          value={stats.redFlagIncidents}
          icon="🚩"
          color="#ef4444"
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

function ClientsList({ organizationId, navigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data } = await supabase
          .from('kyc_clients')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10);

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
  }, [organizationId]);

  if (loading) {
    return <LoadingSpinner text="Loading clients..." />;
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
