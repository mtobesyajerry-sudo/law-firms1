import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import integrationService from '../services/integrationService';
import { getRiskColor } from '../data/kycData';

export default function IntegratedClientRiskView() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIntegratedProfile();
  }, [clientId]);

  const loadIntegratedProfile = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getClientCompleteProfile(clientId);
      setProfile(data);
    } catch (err) {
      console.error('Error loading integrated profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading integrated risk profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!profile) return null;

  const { client, alertStats, institutionalAssessment, riskProfile, recommendations } = profile;

  return (
    <div style={styles.container}>
      <div style={styles.sectionCard}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{client.client_name}</h2>
            <p style={styles.subtitle}>Integrated Risk Intelligence</p>
          </div>
          <button onClick={() => navigate('/staff-dashboard')} style={styles.backButton}>
            ← Back
          </button>
        </div>

        {/* Composite Risk Score - Hero Section */}
        <div style={{
          ...styles.heroCard,
          background: `linear-gradient(135deg, ${getRiskColor(riskProfile.rating)}22, ${getRiskColor(riskProfile.rating)}44)`,
          border: `2px solid ${getRiskColor(riskProfile.rating)}`
        }}>
        <div style={styles.heroContent}>
          <div>
            <div style={styles.label}>COMPOSITE RISK SCORE</div>
            <div style={styles.compositeScore}>
              {riskProfile.score}/100
            </div>
            <div style={{
              ...styles.riskBadge,
              background: getRiskColor(riskProfile.rating),
              display: 'inline-block'
            }}>
              {riskProfile.rating}
            </div>
          </div>
          <div style={styles.scoreBreakdown}>
            <div style={styles.scoreItem}>
              <div style={styles.scoreLabel}>KYC Base Risk</div>
              <div style={styles.scoreValue}>{riskProfile.breakdown.kycRisk}/5</div>
            </div>
            <div style={styles.scoreItem}>
              <div style={styles.scoreLabel}>Alert History</div>
              <div style={styles.scoreValue}>{riskProfile.breakdown.alertRisk}/5</div>
            </div>
            <div style={styles.scoreItem}>
              <div style={styles.scoreLabel}>Behavior Risk</div>
              <div style={styles.scoreValue}>{riskProfile.breakdown.behaviorRisk}/5</div>
            </div>
            <div style={styles.scoreItem}>
              <div style={styles.scoreLabel}>Control Context</div>
              <div style={styles.scoreValue}>
                {riskProfile.breakdown.institutionalContext
                  ? `${riskProfile.breakdown.institutionalContext.toFixed(1)}/5`
                  : 'View Only'}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Three-Column Integration View */}
        <div style={styles.grid}>
        {/* Column 1: KYC Profile */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span style={styles.icon}>👤</span>
            KYC Profile
          </h3>
          <div style={styles.cardContent}>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>KYC Risk Rating:</span>
              <span style={{
                ...styles.dataBadge,
                background: getRiskColor(client.current_risk_rating)
              }}>
                {client.current_risk_rating || 'Not Rated'}
              </span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Client Type:</span>
              <span style={styles.dataValue}>{client.client_type}</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>DD Level:</span>
              <span style={styles.dataValue}>{client.current_dd_level || 'Standard'}</span>
            </div>
            {client.pep_status && (
              <div style={styles.dataRow}>
                <span style={{ ...styles.dataBadge, background: '#ef4444' }}>PEP</span>
              </div>
            )}
            {client.fatf_high_risk_jurisdiction && (
              <div style={styles.dataRow}>
                <span style={{ ...styles.dataBadge, background: '#f59e0b' }}>High Risk Jurisdiction</span>
              </div>
            )}
            {client.enhanced_monitoring_required && (
              <div style={styles.dataRow}>
                <span style={{ ...styles.dataBadge, background: '#8b5cf6' }}>Enhanced Monitoring</span>
              </div>
            )}
            <div style={styles.divider}></div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Last Review:</span>
              <span style={styles.dataValue}>
                {client.last_review_date
                  ? new Date(client.last_review_date).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Next Review:</span>
              <span style={styles.dataValue}>
                {client.next_review_date
                  ? new Date(client.next_review_date).toLocaleDateString()
                  : 'Not scheduled'}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Alert Intelligence */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span style={styles.icon}>🚨</span>
            Alert Intelligence
          </h3>
          <div style={styles.cardContent}>
            <div style={styles.statGrid}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{alertStats.total}</div>
                <div style={styles.statLabel}>Total Alerts</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNumber, color: '#ef4444' }}>{alertStats.critical}</div>
                <div style={styles.statLabel}>Critical</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{alertStats.high}</div>
                <div style={styles.statLabel}>High Severity</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statNumber, color: '#8b5cf6' }}>{alertStats.strFiled}</div>
                <div style={styles.statLabel}>STRs Filed</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{alertStats.pending}</div>
                <div style={styles.statLabel}>Pending</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{alertStats.last30Days}</div>
                <div style={styles.statLabel}>Last 30 Days</div>
              </div>
            </div>
            {alertStats.total > 0 && (
              <>
                <div style={styles.divider}></div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Avg Alert Score:</span>
                  <span style={styles.dataValue}>{alertStats.averageScore.toFixed(1)}/100</span>
                </div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>False Positives:</span>
                  <span style={styles.dataValue}>
                    {alertStats.falsePositives} ({((alertStats.falsePositives / alertStats.total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 3: Institutional Context */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span style={styles.icon}>🏢</span>
            Institutional Context
          </h3>
          <div style={styles.cardContent}>
            {institutionalAssessment ? (
              <>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Overall Risk:</span>
                  <span style={{
                    ...styles.dataBadge,
                    background: getRiskColor(institutionalAssessment.overall_risk_rating)
                  }}>
                    {institutionalAssessment.overall_risk_rating}
                  </span>
                </div>
                <div style={styles.divider}></div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Inherent Risk:</span>
                  <span style={styles.dataValue}>
                    {institutionalAssessment.module_1_score?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Technical Compliance:</span>
                  <span style={styles.dataValue}>
                    {institutionalAssessment.module_2_score?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Effectiveness:</span>
                  <span style={{
                    ...styles.dataValue,
                    color: institutionalAssessment.module_3_score < 2.5 ? '#ef4444' :
                           institutionalAssessment.module_3_score >= 4.0 ? '#10b981' : '#6b7280'
                  }}>
                    {institutionalAssessment.module_3_score?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Maturity:</span>
                  <span style={styles.dataValue}>
                    {institutionalAssessment.module_4_score?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
                <div style={styles.divider}></div>
                <div style={styles.dataRow}>
                  <span style={styles.dataLabel}>Completed:</span>
                  <span style={styles.dataValue}>
                    {new Date(institutionalAssessment.completed_at).toLocaleDateString()}
                  </span>
                </div>
              </>
            ) : (
              <div style={styles.infoBox}>
                <strong>No Assessment Available</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Complete an institutional risk assessment to enable context-aware monitoring
                </p>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Client Matters Section */}
        {client.client_matter_relationships && client.client_matter_relationships.length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <span style={styles.icon}>📁</span>
              Associated Matters
            </h3>
            <div style={styles.cardContent}>
              <div style={{ marginBottom: '12px', display: 'flex', gap: '16px' }}>
                <div>
                  <span style={styles.dataLabel}>Total Matters: </span>
                  <span style={{ ...styles.dataValue, fontWeight: '700' }}>
                    {client.client_matter_relationships.length}
                  </span>
                </div>
                <div>
                  <span style={styles.dataLabel}>Active: </span>
                  <span style={{ ...styles.dataValue, fontWeight: '700', color: '#10b981' }}>
                    {client.client_matter_relationships.filter(rel =>
                      rel.matters?.status === 'open' || rel.matters?.status === 'active'
                    ).length}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {client.client_matter_relationships.map((rel) => {
                  const matter = rel.matters;
                  if (!matter) return null;

                  return (
                    <div
                      key={rel.matter_id}
                      style={{
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#0a1929', fontSize: '14px', marginBottom: '4px' }}>
                            {matter.matter_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>{matter.matter_type?.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{rel.relationship_type?.replace('_', ' ')}</span>
                            {matter.opened_date && (
                              <>
                                <span>•</span>
                                <span>Opened: {new Date(matter.opened_date).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {matter.status && (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background:
                                matter.status === 'open' || matter.status === 'active' ? '#dbeafe' :
                                matter.status === 'closed' ? '#e5e7eb' : '#fef3c7',
                              color:
                                matter.status === 'open' || matter.status === 'active' ? '#1e40af' :
                                matter.status === 'closed' ? '#374151' : '#92400e'
                            }}>
                              {matter.status}
                            </span>
                          )}
                          {matter.risk_level && (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: getRiskColor(matter.risk_level) + '20',
                              color: getRiskColor(matter.risk_level)
                            }}>
                              {matter.risk_level}
                            </span>
                          )}
                        </div>
                      </div>
                      {matter.estimated_value && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Est. Value: {matter.estimated_value.toLocaleString()} {matter.currency || 'TZS'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Risk Factor Breakdown */}
        <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          <span style={styles.icon}>📊</span>
          Risk Factor Analysis
        </h3>
        <div style={styles.cardContent}>
          <div style={styles.factorGrid}>
            {riskProfile.factors.map((factor, idx) => (
              <div key={idx} style={styles.factorCard}>
                <div style={styles.factorHeader}>
                  <span style={styles.factorName}>{factor.name}</span>
                  <span style={styles.factorWeight}>Weight: {factor.weight}%</span>
                </div>
                <div style={styles.factorBar}>
                  <div
                    style={{
                      ...styles.factorBarFill,
                      width: `${(factor.value / 5) * 100}%`,
                      background: factor.value >= 4 ? '#ef4444' :
                                 factor.value >= 3 ? '#f59e0b' :
                                 factor.value >= 2 ? '#eab308' : '#10b981'
                    }}
                  />
                </div>
                <div style={styles.factorValue}>
                  {factor.value}/5 {factor.adjustment && `(${factor.adjustment})`}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Automated Recommendations */}
        {recommendations.length > 0 && (
          <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span style={styles.icon}>💡</span>
            Intelligent Recommendations
          </h3>
          <div style={styles.cardContent}>
            <div style={styles.recommendationGrid}>
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.recommendationCard,
                    borderLeft: `4px solid ${rec.priority === 'High' ? '#ef4444' : '#f59e0b'}`
                  }}
                >
                  <div style={styles.recommendationHeader}>
                    <span style={{
                      ...styles.priorityBadge,
                      background: rec.priority === 'High' ? '#fee2e2' : '#fef3c7',
                      color: rec.priority === 'High' ? '#991b1b' : '#92400e'
                    }}>
                      {rec.priority} Priority
                    </span>
                    <span style={styles.categoryBadge}>{rec.category}</span>
                  </div>
                  <div style={styles.recommendationAction}>{rec.action}</div>
                  <div style={styles.recommendationReason}>{rec.reason}</div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {/* Integration Benefits Notice */}
        <div style={{
          ...styles.infoCard,
          background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
          border: '2px solid #3b82f6'
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>
              Integrated Risk Intelligence
            </h3>
            <p style={{ margin: 0, color: '#1e3a8a', lineHeight: '1.6' }}>
              <strong>Client Risk Calculation:</strong> This composite risk score is calculated based ONLY on the client's inherent characteristics:
              KYC ratings, transaction behavior patterns, PEP status, sanctions screening, and jurisdiction risk.
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#1e3a8a', lineHeight: '1.6' }}>
              <strong>Institutional Context:</strong> The organizational assessment shown above is for viewing context ONLY
              and does NOT affect the client's risk score. Client risk remains independent of institutional controls.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    maxWidth: '100%',
    margin: '0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
    padding: '32px',
    marginBottom: '32px'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096'
  },
  error: {
    background: '#fee2e2',
    border: '2px solid #fca5a5',
    borderRadius: '12px',
    padding: '24px',
    color: '#991b1b',
    margin: '32px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid #d4af37'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0 0 0'
  },
  backButton: {
    padding: '12px 24px',
    background: 'transparent',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    transition: 'all 0.2s',
    marginBottom: '16px'
  },
  heroCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '32px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  heroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '32px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  compositeScore: {
    fontSize: '56px',
    fontWeight: '800',
    color: '#111827',
    lineHeight: '1',
    marginBottom: '12px'
  },
  riskBadge: {
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white'
  },
  scoreBreakdown: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  scoreItem: {
    textAlign: 'center'
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginBottom: '32px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  infoCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    marginTop: '32px'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  icon: {
    fontSize: '20px'
  },
  cardContent: {
    fontSize: '14px'
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    gap: '12px'
  },
  dataLabel: {
    color: '#6b7280',
    fontSize: '13px'
  },
  dataValue: {
    color: '#0a1929',
    fontWeight: '500'
  },
  dataBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '12px 0'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px'
  },
  statBox: {
    textAlign: 'center',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280'
  },
  infoBox: {
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px'
  },
  factorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  factorCard: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  factorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  factorName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0a1929'
  },
  factorWeight: {
    fontSize: '12px',
    color: '#6b7280'
  },
  factorBar: {
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  factorBarFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  factorValue: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right'
  },
  recommendationGrid: {
    display: 'grid',
    gap: '12px'
  },
  recommendationCard: {
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px'
  },
  recommendationHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  priorityBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  categoryBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    background: '#e0e7ff',
    color: '#3730a3'
  },
  recommendationAction: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '4px'
  },
  recommendationReason: {
    fontSize: '13px',
    color: '#6b7280'
  }
};
