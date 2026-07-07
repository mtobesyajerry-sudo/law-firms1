import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
import ManualScreeningForm from './ManualScreeningForm';
import ScreeningMatchReview from './ScreeningMatchReview';
import ScreeningListManagement from './ScreeningListManagement';
import LoadingSpinner from './LoadingSpinner';
import NewScreeningModal from './NewScreeningModal';
import ReviewMatchesPanel from './ReviewMatchesPanel';
import ManageListsPanel from './ManageListsPanel';
import { getDashboardCounters, getScreeningHistory } from '../services/screeningService';

export default function ScreeningDashboard({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [showNewScreening, setShowNewScreening] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      setOrganizationId(profile.organization_id);

      const { data: clientsData } = await supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, client_type, risk_level, is_pep, is_sanctioned, last_screening_date, nationality')
        .eq('organization_id', profile.organization_id)
        .order('client_name');

      setClients(clientsData || []);

      const [counters, history] = await Promise.all([
        getDashboardCounters().catch(() => null),
        getScreeningHistory({ pageSize: 50 }).catch(() => ({ rows: [] })),
      ]);

      if (counters) {
        setStatistics({
          total: counters.total,
          matchesFound: counters.matches,
          pending: counters.pending,
          underReview: 0,
          cleared: counters.cleared,
          highRisk: counters.high_risk,
        });
      } else {
        setStatistics({ total: 0, matchesFound: 0, pending: 0, underReview: 0, cleared: 0, highRisk: 0 });
      }

      const liveResults = (history.rows || []).map((r) => ({
        id: r.id,
        client_name: r.kyc_clients?.client_name ?? r.screened_name ?? 'Unknown',
        client_id: r.client_id,
        screening_type: 'Sanctions / PEP',
        screening_date: r.screened_at ?? r.created_at,
        match_found: (r.match_count ?? 0) > 0,
        match_count: r.match_count ?? 0,
        risk_level: r.overall_risk ?? 'low',
        screening_status: r.status ?? 'pending_review',
        screened_by: r.screened_by,
        lists_checked: ['OFAC SDN', 'UN Sanctions', 'EU Sanctions', 'UK Sanctions'],
        nationality: r.screened_nationality,
      }));

      setRecentResults(liveResults);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScreeningComplete = () => {
    setSelectedClient(null);
    setActiveView('overview');
    loadDashboardData();
  };

  const getScreeningRiskBadgeStyle = (level) => {
    const colors = {
      critical: { bg: '#fee2e2', color: '#991b1b' },
      high: { bg: '#fed7aa', color: '#c2410c' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      low: { bg: '#d1fae5', color: '#065f46' }
    };
    const style = colors[level] || colors.low;
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  const getScreeningStatusBadgeStyle = (status) => {
    const statusColors = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      under_review: { bg: '#dbeafe', color: '#1e40af' },
      cleared: { bg: '#d1fae5', color: '#065f46' },
      escalated: { bg: '#fee2e2', color: '#991b1b' }
    };
    const style = statusColors[status] || statusColors.pending;
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (activeView === 'perform_screening' && selectedClient) {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => {
            setSelectedClient(null);
            setActiveView('overview');
          }}
          style={dashboardStyles.backButton}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(212, 175, 55, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
          }}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ManualScreeningForm
            client={selectedClient}
            onComplete={handleScreeningComplete}
            onCancel={() => {
              setSelectedClient(null);
              setActiveView('overview');
            }}
          />
        </div>
      </div>
    );
  }

  if (activeView === 'review_matches') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.backButton}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(212, 175, 55, 0.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ReviewMatchesPanel />
        </div>
      </div>
    );
  }

  if (activeView === 'list_management') {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.backButton}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(212, 175, 55, 0.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ManageListsPanel />
        </div>
      </div>
    );
  }

  if (activeView === 'perform_screening' && !selectedClient) {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => setActiveView('overview')}
          style={dashboardStyles.backButton}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(212, 175, 55, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
          }}
        >
          ← Back
        </button>
        <div style={{ ...dashboardStyles.contentCard, marginTop: '20px' }}>
          <h2 style={dashboardStyles.sectionTitle}>Select Client to Screen</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Choose a client to perform sanctions, PEP, and adverse media screening
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                style={{
                  ...dashboardStyles.quickActionCard,
                  textAlign: 'left',
                  padding: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d4af37';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8eaed';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' }}>
                  {client.client_name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {client.client_type} • {client.risk_level}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredResults = recentResults.filter(result => {
    if (activeTab === 'all') return true;
    if (activeTab === 'matches') return result.match_found;
    if (activeTab === 'pending') return result.screening_status === 'pending';
    if (activeTab === 'cleared') return result.screening_status === 'cleared';
    if (activeTab === 'high_risk') return result.risk_level === 'high' || result.risk_level === 'critical';
    return true;
  });

  return (
    <div style={dashboardStyles.pageContainer}>
      {showNewScreening && (
        <NewScreeningModal
          onClose={() => setShowNewScreening(false)}
          onSaved={() => {
            setShowNewScreening(false);
            loadDashboardData();
          }}
        />
      )}

      {/* Header */}
      <div style={dashboardStyles.headerCard}>
        <div style={{ ...dashboardStyles.headerContent, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={dashboardStyles.headerTitle}>SANCTIONS & SCREENING</div>
            <h1 style={dashboardStyles.headerSubtitle}>Compliance Screening Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px', maxWidth: '600px' }}>
              Screen clients against sanctions, PEP, and adverse media lists to ensure compliance
            </p>
          </div>
          {onBack && (
            <button onClick={onBack} style={{ ...dashboardStyles.buttonSecondary, color: '#ffffff' }}>← Back</button>
          )}
        </div>
      </div>

      {/* Workflow Explanation Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        border: '2px solid #e8eaed',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <svg style={{ width: '24px', height: '24px', color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929', margin: 0 }}>
            How Screening Works
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <WorkflowStep
            number="1"
            title="Maintain Lists"
            description="Keep sanctions, PEP, and watchlists updated"
            icon="📋"
            action="Manage Lists"
            onClick={() => setActiveView('list_management')}
          />
          <WorkflowStep
            number="2"
            title="Screen Clients"
            description="Run clients against all screening lists"
            icon="🔍"
            action="New Screening"
            onClick={() => setShowNewScreening(true)}
          />
          <WorkflowStep
            number="3"
            title="Review Matches"
            description="Clear false positives or escalate hits"
            icon="✓"
            action="Review Matches"
            onClick={() => setActiveView('review_matches')}
            badge={statistics?.pending > 0 ? statistics.pending : null}
          />
          <WorkflowStep
            number="4"
            title="Monitor Results"
            description="Track screening history and compliance"
            icon="📊"
            action="View Below"
            isActive={true}
          />
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <StatCard
            label="Total Screenings"
            value={statistics.total}
            color="#0a1929"
            icon="📋"
            subtitle="All time"
          />
          <StatCard
            label="Matches Found"
            value={statistics.matchesFound}
            color="#c2410c"
            icon="⚠️"
            subtitle="Require review"
          />
          <StatCard
            label="Pending Review"
            value={statistics.pending + statistics.underReview}
            color="#92400e"
            icon="⏳"
            subtitle="Action needed"
            highlight={true}
          />
          <StatCard
            label="Cleared"
            value={statistics.cleared}
            color="#065f46"
            icon="✓"
            subtitle="No issues"
          />
          <StatCard
            label="High Risk Alerts"
            value={statistics.highRisk}
            color="#991b1b"
            icon="🚨"
            subtitle="Critical"
            highlight={statistics.highRisk > 0}
          />
        </div>
      )}

      {/* Results Table */}
      <div style={dashboardStyles.contentCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={dashboardStyles.sectionTitle}>Screening History</h2>
            <p style={{ color: '#64748b', margin: '0', fontSize: '14px' }}>
              Complete record of all client screenings and results
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={dashboardStyles.tabContainer}>
          <TabButton
            label={`All (${recentResults.length})`}
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
          <TabButton
            label={`Matches (${recentResults.filter(r => r.match_found).length})`}
            active={activeTab === 'matches'}
            onClick={() => setActiveTab('matches')}
          />
          <TabButton
            label={`Pending (${recentResults.filter(r => r.screening_status === 'pending').length})`}
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
          />
          <TabButton
            label={`Cleared (${recentResults.filter(r => r.screening_status === 'cleared').length})`}
            active={activeTab === 'cleared'}
            onClick={() => setActiveTab('cleared')}
          />
          <TabButton
            label={`High Risk (${recentResults.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length})`}
            active={activeTab === 'high_risk'}
            onClick={() => setActiveTab('high_risk')}
          />
        </div>

        {filteredResults.length === 0 ? (
          <div style={dashboardStyles.emptyState}>
            <div style={dashboardStyles.emptyStateIcon}>🔍</div>
            <div style={dashboardStyles.emptyStateText}>No screening results found</div>
            <div style={dashboardStyles.emptyStateSubtext}>
              Start by screening your clients against compliance lists
            </div>
            <button
              onClick={() => {
                setSelectedClient(null);
                setActiveView('perform_screening');
              }}
              style={{ ...dashboardStyles.button, marginTop: '20px' }}
            >
              Screen a Client
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={dashboardStyles.table}>
              <thead>
                <tr>
                  <th style={dashboardStyles.tableHeader}>CLIENT</th>
                  <th style={dashboardStyles.tableHeader}>SCREENING TYPE</th>
                  <th style={dashboardStyles.tableHeader}>DATE</th>
                  <th style={dashboardStyles.tableHeader}>MATCHES</th>
                  <th style={dashboardStyles.tableHeader}>RISK LEVEL</th>
                  <th style={dashboardStyles.tableHeader}>STATUS</th>
                  <th style={dashboardStyles.tableHeader}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id} style={{ transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={dashboardStyles.tableCell}>
                      <div style={{ fontWeight: '600', color: '#0a1929' }}>{result.client_name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {result.nationality || 'N/A'}
                      </div>
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      <span style={getBadgeStyle('info')}>
                        {result.screening_type}
                      </span>
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      {new Date(result.screening_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      <span style={result.match_found ? getBadgeStyle('warning') : getBadgeStyle('success')}>
                        {result.match_found ? `${result.match_count} match${result.match_count !== 1 ? 'es' : ''}` : 'Clear'}
                      </span>
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      <span style={getScreeningRiskBadgeStyle(result.risk_level)}>
                        {result.risk_level?.toUpperCase()}
                      </span>
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      <span style={getScreeningStatusBadgeStyle(result.screening_status)}>
                        {result.screening_status ? result.screening_status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={dashboardStyles.tableCell}>
                      <button
                        onClick={() => setActiveView('review_matches')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#d4af37',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(212, 175, 55, 0.1)';
                          e.target.style.color = '#0a1929';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#d4af37';
                        }}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowStep({ number, title, description, icon, action, onClick, badge, isActive }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        padding: '16px',
        borderRadius: '8px',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isHovered && !isActive ? '#d4af37' : (isActive ? '#d4af37' : '#e8eaed'),
        background: isActive ? 'linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)' : 'white',
        transition: 'all 0.2s',
        transform: isHovered && !isActive ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered && !isActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {badge && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#c2410c',
          color: 'white',
          borderRadius: '12px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          {badge}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isActive ? '#d4af37' : '#e8eaed',
          color: isActive ? 'white' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px'
        }}>
          {number}
        </div>
        <div style={{ fontSize: '24px' }}>{icon}</div>
      </div>

      <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0a1929', margin: '0 0 4px 0' }}>
        {title}
      </h4>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
        {description}
      </p>

      {onClick ? (
        <button
          onClick={onClick}
          style={{
            background: 'transparent',
            border: `2px solid ${isActive ? '#d4af37' : '#e8eaed'}`,
            color: isActive ? '#0a1929' : '#64748b',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#d4af37';
            e.target.style.color = 'white';
            e.target.style.borderColor = '#d4af37';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = isActive ? '#0a1929' : '#64748b';
            e.target.style.borderColor = isActive ? '#d4af37' : '#e8eaed';
          }}
        >
          {action}
        </button>
      ) : (
        <div style={{
          background: isActive ? 'rgba(212, 175, 55, 0.2)' : '#f8f9fa',
          border: `2px solid ${isActive ? '#d4af37' : '#e8eaed'}`,
          color: isActive ? '#0a1929' : '#64748b',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {action}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon, subtitle, highlight }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...dashboardStyles.statCard,
        ...(highlight ? {
          background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)',
          borderColor: '#d4af37'
        } : {}),
        ...(isHovered ? dashboardStyles.statCardHover : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={dashboardStyles.statLabel}>{label}</div>
          <div style={{ ...dashboardStyles.statValue, color, marginTop: '4px' }}>{value}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: '24px', opacity: 0.8 }}>{icon}</div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={active ? dashboardStyles.tabActive : dashboardStyles.tab}
    >
      {label}
    </button>
  );
}
