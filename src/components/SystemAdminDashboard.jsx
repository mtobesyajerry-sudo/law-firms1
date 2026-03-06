import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ManagementUserApproval from './ManagementUserApproval';

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
        { count: pendingNewUsers },
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
        supabase.from('new_user_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
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
        pendingNewUserRequests: pendingNewUsers || 0,
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
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading system dashboard...</div>
        </div>
      </div>
    );
  }

  const totalPendingActions = stats.pendingRegistrations + stats.pendingRoleUpgrades + stats.pendingNewUserRequests;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src="/Iuris_Peritis_New_Logo.png"
            alt="Iuris Peritis Logo"
            style={{ maxWidth: '110px', height: 'auto' }}
          />
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
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
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
