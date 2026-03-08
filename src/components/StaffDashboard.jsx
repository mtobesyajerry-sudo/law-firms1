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
  const [clientFilter, setClientFilter] = useState('all');
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
              current_risk_rating
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
        .select('id, current_risk_rating, current_dd_level, next_review_date, last_review_date, pep_status')
        .eq('organization_id', profile.organization_id)
        .eq('relationship_manager_id', user.id);

      const { data: conflicts } = await supabase
        .from('conflict_checks')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('resolution_status', 'pending');

      const today = new Date().toISOString().split('T')[0];
      // A review is overdue if next_review_date is in the past AND the last_review_date is before next_review_date (meaning the review hasn't been completed yet)
      const overdueReviews = allClients?.filter(c => {
        if (!c.next_review_date || c.next_review_date >= today) return false;
        // If no last_review_date exists, or last_review_date is before next_review_date, the review is still pending
        if (!c.last_review_date) return true;
        return new Date(c.last_review_date) < new Date(c.next_review_date);
      }).length || 0;

      setMyMatters(matters || []);
      setMyClients(clients || []);
      setStats({
        myMatters: allMatters?.length || 0,
        openMatters: allMatters?.filter(m => m.status === 'open' || m.status === 'active').length || 0,
        myClients: allClients?.length || 0,
        highRiskClients: allClients?.filter(c => c.current_risk_rating === 'High' || c.current_risk_rating === 'Very High').length || 0,
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

  if (activeView === 'overdue-reviews') {
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
          <OverdueReviewsList organizationId={profile.organization_id} userId={user.id} />
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
            setClientFilter('all');
            loadDashboardData();
          }}
          style={dashboardStyles.buttonSecondary}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <KYCClientManagement initialFilter={clientFilter} />
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

      {stats.overdueReviews > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #ef4444',
          boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a1929', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⏰</span>
              Overdue Client Reviews ({stats.overdueReviews})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myClients
              .filter(c => {
                if (!c.next_review_date) return false;
                const today = new Date().toISOString().split('T')[0];
                if (c.next_review_date >= today) return false;
                if (!c.last_review_date) return true;
                return new Date(c.last_review_date) < new Date(c.next_review_date);
              })
              .slice(0, 5)
              .map((client) => {
                const daysOverdue = Math.floor(
                  (new Date() - new Date(client.next_review_date)) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/client/kyc/${client.id}`)}
                    style={{
                      padding: '14px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      border: '2px solid #ef4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#ef4444';
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
                        background: '#dc2626',
                        color: 'white'
                      }}>
                        {daysOverdue} DAY{daysOverdue !== 1 ? 'S' : ''} OVERDUE
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Risk: {client.current_risk_rating} • DD Level: {(client.current_dd_level || 'standard').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '500' }}>
                      Due Date: {new Date(client.next_review_date).toLocaleDateString()} • Click to conduct review
                    </div>
                  </div>
                );
              })}
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
          onClick={() => {
            setClientFilter('all');
            setActiveView('clients');
          }}
        />
        <StatCard
          title="High Risk"
          value={stats.highRiskClients}
          icon="⚠️"
          color="#ef4444"
          onClick={() => {
            setClientFilter('high_risk');
            setActiveView('clients');
          }}
        />
        <StatCard
          title="EDD Required"
          value={stats.eddRequired}
          icon="🔍"
          color="#ec4899"
          onClick={() => {
            setClientFilter('enhanced_dd');
            setActiveView('clients');
          }}
        />
        <StatCard
          title="Overdue Reviews"
          value={stats.overdueReviews}
          icon="📅"
          color="#f59e0b"
          onClick={() => setActiveView('overdue-reviews')}
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
                    onClick={() => setActiveView('matters')}
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
                const riskStyle = getRiskStyle(client.current_risk_rating);
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
                        {client.current_risk_rating || 'Medium'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{client.client_type}</span>
                      {client.pep_status && <span style={{ color: '#f59e0b', fontWeight: '600' }}>• PEP</span>}
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

function OverdueReviewsList({ organizationId, userId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOverdueClients();
  }, [organizationId, userId]);

  const loadOverdueClients = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('kyc_clients')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('relationship_manager_id', userId)
        .lt('next_review_date', today)
        .order('next_review_date', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading overdue clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading overdue reviews..." />;
  }

  const getDaysOverdue = (reviewDate) => {
    const today = new Date();
    const review = new Date(reviewDate);
    const diffTime = today - review;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRiskColor = (rating) => {
    const colors = {
      'Very High': '#dc2626',
      'High': '#f59e0b',
      'Substantial': '#f97316',
      'Medium': '#10b981',
      'Low': '#3b82f6',
      'Very Low': '#6b7280'
    };
    return colors[rating] || '#6b7280';
  };

  return (
    <div>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: '#0a1929',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '32px' }}>📅</span>
          Overdue Reviews
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          {clients.length === 0
            ? 'All client reviews are up to date!'
            : `${clients.length} client(s) require immediate review`}
        </p>
      </div>

      {clients.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '48px',
          border: '2px solid #d4af37',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0a1929', margin: '0 0 8px 0' }}>
            All Reviews Current
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            No clients have overdue reviews at this time
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {clients.map((client) => {
            const daysOverdue = getDaysOverdue(client.next_review_date);
            const urgencyLevel = daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium';
            const urgencyColor = urgencyLevel === 'critical' ? '#dc2626' : urgencyLevel === 'high' ? '#f59e0b' : '#f97316';

            return (
              <div
                key={client.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: `2px solid ${urgencyColor}`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/kyc-client-details/${client.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${urgencyColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#0a1929',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {client.client_name}
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: getRiskColor(client.current_risk_rating),
                        color: 'white'
                      }}>
                        {client.current_risk_rating}
                      </span>
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                      <span>📋 {client.client_type === 'individual' ? 'Individual' : 'Corporate'}</span>
                      <span>🔍 DD Level: {client.current_dd_level}</span>
                      {client.pep_status && <span>⚠️ PEP</span>}
                    </div>
                  </div>
                  <div style={{
                    background: urgencyColor,
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '120px'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{daysOverdue}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>
                      DAYS OVERDUE
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                      Last Review
                    </div>
                    <div style={{ color: '#0a1929', fontWeight: '600' }}>
                      {client.last_review_date ? new Date(client.last_review_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                      Due Date
                    </div>
                    <div style={{ color: urgencyColor, fontWeight: '700' }}>
                      {new Date(client.next_review_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                      Status
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: urgencyColor,
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      {urgencyLevel === 'critical' ? '🚨 CRITICAL' : urgencyLevel === 'high' ? '⚠️ HIGH' : '📌 MEDIUM'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
    'Low': { bg: '#d1fae5', color: '#065f46' },
    'Medium': { bg: '#fef3c7', color: '#92400e' },
    'Substantial': { bg: '#fed7aa', color: '#9a3412' },
    'High': { bg: '#fee2e2', color: '#991b1b' },
    'Very High': { bg: '#fce7f3', color: '#831843' }
  };
  return styles[riskLevel] || styles['Medium'];
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
