import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
import ManualScreeningForm from './ManualScreeningForm';
import ScreeningMatchReview from './ScreeningMatchReview';
import ScreeningListManagement from './ScreeningListManagement';
import LoadingSpinner from './LoadingSpinner';
import NewScreeningModal from './NewScreeningModal';
import ReviewMatchesPanel from './ReviewMatchesPanel';
import ManageListsPanel from './ManageListsPanel';
import PEPReviewPanel from './PEPReviewPanel';
import DomesticDesignationsAdmin from './DomesticDesignationsAdmin';
import { getDashboardCounters, getScreeningHistory } from '../services/screeningService';
import PageHeader from './PageHeader';
import { fmtDateShort } from '../utils/dateFormat';

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
  const historyRef = useRef(null);

  const scrollToHistory = (tab) => {
    setActiveTab(tab);
    setTimeout(() => {
      historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

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

      const [counters, historyData] = await Promise.all([
        getDashboardCounters(),
        getScreeningHistory({ page: 1, pageSize: 50 }),
      ]);

      setStatistics(counters);
      setRecentResults(historyData.rows || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...dashboardStyles.pageContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
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
          <ReviewMatchesPanel organizationId={organizationId} />
        </div>
      </div>
    );
  }

  if (activeView === 'pep_review') {
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
          <PEPReviewPanel />
        </div>
      </div>
    );
  }

  if (activeView === 'domestic_designations') {
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
          <DomesticDesignationsAdmin organizationId={organizationId} />
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
          onMouseEnter={(e) => { e.target.style.background = 'rgba(212, 175, 55, 0.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ManualScreeningForm
            onComplete={() => {
              setActiveView('overview');
              loadDashboardData();
            }}
          />
        </div>
      </div>
    );
  }

  if (activeView === 'view_result' && selectedClient) {
    return (
      <div style={dashboardStyles.pageContainer}>
        <button
          onClick={() => { setSelectedClient(null); setActiveView('overview'); }}
          style={dashboardStyles.backButton}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(212, 175, 55, 0.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >
          ← Back
        </button>
        <div style={{ marginTop: '20px' }}>
          <ScreeningMatchReview
            screeningId={selectedClient}
            onBack={() => { setSelectedClient(null); setActiveView('overview'); }}
          />
        </div>
      </div>
    );
  }

  const filteredResults = recentResults.filter(result => {
    if (activeTab === 'all') return true;
    if (activeTab === 'matches') return result.match_count > 0;
    if (activeTab === 'pending') return result.status === 'pending_review';
    if (activeTab === 'cleared') return result.status === 'cleared';
    if (activeTab === 'high_risk') return result.overall_risk === 'high' || result.overall_risk === 'critical';
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
      <PageHeader
        eyebrow="SANCTIONS & SCREENING"
        title="Compliance Screening Dashboard"
        subtitle="Screen clients against sanctions, PEP, and adverse media lists to ensure compliance"
        onBack={onBack}
      />

      {/* Workflow Steps Card */}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
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
            title="PEP Review"
            description="Enhanced due diligence for politically exposed persons"
            icon="👤"
            action="PEP Queue"
            onClick={() => setActiveView('pep_review')}
          />
          <WorkflowStep
            number="5"
            title="Domestic Lists"
            description="Tanzania domestic designations (Gazette)"
            icon="📜"
            action="Manage Designations"
            onClick={() => setActiveView('domestic_designations')}
          />
          <WorkflowStep
            number="6"
            title="Monitor Results"
            description="Track screening history and compliance"
            icon="📊"
            action="View History"
            isActive={true}
            onClick={() => scrollToHistory('all')}
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
            icon="📋"
            onClick={() => scrollToHistory('all')}
          />
          <StatCard
            label="Matches Found"
            value={statistics.matches}
            icon="⚠️"
            highlight={statistics.matches > 0}
            onClick={() => scrollToHistory('matches')}
          />
          <StatCard
            label="Pending Review"
            value={statistics.pending}
            icon="⏳"
            urgent={statistics.pending > 0}
            onClick={() => scrollToHistory('pending')}
          />
          <StatCard
            label="Cleared"
            value={statistics.cleared}
            icon="✓"
            onClick={() => scrollToHistory('cleared')}
          />
          <StatCard
            label="High Risk Alerts"
            value={statistics.high_risk}
            icon="🚨"
            urgent={statistics.high_risk > 0}
            onClick={() => scrollToHistory('high_risk')}
          />
        </div>
      )}

      {/* Screening History */}
      <div ref={historyRef} style={{
        background: '#ffffff',
        border: '1px solid #e8eaed',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8eaed' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929', margin: '0 0 4px 0' }}>
            Screening History
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Complete record of all client screenings and results
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e8eaed', padding: '0 24px' }}>
          {[
            { id: 'all', label: `All (${recentResults.length})` },
            { id: 'matches', label: `Matches (${recentResults.filter(r => r.match_count > 0).length})` },
            { id: 'pending', label: `Pending (${recentResults.filter(r => r.status === 'pending_review').length})` },
            { id: 'cleared', label: `Cleared (${recentResults.filter(r => r.status === 'cleared').length})` },
            { id: 'high_risk', label: `High Risk (${recentResults.filter(r => r.overall_risk === 'high' || r.overall_risk === 'critical').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #d4af37' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab.id ? '#d4af37' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {filteredResults.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <p style={{ margin: 0 }}>No screening results found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a1929' }}>
                  {['CLIENT', 'SCREENING TYPE', 'DATE', 'MATCHES', 'RISK LEVEL', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#d4af37',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, idx) => (
                  <tr key={result.id} style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    borderBottom: '1px solid #e8eaed',
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0a1929' }}>
                        {result.kyc_clients?.client_name || result.screened_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {result.screened_nationality || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}>
                        Sanctions / PEP
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {result.screened_at
                        ? fmtDateShort(result.screened_at)
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={getBadgeStyle(result.match_count > 0 ? 'warning' : 'success')}>
                        {result.match_count > 0 ? `${result.match_count} matches` : 'Clear'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={getRiskBadgeStyle(result.overall_risk)}>
                        {(result.overall_risk || 'low').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={getStatusBadgeStyle(result.status)}>
                        {(result.status || 'pending').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => { setSelectedClient(result.id); setActiveView('view_result'); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d4af37',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '4px 0',
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

function StatCard({ label, value, icon, highlight, urgent, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: urgent ? 'linear-gradient(135deg, #fef3c7, #fef9e6)' : '#ffffff',
        border: urgent ? '2px solid #d4af37' : (highlight ? '2px solid #f59e0b' : '1px solid #e8eaed'),
        borderRadius: '10px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: urgent ? '#b45309' : '#0a1929' }}>
            {value ?? 0}
          </div>
        </div>
        <div style={{ fontSize: '24px' }}>{icon}</div>
      </div>
      {urgent && value > 0 && (
        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px', fontWeight: '500' }}>
          Action needed
        </div>
      )}
      {!urgent && label === 'Cleared' && (
        <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: '500' }}>
          No issues
        </div>
      )}
      {!urgent && label === 'Matches Found' && value > 0 && (
        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px', fontWeight: '500' }}>
          Require review
        </div>
      )}
      {label === 'Total Screenings' && (
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
          All time
        </div>
      )}
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
        boxShadow: isHovered && !isActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
        cursor: 'pointer',
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
          fontSize: '14px',
          flexShrink: 0,
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

      <button
        onClick={onClick}
        style={{
          width: '100%',
          padding: '8px',
          border: `1px solid ${isActive ? '#d4af37' : '#e8eaed'}`,
          borderRadius: '6px',
          background: isActive ? '#d4af37' : 'transparent',
          color: isActive ? 'white' : '#374151',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {action}
      </button>
    </div>
  );
}
