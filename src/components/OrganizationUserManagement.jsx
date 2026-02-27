import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function OrganizationUserManagement({ user }) {
  const [organizations, setOrganizations] = useState([]);
  const [orgUsers, setOrgUsers] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Force fresh data by adding a cache-busting timestamp
      const timestamp = new Date().getTime();

      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'client')
        .order('full_name');

      const { data: accessData } = await supabase
        .from('organization_user_access')
        .select(`
          *,
          user:user_profiles!organization_user_access_user_id_fkey(id, email, full_name),
          granted_by_user:user_profiles!organization_user_access_granted_by_fkey(email, full_name)
        `);

      setOrganizations(orgsData || []);
      setAllUsers(usersData || []);

      const accessByOrg = {};
      (accessData || []).forEach(access => {
        if (!accessByOrg[access.organization_id]) {
          accessByOrg[access.organization_id] = [];
        }
        accessByOrg[access.organization_id].push(access);
      });
      setOrgUsers(accessByOrg);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const grantAccess = async (orgId) => {
    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    try {
      const activeUsers = (orgUsers[orgId] || []).filter(u => u.is_active);
      if (activeUsers.length >= 3) {
        alert('This organization already has 3 active management users (maximum allowed)');
        return;
      }

      const alreadyHasAccess = activeUsers.some(u => u.user_id === selectedUser);
      if (alreadyHasAccess) {
        alert('This user already has management access to this organization');
        return;
      }

      const { error } = await supabase
        .from('organization_user_access')
        .insert([{
          organization_id: orgId,
          user_id: selectedUser,
          granted_by: user.id,
          is_active: true
        }]);

      if (error) throw error;

      alert('Management access granted successfully');
      setSelectedUser('');
      setSelectedOrg(null);
      await loadData();
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Error granting access: ' + error.message);
    }
  };

  const revokeAccess = async (accessId) => {
    if (!confirm('Are you sure you want to revoke this user\'s management access?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_user_access')
        .update({ is_active: false })
        .eq('id', accessId);

      if (error) throw error;

      alert('Management access revoked successfully');
      await loadData();
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Error revoking access: ' + error.message);
    }
  };

  const styles = {
    container: {
      padding: '0'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#0a1929',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      lineHeight: '1.6',
      margin: 0
    },
    organizationsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '24px',
      marginTop: '24px'
    },
    orgCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '28px',
      border: '2px solid #d4af37',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      transition: 'all 0.3s',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '400px'
    },
    orgHeaderSection: {
      marginBottom: '20px',
      paddingBottom: '20px',
      borderBottom: '2px solid #f1f5f9'
    },
    orgName: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    orgType: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '12px'
    },
    slotsIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      background: '#f1f5f9',
      marginTop: '8px'
    },
    slotDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      display: 'inline-block'
    },
    usersSection: {
      flex: 1,
      marginBottom: '16px'
    },
    sectionLabel: {
      fontSize: '13px',
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '12px'
    },
    userCard: {
      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '10px',
      transition: 'all 0.2s'
    },
    userName: {
      fontSize: '15px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '4px'
    },
    userEmail: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '6px'
    },
    grantedInfo: {
      fontSize: '11px',
      color: '#94a3b8',
      marginBottom: '10px',
      paddingTop: '8px',
      borderTop: '1px solid #e2e8f0'
    },
    revokeButton: {
      padding: '8px 16px',
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      width: '100%',
      transition: 'all 0.2s'
    },
    addSection: {
      background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
      border: '2px dashed #3b82f6',
      borderRadius: '12px',
      padding: '20px',
      marginTop: 'auto'
    },
    addTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '12px',
      background: 'white',
      color: '#0a1929',
      fontWeight: '500'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    primaryButton: {
      padding: '12px 20px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      flex: 1,
      transition: 'all 0.2s'
    },
    secondaryButton: {
      padding: '12px 20px',
      background: '#64748b',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      flex: 1,
      transition: 'all 0.2s'
    },
    emptyState: {
      padding: '40px 20px',
      textAlign: 'center',
      background: '#f8fafc',
      border: '2px dashed #cbd5e1',
      borderRadius: '12px',
      color: '#64748b',
      fontSize: '14px'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '12px',
      opacity: 0.5
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', color: '#64748b' }}>Loading organization users...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Organization User Management</h2>
        <p style={styles.subtitle}>
          Grant up to 3 users per organization access to the Management dashboard. These users can approve role upgrade requests using a dual-approval workflow.
        </p>
      </div>

      <div style={styles.organizationsGrid}>
        {organizations.map(org => {
          const activeUsers = (orgUsers[org.id] || []).filter(u => u.is_active);
          const availableSlots = 3 - activeUsers.length;
          const usedSlots = activeUsers.length;

          return (
            <div
              key={org.id}
              style={styles.orgCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
              }}
            >
              <div style={styles.orgHeaderSection}>
                <div style={styles.orgName}>
                  <span>🏢</span>
                  {org.name}
                </div>
                <div style={styles.orgType}>{org.business_type || 'Organization'}</div>
                <div style={styles.slotsIndicator}>
                  <span>Management Users:</span>
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      style={{
                        ...styles.slotDot,
                        background: i < usedSlots ? '#10b981' : '#e5e7eb'
                      }}
                    />
                  ))}
                  <span style={{
                    color: usedSlots === 3 ? '#991b1b' : '#065f46',
                    fontWeight: '700'
                  }}>
                    {usedSlots}/3
                  </span>
                </div>
              </div>

              <div style={styles.usersSection}>
                <div style={styles.sectionLabel}>Current Users</div>
                {activeUsers.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>👥</div>
                    <div>No management users assigned</div>
                  </div>
                ) : (
                  activeUsers.map(access => (
                    <div
                      key={access.id}
                      style={styles.userCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={styles.userName}>{access.user?.full_name || 'Unknown User'}</div>
                      <div style={styles.userEmail}>{access.user?.email}</div>
                      <div style={styles.grantedInfo}>
                        Granted by {access.granted_by_user?.full_name || 'System'} •{' '}
                        {new Date(access.granted_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => revokeAccess(access.id)}
                        style={styles.revokeButton}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#b91c1c';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))
                )}
              </div>

              {availableSlots > 0 && (
                <div style={styles.addSection}>
                  <div style={styles.addTitle}>
                    <span>➕</span>
                    Add Management User
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      padding: '4px 8px',
                      background: '#3b82f6',
                      borderRadius: '6px',
                      color: 'white'
                    }}>
                      {availableSlots} slot{availableSlots !== 1 ? 's' : ''} left
                    </span>
                  </div>
                  {selectedOrg === org.id ? (
                    <>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        style={styles.select}
                      >
                        <option value="">Select a user...</option>
                        {allUsers
                          .filter(u => !activeUsers.some(a => a.user_id === u.id))
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} ({u.email})
                            </option>
                          ))}
                      </select>
                      <div style={styles.buttonGroup}>
                        <button
                          onClick={() => grantAccess(org.id)}
                          style={styles.primaryButton}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#2563eb';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#3b82f6';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Grant Access
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(null);
                            setSelectedUser('');
                          }}
                          style={styles.secondaryButton}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#475569';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#64748b';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedOrg(org.id)}
                      style={{...styles.primaryButton, width: '100%'}}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Add User
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {organizations.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏢</div>
          <div>No organizations found</div>
        </div>
      )}
    </div>
  );
}
