import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  clearMatch,
  confirmMatch,
  escalateMatch,
  fileSTR,
  recordFreezeAction,
  notifyCommittee,
} from '../services/screeningService';
import { dashboardStyles } from '../utils/dashboardStyles';
import LoadingSpinner from './LoadingSpinner';

const ReviewMatchesPanel = ({ organizationId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [notes, setNotes] = useState({});
  const [escalationJustification, setEscalationJustification] = useState({});
  const [strReference, setStrReference] = useState({});
  const [committeeReference, setCommitteeReference] = useState({});
  const [freezeActionInProgress, setFreezeActionInProgress] = useState(null);
  const [notifyActionInProgress, setNotifyActionInProgress] = useState(null);
  const [strActionInProgress, setStrActionInProgress] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, [organizationId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('screening_matches')
        .select(`
          *,
          screening_results (
            id,
            screened_name,
            pep_category,
            overall_risk
          )
        `)
        .in('status', ['pending_review', 'pending_second_review'])
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (matchId) => {
    try {
      setActionInProgress(matchId);
      await clearMatch(matchId, notes[matchId] || '');
      await fetchMatches();
      setNotes({ ...notes, [matchId]: '' });
      setExpandedMatchId(null);
    } catch (error) {
      console.error('Error clearing match:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirm = async (matchId) => {
    try {
      setActionInProgress(matchId);
      await confirmMatch(matchId, notes[matchId] || '');
      await fetchMatches();
      setNotes({ ...notes, [matchId]: '' });
    } catch (error) {
      console.error('Error confirming match:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEscalate = async (matchId) => {
    try {
      setActionInProgress(matchId);
      await escalateMatch(
        matchId,
        null,
        notes[matchId] || '',
        escalationJustification[matchId] || ''
      );
      await fetchMatches();
      setNotes({ ...notes, [matchId]: '' });
      setEscalationJustification({ ...escalationJustification, [matchId]: '' });
      setExpandedMatchId(null);
    } catch (error) {
      console.error('Error escalating match:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRecordFreeze = async (matchId) => {
    try {
      setFreezeActionInProgress(matchId);
      await recordFreezeAction(matchId);
      await fetchMatches();
    } catch (error) {
      console.error('Error recording freeze action:', error);
    } finally {
      setFreezeActionInProgress(null);
    }
  };

  const handleNotifyCommittee = async (matchId) => {
    try {
      setNotifyActionInProgress(matchId);
      await notifyCommittee(matchId, committeeReference[matchId] || '');
      await fetchMatches();
      setCommitteeReference({ ...committeeReference, [matchId]: '' });
    } catch (error) {
      console.error('Error notifying committee:', error);
    } finally {
      setNotifyActionInProgress(null);
    }
  };

  const handleFileSTR = async (matchId, screeningResultId) => {
    try {
      setStrActionInProgress(matchId);
      await fileSTR(screeningResultId, strReference[matchId] || '');
      await fetchMatches();
      setStrReference({ ...strReference, [matchId]: '' });
    } catch (error) {
      console.error('Error filing STR:', error);
    } finally {
      setStrActionInProgress(null);
    }
  };

  const getScoreBadgeColor = (score) => {
    if (score < 70) return '#10b981';
    if (score < 85) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskBadgeStyle = (riskLevel) => {
    const baseStyle = {
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      display: 'inline-block',
    };

    switch (riskLevel) {
      case 'critical':
        return { ...baseStyle, backgroundColor: '#ef4444', color: '#fff' };
      case 'high':
        return { ...baseStyle, backgroundColor: '#f97316', color: '#fff' };
      case 'medium':
        return { ...baseStyle, backgroundColor: '#f59e0b', color: '#fff' };
      case 'low':
        return { ...baseStyle, backgroundColor: '#6b7280', color: '#fff' };
      default:
        return { ...baseStyle, backgroundColor: '#d1d5db', color: '#fff' };
    }
  };

  const isHighRisk = (riskLevel) => {
    return riskLevel === 'critical' || riskLevel === 'high';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (matches.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          color: '#94a3b8',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', color: '#cbd5e1' }}>
          No Pending Matches
        </h3>
        <p style={{ margin: 0 }}>All screening matches have been reviewed.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2
          style={{
            color: '#f59e0b',
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 10px 0',
          }}
        >
          Review Screening Matches
        </h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''} pending review
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {matches.map((match) => {
          const screeningResult = match.screening_results;
          const isExpanded = expandedMatchId === match.id;
          const score = match.match_score || 0;
          const scoreBadgeColor = getScoreBadgeColor(score);
          const riskLevel = screeningResult?.overall_risk || 'unknown';
          const showComplianceActions =
            match.status === 'pending_second_review' &&
            isHighRisk(riskLevel);

          return (
            <div
              key={match.id}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                boxShadow: isExpanded ? '0 10px 25px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {/* Match Header */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid #1e293b' : 'none',
                }}
                onClick={() =>
                  setExpandedMatchId(isExpanded ? null : match.id)
                }
              >
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      color: '#f1f5f9',
                      margin: '0 0 8px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    {screeningResult?.screened_name}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: scoreBadgeColor,
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      {score.toFixed(1)}%
                    </div>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                      {match.match_entity_name}
                    </span>
                    {screeningResult?.pep_category && (
                      <div
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#f59e0b',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {screeningResult.pep_category}
                      </div>
                    )}
                    <div style={getRiskBadgeStyle(riskLevel)}>
                      {riskLevel}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: '20px',
                    marginLeft: '20px',
                  }}
                >
                  {isExpanded ? '−' : '+'}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{ padding: '20px', backgroundColor: '#0f172a' }}>
                  {/* TFS Freeze Banner */}
                  {showComplianceActions && !match.freeze_action_taken_at && (
                    <div
                      style={{
                        backgroundColor: '#7c2d12',
                        border: '2px solid #ea580c',
                        borderRadius: '6px',
                        padding: '16px',
                        marginBottom: '20px',
                        color: '#ffedd5',
                        fontSize: '14px',
                        lineHeight: '1.6',
                      }}
                    >
                      <strong>TFS Freeze Required:</strong> TFS freeze
                      obligates immediate reporting to FIU. Asset freeze must
                      be applied within 24 hours of designation confirmation.
                    </div>
                  )}

                  {/* Review Form */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        color: '#cbd5e1',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '8px',
                      }}
                    >
                      Review Notes
                    </label>
                    <textarea
                      value={notes[match.id] || ''}
                      onChange={(e) =>
                        setNotes({ ...notes, [match.id]: e.target.value })
                      }
                      placeholder="Enter your review notes..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Initial Actions */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '12px',
                      marginBottom: showComplianceActions ? '20px' : '0',
                    }}
                  >
                    <button
                      onClick={() => handleClear(match.id)}
                      disabled={
                        actionInProgress === match.id ||
                        match.status === 'pending_second_review'
                      }
                      style={{
                        padding: '10px 16px',
                        backgroundColor:
                          actionInProgress === match.id ||
                          match.status === 'pending_second_review'
                            ? '#64748b'
                            : '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          actionInProgress === match.id ||
                          match.status === 'pending_second_review'
                            ? 'not-allowed'
                            : 'pointer',
                        opacity:
                          actionInProgress === match.id ||
                          match.status === 'pending_second_review'
                            ? 0.6
                            : 1,
                      }}
                    >
                      Clear (False Positive)
                    </button>

                    <button
                      onClick={() => handleConfirm(match.id)}
                      disabled={actionInProgress === match.id}
                      style={{
                        padding: '10px 16px',
                        backgroundColor:
                          actionInProgress === match.id ? '#64748b' : '#f59e0b',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          actionInProgress === match.id
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: actionInProgress === match.id ? 0.6 : 1,
                      }}
                    >
                      Confirm (True Match)
                    </button>

                    <button
                      onClick={() => handleEscalate(match.id)}
                      disabled={actionInProgress === match.id}
                      style={{
                        padding: '10px 16px',
                        backgroundColor:
                          actionInProgress === match.id ? '#64748b' : '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          actionInProgress === match.id
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: actionInProgress === match.id ? 0.6 : 1,
                      }}
                    >
                      Escalate
                    </button>
                  </div>

                  {/* Escalation Justification */}
                  {match.status === 'pending_second_review' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label
                        style={{
                          display: 'block',
                          color: '#cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: '8px',
                        }}
                      >
                        Escalation Justification
                      </label>
                      <textarea
                        value={escalationJustification[match.id] || ''}
                        onChange={(e) =>
                          setEscalationJustification({
                            ...escalationJustification,
                            [match.id]: e.target.value,
                          })
                        }
                        placeholder="Provide justification for escalation..."
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '12px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  {/* Compliance Actions (Post-Confirmation) */}
                  {showComplianceActions && (
                    <div
                      style={{
                        borderTop: '1px solid #1e293b',
                        paddingTop: '20px',
                      }}
                    >
                      <h5
                        style={{
                          color: '#f59e0b',
                          fontSize: '14px',
                          fontWeight: '600',
                          margin: '0 0 16px 0',
                        }}
                      >
                        Compliance Actions
                      </h5>

                      <div
                        style={{
                          display: 'grid',
                          gap: '16px',
                        }}
                      >
                        {/* Record TFS Freeze */}
                        {!match.freeze_action_taken_at && (
                          <div>
                            <button
                              onClick={() => handleRecordFreeze(match.id)}
                              disabled={freezeActionInProgress === match.id}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor:
                                  freezeActionInProgress === match.id
                                    ? '#64748b'
                                    : '#ea580c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor:
                                  freezeActionInProgress === match.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  freezeActionInProgress === match.id
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              Record TFS Freeze Action
                            </button>
                          </div>
                        )}

                        {/* Notify Committee */}
                        <div>
                          <label
                            style={{
                              display: 'block',
                              color: '#cbd5e1',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '6px',
                            }}
                          >
                            Committee Notification Reference
                          </label>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 120px',
                              gap: '8px',
                            }}
                          >
                            <input
                              type="text"
                              value={committeeReference[match.id] || ''}
                              onChange={(e) =>
                                setCommitteeReference({
                                  ...committeeReference,
                                  [match.id]: e.target.value,
                                })
                              }
                              placeholder="Enter reference number..."
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#e2e8f0',
                                fontSize: '13px',
                              }}
                            />
                            <button
                              onClick={() =>
                                handleNotifyCommittee(match.id)
                              }
                              disabled={notifyActionInProgress === match.id}
                              style={{
                                padding: '8px 12px',
                                backgroundColor:
                                  notifyActionInProgress === match.id
                                    ? '#64748b'
                                    : '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor:
                                  notifyActionInProgress === match.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  notifyActionInProgress === match.id
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              Notify
                            </button>
                          </div>
                        </div>

                        {/* File STR */}
                        <div>
                          <label
                            style={{
                              display: 'block',
                              color: '#cbd5e1',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '6px',
                            }}
                          >
                            STR Reference Number
                          </label>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 120px',
                              gap: '8px',
                            }}
                          >
                            <input
                              type="text"
                              value={strReference[match.id] || ''}
                              onChange={(e) =>
                                setStrReference({
                                  ...strReference,
                                  [match.id]: e.target.value,
                                })
                              }
                              placeholder="Enter STR reference..."
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#e2e8f0',
                                fontSize: '13px',
                              }}
                            />
                            <button
                              onClick={() =>
                                handleFileSTR(
                                  match.id,
                                  screeningResult?.id
                                )
                              }
                              disabled={strActionInProgress === match.id}
                              style={{
                                padding: '8px 12px',
                                backgroundColor:
                                  strActionInProgress === match.id
                                    ? '#64748b'
                                    : '#8b5cf6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor:
                                  strActionInProgress === match.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  strActionInProgress === match.id
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              File STR
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match Details */}
                  <div
                    style={{
                      borderTop: '1px solid #1e293b',
                      marginTop: '20px',
                      paddingTop: '16px',
                      fontSize: '13px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <p
                          style={{
                            color: '#94a3b8',
                            margin: '0 0 4px 0',
                          }}
                        >
                          Match ID
                        </p>
                        <p
                          style={{
                            color: '#cbd5e1',
                            margin: 0,
                            fontFamily: 'monospace',
                          }}
                        >
                          {match.id}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            color: '#94a3b8',
                            margin: '0 0 4px 0',
                          }}
                        >
                          Status
                        </p>
                        <p
                          style={{
                            color: '#cbd5e1',
                            margin: 0,
                            textTransform: 'uppercase',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          {match.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewMatchesPanel;
