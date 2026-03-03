import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getRiskColor, getRiskLabel, institutionCategories, getFrameworkForCategory } from '../data/assessmentData';
import MarkdownRenderer from './MarkdownRenderer';
import KYCClientManagement from './KYCClientManagement';
import STRAlertDashboard from './STRAlertDashboard';
import integrationService from '../services/integrationService';
import LoadingSpinner from './LoadingSpinner';

function ClientRiskProfilesSection({ organizationId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, [organizationId]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_clients')
        .select('id, client_name, client_type, current_risk_rating, current_dd_level, alert_count, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '2px solid #d4af37', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <LoadingSpinner text="Loading client profiles..." />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '2px solid #d4af37', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>👥</span>
          Client Risk Profiles
        </h3>
        <p style={{ textAlign: 'center', color: '#718096' }}>No clients yet. Add clients from the KYC Management tab.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '2px solid #d4af37', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>👥</span>
          Client Risk Profiles
        </h3>
        <span style={{ fontSize: '13px', color: '#4a5568' }}>
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        {clients.map((client) => (
          <div
            key={client.id}
            style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #d4af37',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => navigate(`/client-risk/${client.id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef9e7';
              e.currentTarget.style.borderColor = '#b8860b';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(212,175,55,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d4af37';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#0a1929', marginBottom: '6px' }}>
                  {client.client_name}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: '#e0e7ff',
                    color: '#3730a3'
                  }}>
                    {client.client_type}
                  </span>
                  {client.current_risk_rating && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: getRiskColor(client.current_risk_rating),
                      color: 'white'
                    }}>
                      {client.current_risk_rating}
                    </span>
                  )}
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: '#fef3c7',
                    color: '#92400e'
                  }}>
                    {client.current_dd_level || 'Standard'} DD
                  </span>
                  {client.alert_count > 0 && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#fee2e2',
                      color: '#991b1b'
                    }}>
                      {client.alert_count} alert{client.alert_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                padding: '8px 12px',
                background: 'white',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#3b82f6',
                border: '1px solid #3b82f6'
              }}>
                View Profile →
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/client/dashboard');
            setTimeout(() => {
              const kycTab = document.querySelector('[data-view="kyc"]');
              if (kycTab) kycTab.click();
            }, 100);
          }}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f9fafb';
            e.target.style.borderColor = '#3b82f6';
            e.target.style.color = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.borderColor = '#d1d5db';
            e.target.style.color = '#374151';
          }}
        >
          View All Clients
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [organization, setOrganization] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, date: '' });
  const [showSupport, setShowSupport] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [systemContent, setSystemContent] = useState({});
  const [integrationData, setIntegrationData] = useState(null);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  const { user, profile, signOut, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();

  const getDefaultView = () => {
    return 'overview';
  };

  useEffect(() => {
    if (profile && !activeView) {
      setActiveView(getDefaultView());
    }
  }, [profile]);

  const loadIntegrationData = useCallback(async (orgId) => {
    if (!orgId) {
      console.log('[Dashboard] No organization ID provided');
      return;
    }

    try {
      console.log('[Dashboard] Loading integration data for org:', orgId);
      setLoadingIntegration(true);
      const data = await integrationService.getOrganizationRiskOverview(orgId);
      console.log('[Dashboard] Integration data loaded successfully:', data);
      setIntegrationData(data);
    } catch (error) {
      console.error('[Dashboard] Error loading integration data:', error);
      setIntegrationData(null);
    } finally {
      setLoadingIntegration(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setSystemContent({});

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;
      setOrganization(orgData);

      if (orgData) {
        const { data: assessData, error: assessError } = await supabase
          .from('assessments')
          .select('*')
          .eq('organization_id', orgData.id)
          .order('created_at', { ascending: false });

        if (assessError) throw assessError;
        setAssessments(assessData || []);

        // Transaction alerts feature not yet implemented
        setAlertCount(0);

        await loadIntegrationData(orgData.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, loadIntegrationData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startNewAssessment = async () => {
    if (!organization) {
      alert('No organization found. Please contact support.');
      return;
    }

    try {
      const frameworkType = getFrameworkForCategory(organization.dnfbp_category);

      const { data, error } = await supabase
        .from('assessments')
        .insert([{
          organization_id: organization.id,
          status: 'draft',
          created_by: user.id,
          framework_type: frameworkType
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating assessment:', error);
        alert(`Failed to create assessment: ${error.message}`);
        return;
      }

      navigate(`/assessment/${data.id}`);
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert(`Failed to create assessment: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      await loadData();
      setDeleteConfirm({ show: false, id: null, date: '' });
      alert('Assessment deleted successfully');
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Error deleting assessment: ' + error.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      alert('Password changed successfully');
      setShowChangePassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.logoContainer}>
              <img
                src="/Iuris_Peritis_logo_(edit).png"
                alt=""
                style={styles.logo}
              />
            </div>
            <h1 style={styles.title}>Law Firm AML Compliance System</h1>
            <p style={styles.subtitle}>Client Dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowChangePassword(true)}
              style={styles.iconButton}
              title="Change Password"
            >
              <svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
            <button onClick={signOut} style={styles.signOutButton}>
              Sign Out
            </button>
          </div>
        </header>
        <div style={styles.content}>
          <div style={styles.emptyStateCard}>
            <h2 style={styles.emptyStateTitle}>No Organization Assigned</h2>
            <p style={styles.emptyStateText}>
              Please contact your administrator to assign an organization to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: '0 0 16px 16px',
        padding: '32px 40px',
        marginBottom: '32px',
        border: '2px solid #d4af37',
        borderTop: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#d4af37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Strategic Compliance Overview
            </div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '36px', fontWeight: '800', color: 'white' }}>
              {organization.name}
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '16px', margin: '0 0 12px 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>{organization.business_type}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>{organization.size} Organization</span>
              </div>
              {organization.dnfbp_category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37' }}></div>
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                    {institutionCategories.find(cat => cat.value === organization.dnfbp_category)?.label || organization.dnfbp_category}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{
              padding: '16px 24px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '2px solid #d4af37',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#d4af37', fontWeight: '600', marginBottom: '4px' }}>
                FIRM DASHBOARD
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                Executive View
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <button
                onClick={() => setShowChangePassword(true)}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}
                title="Change Password"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </button>
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
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {/* Only show subscription warning for client role users */}
        {!hasActiveSubscription && profile?.role === 'client' && (
          <div style={styles.subscriptionWarning}>
            <div style={styles.warningIcon}>⚠️</div>
            <div style={styles.warningContent}>
              <h3 style={styles.warningTitle}>Subscription Required</h3>
              <p style={styles.warningText}>
                {profile?.subscription_expiry_date
                  ? `Your subscription expired on ${new Date(profile.subscription_expiry_date).toLocaleDateString()}. Please contact support to renew your subscription and continue using the assessment system.`
                  : 'No active subscription found. Please contact support to activate your subscription and access the assessment system.'}
              </p>
            </div>
          </div>
        )}

        <div style={styles.viewToggle}>
          <button
            onClick={() => setActiveView('overview')}
            style={{
              ...styles.viewToggleButton,
              ...(activeView === 'overview' ? styles.viewToggleButtonActive : {})
            }}
          >
            <svg style={styles.viewToggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Compliance Intelligence
          </button>
          <button
            data-view="kyc"
            onClick={() => setActiveView('kyc')}
            style={{
              ...styles.viewToggleButton,
              ...(activeView === 'kyc' ? styles.viewToggleButtonActive : {})
            }}
          >
            <svg style={styles.viewToggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Client Portfolio
          </button>
          <button
            onClick={() => setActiveView('institutional')}
            style={{
              ...styles.viewToggleButton,
              ...(activeView === 'institutional' ? styles.viewToggleButtonActive : {})
            }}
          >
            <svg style={styles.viewToggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            Firm Risk Assessment
          </button>
          <button
            onClick={() => setActiveView('str')}
            style={{
              ...styles.viewToggleButton,
              ...(activeView === 'str' ? styles.viewToggleButtonActive : {}),
              position: 'relative'
            }}
          >
            <svg style={styles.viewToggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            Suspicious Activity
            {alertCount > 0 && (
              <span style={{
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {alertCount}
              </span>
            )}
          </button>
        </div>

        {activeView === 'overview' ? (
          loadingIntegration ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading integrated intelligence...
            </div>
          ) : integrationData ? (
            <>
              <div style={{
                ...styles.sectionCard,
                background: `linear-gradient(135deg, ${getRiskColor(integrationData.healthScore.rating)}15, ${getRiskColor(integrationData.healthScore.rating)}30)`,
                border: `3px solid ${getRiskColor(integrationData.healthScore.rating)}`,
                marginBottom: '32px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#64748b', fontWeight: '600' }}>
                      FIRM COMPLIANCE HEALTH SCORE
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                      <div style={{ fontSize: '56px', fontWeight: '800', color: '#0a1929' }}>
                        {integrationData.healthScore.score}/100
                      </div>
                      <div style={{
                        ...styles.badge,
                        background: getRiskColor(integrationData.healthScore.rating),
                        color: 'white',
                        fontSize: '16px',
                        padding: '8px 20px'
                      }}>
                        {integrationData.healthScore.rating}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                      Based on {integrationData.kycStats.totalClients} clients, {integrationData.alertStats.totalAlerts} alerts
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Assessment: {integrationData.assessment ? 'Complete' : 'Pending'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  borderTop: '2px solid rgba(0,0,0,0.1)',
                  paddingTop: '20px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>KYC Health</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.healthScore.breakdown.kycHealth}/25
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Alert Performance</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.healthScore.breakdown.alertPerformance}/25
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Control Effectiveness</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.healthScore.breakdown.controlEffectiveness}/25
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Risk Balance</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.healthScore.breakdown.riskBalance}/25
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                <div style={styles.sectionCard}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>👥</span>
                    Clients
                  </h3>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.kycStats.totalClients}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Total Clients</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#92400e' }}>
                        {integrationData.kycStats.highRiskCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#92400e' }}>High Risk</div>
                      <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>
                        ({((integrationData.kycStats.highRiskCount / integrationData.kycStats.totalClients) * 100).toFixed(1)}%)
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: '#e0e7ff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#3730a3' }}>
                        {integrationData.kycStats.pepCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#3730a3' }}>PEPs</div>
                      <div style={{ fontSize: '10px', color: '#3730a3', marginTop: '2px' }}>
                        ({((integrationData.kycStats.pepCount / integrationData.kycStats.totalClients) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.sectionCard}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🚨</span>
                    Suspicious Activity Alerts
                  </h3>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: '#0a1929' }}>
                      {integrationData.alertStats.totalAlerts}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Total Alerts</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#991b1b' }}>
                        {integrationData.alertStats.pendingAlerts}
                      </div>
                      <div style={{ fontSize: '11px', color: '#991b1b' }}>Pending</div>
                    </div>
                    <div style={{ padding: '12px', background: '#e0e7ff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#3730a3' }}>
                        {integrationData.alertStats.strCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#3730a3' }}>STRs Filed</div>
                    </div>
                  </div>
                </div>

                <div style={styles.sectionCard}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>⚖️</span>
                    Firm Assessment
                  </h3>
                  {integrationData.assessment ? (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          ...styles.badge,
                          background: getRiskColor(integrationData.assessment.overall_risk_rating),
                          color: 'white',
                          fontSize: '14px',
                          padding: '6px 16px',
                          display: 'inline-block'
                        }}>
                          {integrationData.assessment.overall_risk_rating}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                          Completed {new Date(integrationData.assessment.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                        <div style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ color: '#64748b' }}>Module 1: Inherent Risk</div>
                          <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px' }}>
                            {integrationData.assessment.module_1_score?.toFixed(1) || 'N/A'}/5
                          </div>
                        </div>
                        <div style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ color: '#64748b' }}>Module 2: Compliance</div>
                          <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px' }}>
                            {integrationData.assessment.module_2_score?.toFixed(1) || 'N/A'}/5
                          </div>
                        </div>
                        <div style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ color: '#64748b' }}>Module 3: Effectiveness</div>
                          <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px' }}>
                            {integrationData.assessment.module_3_score?.toFixed(1) || 'N/A'}/5
                          </div>
                        </div>
                        <div style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ color: '#64748b' }}>Module 4: Maturity</div>
                          <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px' }}>
                            {integrationData.assessment.module_4_score?.toFixed(1) || 'N/A'}/5
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>No Assessment</div>
                      <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                        Complete an assessment to enable full integration
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {integrationData.recommendations && integrationData.recommendations.length > 0 && (
                <div style={styles.sectionCard}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>💡</span>
                    Intelligent Recommendations
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {integrationData.recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${rec.priority === 'High' ? '#ef4444' : '#f59e0b'}`
                      }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                          <span style={{
                            ...styles.badge,
                            background: rec.priority === 'High' ? '#fee2e2' : '#fef3c7',
                            color: rec.priority === 'High' ? '#991b1b' : '#92400e'
                          }}>
                            {rec.priority} Priority
                          </span>
                          <span style={{ ...styles.badge, background: '#e0e7ff', color: '#3730a3' }}>
                            {rec.category}
                          </span>
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0a1929', marginBottom: '4px' }}>
                          {rec.action}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {rec.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ClientRiskProfilesSection organizationId={organization.id} />

              <div style={{
                ...styles.sectionCard,
                background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '32px' }}>🎯</span>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '18px', fontWeight: '700' }}>
                      Integrated Compliance Intelligence
                    </h3>
                    <p style={{ margin: 0, color: '#1e3a8a', lineHeight: '1.6', fontSize: '14px' }}>
                      This dashboard combines data from client due diligence, suspicious activity monitoring, and firm
                      risk assessments to provide a comprehensive view of your AML compliance posture. The system automatically
                      calculates composite risk scores, adjusts monitoring thresholds, and generates intelligent recommendations
                      based on real-time data across all compliance functions.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.sectionCard}>
              <p style={{ textAlign: 'center', color: '#64748b' }}>
                No integration data available. Complete an assessment and add KYC clients to see integrated intelligence.
              </p>
            </div>
          )
        ) : activeView === 'kyc' ? (
          <KYCClientManagement />
        ) : activeView === 'institutional' ? (
          <>

        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Assessments</h2>
            <button
              onClick={startNewAssessment}
              style={styles.primaryButton}
            >
              + New Assessment
            </button>
          </div>
          <div style={styles.cardTableContainer}>
            {assessments.length === 0 ? (
              <p style={styles.emptyState}>No assessments yet. Click "New Assessment" to get started.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Risk Rating</th>
                    <th style={styles.th}>Assessor</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: assessment.status === 'completed' ? '#d1fae5' : '#fef3c7',
                          color: assessment.status === 'completed' ? '#065f46' : '#92400e'
                        }}>
                          {assessment.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {assessment.overall_risk_rating ? (
                          <span style={{
                            ...styles.badge,
                            background: getRiskColor(assessment.overall_risk_rating) + '20',
                            color: getRiskColor(assessment.overall_risk_rating)
                          }}>
                            {getRiskLabel(assessment.overall_risk_rating)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>{assessment.assessor_name || '-'}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(assessment.status === 'completed' ? `/report/${assessment.id}` : `/assessment/${assessment.id}`)}
                            style={styles.linkButton}
                          >
                            {assessment.status === 'completed' ? 'View Report' : 'Continue'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({
                              show: true,
                              id: assessment.id,
                              date: new Date(assessment.assessment_date).toLocaleDateString()
                            })}
                            style={styles.dangerButton}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </>
        ) : activeView === 'str' ? (
          <STRAlertDashboard />
        ) : null}
      </div>

      {deleteConfirm.show && (
        <div style={styles.modal} onClick={() => setDeleteConfirm({ show: false, id: null, date: '' })}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Confirm Delete</h2>
            <p style={styles.modalText}>
              Are you sure you want to delete this assessment?
            </p>
            <p style={{ ...styles.modalText, fontWeight: '600' }}>
              Assessment Date: {deleteConfirm.date}
            </p>
            <p style={{ ...styles.modalText, color: '#ef4444', fontSize: '13px' }}>
              This action cannot be undone. All assessment data will be permanently deleted.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setDeleteConfirm({ show: false, id: null, date: '' })}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={styles.deleteButton}
              >
                Delete Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <div style={styles.modal} onClick={() => setShowSupport(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{systemContent.support?.title || 'Contact Support'}</h2>
            <div style={styles.supportInfo}>
              <MarkdownRenderer content={systemContent.support?.content || 'Loading support information...'} />
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowSupport(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrivacyPolicy && (
        <div style={styles.modal} onClick={() => setShowPrivacyPolicy(false)}>
          <div style={styles.privacyPolicyContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{...styles.modalTitle, padding: '24px 32px 0'}}>{systemContent.privacy?.title || 'Privacy Policy'}</h2>
            <div style={styles.privacyPolicyScroll}>
              <MarkdownRenderer content={systemContent.privacy?.content || 'Loading privacy policy...'} />
            </div>
            <div style={{...styles.modalActions, padding: '20px 32px', borderTop: '1px solid #e8eaed'}}>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div style={styles.modal} onClick={() => {
          setShowChangePassword(false);
          setPasswordForm({ newPassword: '', confirmPassword: '' });
          setPasswordError('');
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              {passwordError && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>
                  {passwordError}
                </p>
              )}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTermsAndConditions && (
        <div style={styles.modal} onClick={() => setShowTermsAndConditions(false)}>
          <div style={styles.privacyPolicyContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{...styles.modalTitle, padding: '24px 32px 0'}}>{systemContent.terms?.title || 'Terms & Conditions'}</h2>
            <div style={styles.privacyPolicyScroll}>
              <MarkdownRenderer content={systemContent.terms?.content || 'Loading terms & conditions...'} />
            </div>
            <div style={{...styles.modalActions, padding: '20px 32px', borderTop: '1px solid #e8eaed'}}>
              <button
                onClick={() => setShowTermsAndConditions(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          © 2026 All Rights Reserved.
        </div>
        <div style={styles.footerRight}>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowTermsAndConditions(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Terms & Conditions
          </a>
          <span style={styles.footerDivider}>|</span>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Privacy Policy
          </a>
          <span style={styles.footerDivider}>|</span>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowSupport(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '32px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '16px',
  },
  logo: {
    maxWidth: '200px',
    height: 'auto',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '16px',
    color: '#d4af37',
    fontWeight: '500',
  },
  iconButton: {
    padding: '10px 14px',
    background: 'transparent',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    padding: '10px 24px',
    background: '#d4af37',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  cardTableContainer: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  section: {
    marginBottom: '48px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '2px solid #d4af37',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    margin: 0,
  },
  primaryButton: {
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
  },
  form: {
    marginBottom: '24px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  submitButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
  },
  cardText: {
    margin: '0 0 4px 0',
    color: '#4a5568',
    fontSize: '14px',
  },
  cardSubtext: {
    margin: '0 0 16px 0',
    color: '#718096',
    fontSize: '13px',
  },
  cardButton: {
    width: '100%',
    padding: '10px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    border: '1px solid #d4af37',
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
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  linkButton: {
    padding: '6px 16px',
    background: 'transparent',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#718096',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
  },
  emptyStateCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
  },
  emptyStateTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 12px 0',
  },
  emptyStateText: {
    fontSize: '16px',
    color: '#4a5568',
    margin: 0,
  },
  dangerButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '32px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '12px',
  },
  modalText: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#2d3748',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    padding: '10px 24px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f0f0f0',
    color: '#2d3748',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  footer: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '3px solid #d4af37',
    marginTop: '48px',
  },
  footerLeft: {
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '500',
  },
  footerRight: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    paddingRight: '48px',
  },
  footerLink: {
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  footerDivider: {
    color: '#d4af37',
    fontSize: '14px',
  },
  supportInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    margin: '24px 0',
  },
  supportItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  supportLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  supportValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#0a1929',
    textDecoration: 'none',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e8eaed',
    transition: 'all 0.3s ease',
  },
  privacyPolicyContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
  },
  privacyPolicyScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    paddingTop: '24px',
  },
  privacySection: {
    marginBottom: '32px',
  },
  privacySectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '16px',
    marginTop: '0',
  },
  privacySubTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: '16px',
    marginBottom: '12px',
  },
  privacyText: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#475569',
    marginBottom: '12px',
  },
  privacyList: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#475569',
    paddingLeft: '24px',
    marginTop: '8px',
    marginBottom: '12px',
  },
  supportContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2d3748',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
  },
  markdownContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2d3748',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
  },
  subscriptionWarning: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
  },
  warningIcon: {
    fontSize: '32px',
    lineHeight: '1',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#92400e',
  },
  warningText: {
    margin: 0,
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.6',
  },
  viewToggle: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  viewToggleButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewToggleButtonActive: {
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },
  viewToggleIcon: {
    width: '20px',
    height: '20px',
  },
};
