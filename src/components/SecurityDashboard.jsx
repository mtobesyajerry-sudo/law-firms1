import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    totalLogins: 0,
    failedLogins: 0,
    activeSessions: 0,
    suspiciousAlerts: 0,
    mfaEnabled: 0,
    totalUsers: 0,
    totalAuditLogs: 0,
    documentAccess: 0,
    passwordResets: 0,
    dataRetentionPolicies: 0
  });

  const [recentLogins, setRecentLogins] = useState([]);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [documentAccess, setDocumentAccess] = useState([]);

  useEffect(() => {
    // Skip redirect check if profile hasn't loaded yet - ProtectedRoute handles auth guards
    if (!profile) return;
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadSecurityData();
  }, [isAdmin, profile, navigate]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentLogins(),
        loadSuspiciousAlerts(),
        loadActiveSessions(),
        loadAuditLogs(),
        loadDocumentAccess()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const [
      loginStats,
      userStats,
      sessionStats,
      mfaStats,
      auditStats,
      docAccessStats,
      passwordResetStats,
      retentionStats,
      suspiciousAlertsStats
    ] = await Promise.all([
      supabase.from('login_history').select('success', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('mfa_secrets').select('*', { count: 'exact', head: true }).eq('enabled', true),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
      supabase.from('document_access_logs').select('*', { count: 'exact', head: true }),
      supabase.from('password_reset_tokens').select('*', { count: 'exact', head: true }),
      supabase.from('data_retention_policies').select('*', { count: 'exact', head: true }),
      supabase.from('suspicious_activity_alerts').select('*', { count: 'exact', head: true }).eq('resolved', false)
    ]);

    const { count: failedCount } = await supabase
      .from('login_history')
      .select('*', { count: 'exact', head: true })
      .eq('success', false);

    setStats({
      totalLogins: loginStats.count || 0,
      failedLogins: failedCount || 0,
      activeSessions: sessionStats.count || 0,
      suspiciousAlerts: suspiciousAlertsStats.count || 0,
      mfaEnabled: mfaStats.count || 0,
      totalUsers: userStats.count || 0,
      totalAuditLogs: auditStats.count || 0,
      documentAccess: docAccessStats.count || 0,
      passwordResets: passwordResetStats.count || 0,
      dataRetentionPolicies: retentionStats.count || 0
    });
  };

  const loadRecentLogins = async () => {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentLogins(data);
    }
  };

  const loadSuspiciousAlerts = async () => {
    const { data, error } = await supabase
      .from('suspicious_activity_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSuspiciousAlerts(data);
    } else if (error) {
      console.error('Error loading suspicious alerts:', error);
      setSuspiciousAlerts([]);
    }
  };

  const loadActiveSessions = async () => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*, user_profiles!inner(email, full_name)')
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setActiveSessions(data);
    }
  };

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const loadDocumentAccess = async () => {
    const { data, error } = await supabase
      .from('document_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setDocumentAccess(data);
    }
  };

  const resolveAlert = async (alertId) => {
    const { error } = await supabase
      .from('suspicious_activity_alerts')
      .update({
        resolved: true,
        resolved_by: profile?.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (!error) {
      await loadSuspiciousAlerts();
      await loadStats();
    } else {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert: ' + error.message);
    }
  };

  const terminateSession = async (sessionId) => {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (!error) {
      loadActiveSessions();
      loadStats();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  if (loading) {
    return <div style={styles.loading}>Loading security dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Security Dashboard</h1>
          <p style={styles.subtitle}>Monitor security events and system activity</p>
        </div>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
          Back
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Users</div>
          <div style={styles.statValue}>{stats.totalUsers}</div>
          <div style={styles.statSubtext}>Registered accounts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>MFA Enabled</div>
          <div style={styles.statValue}>{stats.mfaEnabled}/{stats.totalUsers}</div>
          <div style={styles.statSubtext}>Multi-factor authentication</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active Sessions</div>
          <div style={styles.statValue}>{stats.activeSessions}</div>
          <div style={styles.statSubtext}>Current user sessions</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Logins</div>
          <div style={styles.statValue}>{stats.totalLogins}</div>
          <div style={styles.statSubtext}>All login attempts</div>
        </div>
        <div style={{...styles.statCard, borderColor: stats.failedLogins > 10 ? '#ef4444' : '#e5e7eb'}}>
          <div style={styles.statLabel}>Failed Logins</div>
          <div style={{...styles.statValue, color: stats.failedLogins > 10 ? '#ef4444' : '#1f2937'}}>
            {stats.failedLogins}
          </div>
          <div style={styles.statSubtext}>Failed login attempts</div>
        </div>
        <div style={{...styles.statCard, borderColor: stats.suspiciousAlerts > 0 ? '#f59e0b' : '#e5e7eb'}}>
          <div style={styles.statLabel}>Suspicious Alerts</div>
          <div style={{...styles.statValue, color: stats.suspiciousAlerts > 0 ? '#f59e0b' : '#1f2937'}}>
            {stats.suspiciousAlerts}
          </div>
          <div style={styles.statSubtext}>Unresolved security alerts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Audit Logs</div>
          <div style={styles.statValue}>{stats.totalAuditLogs.toLocaleString()}</div>
          <div style={styles.statSubtext}>Total system events</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Document Access</div>
          <div style={styles.statValue}>{stats.documentAccess.toLocaleString()}</div>
          <div style={styles.statSubtext}>Document access logs</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Password Resets</div>
          <div style={styles.statValue}>{stats.passwordResets}</div>
          <div style={styles.statSubtext}>Total reset tokens</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Retention Policies</div>
          <div style={styles.statValue}>{stats.dataRetentionPolicies}</div>
          <div style={styles.statSubtext}>Active data policies</div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          style={{...styles.tab, ...(activeTab === 'alerts' ? styles.activeTab : {})}}
        >
          Suspicious Alerts ({stats.suspiciousAlerts})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{...styles.tab, ...(activeTab === 'sessions' ? styles.activeTab : {})}}
        >
          Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{...styles.tab, ...(activeTab === 'audit' ? styles.activeTab : {})}}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          style={{...styles.tab, ...(activeTab === 'documents' ? styles.activeTab : {})}}
        >
          Document Access
        </button>
        <button
          onClick={() => setActiveTab('security')}
          style={{...styles.tab, ...(activeTab === 'security' ? styles.activeTab : {})}}
        >
          Security Features
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Login Activity</h2>
          <div style={styles.table}>
            <table style={styles.tableElement}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>MFA</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogins.map((login) => (
                  <tr key={login.id} style={styles.tr}>
                    <td style={styles.td}>{login.email}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: login.success ? '#d1fae5' : '#fee2e2',
                        color: login.success ? '#065f46' : '#991b1b'
                      }}>
                        {login.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td style={styles.td}>{login.ip_address}</td>
                    <td style={styles.td}>{login.mfa_used ? 'Yes' : 'No'}</td>
                    <td style={styles.td}>{formatDate(login.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Suspicious Activity Alerts</h2>
          {suspiciousAlerts.length === 0 ? (
            <div style={styles.emptyState}>No unresolved suspicious alerts</div>
          ) : (
            <div style={styles.alertsList}>
              {suspiciousAlerts.map((alert) => (
                <div key={alert.id} style={{
                  ...styles.alertCard,
                  borderLeftColor: getSeverityColor(alert.severity)
                }}>
                  <div style={styles.alertHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        ...styles.badge,
                        background: getSeverityColor(alert.severity),
                        color: 'white'
                      }}>
                        {alert.severity?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span style={styles.alertType}>{alert.alert_type}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Mark this alert as resolved?')) {
                          resolveAlert(alert.id);
                        }
                      }}
                      style={styles.resolveButton}
                    >
                      Resolve
                    </button>
                  </div>
                  <div style={styles.alertDescription}>{alert.description}</div>
                  {alert.ip_address && (
                    <div style={styles.alertMeta}>IP Address: {alert.ip_address}</div>
                  )}
                  {alert.user_id && (
                    <div style={styles.alertMeta}>User ID: {alert.user_id.substring(0, 8)}</div>
                  )}
                  <div style={styles.alertMeta}>
                    Created: {formatDate(alert.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Implemented Security Features</h2>

          <div style={styles.securityGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔐</div>
              <h3 style={styles.featureTitle}>Authentication & Access Control</h3>
              <ul style={styles.featureList}>
                <li>Email/Password authentication via Supabase Auth</li>
                <li>Multi-factor authentication (MFA) support</li>
                <li>Role-based access control (RBAC)</li>
                <li>Session management with expiry</li>
                <li>Password history tracking</li>
                <li>Secure password reset flows</li>
                <li>Account lockout after failed attempts</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📊</div>
              <h3 style={styles.featureTitle}>Audit & Logging</h3>
              <ul style={styles.featureList}>
                <li>Comprehensive audit trail system</li>
                <li>AML-specific audit logging</li>
                <li>Login history tracking</li>
                <li>Document access logging</li>
                <li>User session monitoring</li>
                <li>Document verification logs</li>
                <li>Immutable audit records</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📄</div>
              <h3 style={styles.featureTitle}>Document Security</h3>
              <ul style={styles.featureList}>
                <li>Secure document storage with encryption</li>
                <li>Document access controls</li>
                <li>Document versioning system</li>
                <li>Document sharing with permissions</li>
                <li>Watermarking support</li>
                <li>Checksum verification</li>
                <li>Automatic expiry management</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>Data Protection</h3>
              <ul style={styles.featureList}>
                <li>AES-256 encryption at rest</li>
                <li>TLS 1.3 encryption in transit</li>
                <li>Row-level security (RLS) policies</li>
                <li>Organization-level data isolation</li>
                <li>Legal document versioning</li>
                <li>User consent management</li>
                <li>Data retention policies (7-year compliance)</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚖️</div>
              <h3 style={styles.featureTitle}>Privacy & Compliance</h3>
              <ul style={styles.featureList}>
                <li>GDPR-aligned data handling</li>
                <li>BOT/FIU regulatory compliance</li>
                <li>FATF recommendations alignment</li>
                <li>Data retention automation</li>
                <li>Legal document management</li>
                <li>User consent tracking</li>
                <li>Right to erasure support</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🛡️</div>
              <h3 style={styles.featureTitle}>Security Infrastructure</h3>
              <ul style={styles.featureList}>
                <li>Hosted on Supabase (SOC 2 Type II)</li>
                <li>AWS infrastructure (ISO 27001)</li>
                <li>Automated backup systems</li>
                <li>99.9% uptime SLA</li>
                <li>DDoS protection</li>
                <li>Web Application Firewall (WAF)</li>
                <li>Geographic data residency options</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>👥</div>
              <h3 style={styles.featureTitle}>User Management</h3>
              <ul style={styles.featureList}>
                <li>User profile management</li>
                <li>Organization assignment</li>
                <li>Password change enforcement</li>
                <li>Account suspension capabilities</li>
                <li>Subscription expiry tracking</li>
                <li>User creation/deletion controls</li>
                <li>Admin privilege management</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔍</div>
              <h3 style={styles.featureTitle}>Monitoring & Detection</h3>
              <ul style={styles.featureList}>
                <li>Real-time session monitoring</li>
                <li>Failed login tracking</li>
                <li>Document access monitoring</li>
                <li>MFA adoption tracking</li>
                <li>User activity analysis</li>
                <li>Security event correlation</li>
                <li>Anomaly detection ready</li>
              </ul>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔑</div>
              <h3 style={styles.featureTitle}>Password Security</h3>
              <ul style={styles.featureList}>
                <li>Bcrypt password hashing</li>
                <li>Password history (prevent reuse)</li>
                <li>Secure reset token generation</li>
                <li>Token expiry management</li>
                <li>IP-based reset tracking</li>
                <li>One-time use tokens</li>
                <li>Password complexity enforcement</li>
              </ul>
            </div>
          </div>

          <div style={styles.complianceSection}>
            <h3 style={styles.complianceTitle}>Regulatory Compliance Status</h3>
            <div style={styles.complianceGrid}>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>Bank of Tanzania (BOT)</div>
                  <div style={styles.complianceDesc}>AML/CFT Guidelines for Banks</div>
                </div>
              </div>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>Tanzania FIU</div>
                  <div style={styles.complianceDesc}>AML/CFT requirements compliant</div>
                </div>
              </div>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>FATF 40 Recommendations</div>
                  <div style={styles.complianceDesc}>Fully aligned assessment framework</div>
                </div>
              </div>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>GDPR Compliance</div>
                  <div style={styles.complianceDesc}>Data protection controls implemented</div>
                </div>
              </div>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>ISO 27001 Aligned</div>
                  <div style={styles.complianceDesc}>Security controls framework</div>
                </div>
              </div>
              <div style={styles.complianceItem}>
                <div style={styles.complianceCheck}>✓</div>
                <div>
                  <div style={styles.complianceLabel}>7-Year Data Retention</div>
                  <div style={styles.complianceDesc}>Automated retention policies</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Active User Sessions</h2>
          <div style={styles.table}>
            <table style={styles.tableElement}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>Last Activity</th>
                  <th style={styles.th}>Expires</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id} style={styles.tr}>
                    <td style={styles.td}>{session.user_profiles?.email || 'Unknown'}</td>
                    <td style={styles.td}>{session.ip_address}</td>
                    <td style={styles.td}>{formatDate(session.last_activity_at)}</td>
                    <td style={styles.td}>{formatDate(session.expires_at)}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => terminateSession(session.id)}
                        style={styles.terminateButton}
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Audit Logs</h2>
          <div style={styles.table}>
            <table style={styles.tableElement}>
              <thead>
                <tr>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={styles.tr}>
                    <td style={styles.td}>{log.event_type}</td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{log.event_category}</span>
                    </td>
                    <td style={styles.td}>{log.action_description}</td>
                    <td style={styles.td}>{log.user_id ? log.user_id.substring(0, 8) : 'System'}</td>
                    <td style={styles.td}>{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Document Access Logs</h2>
          <div style={styles.table}>
            <table style={styles.tableElement}>
              <thead>
                <tr>
                  <th style={styles.th}>Document</th>
                  <th style={styles.th}>Access Type</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {documentAccess.map((access) => (
                  <tr key={access.id} style={styles.tr}>
                    <td style={styles.td}>{access.document_name}</td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{access.access_type}</span>
                    </td>
                    <td style={styles.td}>{access.user_id.substring(0, 8)}</td>
                    <td style={styles.td}>{access.ip_address}</td>
                    <td style={styles.td}>{formatDate(access.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
    padding: '32px',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#4a5568',
    margin: 0,
  },
  backButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    background: 'transparent',
    color: '#0a1929',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    transition: 'all 0.2s',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: 'white',
    color: '#d4af37',
    borderBottom: '2px solid #d4af37',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '20px',
  },
  table: {
    overflowX: 'auto',
  },
  tableElement: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1f2937',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#e5e7eb',
    color: '#4b5563',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '16px',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  alertCard: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #ef4444',
    background: '#fafafa',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  alertType: {
    marginLeft: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  alertDescription: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '8px',
  },
  alertMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0',
  },
  resolveButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    background: '#10b981',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  terminateButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    background: '#ef4444',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  securityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  featureCard: {
    background: '#fafafa',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '16px',
  },
  featureList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.8',
  },
  complianceSection: {
    marginTop: '32px',
    padding: '24px',
    background: '#f0fdf4',
    borderRadius: '12px',
    border: '2px solid #10b981',
  },
  complianceTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#065f46',
    marginBottom: '20px',
  },
  complianceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  complianceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #d1fae5',
  },
  complianceCheck: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#10b981',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    flexShrink: 0,
  },
  complianceLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#065f46',
    marginBottom: '4px',
  },
  complianceDesc: {
    fontSize: '12px',
    color: '#047857',
  },
};
