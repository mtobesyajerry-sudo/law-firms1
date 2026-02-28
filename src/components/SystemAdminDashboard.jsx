import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalAssessments: 0,
    totalClients: 0,
    activeUsers: 0,
    pendingRegistrations: 0,
    pendingRoleUpgrades: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { count: totalUsers },
        { count: totalOrgs },
        { count: totalAssessments },
        { count: totalClients },
        { count: activeUsers },
        { count: pendingRegs },
        { count: pendingUpgrades },
        { data: orgsData },
        { data: usersData },
        { data: activityData }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('kyc_clients').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('law_firm_registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('role_upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('organizations').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('user_profiles').select('*, organizations(name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalOrganizations: totalOrgs || 0,
        totalAssessments: totalAssessments || 0,
        totalClients: totalClients || 0,
        activeUsers: activeUsers || 0,
        pendingRegistrations: pendingRegs || 0,
        pendingRoleUpgrades: pendingUpgrades || 0,
      });

      setOrganizations(orgsData || []);
      setUsers(usersData || []);
      setRecentActivity(activityData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading system dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            System Administrator
          </div>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '36px', fontWeight: '800', color: 'white' }}>
            System Administration Dashboard
          </h1>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Full System Access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>{stats.totalOrganizations} Organizations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37' }}></div>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>{stats.totalUsers} Users</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <button
            onClick={signOut}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              border: '2px solid #d4af37',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #b91c1c, #991b1b)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
              e.currentTarget.style.borderColor = '#f0d883';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
              e.currentTarget.style.borderColor = '#d4af37';
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.activeTab : {})
            }}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            style={{
              ...styles.tab,
              ...(activeTab === 'organizations' ? styles.activeTab : {})
            }}
          >
            Organizations
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              ...styles.tab,
              ...(activeTab === 'users' ? styles.activeTab : {})
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            style={{
              ...styles.tab,
              ...(activeTab === 'registrations' ? styles.activeTab : {}),
              position: 'relative'
            }}
          >
            Registration Requests
            {stats.pendingRegistrations > 0 && (
              <span style={styles.badge}>{stats.pendingRegistrations}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              ...styles.tab,
              ...(activeTab === 'activity' ? styles.activeTab : {})
            }}
          >
            Activity Logs
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👥</div>
                <div style={styles.statValue}>{stats.totalUsers}</div>
                <div style={styles.statLabel}>Total Users</div>
                <div style={styles.statSubtext}>{stats.activeUsers} active</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🏢</div>
                <div style={styles.statValue}>{stats.totalOrganizations}</div>
                <div style={styles.statLabel}>Organizations</div>
                <div style={styles.statSubtext}>Registered firms</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📊</div>
                <div style={styles.statValue}>{stats.totalAssessments}</div>
                <div style={styles.statLabel}>Assessments</div>
                <div style={styles.statSubtext}>Total completed</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👤</div>
                <div style={styles.statValue}>{stats.totalClients}</div>
                <div style={styles.statLabel}>KYC Clients</div>
                <div style={styles.statSubtext}>Under monitoring</div>
              </div>
            </div>

            {stats.pendingRegistrations > 0 && (
              <div style={styles.alertCard}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                  Pending Actions Required
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#92400e' }}>
                  You have {stats.pendingRegistrations} pending registration request(s) and {stats.pendingRoleUpgrades} pending role upgrade request(s) awaiting review.
                </p>
                <button
                  onClick={() => setActiveTab('registrations')}
                  style={{
                    padding: '8px 16px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  Review Requests
                </button>
              </div>
            )}

            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Recent Organizations</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Organization Name</th>
                      <th style={styles.th}>Business Type</th>
                      <th style={styles.th}>Size</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id} style={styles.tr}>
                        <td style={styles.td}>{org.name}</td>
                        <td style={styles.td}>{org.business_type}</td>
                        <td style={styles.td}>{org.size}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: org.is_active ? '#d1fae5' : '#fee2e2',
                            color: org.is_active ? '#065f46' : '#991b1b'
                          }}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(org.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <button
                  onClick={() => navigate('/admin/security')}
                  style={styles.actionButton}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>Security Dashboard</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Manage system security</div>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  style={styles.actionButton}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>User Management</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>View and manage users</div>
                </button>
                <button
                  onClick={() => setActiveTab('organizations')}
                  style={styles.actionButton}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>Organizations</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Manage organizations</div>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'organizations' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>All Organizations</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Organization Name</th>
                    <th style={styles.th}>Business Type</th>
                    <th style={styles.th}>Size</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Subscription</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} style={styles.tr}>
                      <td style={styles.td}>{org.name}</td>
                      <td style={styles.td}>{org.business_type}</td>
                      <td style={styles.td}>{org.size}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: org.is_active ? '#d1fae5' : '#fee2e2',
                          color: org.is_active ? '#065f46' : '#991b1b'
                        }}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {org.subscription_expiry_date ? new Date(org.subscription_expiry_date).toLocaleDateString() : 'Unlimited'}
                      </td>
                      <td style={styles.td}>{new Date(org.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>All Users</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Organization</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>{user.full_name || 'N/A'}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: user.role === 'admin' ? '#fee2e2' : '#e0e7ff',
                          color: user.role === 'admin' ? '#991b1b' : '#3730a3'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={styles.td}>{user.organizations?.name || 'N/A'}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: user.is_active ? '#d1fae5' : '#fee2e2',
                          color: user.is_active ? '#065f46' : '#991b1b'
                        }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Pending Registration Requests</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Review and approve new organization registrations. Navigate to the Security Dashboard for detailed management.
            </p>
            <button
              onClick={() => navigate('/admin/security')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                color: '#0a1929',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
                transition: 'all 0.3s ease',
              }}
            >
              Go to Security Dashboard
            </button>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Recent Activity Logs</h3>
            <div style={{ overflowX: 'auto' }}>
              {recentActivity.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No activity logs available</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Timestamp</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Table</th>
                      <th style={styles.th}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((log) => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: log.action === 'INSERT' ? '#d1fae5' : log.action === 'UPDATE' ? '#e0e7ff' : '#fee2e2',
                            color: log.action === 'INSERT' ? '#065f46' : log.action === 'UPDATE' ? '#3730a3' : '#991b1b'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={styles.td}>{log.user_email || 'System'}</td>
                        <td style={styles.td}>{log.table_name}</td>
                        <td style={styles.td}>{log.ip_address || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    borderRadius: '0 0 16px 16px',
    padding: '32px 40px',
    marginBottom: '32px',
    border: '2px solid #d4af37',
    borderTop: 'none',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px',
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    padding: '16px 24px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  activeTab: {
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },
  badge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#ef4444',
    color: 'white',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '700',
    minWidth: '20px',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  statIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#0a1929',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '4px',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  alertCard: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)',
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
    padding: '24px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '14px',
    borderBottom: '3px solid #d4af37',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #e8eaed',
    transition: 'background 0.2s ease',
  },
  td: {
    padding: '12px',
    color: '#2d3748',
    fontSize: '14px',
  },
  actionButton: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
};
