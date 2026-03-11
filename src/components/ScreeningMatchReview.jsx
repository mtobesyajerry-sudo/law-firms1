import React, { useState, useEffect } from 'react';
import { screeningService } from '../services/screeningService';
import { supabase } from '../supabaseClient';
import { dashboardStyles } from '../utils/dashboardStyles';

export default function ScreeningMatchReview() {
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [reviewAction, setReviewAction] = useState({
    false_positive: false,
    false_positive_reason: '',
    screening_status: 'cleared',
    review_notes: '',
  });
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      setOrganizationId(profile.organization_id);

      const reviews = await screeningService.getPendingScreeningReviews(profile.organization_id);
      setPendingReviews(reviews || []);
    } catch (error) {
      console.error('Error loading pending reviews:', error);
      setPendingReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: clients } = await supabase
        .from('kyc_clients')
        .select('id, client_name, client_type, risk_level, nationality')
        .eq('organization_id', organizationId)
        .limit(5);

      if (!clients || clients.length === 0) {
        alert('No clients found. Please add clients first in the KYC/CDD section.');
        setLoading(false);
        return;
      }

      const sampleScreeningResults = [];

      for (let i = 0; i < Math.min(3, clients.length); i++) {
        const client = clients[i];
        const hasMatches = i < 2;

        const matchesData = hasMatches ? [
          {
            matched_name: client.client_name,
            list_name: i === 0 ? 'OFAC SDN List' : 'UN Consolidated Sanctions',
            list_type: 'sanctions',
            match_confidence: Math.floor(Math.random() * 20) + 80,
            match_reason: i === 0 ? 'Name similarity with sanctioned individual' : 'Partial name match with UN sanctions list',
            additional_details: `Country: ${client.nationality || 'Unknown'}\nDate Added: ${new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}\nReference: REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
        ] : [];

        const screeningResult = {
          organization_id: organizationId,
          client_id: client.id,
          screening_type: i === 0 ? 'Sanctions' : i === 1 ? 'PEP' : 'Adverse Media',
          screening_date: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)).toISOString(),
          match_found: hasMatches,
          match_count: hasMatches ? 1 : 0,
          matches: matchesData,
          lists_checked: ['OFAC SDN', 'UN Sanctions', 'EU Sanctions', 'UK HMT', 'World Bank Debarment'],
          screening_status: hasMatches ? 'pending' : 'cleared',
          risk_level: hasMatches ? (i === 0 ? 'high' : 'medium') : 'low',
          overall_risk_score: hasMatches ? (i === 0 ? 78 : 62) : 15,
          false_positive: false,
          screened_by_id: user.id
        };

        sampleScreeningResults.push(screeningResult);
      }

      const { error } = await supabase
        .from('screening_results')
        .insert(sampleScreeningResults);

      if (error) throw error;

      alert('Sample screening data generated successfully!');
      await loadPendingReviews();
    } catch (error) {
      console.error('Error generating sample data:', error);
      alert('Error generating sample data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result) => {
    setSelectedResult(result);
    setReviewAction({
      false_positive: false,
      false_positive_reason: '',
      screening_status: result.screening_status || 'under_review',
      review_notes: result.review_notes || '',
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedResult) return;

    if (reviewAction.false_positive && !reviewAction.false_positive_reason.trim()) {
      alert('Please provide a reason for marking this as a false positive');
      return;
    }

    setLoading(true);
    try {
      await screeningService.updateScreeningResult(selectedResult.id, reviewAction);
      alert('Review submitted successfully');
      setSelectedResult(null);
      await loadPendingReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeStyle = (level) => {
    const colors = {
      critical: { bg: '#fee2e2', color: '#991b1b' },
      high: { bg: '#fed7aa', color: '#c2410c' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      low: { bg: '#d1fae5', color: '#065f46' },
    };
    const style = colors[level] || { bg: '#e5e7eb', color: '#374151' };
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  const getStatusBadgeStyle = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      under_review: { bg: '#dbeafe', color: '#1e40af' },
      cleared: { bg: '#d1fae5', color: '#065f46' },
      escalated: { bg: '#fee2e2', color: '#991b1b' },
    };
    const style = colors[status] || { bg: '#e5e7eb', color: '#374151' };
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  const getListTypeBadgeStyle = (type) => {
    const colors = {
      sanctions: { bg: '#fee2e2', color: '#991b1b' },
      pep: { bg: '#e9d5ff', color: '#6b21a8' },
      adverse_media: { bg: '#fed7aa', color: '#c2410c' },
      watchlist: { bg: '#dbeafe', color: '#1e40af' },
    };
    const style = colors[type] || { bg: '#e5e7eb', color: '#374151' };
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e8eaed',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0a1929',
    background: 'white',
    transition: 'all 0.2s',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px',
    letterSpacing: '0.3px'
  };

  if (loading && !selectedResult && pendingReviews.length === 0) {
    return (
      <div style={{
        ...dashboardStyles.pageContainer,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e8eaed',
            borderTop: '4px solid #d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
            Loading pending reviews...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.pageContainer}>
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerContent}>
          <div>
            <div style={dashboardStyles.headerTitle}>SCREENING MATCH REVIEW</div>
            <h1 style={dashboardStyles.headerSubtitle}>
              Review and clear screening matches
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px', maxWidth: '600px' }}>
              Review screening hits and determine if they are true matches or false positives
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start',
        minHeight: '600px',
        position: 'relative'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '2px solid #e8eaed',
          overflow: 'hidden',
          width: '380px',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '3px solid #d4af37',
            background: 'linear-gradient(135deg, #0a1929 0%, #1e293b 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <svg style={{ width: '20px', height: '20px', color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', letterSpacing: '0.5px' }}>
                PENDING REVIEWS
              </h2>
            </div>
            <div style={{
              background: '#d4af37',
              color: '#0a1929',
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              {pendingReviews.length} {pendingReviews.length === 1 ? 'Match' : 'Matches'}
            </div>
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {pendingReviews.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <svg style={{ width: '48px', height: '48px', margin: '0 auto', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ marginTop: '12px', color: '#0a1929', fontSize: '15px', fontWeight: '600' }}>
                  No pending reviews
                </p>
                <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                  Generate sample screening data to test the review workflow
                </p>
                <button
                  onClick={generateSampleData}
                  disabled={loading}
                  style={{
                    ...dashboardStyles.button,
                    fontSize: '13px',
                    padding: '10px 20px',
                    opacity: loading ? 0.5 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {loading ? 'Generating...' : 'Generate Sample Data'}
                </button>
                <p style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                  This will create sample screening results with matches that need review
                </p>
              </div>
            ) : (
              pendingReviews.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid #e8eaed',
                    background: selectedResult?.id === result.id ? 'linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: selectedResult?.id === result.id ? '4px solid #d4af37' : '4px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedResult?.id !== result.id) {
                      e.target.style.background = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedResult?.id !== result.id) {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#0a1929', marginBottom: '8px', fontSize: '15px' }}>
                    {result.client?.full_name || result.client?.client_name || 'Unknown Client'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    {result.match_count} match{result.match_count !== 1 ? 'es' : ''} found • {result.screening_type}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={getRiskBadgeStyle(result.risk_level)}>
                      {result.risk_level?.toUpperCase()}
                    </span>
                    <span style={getStatusBadgeStyle(result.screening_status)}>
                      {result.screening_status ? result.screening_status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(result.screening_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div style={{
          flex: 1,
          position: 'relative',
          zIndex: 1
        }}>
          {!selectedResult ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #e8eaed',
              padding: '60px 40px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p style={{ marginTop: '20px', fontSize: '18px', fontWeight: '600', color: '#0a1929' }}>
                Select a screening result to review
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                Choose a pending review from the left panel to begin
              </p>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #e8eaed',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #e8eaed',
                background: 'linear-gradient(135deg, #0a1929 0%, #1e293b 100%)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#d4af37', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>
                      MATCH REVIEW
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                      {selectedResult.client?.full_name || selectedResult.client?.client_name || 'Unknown Client'}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                      {selectedResult.client?.client_type || 'Individual'} • Risk Level: {selectedResult.client?.risk_level || 'N/A'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      ...getRiskBadgeStyle(selectedResult.risk_level),
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      display: 'inline-block'
                    }}>
                      {selectedResult.risk_level?.toUpperCase()} RISK
                    </span>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                      Score: {selectedResult.overall_risk_score || 0}/100
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Screening Type</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                      {selectedResult.screening_type}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                      {new Date(selectedResult.screening_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matches Found</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                      {selectedResult.match_count}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', borderBottom: '2px solid #e8eaed', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{
                    width: '4px',
                    height: '24px',
                    background: '#d4af37',
                    borderRadius: '2px'
                  }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', letterSpacing: '0.3px' }}>
                    SCREENING MATCHES
                  </h3>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {(selectedResult.matches || []).map((match, index) => (
                    <div
                      key={index}
                      style={{
                        border: '2px solid #e8eaed',
                        borderRadius: '8px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#d4af37';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e8eaed';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px', marginBottom: '4px' }}>
                            {match.matched_name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {match.list_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={getListTypeBadgeStyle(match.list_type)}>
                            {match.list_type?.toUpperCase()}
                          </span>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {match.match_confidence}% confidence
                          </div>
                        </div>
                      </div>

                      {match.match_reason && (
                        <div style={{ fontSize: '13px', color: '#0a1929', marginTop: '8px', padding: '8px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '6px' }}>
                          <strong>Reason:</strong> {match.match_reason}
                        </div>
                      )}

                      {match.additional_details && (
                        <details style={{ marginTop: '12px', fontSize: '12px' }}>
                          <summary style={{
                            cursor: 'pointer',
                            color: '#d4af37',
                            fontWeight: '600',
                            padding: '8px 0'
                          }}>
                            View Additional Details
                          </summary>
                          <pre style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: 'white',
                            border: '1px solid #e8eaed',
                            borderRadius: '6px',
                            fontSize: '11px',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {match.additional_details}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '24px', background: '#f8f9fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{
                    width: '4px',
                    height: '24px',
                    background: '#d4af37',
                    borderRadius: '2px'
                  }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', letterSpacing: '0.3px' }}>
                    REVIEW DECISION
                  </h3>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '2px solid #e8eaed'
                  }}>
                    <input
                      type="checkbox"
                      id="falsePositive"
                      checked={reviewAction.false_positive}
                      onChange={(e) => setReviewAction({
                        ...reviewAction,
                        false_positive: e.target.checked,
                        screening_status: e.target.checked ? 'cleared' : 'under_review'
                      })}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#d4af37'
                      }}
                    />
                    <label htmlFor="falsePositive" style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0a1929',
                      cursor: 'pointer'
                    }}>
                      Mark as False Positive
                    </label>
                  </div>

                  {reviewAction.false_positive && (
                    <div>
                      <label style={labelStyle}>False Positive Reason *</label>
                      <textarea
                        value={reviewAction.false_positive_reason}
                        onChange={(e) => setReviewAction({ ...reviewAction, false_positive_reason: e.target.value })}
                        rows="3"
                        placeholder="Explain why this is a false positive (different person, name variation, etc.)"
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                        onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Screening Status *</label>
                    <select
                      value={reviewAction.screening_status}
                      onChange={(e) => setReviewAction({ ...reviewAction, screening_status: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    >
                      <option value="under_review">Under Review</option>
                      <option value="cleared">Cleared</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Review Notes</label>
                    <textarea
                      value={reviewAction.review_notes}
                      onChange={(e) => setReviewAction({ ...reviewAction, review_notes: e.target.value })}
                      rows="4"
                      placeholder="Add your review notes, additional research findings, or justification for the decision..."
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                    <button
                      onClick={handleSubmitReview}
                      disabled={loading || (reviewAction.false_positive && !reviewAction.false_positive_reason)}
                      style={{
                        ...dashboardStyles.button,
                        flex: 1,
                        opacity: (loading || (reviewAction.false_positive && !reviewAction.false_positive_reason)) ? 0.5 : 1,
                        cursor: (loading || (reviewAction.false_positive && !reviewAction.false_positive_reason)) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading && !(reviewAction.false_positive && !reviewAction.false_positive_reason)) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading && !(reviewAction.false_positive && !reviewAction.false_positive_reason)) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      onClick={() => setSelectedResult(null)}
                      style={{ ...dashboardStyles.buttonSecondary, padding: '10px 24px' }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f8f9fa';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
