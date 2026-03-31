import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ManagementUserApproval from './ManagementUserApproval';
import LoadingSpinner from './LoadingSpinner';

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalAssessments: 0,
    totalClients: 0,
    activeUsers: 0,
    pendingRegistrations: 0,
    pendingRoleUpgrades: 0,
    pendingNewUserRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== SYSTEM ADMIN DASHBOARD LOADED ===');
    console.log('Current user profile:', profile);
    loadDashboardData();
  }, [profile]);

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
        { data: activityData },
        { data: regRequestsData }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('kyc_clients').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('management_user_registrations').select('*', { count: 'exact', head: true }).eq('registration_status', 'pending'),
        supabase.from('role_upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('organizations').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('user_profiles').select('*, organizations(name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('management_user_registrations').select('*').eq('registration_status', 'pending').order('created_at', { ascending: false })
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalOrganizations: totalOrgs || 0,
        totalAssessments: totalAssessments || 0,
        totalClients: totalClients || 0,
        activeUsers: activeUsers || 0,
        pendingRegistrations: pendingRegs || 0,
        pendingRoleUpgrades: pendingUpgrades || 0,
        pendingNewUserRequests: 0,
      });

      // Enrich organizations with management user count
      const enrichedOrgs = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('role', 'management');

          return {
            ...org,
            management_user_count: count || 0
          };
        })
      );

      setOrganizations(enrichedOrgs);
      setUsers(usersData || []);
      setRecentActivity(activityData || []);
      setRegistrationRequests(regRequestsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRegistration = async (requestId) => {
    if (!confirm('Are you sure you want to approve this registration request?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'approve_registration',
          registrationId: requestId
        })
      });

      if (response.ok) {
        alert('Registration approved successfully!');
        loadDashboardData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to approve registration'}`);
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Failed to approve registration');
    }
  };

  const handleRejectRegistration = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('law_firm_registrations')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', requestId);

      if (error) throw error;

      alert('Registration rejected');
      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Failed to reject registration');
    }
  };

  const handleSuspendOrganization = async (org) => {
    const reason = prompt(`Enter reason for suspending ${org.name}:`);
    if (!reason) return;

    if (!confirm(`Are you sure you want to suspend ${org.name}? All users from this organization will lose access to the system.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('suspend_organization', {
        org_id: org.id,
        reason: reason,
        admin_id: profile.id
      });

      if (error) throw error;

      alert(`${org.name} has been suspended successfully.`);
      await loadDashboardData();
    } catch (error) {
      console.error('Error suspending organization:', error);
      alert('Failed to suspend organization: ' + error.message);
    }
  };

  const handleActivateOrganization = async (org) => {
    const paymentAmount = prompt(`Enter payment amount received (TZS) for ${org.name}:`);
    if (!paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (!confirm(`Activate ${org.name} with payment of TZS ${amount.toLocaleString()}?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('activate_organization', {
        org_id: org.id,
        admin_id: profile.id,
        payment_received: amount,
        payment_date: new Date().toISOString()
      });

      if (error) throw error;

      alert(`${org.name} has been activated successfully.`);
      await loadDashboardData();
    } catch (error) {
      console.error('Error activating organization:', error);
      alert('Failed to activate organization: ' + error.message);
    }
  };

  const handleUpdateSubscription = async (org) => {
    const newFee = prompt(`Enter new monthly subscription fee (TZS) for ${org.name}:`, org.subscription_fee || '0');
    if (newFee === null) return;

    const fee = parseFloat(newFee);
    if (isNaN(fee) || fee < 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_fee: fee
        })
        .eq('id', org.id);

      if (error) throw error;

      alert(`Subscription fee updated to TZS ${fee.toLocaleString()} per month.`);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const totalPendingActions = stats.pendingRegistrations + stats.pendingRoleUpgrades + stats.pendingNewUserRequests;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#d4af37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            SYSTEM ADMINISTRATOR
          </div>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '36px', fontWeight: '800', color: 'white' }}>
            {profile?.first_name ? `Welcome, ${profile.first_name}` : 'System Administration'}
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
        <button
          onClick={signOut}
          style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #d4af37, #b8941f)',
            border: '2px solid #d4af37',
            borderRadius: '8px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #b8941f, #9c7a1a)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.4)';
            e.currentTarget.style.borderColor = '#f0d883';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #d4af37, #b8941f)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(212, 175, 55, 0.3)';
            e.currentTarget.style.borderColor = '#d4af37';
          }}
        >
          Sign Out
        </button>
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
            Law Firms
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
            Registrations
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
          <button
            onClick={() => setActiveTab('policies')}
            style={{
              ...styles.tab,
              ...(activeTab === 'policies' ? styles.activeTab : {})
            }}
          >
            Policy Templates
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
                <div style={styles.statIcon}>⚖️</div>
                <div style={styles.statValue}>{stats.totalOrganizations}</div>
                <div style={styles.statLabel}>Law Firms</div>
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

            {totalPendingActions > 0 && (
              <div style={styles.alertCard}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                  Pending Actions Required
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#92400e' }}>
                  You have {stats.pendingRegistrations} pending registration request(s), {stats.pendingRoleUpgrades} role upgrade request(s), and {stats.pendingNewUserRequests} new user request(s) awaiting review.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {stats.pendingRegistrations > 0 && (
                    <button
                      onClick={() => setActiveTab('registrations')}
                      style={styles.alertButton}
                    >
                      Review Registrations ({stats.pendingRegistrations})
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/admin/security')}
                    style={styles.alertButton}
                  >
                    Security Dashboard
                  </button>
                </div>
              </div>
            )}

            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Recent Law Firms</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Law Firm Name</th>
                      <th style={styles.th}>BRELA Number</th>
                      <th style={styles.th}>Management Users</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600', color: '#0a1929' }}>{org.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{org.contact_email}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            color: '#0a1929',
                            fontWeight: '600'
                          }}>
                            {org.brela_registration || 'N/A'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: '#dbeafe',
                            color: '#1e40af'
                          }}>
                            {org.management_user_count || 0}/3
                          </span>
                        </td>
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
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>Security Dashboard</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Manage system security</div>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  style={styles.actionButton}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>User Management</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>View all system users</div>
                </button>
                <button
                  onClick={() => setActiveTab('organizations')}
                  style={styles.actionButton}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚖️</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>Law Firms</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Manage all law firms</div>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'organizations' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>All Law Firms</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Law Firm Name</th>
                    <th style={styles.th}>BRELA Number</th>
                    <th style={styles.th}>Contact Email</th>
                    <th style={styles.th}>Management Users</th>
                    <th style={styles.th}>Subscription</th>
                    <th style={styles.th}>Payment</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#0a1929' }}>{org.name}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          color: '#0a1929',
                          fontWeight: '600',
                          background: '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}>
                          {org.brela_registration || 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {org.contact_email || 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: '#dbeafe',
                          color: '#1e40af'
                        }}>
                          {org.management_user_count || 0}/3
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: org.subscription_status === 'active' ? '#dcfce7' : org.subscription_status === 'suspended' ? '#fee2e2' : '#fef3c7',
                            color: org.subscription_status === 'active' ? '#166534' : org.subscription_status === 'suspended' ? '#991b1b' : '#92400e'
                          }}>
                            {org.subscription_status?.toUpperCase() || 'ACTIVE'}
                          </span>
                          {org.subscription_fee > 0 && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              TZS {org.subscription_fee.toLocaleString()}/mo
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: '12px' }}>
                          {org.last_payment_date ? (
                            <>
                              <div style={{ color: '#0a1929', fontWeight: '600' }}>
                                Last: {new Date(org.last_payment_date).toLocaleDateString()}
                              </div>
                              {org.next_payment_due && (
                                <div style={{
                                  color: new Date(org.next_payment_due) < new Date() ? '#dc2626' : '#64748b',
                                  fontSize: '11px',
                                  marginTop: '2px'
                                }}>
                                  Due: {new Date(org.next_payment_due).toLocaleDateString()}
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#64748b' }}>No payments</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: org.subscription_status === 'active' && org.is_active ? '#d1fae5' : '#fee2e2',
                          color: org.subscription_status === 'active' && org.is_active ? '#065f46' : '#991b1b'
                        }}>
                          {org.subscription_status === 'active' && org.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {org.subscription_status === 'active' ? (
                            <button
                              onClick={() => handleSuspendOrganization(org)}
                              style={{
                                padding: '6px 12px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateOrganization(org)}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateSubscription(org)}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>All System Users</h3>
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
                      <td style={styles.td}>{user.full_name || '-'}</td>
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
                      <td style={styles.td}>{user.organizations?.name || '-'}</td>
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
          <ManagementUserApproval user={profile} />
        )}

        {activeTab === 'activity' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>System Activity Logs</h3>
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
                        <td style={styles.td}>{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div style={styles.sectionCard}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={styles.sectionTitle}>AML/CFT Policy Templates Library</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                Comprehensive, Tanzania-compliant policy templates ready for customization and implementation.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {policyTemplates.map((policy, index) => (
                <div key={index} style={{
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d4af37';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                        {policy.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        {policy.description}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(policy.content);
                        alert('Policy template copied to clipboard!');
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #b8941f, #9c7a1a)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #d4af37, #b8941f)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Copy Template
                    </button>
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: '1.6',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}>
                    {policy.content.substring(0, 500)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const policyTemplates = [
  {
    title: "1. Anti-Money Laundering (AML) Policy",
    description: "Comprehensive AML framework aligned with Tanzania's AML Act and FATF recommendations",
    content: `ANTI-MONEY LAUNDERING (AML) POLICY

1. PURPOSE AND SCOPE
This policy establishes [Organization Name]'s commitment to preventing money laundering and terrorist financing in compliance with the Anti-Money Laundering Act, 2006 (Cap. 423) and Financial Intelligence Act, 2015.

2. POLICY STATEMENT
[Organization Name] maintains a zero-tolerance approach to money laundering and will implement robust controls to detect and prevent ML/TF activities.

3. KEY PRINCIPLES
- Risk-Based Approach: Apply controls proportionate to identified ML/TF risks
- Customer Due Diligence: Verify customer identity and understand business relationships
- Ongoing Monitoring: Continuously monitor transactions for suspicious activity
- Reporting Obligations: Report suspicious transactions to Financial Intelligence Unit (FIU)

4. GOVERNANCE STRUCTURE
4.1 Board Responsibilities
- Approve AML/CFT policies and procedures
- Allocate adequate resources for AML compliance
- Review annual AML compliance reports

4.2 Management Responsibilities
- Implement board-approved AML policies
- Ensure staff training and awareness
- Maintain relationship with FIU and regulatory authorities

4.3 Compliance Officer Responsibilities
- Oversee day-to-day AML compliance
- Monitor transactions and investigate alerts
- Prepare and submit STR/CTR reports
- Conduct internal AML audits

5. CUSTOMER DUE DILIGENCE (CDD)
5.1 Standard Due Diligence
Required for all customers, including:
- Full name and any aliases
- Date and place of birth
- National ID or passport number
- Residential and business addresses
- Contact information
- Occupation and nature of business
- Purpose and intended nature of relationship

5.2 Enhanced Due Diligence (EDD)
Required for high-risk customers:
- Politically Exposed Persons (PEPs)
- High net-worth individuals
- Complex corporate structures
- Customers from high-risk jurisdictions
- Cash-intensive businesses

Additional EDD measures:
- Source of wealth verification
- Source of funds verification
- Beneficial ownership identification
- Enhanced ongoing monitoring
- Senior management approval

5.3 Simplified Due Diligence
May be applied to low-risk customers:
- Government entities
- Listed companies
- Regulated financial institutions

6. TRANSACTION MONITORING
6.1 Monitoring Systems
- Automated transaction monitoring system
- Risk-based thresholds and scenarios
- Regular review and tuning of detection rules

6.2 Red Flags and Indicators
- Transactions inconsistent with customer profile
- Unusual transaction patterns or volumes
- Attempts to avoid reporting thresholds
- Use of multiple accounts for no apparent reason
- Transactions involving high-risk jurisdictions

7. SUSPICIOUS TRANSACTION REPORTING
7.1 Internal Reporting
Staff must immediately report suspicious activities to the Compliance Officer.

7.2 STR Filing
Compliance Officer must file STR with FIU within 7 working days of suspicion arising.

7.3 Tipping-Off Prohibition
Strictly prohibited to inform customers or third parties about STR filings.

8. RECORD KEEPING
Maintain the following records for minimum 10 years:
- Customer identification documents
- Account files and business correspondence
- Transaction records
- STR and CTR reports
- Internal investigation reports

9. STAFF TRAINING
9.1 Initial Training
All new staff receive AML training within 30 days of joining.

9.2 Ongoing Training
Annual refresher training covering:
- Current ML/TF typologies
- Red flag indicators
- Reporting procedures
- Regulatory updates

10. SANCTIONS SCREENING
- Screen all customers against UN, US, EU sanctions lists
- Screen transactions in real-time
- Immediate escalation of matches to Compliance Officer

11. POLITICALLY EXPOSED PERSONS (PEPs)
- Maintain updated PEP database
- Enhanced due diligence for all PEPs
- Senior management approval for PEP relationships
- Enhanced ongoing monitoring

12. CORRESPONDENT BANKING
- Enhanced due diligence on respondent institutions
- Assess AML/CFT controls of respondent
- Document respective AML responsibilities
- Prohibit relationships with shell banks

13. WIRE TRANSFERS
- Obtain complete originator information
- Screen against sanctions lists
- Retain wire transfer records for 10 years

14. RISK ASSESSMENT
- Conduct enterprise-wide ML/TF risk assessment annually
- Assess customer, product, geographic, and delivery channel risks
- Update policies and procedures based on findings

15. INDEPENDENT AUDIT
- Annual independent AML audit
- Report findings to Board and Senior Management
- Implement corrective actions within specified timeframes

16. REGULATORY COMPLIANCE
- Comply with all directives from Bank of Tanzania
- Respond to FIU information requests within stipulated timeframes
- Participate in regulatory examinations

17. POLICY REVIEW
This policy will be reviewed annually or more frequently if required by regulatory changes.

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Review Date: [Date]`
  },
  {
    title: "2. Customer Due Diligence (CDD) Policy",
    description: "Detailed procedures for customer identification, verification, and risk assessment",
    content: `CUSTOMER DUE DILIGENCE (CDD) POLICY

1. PURPOSE
This policy establishes comprehensive customer due diligence procedures to comply with the Anti-Money Laundering Act and prevent ML/TF risks.

2. SCOPE
Applies to all customer relationships including:
- Individual customers
- Corporate and legal entity customers
- Beneficial owners
- Politically Exposed Persons (PEPs)

3. CDD LEVELS
3.1 Simplified Due Diligence (SDD)
3.2 Standard Due Diligence (CDD)
3.3 Enhanced Due Diligence (EDD)

4. RISK-BASED APPROACH
CDD level determined by risk assessment considering:
- Customer risk factors
- Product/service risk
- Delivery channel risk
- Geographic risk

5. IDENTIFICATION REQUIREMENTS

5.1 Individual Customers
Acceptable identification documents:
- National Identity Card (NIDA)
- Valid passport
- Driver's license
- Voter registration card

Required information:
- Full legal name
- Date and place of birth
- Nationality
- Residential address
- Tax Identification Number (TIN)
- Occupation and employer
- Source of income
- Purpose of account/relationship

5.2 Corporate Customers
Required documents:
- Certificate of Incorporation
- Business Registration Certificate (BRELA)
- Tax Identification Number (TIN)
- Memorandum and Articles of Association
- Board Resolution authorizing account opening
- Identification of authorized signatories
- Proof of business address

Required information:
- Legal name and trading name
- Business registration number
- Registered office address
- Nature of business
- Beneficial ownership structure
- Source of funds

6. BENEFICIAL OWNERSHIP

6.1 Definition
Individual(s) who ultimately own or control more than 25% of shares or voting rights, or exercise control through other means.

6.2 Identification Requirements
- Full name and identification details of each beneficial owner
- Percentage ownership or nature of control
- Copy of identification documents
- Proof of address

6.3 Complex Structures
For multi-layered ownership:
- Obtain organizational chart
- Identify ultimate beneficial owners
- Document ownership chain
- Verify control mechanisms

7. POLITICALLY EXPOSED PERSONS (PEPs)

7.1 Definition
Individuals entrusted with prominent public functions:
- Heads of State or Government
- Ministers and Deputy Ministers
- Members of Parliament
- Senior government officials
- Judicial officers
- Military officers (Colonel and above)
- Senior political party officials
- Board members of state corporations

7.2 PEP Categories
- Domestic PEPs
- Foreign PEPs
- International organization PEPs
- Family members of PEPs
- Close associates of PEPs

7.3 Enhanced Due Diligence for PEPs
- Obtain senior management approval
- Establish source of wealth
- Establish source of funds
- Conduct enhanced ongoing monitoring
- Review relationship annually

8. SOURCE OF WEALTH AND FUNDS

8.1 Source of Wealth (SOW)
Description of economic activities that generated customer's total net worth.

Required documentation:
- Employment contracts and payslips
- Business registration and financial statements
- Investment portfolios
- Inheritance documentation
- Property sale agreements

8.2 Source of Funds (SOF)
Origin of specific funds used in the business relationship.

Required documentation:
- Bank statements
- Loan agreements
- Sale agreements
- Invoices and receipts
- Tax returns

9. ONGOING MONITORING

9.1 Transaction Monitoring
- Monitor transactions for consistency with customer profile
- Identify unusual or suspicious patterns
- Set transaction limits based on risk profile

9.2 Periodic Review
Review frequency based on risk:
- High risk: Every 6 months
- Medium risk: Annually
- Low risk: Every 2 years

Review includes:
- Update customer information
- Verify continued business relationship purpose
- Review transaction activity
- Reassess risk rating

10. ENHANCED DUE DILIGENCE (EDD)

10.1 EDD Triggers
- High-risk customers (PEPs, high net worth)
- High-risk countries or geographic areas
- High-risk products or services
- Unusual or complex transactions
- Non-face-to-face relationships

10.2 Additional EDD Measures
- Obtain additional documentation
- Conduct independent verification
- Understand business relationship purpose
- Increased monitoring frequency
- Senior management approval

11. SIMPLIFIED DUE DILIGENCE (SDD)

11.1 SDD Eligibility
- Government ministries and agencies
- Listed companies on regulated exchanges
- Regulated financial institutions
- Low-risk products (e.g., small value accounts)

11.2 SDD Requirements
- Reduced documentation
- Less frequent monitoring
- Simplified verification procedures

12. NON-FACE-TO-FACE RELATIONSHIPS

12.1 Enhanced Verification
- Additional documents required
- Independent verification from reliable sources
- First payment through account in customer's name
- Callback to verified phone numbers

12.2 Digital Identity Verification
- Use of NIDA verification
- Biometric verification where available
- Electronic signature verification

13. THIRD-PARTY RELIANCE

13.1 Conditions for Reliance
May rely on third party if:
- Third party is regulated and supervised
- Third party has AML controls
- Written agreement in place
- Ultimate responsibility remains with institution

13.2 Requirements
- Immediately obtain CDD information from third party
- Take adequate steps to verify reliability
- Confirm third party will provide documents upon request

14. RECORD KEEPING
Maintain for minimum 10 years:
- Identification documents
- CDD questionnaires
- Source of wealth/funds documentation
- Risk assessment worksheets
- Ongoing monitoring records
- Correspondence with customer

15. SUSPICIOUS ACTIVITY REPORTING
If unable to complete CDD:
- Do not open account or conduct transaction
- Consider filing Suspicious Transaction Report (STR)
- Document reasons for declining relationship

16. STAFF TRAINING
- Initial CDD training for all staff
- Annual refresher training
- Updates on regulatory changes
- Red flag indicator training

17. QUALITY ASSURANCE
- Internal audit reviews CDD files quarterly
- Compliance tests samples monthly
- Report deficiencies to management
- Implement corrective actions

18. POLICY REVIEW
Annual review or upon regulatory changes.

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  },
  {
    title: "3. Suspicious Transaction Reporting (STR) Policy",
    description: "Procedures for identifying, documenting, and reporting suspicious activities",
    content: `SUSPICIOUS TRANSACTION REPORTING (STR) POLICY

1. PURPOSE
This policy establishes procedures for identifying, investigating, and reporting suspicious transactions to the Financial Intelligence Unit (FIU) in compliance with the Anti-Money Laundering Act and Financial Intelligence Act.

2. LEGAL FRAMEWORK
- Anti-Money Laundering Act, 2006 (Cap. 423)
- Financial Intelligence Act, 2015
- Proceeds of Crime Act, 1991
- Prevention of Terrorism Act, 2002

3. DEFINITION
A suspicious transaction is any transaction that:
- Gives rise to reasonable grounds to suspect money laundering or terrorist financing
- Is inconsistent with customer's known legitimate business
- Involves funds believed to be proceeds of crime
- Lacks apparent economic or lawful purpose

4. REPORTING OBLIGATION
4.1 Who Must Report
All staff members must immediately report suspicious activities to the Compliance Officer.

4.2 Compliance Officer Duties
- Conduct preliminary investigation
- Determine if STR filing is warranted
- File STR with FIU within 7 working days
- Maintain STR records

5. SUSPICIOUS ACTIVITY INDICATORS

5.1 Customer Behavior Red Flags
- Reluctance to provide identification or information
- Provision of false, misleading, or suspicious information
- Unusual nervousness or evasiveness
- Attempts to avoid contact with staff
- Coercion or intimidation of staff
- Customer with no legitimate explanation for activities

5.2 Transaction Red Flags
- Transactions inconsistent with customer profile
- Structuring transactions to avoid reporting thresholds
- Transactions just below reporting limits
- Multiple deposits followed by immediate withdrawals
- Frequent deposits or withdrawals of cash
- Large cash deposits by business that normally uses checks
- Deposits followed by immediate wire transfers
- Transactions involving high-risk jurisdictions

5.3 Account Activity Red Flags
- Account opened with minimal information
- Account shows little activity after opening, then suddenly very active
- Significant increase in account activity without explanation
- Use of multiple accounts for no apparent reason
- Funds transferred between related accounts without explanation
- Dormant account suddenly becomes active

5.4 Business Relationship Red Flags
- Customer business unclear or difficult to understand
- Business inconsistent with customer profile
- No clear business reason for transaction
- Transaction appears unrelated to customer's business
- Complex ownership structure without clear business purpose

5.5 High-Risk Products/Services
- Bearer shares or instruments
- Trust structures with unnamed beneficiaries
- Correspondent banking
- Wire transfers to/from high-risk jurisdictions
- Cash-intensive businesses

5.6 Geographic Red Flags
- Transactions involving countries with:
  - Inadequate AML systems
  - High levels of corruption
  - Significant drug trafficking
  - Terrorist activity
  - FATF non-cooperative jurisdictions

6. INTERNAL REPORTING PROCESS

6.1 Staff Responsibilities
All staff must:
- Remain alert for suspicious activity
- Document observations immediately
- Report to Compliance Officer without delay
- Continue normal customer service
- Not disclose suspicions to customer (no tipping-off)

6.2 Internal Report Contents
- Customer identification details
- Description of suspicious activity
- Dates and amounts of transactions
- Supporting documentation
- Name of reporting staff member

6.3 Timeframe
Report suspicious activity immediately, but no later than 24 hours after identification.

7. COMPLIANCE OFFICER INVESTIGATION

7.1 Initial Review
- Review internal report
- Examine customer account history
- Analyze transaction patterns
- Check customer due diligence files

7.2 Additional Investigation
- Interview relevant staff
- Review related accounts
- Check for prior suspicious activity reports
- Research public information about customer
- Review beneficial ownership structure

7.3 Risk Assessment
Evaluate:
- Nature and extent of suspicious activity
- Customer risk rating
- Transaction risk factors
- Strength of suspicion

7.4 Decision
Within 5 working days, determine:
- File STR with FIU
- Continue monitoring without filing
- Conduct additional investigation

8. STR FILING PROCEDURES

8.1 STR Contents
- Customer identification information
- Account details
- Description of suspicious activity
- Transaction details (dates, amounts, parties)
- Supporting documentation
- Reason for suspicion
- Other relevant information

8.2 Filing Method
- Submit through FIU online portal
- Encrypted email to FIU
- Hand delivery (for urgent cases)

8.3 Timeframe
File STR within 7 working days of forming suspicion.

8.4 Acknowledgment
- Obtain FIU acknowledgment receipt
- Record filing date and reference number
- File acknowledgment with STR documentation

9. CURRENCY TRANSACTION REPORTS (CTR)

9.1 Reporting Threshold
Cash transactions of TZS 30,000,000 or more (or equivalent in foreign currency) must be reported to FIU within 7 working days.

9.2 CTR Contents
- Customer identification
- Transaction date and amount
- Type of transaction (deposit, withdrawal, exchange)
- Source or destination of funds
- Purpose of transaction

9.3 Multiple Transactions
Aggregate related transactions within same business day that equal or exceed threshold.

10. TIPPING-OFF PROHIBITION

10.1 Definition
Tipping-off means disclosing to customer or third party:
- STR has been filed
- Investigation is underway
- Law enforcement action is contemplated

10.2 Prohibited Actions
- Informing customer about STR filing
- Explaining reasons for information requests
- Discussing suspicions with anyone except authorized persons
- Closing account immediately after filing STR

10.3 Consequences
Tipping-off is a criminal offense punishable by:
- Imprisonment up to 3 years
- Fine up to TZS 10,000,000
- Professional sanctions

11. CONTINUING BUSINESS RELATIONSHIP

11.1 After STR Filing
- Continue normal business relationship unless instructed otherwise by FIU
- Do not refuse transactions without valid business reason
- Maintain enhanced monitoring
- Document all subsequent activities

11.2 Account Closure
Only close account if:
- FIU issues directive
- Valid business reasons exist
- Risk is unacceptable
Do not cite STR as reason for closure.

12. FIU REQUESTS FOR INFORMATION

12.1 Response Requirements
- Respond within timeframe specified by FIU
- Provide all requested information
- Designate authorized contact person
- Maintain confidentiality

12.2 Authorized Personnel
Only Compliance Officer and designated deputies may:
- Communicate with FIU
- Respond to information requests
- Provide clarifications

13. LAW ENFORCEMENT COOPERATION

13.1 Cooperation Obligations
- Provide information requested by law enforcement
- Do not obstruct investigations
- Maintain confidentiality
- Protect evidence

13.2 Account Freezing
If directed by court order or FIU:
- Immediately freeze account
- Do not inform customer
- Document all activities
- Cooperate with authorities

14. RECORD KEEPING

14.1 STR Records
Maintain for minimum 10 years:
- Internal suspicious activity reports
- Investigation notes
- STR filed with FIU
- FIU acknowledgments
- Supporting documentation
- Correspondence with FIU

14.2 Security
- Store in secure location
- Restrict access to authorized personnel
- Implement confidentiality measures

15. STAFF TRAINING

15.1 Initial Training
All staff receive training on:
- Legal obligations
- Red flag indicators
- Reporting procedures
- Tipping-off prohibition

15.2 Ongoing Training
- Annual refresher training
- Updates on new typologies
- Case studies and scenarios
- Regulatory changes

16. QUALITY ASSURANCE

16.1 Internal Audit
- Review STR processes quarterly
- Test compliance with procedures
- Evaluate quality of STR reports
- Report findings to management

16.2 Metrics
Track and report:
- Number of internal reports
- Number of STRs filed
- Time to file STRs
- Investigation completion time
- FIU feedback

17. PROTECTION OF REPORTING PERSONS

17.1 Legal Protection
Staff who report in good faith are protected from:
- Civil liability
- Criminal prosecution
- Disciplinary action
- Breach of confidentiality claims

17.2 Confidentiality
Identity of reporting person kept confidential except:
- Required by court order
- Authorized by reporting person
- Required by law enforcement

18. POLICY REVIEW
Review annually or upon regulatory changes.

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  },
  {
    title: "4. Know Your Customer (KYC) Policy",
    description: "Comprehensive framework for customer identification and ongoing due diligence",
    content: `KNOW YOUR CUSTOMER (KYC) POLICY

1. PURPOSE AND SCOPE
This policy establishes the framework for customer identification, verification, and risk assessment to prevent money laundering, terrorist financing, and other financial crimes.

2. POLICY STATEMENT
[Organization Name] will only establish business relationships with customers whose identity has been satisfactorily verified and whose business appears legitimate.

3. REGULATORY FRAMEWORK
- Anti-Money Laundering Act, 2006
- Financial Intelligence Act, 2015
- Bank of Tanzania AML/CFT Guidelines
- FATF Recommendations

4. KYC PRINCIPLES
4.1 Customer Acceptance Policy
- Clear customer acceptance criteria
- Risk-based customer categorization
- Prohibited customer categories
- Enhanced scrutiny for high-risk customers

4.2 Customer Identification
- Verify identity using reliable, independent documents
- Obtain customer information before establishing relationship
- Understand nature and purpose of relationship

4.3 Ongoing Due Diligence
- Monitor transactions against customer profile
- Keep customer information current
- Review relationships periodically

4.4 Risk Management
- Assess and categorize customer risk
- Apply controls commensurate with risk
- Enhanced due diligence for high-risk customers

5. CUSTOMER ACCEPTANCE POLICY

5.1 General Principles
- Accept only customers whose identity can be verified
- Decline customers unable or unwilling to provide required information
- Conduct enhanced due diligence for high-risk customers
- Obtain senior management approval for high-risk relationships

5.2 Prohibited Customers
Will not accept:
- Anonymous or fictitious name accounts
- Shell banks (correspondent banking)
- Unlicensed money service businesses
- Customers on sanctions lists
- Customers with clear criminal links

5.3 High-Risk Customers Requiring EDD
- Politically Exposed Persons (PEPs)
- Non-resident customers
- Cash-intensive businesses
- Non-face-to-face customers
- Customers from high-risk jurisdictions
- High net worth individuals
- Complex ownership structures
- Dealers in precious metals/stones

6. CUSTOMER IDENTIFICATION - INDIVIDUALS

6.1 Required Information
- Full legal name (including former names)
- Date and place of birth
- Nationality and resident status
- National ID/Passport number
- Tax Identification Number (TIN)
- Residential address (verified)
- Contact information (phone, email)
- Occupation and employer details
- Source of income/wealth
- Purpose and intended nature of relationship
- Expected account activity

6.2 Acceptable Identification Documents
Primary Documents (at least one required):
- National Identity Card (NIDA)
- Valid passport
- Driver's license

Secondary Documents (for address verification):
- Utility bills (TANESCO, DAWASCO)
- Bank statements
- Lease agreements
- Tax assessments

6.3 Verification Requirements
- Obtain original documents or certified copies
- Verify authenticity of documents
- Take copies for customer file
- Cross-check information across documents
- Verify with issuing authority if suspicious

7. CUSTOMER IDENTIFICATION - LEGAL ENTITIES

7.1 Corporate Customers
Required Documents:
- Certificate of Incorporation
- Business Registration (BRELA) Certificate
- Tax Identification Number (TIN)
- Memorandum and Articles of Association
- Board Resolution authorizing account opening
- Business license
- List of directors and shareholders
- Identification of authorized signatories
- Proof of business address
- Recent financial statements

Required Information:
- Legal name and trading names
- Business registration number
- Registered office address
- Nature of business activities
- Ownership structure
- Beneficial ownership information
- Expected transaction volumes
- Source of funds

7.2 Partnerships
Required Documents:
- Partnership deed
- Business registration certificate
- Tax Identification Number
- Identification of all partners
- Authorization for account operation
- Business license
- Proof of business address

7.3 Trusts
Required Documents:
- Trust deed
- Trustee identification
- Settlor identification
- Beneficiaries identification
- Purpose of trust
- Source of trust assets

7.4 NGOs and Associations
Required Documents:
- Certificate of Registration
- Constitution or bylaws
- List of office bearers
- Authorization resolution
- Tax exemption certificate (if applicable)
- Donor information

8. BENEFICIAL OWNERSHIP

8.1 Definition
Individual(s) who:
- Own 25% or more of shares or voting rights
- Exercise control through other means
- Are senior managing officials (if no person meets above criteria)

8.2 Identification Requirements
For each beneficial owner obtain:
- Full name and identification details
- Percentage of ownership or nature of control
- Copy of identification document
- Proof of address
- Source of wealth information

8.3 Ownership Chain Documentation
For complex structures:
- Organizational chart showing ownership layers
- Identification at each ownership layer
- Documentation of control mechanisms
- Ultimate beneficial owner identification

9. POLITICALLY EXPOSED PERSONS (PEPs)

9.1 Definition and Categories
Domestic PEPs:
- Current or former senior government officials
- Heads of state corporations
- Senior judicial officers
- Senior military officers
- Senior political party officials

Foreign PEPs:
- Individuals holding prominent public functions in foreign countries

International Organization PEPs:
- Senior officials of international organizations

Family Members:
- Spouse, children, parents, siblings

Close Associates:
- Business partners of PEPs
- Persons with joint beneficial ownership

9.2 Enhanced Due Diligence Requirements
- Obtain senior management approval
- Establish source of wealth
- Establish source of funds
- Conduct enhanced ongoing monitoring
- Update information at least annually
- Review relationship if PEP status changes

9.3 PEP Screening
- Screen at onboarding against PEP databases
- Screen periodically (at least annually)
- Screen before significant transactions
- Document screening results

10. CUSTOMER RISK RATING

10.1 Risk Factors

Customer Risk:
- Occupation/business type
- Expected transaction volume
- PEP status
- Public information (adverse media)
- Length of relationship

Product/Service Risk:
- Cash-intensive products
- International wire transfers
- Correspondent banking
- Trade finance

Geographic Risk:
- High-risk jurisdictions
- Offshore financial centers
- Weak AML regimes
- Sanctions countries

Delivery Channel Risk:
- Non-face-to-face relationships
- Third-party intermediaries
- Remote access channels

10.2 Risk Categories
Low Risk:
- Government entities
- Listed companies
- Regulated financial institutions
- Salaried individuals with simple transactions

Medium Risk:
- Most retail customers
- Small businesses
- Standard products

High Risk:
- PEPs
- Cash-intensive businesses
- Non-resident customers
- Complex structures
- High net worth individuals
- Customers from high-risk countries

10.3 Risk Rating Process
- Assign preliminary risk rating at onboarding
- Document risk factors considered
- Obtain appropriate approval levels
- Review and update risk rating periodically

11. ONGOING DUE DILIGENCE

11.1 Transaction Monitoring
- Monitor transactions for consistency with customer profile
- Identify unusual patterns or suspicious activity
- Set transaction limits based on risk profile
- Investigate significant deviations

11.2 Periodic Review Schedule
High Risk: Every 6 months
Medium Risk: Annually
Low Risk: Every 2 years

11.3 Periodic Review Process
- Update customer information
- Verify continued business relationship purpose
- Review transaction activity
- Obtain new documentation if needed
- Reassess risk rating
- Document review completion

11.4 Event-Driven Reviews
Conduct immediate review if:
- Significant transaction inconsistent with profile
- Adverse media information
- Customer behavior changes
- PEP status determined
- Regulatory directive received

12. SOURCE OF WEALTH AND FUNDS

12.1 Source of Wealth (SOW)
Economic activities generating customer's total net worth.

Documentation Required:
- Employment income: Employment contracts, payslips, tax returns
- Business income: Financial statements, tax returns, business registration
- Investment income: Portfolio statements, dividend reports
- Property income: Rental agreements, property valuations
- Inheritance: Probate documents, succession certificates
- Sale of assets: Sale agreements, payment evidence

12.2 Source of Funds (SOF)
Origin of specific funds in the business relationship.

Documentation Required:
- Bank statements showing fund origin
- Loan agreements and disbursement evidence
- Sale agreements and payment receipts
- Gift letters and donor identification
- Investment redemption statements

13. NON-FACE-TO-FACE CUSTOMERS

13.1 Enhanced Verification
- Additional identification documents required
- Independent verification from reliable sources
- Callback to verified phone numbers
- First payment through account in customer's name
- Increased monitoring

13.2 Digital Identity Verification
- NIDA electronic verification
- Biometric verification
- Video identification
- Electronic signature verification

14. SIMPLIFIED DUE DILIGENCE

14.1 Eligible Customers
- Government ministries and departments
- Listed companies on regulated exchanges
- Regulated financial institutions
- Low-value accounts (below specified threshold)

14.2 Reduced Requirements
- Simplified identification
- Less frequent monitoring
- Lower documentation requirements

15. ENHANCED DUE DILIGENCE (EDD)

15.1 When EDD Required
- High-risk customers
- Unusual transactions without clear economic purpose
- Complex or unusually large transactions
- Customers from high-risk jurisdictions
- Adverse media information

15.2 Additional EDD Measures
- Additional information and documentation
- Independent information sources
- Enhanced ongoing monitoring
- Senior management involvement
- More frequent account reviews

16. RECORD KEEPING

16.1 Records to Maintain
- Customer identification documents
- Account opening forms
- Risk assessment documentation
- Transaction records
- Correspondence with customer
- Internal investigation reports
- Review and update documentation

16.2 Retention Period
Minimum 10 years after:
- Account closure
- End of business relationship
- Date of transaction

16.3 Record Access
- Available to internal auditors
- Available to regulatory authorities
- Available to law enforcement (with proper authorization)
- Confidentiality maintained

17. STAFF TRAINING

17.1 Initial Training
All customer-facing staff receive training on:
- KYC requirements
- Identification verification
- Risk assessment
- Red flag recognition
- Reporting procedures

17.2 Ongoing Training
- Annual refresher training
- Updates on regulatory changes
- New typologies and risks
- Case studies

18. QUALITY ASSURANCE

18.1 Compliance Monitoring
- Sample testing of new accounts monthly
- Review of periodic updates quarterly
- Exception reporting
- Corrective action tracking

18.2 Internal Audit
- Annual comprehensive KYC audit
- Report findings to management and board
- Track remediation actions

19. GOVERNANCE AND OVERSIGHT

19.1 Board Responsibilities
- Approve KYC policy
- Review KYC effectiveness annually
- Ensure adequate resources

19.2 Management Responsibilities
- Implement KYC procedures
- Allocate resources
- Address audit findings

19.3 Compliance Officer Responsibilities
- Oversee KYC implementation
- Monitor compliance
- Report to management
- Liaise with regulators

20. POLICY REVIEW
Annual review or upon significant regulatory changes.

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  },
  {
    title: "5. Transaction Monitoring Policy",
    description: "Framework for continuous monitoring and analysis of customer transactions",
    content: `TRANSACTION MONITORING POLICY

1. PURPOSE
This policy establishes a comprehensive framework for monitoring customer transactions to detect suspicious activities, ensure compliance with regulations, and manage ML/TF risks.

2. SCOPE
Applies to all customer transactions including:
- Cash deposits and withdrawals
- Fund transfers (domestic and international)
- Account-to-account transfers
- Trade finance transactions
- Foreign exchange transactions
- Electronic banking transactions
- Mobile money transactions
- Payment processing

3. REGULATORY FRAMEWORK
- Anti-Money Laundering Act, 2006
- Financial Intelligence Act, 2015
- Bank of Tanzania Guidelines
- FATF Recommendations

4. POLICY STATEMENT
[Organization Name] will implement robust transaction monitoring systems and procedures to detect and report suspicious transactions while maintaining efficient customer service.

5. TRANSACTION MONITORING OBJECTIVES
- Detect potentially suspicious transactions
- Identify structuring and other ML/TF patterns
- Ensure compliance with reporting obligations
- Support risk-based customer reviews
- Generate management information
- Demonstrate regulatory compliance

6. RISK-BASED APPROACH

6.1 Risk Factors
Customer Risk:
- High-risk customer categories
- PEP status
- Previous suspicious activity
- High-risk jurisdictions
- Cash-intensive businesses

Transaction Risk:
- Large or unusual transactions
- Complex transactions
- Rapid movement of funds
- High-risk products/services
- High-risk countries involved

6.2 Risk-Based Monitoring
- Enhanced monitoring for high-risk customers
- Higher thresholds for low-risk customers
- More frequent reviews of high-risk relationships
- Automated alerts calibrated by risk

7. MONITORING METHODS

7.1 Automated Transaction Monitoring
- Rules-based detection system
- Scenario-based monitoring
- Real-time and batch processing
- Alert generation and management
- Exception reporting

7.2 Manual Monitoring
- Front-line staff observation
- Branch manager reviews
- Compliance officer investigations
- Periodic account reviews

7.3 Hybrid Approach
Combination of:
- Automated system alerts
- Staff reporting
- Management review
- Risk-based sampling

8. MONITORING SCENARIOS

8.1 Cash Activity Monitoring
- Cash deposits above threshold
- Multiple cash deposits below threshold (structuring)
- Cash deposits inconsistent with business type
- Unusual patterns of cash activity
- Cash deposits followed by immediate transfers
- ATM activity inconsistent with profile

Thresholds:
- Single transaction: TZS 5,000,000
- Cumulative daily: TZS 10,000,000
- Structuring pattern: 3+ transactions near threshold

8.2 Wire Transfer Monitoring
- Incoming wires from high-risk countries
- Outgoing wires to high-risk countries
- Wire transfers inconsistent with customer profile
- Round-robin wire transfers
- Wires followed by cash withdrawals
- Beneficiary and originator in same high-risk country

Thresholds:
- International wires: TZS 10,000,000
- Multiple wires: 3+ in one day
- High-risk countries: Any amount

8.3 Account Activity Monitoring
- Dormant account suddenly active
- Significant increase in transaction volume
- Sudden change in transaction patterns
- Account used as pass-through
- Transactions inconsistent with stated purpose
- Multiple related accounts with unusual activity

Indicators:
- 200% increase in monthly volume
- 300% increase in transaction frequency
- Account dormant >6 months then active
- Balance remains near zero despite high turnover

8.4 Structuring Detection
- Multiple transactions just below reporting threshold
- Multiple locations used for transactions
- Multiple related accounts used
- Timing patterns (end of day, weekends)
- Different persons making deposits

Patterns:
- 3+ transactions in one day, each 70-90% of threshold
- Daily pattern of near-threshold transactions
- Multiple branches used
- Different branches on same day

8.5 Trade Finance Monitoring
- Overvaluation or undervaluation of goods
- Rapid commodity trading
- Shipment inconsistent with business
- High-risk origin or destination countries
- Circular trading patterns
- Third-party payments

8.6 Geographic Risk Monitoring
- Transactions involving:
  - FATF high-risk jurisdictions
  - Tax havens
  - Countries with weak AML controls
  - Conflict zones
  - Countries under sanctions

8.7 Customer Behavior Monitoring
- Reluctance to provide information
- Attempts to avoid documentation
- Unusual interest in reporting requirements
- Lack of concern about unfavorable terms
- Coercion of staff

9. CURRENCY TRANSACTION REPORTING

9.1 Reporting Threshold
Cash transactions ≥ TZS 30,000,000 (or foreign currency equivalent)

9.2 Aggregation Rules
Aggregate multiple cash transactions by same customer in one business day if total ≥ threshold.

9.3 Exemptions
May exempt:
- Government entities
- Financial institutions
- Listed companies
After proper due diligence and senior management approval.

9.4 Filing Requirements
File CTR with FIU within 7 working days including:
- Customer identification
- Transaction details
- Currency type and amount
- Source or destination of funds
- Purpose of transaction

10. ALERT MANAGEMENT

10.1 Alert Generation
Automated system generates alerts when:
- Threshold exceeded
- Scenario pattern detected
- Risk score elevated
- Watchlist match found

10.2 Alert Prioritization
Priority Levels:
- Critical: Immediate review required (PEPs, sanctions hits, very high amounts)
- High: Review within 24 hours
- Medium: Review within 3 days
- Low: Review within 7 days

10.3 Alert Investigation Process

Step 1: Initial Review (2 hours)
- Review alert details
- Check customer profile and risk rating
- Review recent account activity
- Identify obvious false positives

Step 2: Investigation (1-3 days)
- Interview customer if appropriate
- Review supporting documentation
- Analyze transaction patterns
- Check related accounts and relationships
- Review external information sources

Step 3: Disposition (5 days maximum)
- Clear as false positive (document reason)
- Continue monitoring (set review date)
- Escalate to Compliance Officer
- File Suspicious Transaction Report (STR)

10.4 Alert Documentation
Document for each alert:
- Alert details and trigger
- Investigation steps taken
- Information reviewed
- Disposition decision and rationale
- Approvals obtained
- Date of completion

11. THRESHOLD REPORTS

11.1 Daily Reports
- Cash transactions > TZS 5,000,000
- Wire transfers > TZS 10,000,000
- Foreign exchange > USD 10,000
- Transactions to/from high-risk countries

11.2 Weekly Reports
- Top 20 accounts by transaction volume
- Top 20 accounts by transaction count
- Dormant accounts becoming active
- High velocity accounts
- Negative news/watchlist matches

11.3 Monthly Reports
- CTR filing summary
- STR filing summary
- Alert volume and disposition
- False positive analysis
- System performance metrics
- High-risk customer activity summary

12. WATCH LIST SCREENING

12.1 Screening Lists
- UN Security Council Sanctions
- OFAC (US Treasury) Sanctions
- EU Sanctions
- UK Sanctions
- Interpol Most Wanted
- PEP lists
- Adverse media databases

12.2 Screening Triggers
- Account opening
- Transaction processing (real-time)
- Periodic batch screening (weekly)
- List updates

12.3 Match Review Process
- Verify if true match or false positive
- Document match details
- Escalate true matches immediately
- Freeze transaction/account if required
- Report to FIU if applicable
- Notify senior management

13. SYSTEM TUNING AND OPTIMIZATION

13.1 Performance Metrics
Track monthly:
- Alert volume by scenario
- False positive rate by scenario
- Average investigation time
- Alert aging
- STR conversion rate
- Coverage ratio

13.2 Tuning Activities
- Review thresholds quarterly
- Adjust scenarios based on effectiveness
- Add new scenarios for emerging risks
- Refine segmentation logic
- Update risk factors

13.3 Model Validation
Annual validation includes:
- Scenario effectiveness review
- False positive analysis
- True positive identification (back-testing)
- Coverage assessment
- Regulatory requirement mapping

14. ROLES AND RESPONSIBILITIES

14.1 Front-Line Staff
- Report unusual transactions immediately
- Provide information to investigations
- Execute monitoring procedures
- Document observations

14.2 Transaction Monitoring Team
- Review automated alerts
- Conduct investigations
- Clear false positives
- Escalate suspicious activity
- Maintain alert documentation

14.3 Compliance Officer
- Oversee monitoring program
- Review escalated alerts
- Determine STR filing
- Report to FIU
- Manage regulatory relationships
- Report to senior management

14.4 Senior Management
- Approve monitoring policy
- Review effectiveness reports
- Allocate resources
- Oversee major investigations
- Interface with regulators

14.5 Internal Audit
- Test monitoring effectiveness
- Review sample of alerts
- Assess compliance with procedures
- Report findings and recommendations

15. STAFF TRAINING

15.1 Initial Training
All monitoring staff receive training on:
- ML/TF typologies
- Monitoring scenarios and thresholds
- Alert investigation procedures
- System operation
- Documentation requirements
- Escalation procedures

15.2 Ongoing Training
- Quarterly updates on new typologies
- Annual refresher training
- System updates and enhancements
- Regulatory changes
- Case studies

16. QUALITY ASSURANCE

16.1 Quality Reviews
- Sample 5% of cleared alerts monthly
- Review 100% of STRs filed
- Assess investigation quality
- Verify documentation adequacy
- Check timeliness compliance

16.2 Corrective Actions
- Identify deficiencies
- Implement corrections
- Additional training if needed
- Process improvements
- Follow-up verification

17. RECORD KEEPING

17.1 Records to Maintain (10 years)
- Alert details and investigations
- Disposition decisions and rationale
- Supporting documentation
- CTRs and STRs filed
- System tuning documentation
- Training records
- Quality review results

17.2 Record Security
- Restrict access to authorized personnel
- Encrypt sensitive information
- Maintain audit trails
- Backup regularly

18. REPORTING TO MANAGEMENT

18.1 Monthly Reports
- Alert volume and trends
- Investigation status
- STR/CTR filing summary
- Key findings
- System performance
- Resource utilization

18.2 Quarterly Reports
- Detailed program effectiveness
- Tuning activities completed
- Training completion
- Quality assurance results
- Regulatory developments

18.3 Annual Report
- Comprehensive program review
- Effectiveness assessment
- Cost-benefit analysis
- Strategic recommendations
- Regulatory compliance status

19. REGULATORY COOPERATION

19.1 FIU Requests
- Respond within specified timeframe
- Provide complete information
- Maintain confidentiality
- Document all responses

19.2 Examinations
- Provide system access to examiners
- Produce requested documentation
- Respond to examination findings
- Implement corrective actions

20. CONTINUOUS IMPROVEMENT
- Review policy annually
- Incorporate lessons learned
- Adopt industry best practices
- Leverage technology advances
- Adjust for regulatory changes

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  },
  {
    title: "6. Record Keeping and Retention Policy",
    description: "Comprehensive data retention requirements for compliance and audit purposes",
    content: `RECORD KEEPING AND RETENTION POLICY

1. PURPOSE
This policy establishes standards for maintaining and retaining records in compliance with Anti-Money Laundering Act, Financial Intelligence Act, and other applicable regulations.

2. REGULATORY FRAMEWORK
- Anti-Money Laundering Act, 2006 (Section 15)
- Financial Intelligence Act, 2015 (Section 19)
- Proceeds of Crime Act, 1991
- Bank of Tanzania AML/CFT Guidelines
- Tanzania Evidence Act
- Companies Act, 2002

3. POLICY STATEMENT
[Organization Name] will maintain complete, accurate, and secure records for the minimum retention periods required by law and make them available to authorized authorities upon request.

4. GENERAL PRINCIPLES

4.1 Record Completeness
Records must be:
- Complete and accurate
- Sufficient to reconstruct transactions
- Sufficient to demonstrate compliance
- Available for inspection

4.2 Record Security
Records must be:
- Protected from unauthorized access
- Protected from loss, damage, or destruction
- Backed up regularly
- Encrypted if containing sensitive information

4.3 Record Accessibility
Records must be:
- Retrievable within reasonable timeframe
- Organized systematically
- Indexed appropriately
- Available to authorized personnel

5. MINIMUM RETENTION PERIODS

5.1 Standard Retention (10 Years)
The following records must be retained for minimum 10 years from:
- Date of transaction
- Date account closed
- Date relationship ended

Categories:
- Customer identification records
- Account files
- Transaction records
- AML compliance records
- Correspondence

5.2 Permanent Retention
The following records retained permanently:
- Corporate charter documents
- Board minutes and resolutions
- Articles of association
- Licenses and registrations
- Audit reports
- Major contracts

5.3 Extended Retention
Records involved in litigation or investigation retained until:
- Final resolution of matter
- Expiration of statute of limitations
- Regulatory clearance received

6. CUSTOMER IDENTIFICATION RECORDS

6.1 Individual Customer Records (10 years)
- National ID/Passport copies
- Proof of address documents
- Customer information file (CIF)
- Account opening forms
- Signature cards
- Beneficial ownership information
- Risk assessment documentation
- PEP screening results
- Source of wealth/funds documentation

6.2 Corporate Customer Records (10 years)
- Certificate of Incorporation
- Business registration documents
- Memorandum and Articles of Association
- Board resolutions
- Authorized signatory documentation
- Director and shareholder identification
- Beneficial ownership structure
- Business licenses
- Tax registration certificates
- Financial statements

6.3 Customer Due Diligence Records (10 years)
- CDD questionnaires
- Enhanced due diligence documentation
- Customer risk ratings
- Periodic review documentation
- Updated information
- Correspondence regarding due diligence

7. TRANSACTION RECORDS

7.1 Account Transaction Records (10 years)
- Account statements
- Deposit slips
- Withdrawal slips
- Check images
- Wire transfer records
- Fund transfer instructions
- Foreign exchange transactions
- Standing orders
- Direct debits and credits

7.2 Wire Transfer Records (10 years)
Must include:
- Originator information (name, account, address)
- Beneficiary information (name, account, address)
- Amount and currency
- Date and time
- Ordering institution
- Beneficiary institution
- Purpose of transfer
- Relationship to customer

7.3 Cash Transaction Records (10 years)
- Currency transaction reports (CTRs)
- Large cash transactions (≥ TZS 30,000,000)
- Cash deposits and withdrawals
- Currency exchange transactions
- Multiple currency transaction logs
- Exemption documentation

7.4 Loan and Credit Records (10 years after repayment)
- Loan applications
- Credit assessments
- Approval documentation
- Loan agreements
- Collateral documentation
- Repayment schedules
- Payment records
- Default and recovery records

8. AML COMPLIANCE RECORDS

8.1 Suspicious Activity Records (10 years)
- Internal suspicious activity reports
- Investigation notes and findings
- STRs filed with FIU
- FIU acknowledgments
- Supporting documentation
- Follow-up correspondence
- Decisions not to file (with rationale)

8.2 Transaction Monitoring Records (10 years)
- System alerts generated
- Alert investigation reports
- Disposition decisions
- False positive documentation
- Threshold reports
- Exception reports
- Tuning and validation documentation

8.3 Sanctions Screening Records (10 years)
- Screening results
- Match reviews
- False positive determinations
- True match escalations
- Blocked transaction reports
- OFAC/UN sanctions compliance

8.4 Training Records (10 years)
- Training materials
- Attendance records
- Test results
- Certifications
- Competency assessments
- Training needs analysis

8.5 Audit and Review Records (10 years)
- Internal audit reports
- External audit reports
- Regulatory examination reports
- Management responses
- Corrective action plans
- Follow-up documentation
- Independent testing results

9. POLICY AND PROCEDURE RECORDS

9.1 Current and Historical Versions (Permanent)
- AML policies (all versions)
- CDD procedures (all versions)
- Transaction monitoring procedures
- STR filing procedures
- Training programs
- Risk assessment methodologies
- Approval documentation
- Version control logs

10. REGULATORY CORRESPONDENCE

10.1 Regulatory Records (10 years minimum)
- FIU correspondence
- Bank of Tanzania correspondence
- Regulatory inquiries and responses
- Examination reports
- Regulatory directives
- Compliance certifications
- License applications and renewals
- Regulatory submissions

11. BUSINESS CORRESPONDENCE

11.1 Customer Correspondence (10 years)
- Letters and emails with customers
- Complaints and resolutions
- Account closure requests
- Service requests
- Marketing communications (if relevant to relationship)

11.2 Third-Party Correspondence (Duration of relationship + 10 years)
- Service provider agreements
- Vendor contracts
- Correspondent banking agreements
- Information sharing agreements
- Due diligence on third parties

12. ELECTRONIC RECORDS

12.1 Format Requirements
Electronic records must:
- Be in non-rewritable, non-erasable format (WORM)
- Maintain data integrity
- Be searchable and retrievable
- Include metadata (date, user, modifications)
- Be admissible as evidence

12.2 Electronic Signatures
Acceptable if meeting standards of:
- Tanzania Electronic Transactions Act
- Electronic signature regulations
- Industry best practices

12.3 Email Records
Business-related emails must be:
- Archived systematically
- Retained for applicable period
- Retrievable for review
- Protected from deletion

13. BACKUP AND DISASTER RECOVERY

13.1 Backup Requirements
- Daily incremental backups
- Weekly full backups
- Monthly archive backups
- Offsite backup storage
- Encrypted backups
- Regular backup testing

13.2 Disaster Recovery
- Documented disaster recovery plan
- Recovery time objectives defined
- Alternative processing sites identified
- Regular disaster recovery testing
- Staff training on procedures

14. RECORD SECURITY AND CONFIDENTIALITY

14.1 Physical Security
- Secure storage facilities
- Restricted access controls
- Fire and water protection
- Environmental controls
- Security monitoring

14.2 Electronic Security
- Access controls and authentication
- Encryption of sensitive data
- Network security measures
- Intrusion detection
- Audit trails
- Regular security assessments

14.3 Confidentiality
- Data classification standards
- Need-to-know access
- Non-disclosure agreements
- Secure transmission protocols
- Secure disposal methods

15. ACCESS CONTROLS

15.1 Authorized Personnel
Access limited to:
- Operations staff (current records)
- Compliance staff (all AML records)
- Audit staff (all records)
- Management (need-based)
- Legal counsel (need-based)

15.2 External Access
Records provided to external parties only:
- Upon valid legal authority (court order, subpoena)
- To authorized regulators (FIU, Bank of Tanzania)
- To law enforcement (with proper authorization)
- After senior management approval
- With documentation of release

15.3 Access Logging
Maintain logs showing:
- Who accessed records
- What records accessed
- Date and time of access
- Purpose of access
- Duration of access

16. RECORD RETRIEVAL

16.1 Retrieval Standards
- Respond to internal requests within 2 business days
- Respond to regulatory requests within timeframe specified (typically 3-5 days)
- Respond to law enforcement requests immediately or as specified
- Document all retrievals

16.2 Search Capabilities
System must support searching by:
- Customer name
- Account number
- Transaction date
- Amount
- Transaction type
- Geographic location
- Multiple criteria

17. RECORD DISPOSAL

17.1 Disposal Procedures
When retention period expires:
- Obtain authorization to destroy
- Use secure disposal methods:
  - Shredding for paper records
  - Degaussing for magnetic media
  - Destruction for electronic media
- Document disposal
- Maintain disposal logs

17.2 Disposal Documentation
Disposal logs must include:
- Description of records destroyed
- Date of destruction
- Method of destruction
- Authorization for destruction
- Persons supervising destruction

17.3 Disposal Restrictions
Do not destroy records if:
- Subject to litigation hold
- Subject to regulatory investigation
- Subject to law enforcement inquiry
- Involved in ongoing matter

18. RECORD PRODUCTION TO AUTHORITIES

18.1 FIU Requests
- Respond within 7 working days (or as specified)
- Provide complete information requested
- Maintain confidentiality
- Document request and response

18.2 Law Enforcement Requests
- Verify authority of request
- Obtain senior management approval
- Consult legal counsel if necessary
- Provide records as authorized
- Maintain confidentiality
- Document request and response

18.3 Court Orders and Subpoenas
- Verify authenticity
- Consult legal counsel
- Comply with timeframes
- Provide certified copies if required
- Document compliance

18.4 Regulatory Examinations
- Provide timely access to records
- Designate liaison personnel
- Facilitate record review
- Respond to follow-up requests
- Document examination activities

19. DATA PRIVACY COMPLIANCE

19.1 Personal Data Protection
Comply with:
- Tanzania Data Protection Act (when enacted)
- Industry privacy standards
- Customer privacy agreements
- International standards (if applicable)

19.2 Customer Rights
- Right to access personal information
- Right to correct inaccurate information
- Right to data portability (where applicable)
- Limitations based on legal obligations

19.3 Cross-Border Data Transfers
- Document legal basis for transfers
- Ensure adequate protection
- Comply with data localization requirements
- Maintain transfer records

20. ROLES AND RESPONSIBILITIES

20.1 Operations Staff
- Create and maintain records
- Ensure accuracy and completeness
- Follow retention schedules
- Protect record security

20.2 Compliance Officer
- Oversee retention compliance
- Approve retention schedules
- Authorize disposals
- Respond to regulatory requests
- Maintain compliance records

20.3 IT Department
- Implement technical controls
- Maintain backup systems
- Ensure data integrity
- Manage electronic record systems
- Support disaster recovery

20.4 Records Manager (if designated)
- Maintain retention schedule
- Coordinate disposal activities
- Manage archive facilities
- Track record locations
- Ensure policy compliance

21. TRAINING
All staff receive training on:
- Retention requirements
- Record security
- Access controls
- Retrieval procedures
- Disposal procedures
- Confidentiality obligations

22. QUALITY ASSURANCE

22.1 Compliance Monitoring
- Quarterly reviews of retention compliance
- Sample testing of records
- Verification of backup systems
- Security assessments
- Access control reviews

22.2 Internal Audit
- Annual comprehensive audit
- Test retention compliance
- Verify disposal procedures
- Assess security controls
- Report findings to management

23. POLICY REVIEW
Annual review or upon regulatory changes.

RETENTION SCHEDULE SUMMARY

Record Type | Retention Period | Trigger Date
-----------|------------------|-------------
Customer ID Documents | 10 years | Account closure
Transaction Records | 10 years | Transaction date
STRs/CTRs | 10 years | Filing date
Account Statements | 10 years | Statement date
Wire Transfers | 10 years | Transfer date
Loan Records | 10 years | Full repayment
Board Minutes | Permanent | N/A
Audit Reports | Permanent | N/A
Policies | Permanent | N/A
Training Records | 10 years | Training date
Correspondence | 10 years | Date created

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  },
  {
    title: "7. Staff Training and Awareness Policy",
    description: "Comprehensive training program for AML/CFT compliance across all staff levels",
    content: `STAFF TRAINING AND AWARENESS POLICY

1. PURPOSE
This policy establishes a comprehensive training program to ensure all staff understand their AML/CFT obligations and can effectively identify and report suspicious activities.

2. REGULATORY REQUIREMENTS
- Anti-Money Laundering Act, 2006 (Section 14)
- Financial Intelligence Act, 2015
- Bank of Tanzania AML/CFT Guidelines
- FATF Recommendation 18

3. POLICY STATEMENT
[Organization Name] is committed to maintaining a well-trained workforce capable of detecting, preventing, and reporting money laundering and terrorist financing activities.

4. TRAINING OBJECTIVES
- Ensure compliance with legal and regulatory requirements
- Develop staff capability to detect suspicious activities
- Promote risk awareness and vigilance
- Foster culture of compliance
- Reduce operational and reputational risks
- Demonstrate commitment to regulators

5. SCOPE OF TRAINING PROGRAM

5.1 Mandatory Training
All employees must complete:
- Initial AML training within 30 days of employment
- Annual refresher training
- Role-specific training (as applicable)
- Update training when regulations change

5.2 Coverage by Role
- Board of Directors and Senior Management
- Front-line staff (customer-facing)
- Compliance staff
- Operations staff
- IT staff
- Human Resources
- Internal Audit
- All other staff

6. TRAINING CURRICULUM

6.1 Core Training Topics (All Staff)

Module 1: Introduction to AML/CFT (2 hours)
- What is money laundering?
- What is terrorist financing?
- How is [Organization Name] vulnerable?
- Consequences of non-compliance
- Three stages of money laundering
- Common ML/TF methods

Module 2: Legal and Regulatory Framework (2 hours)
- Anti-Money Laundering Act overview
- Financial Intelligence Act overview
- Proceeds of Crime Act
- Prevention of Terrorism Act
- Bank of Tanzania regulations
- Penalties for non-compliance
- Recent enforcement actions

Module 3: Know Your Customer (3 hours)
- Customer identification requirements
- Verification procedures
- Beneficial ownership identification
- Politically Exposed Persons (PEPs)
- Risk-based approach
- Enhanced due diligence
- Ongoing monitoring
- Record keeping requirements

Module 4: Suspicious Activity Recognition (3 hours)
- Red flag indicators by category:
  - Customer behavior
  - Transaction patterns
  - Account activity
  - Geographic risks
- Industry-specific typologies
- Case studies
- Practical exercises

Module 5: Reporting Obligations (2 hours)
- Internal reporting procedures
- Suspicious Transaction Reports (STRs)
- Currency Transaction Reports (CTRs)
- Timelines for reporting
- Tipping-off prohibition
- Legal protections for reporters
- Documentation requirements

Module 6: [Organization Name] Policies and Procedures (2 hours)
- AML/CFT policy overview
- CDD procedures
- Transaction monitoring
- Sanctions screening
- Record keeping
- Roles and responsibilities
- Internal controls
- Escalation procedures

Total Core Training: 14 hours minimum

6.2 Role-Specific Training

Front-Line Staff Additional Training (4 hours)
- Customer onboarding procedures
- Identification document verification
- Cash transaction reporting
- Red flags during customer interactions
- Handling difficult customer questions
- When to escalate to supervisor
- Practical scenarios and role plays

Compliance Staff Additional Training (8 hours)
- Advanced typology analysis
- Investigation techniques
- STR preparation and filing
- Regulatory reporting
- Risk assessment methodologies
- Transaction monitoring systems
- Quality assurance
- Regulatory examination preparation
- FIU interaction protocols

Management Additional Training (4 hours)
- Governance and oversight responsibilities
- Risk appetite and tolerance
- Resource allocation
- Strategic AML planning
- Regulatory expectations
- Board reporting
- Crisis management
- Reputational risk management

Operations Staff Additional Training (3 hours)
- Transaction processing controls
- Payment system risks
- Wire transfer requirements
- Cash handling procedures
- Sanctions screening
- Record retention
- System controls

IT Staff Additional Training (3 hours)
- AML system requirements
- Data security and integrity
- Access controls
- Audit trail requirements
- System monitoring
- Disaster recovery
- Regulatory technology requirements

Internal Audit Additional Training (4 hours)
- AML audit methodologies
- Testing procedures
- Sampling techniques
- Regulatory expectations
- Finding documentation
- Follow-up procedures

Board and Senior Management Training (4 hours annually)
- Regulatory environment updates
- Enterprise risk management
- Governance best practices
- Industry trends
- Enforcement actions and lessons learned
- Strategic initiatives
- Board reporting and oversight

7. TRAINING METHODS

7.1 Classroom Training
- Instructor-led sessions
- Interactive discussions
- Group exercises
- Case study analysis
- Role-playing scenarios

7.2 E-Learning
- Online modules
- Interactive lessons
- Video presentations
- Knowledge checks
- Self-paced learning

7.3 On-the-Job Training
- Supervisor coaching
- Mentoring programs
- Job shadowing
- Practical application

7.4 Seminars and Workshops
- External training programs
- Industry conferences
- Regulatory seminars
- Professional development courses

7.5 Reference Materials
- Policy and procedure manuals
- Quick reference guides
- Job aids and checklists
- Intranet resources
- Regulatory bulletins

8. TRAINING SCHEDULE

8.1 Initial Training (New Employees)
Week 1: Core AML training (14 hours)
Week 2-4: Role-specific training
Within 30 days: Complete all required training
Within 60 days: Demonstrate competency

8.2 Annual Refresher Training
All staff complete annually:
- Core topics review (6 hours minimum)
- Regulatory updates
- New typologies
- Case studies
- Policy changes
- Assessment testing

Timing: Within 12 months of previous training

8.3 Update Training (Ad Hoc)
When required by:
- Significant regulatory changes
- New product/service launches
- System implementations
- Risk assessment findings
- Audit findings
- Enforcement actions

8.4 Specialized Training (As Needed)
- New compliance officers: Within 90 days
- Promoted staff: Within 60 days of promotion
- Staff moving to high-risk roles: Before assumption of duties
- Staff with deficiencies: Immediately

9. TRAINING DELIVERY

9.1 Training Providers
Internal trainers:
- Compliance Officer
- Senior compliance staff
- Department managers
- Subject matter experts

External trainers:
- Professional training firms
- Law firms specializing in AML
- Consultants
- Regulatory authorities
- Industry associations

9.2 Trainer Qualifications
Trainers must have:
- Expert knowledge of AML/CFT
- Understanding of regulations
- Training delivery skills
- Practical experience
- Current knowledge of typologies

9.3 Training Materials
Materials must be:
- Accurate and current
- Clear and understandable
- Practical and relevant
- Appropriately detailed for audience
- Available in appropriate languages
- Updated regularly

10. ASSESSMENT AND COMPETENCY TESTING

10.1 Knowledge Assessment
After training, staff must pass:
- Written examination (minimum 80% score)
- Practical scenario assessment
- Competency demonstration

10.2 Retraining
Staff failing assessment:
- Receive additional training
- Retake assessment within 30 days
- Restrictions on duties until competent

10.3 Ongoing Competency
Monitor through:
- Quality assurance reviews
- Supervisor observations
- Performance appraisals
- Mystery shopping programs
- Audit findings

11. RECORD KEEPING

11.1 Training Records (Maintain 10 years)
- Training attendance records
- Training materials used
- Assessment results
- Certificates issued
- Trainer qualifications
- Training schedules
- Course outlines
- Sign-in sheets

11.2 Individual Training Files
Maintain for each employee:
- Training completion dates
- Topics covered
- Hours completed
- Assessment scores
- Certificates earned
- Identified deficiencies
- Remedial training completed

12. SPECIALIZED TRAINING TOPICS

12.1 Transaction Monitoring
- System operation
- Alert investigation
- Scenario interpretation
- Threshold analysis
- Disposition decisions
- Documentation standards

12.2 Sanctions Compliance
- Sanctions lists and sources
- Screening procedures
- Match review process
- Blocking procedures
- OFAC reporting
- License applications

12.3 Trade-Based Money Laundering
- TBML indicators
- Document review
- Pricing analysis
- Commodity risks
- Country risks
- Correspondent banking risks

12.4 Virtual Currencies and Fintech
- Virtual currency risks
- Blockchain technology
- Fintech business models
- Technology risks
- Regulatory expectations

12.5 Cyber Security and Fraud
- Cyber ML risks
- Identity theft
- Account takeover
- Business email compromise
- Fraud indicators
- Information security

13. CULTURAL AND ETHICAL TRAINING

13.1 Compliance Culture
- Speaking up / whistleblowing
- Ethical decision-making
- Integrity and honesty
- Accountability
- Consequences of non-compliance

13.2 Customer Treatment
- Professional conduct
- Fair treatment
- Privacy protection
- Conflict of interest
- Bribery and corruption prevention

14. AWARENESS CAMPAIGNS

14.1 Ongoing Awareness Activities
- Monthly compliance bulletins
- Case study newsletters
- Regulatory update notices
- Posters and visual reminders
- Intranet articles
- Team meetings
- Town halls

14.2 AML Awareness Month
Annual focused campaign including:
- Special training sessions
- Guest speakers
- Competitions and quizzes
- Awards and recognition
- Enhanced communications

15. EVALUATION OF TRAINING EFFECTIVENESS

15.1 Immediate Feedback
- Post-training surveys
- Participant feedback forms
- Trainer evaluations
- Suggestions for improvement

15.2 Performance Metrics
- Training completion rates
- Assessment pass rates
- Time to competency
- Deficiency identification rates
- STR quality scores

15.3 Impact Assessment
- Reduction in policy violations
- Improvement in STR quality
- Decrease in audit findings
- Improved risk ratings
- Regulatory feedback

15.4 Annual Review
Evaluate program effectiveness:
- Achievement of objectives
- Training coverage
- Resource adequacy
- Material currency
- Delivery methods
- Cost-effectiveness

16. ROLES AND RESPONSIBILITIES

16.1 Board of Directors
- Approve training policy
- Ensure adequate resources
- Receive annual training reports
- Complete board training annually

16.2 Senior Management
- Champion training program
- Allocate resources
- Monitor completion rates
- Address deficiencies
- Lead by example

16.3 Compliance Officer
- Develop training program
- Coordinate training delivery
- Maintain training records
- Monitor effectiveness
- Report to management and board
- Ensure regulatory compliance

16.4 Training Coordinator (if designated)
- Schedule training sessions
- Coordinate logistics
- Track completion
- Maintain records
- Administer assessments
- Support trainers

16.5 Department Managers
- Ensure staff complete training
- Release staff for training
- Reinforce learning
- Monitor application
- Identify training needs

16.6 Human Resources
- Include training in onboarding
- Track completion for performance reviews
- Support training administration
- Assist with recordkeeping

16.7 Internal Audit
- Test training effectiveness
- Verify recordkeeping
- Assess competency
- Report findings

17. TRAINING BUDGET
Adequate budget allocated for:
- Trainer compensation
- External training programs
- Training materials
- E-learning systems
- Conference attendance
- Professional memberships
- Assessment tools

18. EXTERNAL TRAINING RESOURCES

18.1 Regulatory Authorities
- Bank of Tanzania training programs
- FIU workshops
- Regulatory guidance sessions

18.2 Professional Associations
- Tanzania Bankers Association
- Institute of Finance Management
- Professional certification programs

18.3 International Resources
- ACAMS certification programs
- ICA certification
- FATF materials
- Wolfsberg Group guidance

19. CONTINUOUS IMPROVEMENT
- Incorporate lessons learned
- Update for regulatory changes
- Adopt new training methods
- Leverage technology
- Benchmark against peers
- Respond to audit findings

20. POLICY REVIEW
Annual review of training policy and program.

TRAINING COMPLETION REQUIREMENTS SUMMARY

Role | Initial Training | Annual Refresher | Specialized
-----|-----------------|------------------|-------------
All Staff | 14 hours + exam | 6 hours | As applicable
Front-Line Staff | 18 hours + exam | 6 hours | Customer service
Compliance | 22 hours + exam | 8 hours | Investigation
Management | 18 hours + exam | 4 hours | Oversight
Board/Senior Mgmt | 4 hours | 4 hours | Strategic
Operations | 17 hours + exam | 6 hours | Procedures
IT Staff | 17 hours + exam | 6 hours | Systems
Internal Audit | 18 hours + exam | 6 hours | Testing

APPROVAL
Policy Owner: Chief Compliance Officer
Approved By: Board of Directors
Effective Date: [Date]
Next Review: [Date]`
  }
];


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
    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.2)',
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
    background: 'linear-gradient(135deg, #d4af37, #b8941f)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },
  badge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#f59e0b',
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
    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.15)',
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
  alertButton: {
    padding: '8px 16px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
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
  requestCard: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
};
