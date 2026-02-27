import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import MatterManagement from './MatterManagement';
import KYCClientManagement from './KYCClientManagement';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
import LoadingSpinner from './LoadingSpinner';
import RoleUpgradeRequestForm from './RoleUpgradeRequestForm';

export default function StaffDashboard() {
  const [showRoleUpgradeForm, setShowRoleUpgradeForm] = useState(false);
  const [stats, setStats] = useState({
    myMatters: 0,
    openMatters: 0,
    myClients: 0,
    highRiskClients: 0,
    conflictsPending: 0,
    eddRequired: 0,
    overdueReviews: 0
  });
  const [myMatters, setMyMatters] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.organization_id && user?.id) {
      loadDashboardData();
    }
  }, [profile, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data: matters } = await supabase
        .from('matters')
        .select(`
          *,
          client_matter_relationships (
            kyc_clients (
              id,
              client_name,
              risk_level
            )
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('responsible_lawyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: allMatters } = await supabase
        .from('matters')
        .select('id, status')
        .eq('organization_id', profile.organization_id)
        .eq('responsible_lawyer_id', user.id);

      const { data: clients } = await supabase
        .from('kyc_clients')
        .select(`
          *,
          client_matter_relationships (
            matter_id,
            matters (
              id,
              status,
              matter_name
            )
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('relationship_manager_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: allClients } = await supabase
        .from('kyc_clients')
        .select('id, risk_level, current_dd_level, next_review_due')
        .eq('organization_id', profile.organization_id)
        .eq('relationship_manager_id', user.id);

      const { data: conflicts } = await supabase
        .from('conflict_checks')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('resolution_status', 'pending');

      const today = new Date().toISOString().split('T')[0];
      const overdueReviews = allClients?.filter(c =>
        c.next_review_due && c.next_review_due < today
      ).length || 0;

      setMyMatters(matters || []);
      setMyClients(clients || []);
      setStats({
        myMatters: allMatters?.length || 0,
        openMatters: allMatters?.filter(m => m.status === 'open' || m.status === 'active').length || 0,
        myClients: allClients?.length || 0,
        highRiskClients: allClients?.filter(c => c.risk_level === 'high' || c.risk_level === 'very_high').length || 0,
        conflictsPending: conflicts?.length || 0,
        eddRequired: allClients?.filter(c => c.current_dd_level === 'enhanced').length || 0,
        overdueReviews
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading lawyer dashboard..." />
      </div>
    );
  }

  if (activeView === 'matters') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => {
            setActiveView('overview');
            loadDashboardData();
          }}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <MatterManagement />
        </div>
      </div>
    );
  }

  if (activeView === 'clients') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => {
            setActiveView('overview');
            loadDashboardData();
          }}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <KYCClientManagement />
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
              Staff Dashboard
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '16px', margin: '8px 0 0 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '8px 0 0 0' }}>
              Client management, KYC operations, and matter handling
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
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

      {(stats.overdueReviews > 0 || stats.conflictsPending > 0) && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          borderRadius: '12px',
          padding: '20px 24px',
          border: '2px solid #f59e0b',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(245,158,11,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '18px', fontWeight: '700' }}>
                Action Required
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                {stats.overdueReviews > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>📅</span>
                    <div>
                      <div style={{ fontWeight: '700', color: '#92400e', fontSize: '20px' }}>
                        {stats.overdueReviews}
                      </div>
                      <div style={{ fontSize: '13px', color: '#92400e' }}>
                        Overdue Client Review{stats.overdueReviews !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
                {stats.conflictsPending > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>⚖️</span>
                    <div>
                      <div style={{ fontWeight: '700', color: '#92400e', fontSize: '20px' }}>
                        {stats.conflictsPending}
                      </div>
                      <div style={{ fontSize: '13px', color: '#92400e' }}>
                        Pending Conflict Check{stats.conflictsPending !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>📊</span>
          My Workload Overview
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px'
        }}>
        <StatCard
          title="My Matters"
          value={stats.myMatters}
          icon="📁"
          color="#3b82f6"
          onClick={() => setActiveView('matters')}
        />
        <StatCard
          title="My Clients"
          value={stats.myClients}
          icon="👥"
          color="#8b5cf6"
          onClick={() => setActiveView('clients')}
        />
        <StatCard
          title="High Risk"
          value={stats.highRiskClients}
          icon="⚠️"
          color="#ef4444"
          onClick={() => setActiveView('clients')}
        />
        <StatCard
          title="EDD Required"
          value={stats.eddRequired}
          icon="🔍"
          color="#ec4899"
        />
        <StatCard
          title="Overdue Reviews"
          value={stats.overdueReviews}
          icon="📅"
          color="#f59e0b"
        />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #d4af37',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📁</span>
              My Active Matters
            </h3>
            <button
              onClick={() => setActiveView('matters')}
              style={styles.viewAllButton}
            >
              View All →
            </button>
          </div>
          {myMatters.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No matters assigned</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myMatters.map((matter) => {
                const statusStyle = getStatusStyle(matter.status);
                return (
                  <div
                    key={matter.id}
                    style={{
                      padding: '14px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d4af37';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a1929' }}>
                        {matter.matter_name}
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {matter.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {matter.matter_type.replace('_', ' ')} • {new Date(matter.opened_date).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #d4af37',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>👥</span>
              My Assigned Clients
            </h3>
            <button
              onClick={() => setActiveView('clients')}
              style={styles.viewAllButton}
            >
              View All →
            </button>
          </div>
          {myClients.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No clients assigned</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myClients.map((client) => {
                const riskStyle = getRiskStyle(client.risk_level);
                const matterCount = client.client_matter_relationships?.length || 0;
                const activeMatters = client.client_matter_relationships?.filter(
                  rel => rel.matters?.status === 'open' || rel.matters?.status === 'active'
                ).length || 0;

                return (
                  <div
                    key={client.id}
                    style={{
                      padding: '14px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => navigate(`/client-risk/${client.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d4af37';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a1929' }}>
                        {client.client_name}
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: riskStyle.bg,
                        color: riskStyle.color
                      }}>
                        {client.risk_level || 'medium'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{client.client_type}</span>
                      {client.is_pep && <span style={{ color: '#f59e0b', fontWeight: '600' }}>• PEP</span>}
                      {matterCount > 0 && (
                        <span style={{
                          color: '#3b82f6',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          • 📁 {activeMatters}/{matterCount} active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <button
            onClick={() => setActiveView('matters')}
            style={styles.actionButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb, #ffffff)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '24px' }}>📁</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Manage Matters</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {stats.myMatters} assigned
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveView('clients')}
            style={styles.actionButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb, #ffffff)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '24px' }}>👥</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Manage Clients</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {stats.myClients} assigned
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate('/client/dashboard')}
            style={styles.actionButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb, #ffffff)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '24px' }}>📊</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Firm Dashboard</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Strategic view
              </div>
            </div>
          </button>
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

function getStatusStyle(status) {
  const styles = {
    open: { bg: '#dbeafe', color: '#1e40af' },
    active: { bg: '#d1fae5', color: '#065f46' },
    on_hold: { bg: '#fef3c7', color: '#92400e' },
    closed: { bg: '#e5e7eb', color: '#374151' },
    conflict_pending: { bg: '#fee2e2', color: '#991b1b' }
  };
  return styles[status] || styles.open;
}

function getRiskStyle(riskLevel) {
  const styles = {
    low: { bg: '#d1fae5', color: '#065f46' },
    medium: { bg: '#fef3c7', color: '#92400e' },
    high: { bg: '#fee2e2', color: '#991b1b' },
    very_high: { bg: '#fce7f3', color: '#831843' }
  };
  return styles[riskLevel] || styles.medium;
}

const styles = {
  viewAllButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '16px',
    padding: '18px 20px',
    background: 'linear-gradient(135deg, #f9fafb, #ffffff)',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    transition: 'all 0.3s ease',
    textAlign: 'left'
  }
};
