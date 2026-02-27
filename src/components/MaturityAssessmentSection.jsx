import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maturityAssessmentService } from '../services/maturityAssessmentService';

export default function MaturityAssessmentSection({ assessmentId }) {
  const navigate = useNavigate();
  const [maturityData, setMaturityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDomains, setExpandedDomains] = useState({});

  useEffect(() => {
    loadMaturityData();
  }, [assessmentId]);

  const loadMaturityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maturityAssessmentService.getMaturitySummary(assessmentId);
      setMaturityData(data);
    } catch (err) {
      console.error('Error loading maturity data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (domainId) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId]
    }));
  };

  const getMaturityRating = (score) => {
    const num = parseFloat(score);
    if (num >= 4.5) return { label: 'Optimised', color: '#0891b2', bg: '#cffafe' };
    if (num >= 3.5) return { label: 'Managed', color: '#16a34a', bg: '#dcfce7' };
    if (num >= 2.5) return { label: 'Defined', color: '#ca8a04', bg: '#fef9c3' };
    if (num >= 1.5) return { label: 'Developing', color: '#ea580c', bg: '#fed7aa' };
    return { label: 'Initial', color: '#dc2626', bg: '#fee2e2' };
  };

  if (loading) {
    return (
      <div className="maturity-section">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#1e293b' }}>
          AML/CFT Institutional Maturity Assessment
        </h2>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          Loading maturity assessment data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="maturity-section">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#1e293b' }}>
          AML/CFT Institutional Maturity Assessment
        </h2>
        <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', color: '#dc2626' }}>
          Error loading maturity data: {error}
        </div>
      </div>
    );
  }

  if (!maturityData || maturityData.domains.length === 0) {
    return (
      <section className="maturity-section" style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.75rem',
        marginTop: '3rem',
        marginBottom: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        border: '3px solid #0891b2'
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          color: '#0891b2',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '2rem' }}>🎯</span>
          AML/CFT Institutional Maturity Assessment
          <span style={{
            fontSize: '0.75rem',
            background: '#0891b2',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontWeight: '600'
          }}>NEW</span>
        </h2>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
          borderRadius: '0.5rem',
          border: '2px dashed #0891b2',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '0.75rem', fontWeight: '700', fontSize: '1.125rem', color: '#0e7490' }}>
            Control Maturity Assessment Not Yet Completed
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#164e63', lineHeight: '1.6' }}>
            This section displays institutional maturity ratings based on AML/CFT control assessments (1-5 maturity scale).
            Control maturity assessments provide the evidence-based foundation for Module 2 (Technical Compliance) and Module 3 (Effectiveness) scores.
            Complete the control maturity assessment to automatically calculate and display unified maturity ratings.
          </p>
          <button
            onClick={() => navigate(`/control-assessment/${assessmentId}`)}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ▶ Start Control Maturity Assessment
          </button>
        </div>
      </section>
    );
  }

  const overallRating = getMaturityRating(maturityData.overallMaturity);

  return (
    <div className="maturity-section" style={{ marginTop: '2rem', pageBreakBefore: 'always' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: '#1e293b',
        borderBottom: '2px solid #0891b2',
        paddingBottom: '0.5rem'
      }}>
        AML/CFT Institutional Maturity Assessment
      </h2>

      <div style={{
        padding: '1rem',
        background: '#e0f2fe',
        borderLeft: '4px solid #0891b2',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: '#164e63',
        lineHeight: '1.6'
      }}>
        <strong style={{color: '#0891b2', fontSize: '0.95rem'}}>Integrated Maturity System:</strong> The control maturity levels assessed here automatically calculate the Module 2 (Technical Compliance) and Module 3 (Effectiveness) scores shown above. This ensures a single, evidence-based source of truth for all maturity measurements.
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem',
        color: 'white'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Overall Institutional Maturity
        </h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
              Maturity Score
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
              {maturityData.overallMaturity}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>
              out of 5.0
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
              Maturity Level
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {overallRating.label}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
              {maturityData.controlsAtLevel3Plus} of {maturityData.totalControls} controls at Level 3+
              ({maturityData.overallComplianceRate}%)
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
              Identified Gaps
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {maturityData.totalGaps.critical}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Critical</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {maturityData.totalGaps.high}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>High</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {maturityData.totalGaps.medium}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Medium</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {maturityData.totalGaps.low}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Low</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
        Maturity by AML/CFT Domain
      </h3>

      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
        The assessment evaluates maturity across 9 weighted AML/CFT domains using a 5-level model:
        1 (Initial/Ad hoc), 2 (Developing), 3 (Defined), 4 (Managed), 5 (Optimised).
        Level 3 is the minimum acceptable maturity for mandatory controls.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {maturityData.domains.map((domain) => {
          if (!domain.domainScore) return null;

          const domainRating = getMaturityRating(domain.domainScore.averageMaturity);
          const isExpanded = expandedDomains[domain.id];

          return (
            <div
              key={domain.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                pageBreakInside: 'avoid'
              }}
            >
              <div
                onClick={() => toggleDomain(domain.id)}
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.25rem 0.5rem',
                      background: '#0891b2',
                      color: 'white',
                      borderRadius: '0.25rem'
                    }}>
                      {domain.code}
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '1rem', color: '#1e293b' }}>
                      {domain.name}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      (Weight: {(parseFloat(domain.weight) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {domain.controls.length} controls assessed
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: domainRating.color
                    }}>
                      {parseFloat(domain.domainScore.averageMaturity).toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: domainRating.color,
                      marginTop: '0.25rem'
                    }}>
                      {domainRating.label}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    color: '#94a3b8',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}>
                    ▼
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '1rem', background: 'white' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Average Maturity
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                        {parseFloat(domain.domainScore.averageMaturity).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Compliance Rate
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                        {parseFloat(domain.domainScore.compliancePercentage).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Weighted Contribution
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                        {parseFloat(domain.domainScore.weightedScore).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Gaps
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        <span style={{ color: '#dc2626' }}>{domain.domainScore.gapsCritical} C</span>,{' '}
                        <span style={{ color: '#ea580c' }}>{domain.domainScore.gapsHigh} H</span>,{' '}
                        <span style={{ color: '#ca8a04' }}>{domain.domainScore.gapsMedium} M</span>,{' '}
                        <span style={{ color: '#64748b' }}>{domain.domainScore.gapsLow} L</span>
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#475569' }}>
                    Control Assessment Details
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>Control</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>Maturity</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>Mandatory</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domain.controls.map((control, idx) => {
                          const controlRating = getMaturityRating(control.maturityLevel);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem' }}>
                                <div style={{ fontWeight: '600' }}>{control.controlCode}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{control.controlName}</div>
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  background: controlRating.bg,
                                  color: controlRating.color,
                                  borderRadius: '0.25rem',
                                  fontWeight: '700',
                                  fontSize: '0.875rem'
                                }}>
                                  {control.maturityLevel}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                {maturityAssessmentService.getImplementationStatusLabel(control.implementationStatus)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                {control.isMandatory ? (
                                  <span style={{ color: '#dc2626', fontWeight: '700' }}>Yes</span>
                                ) : (
                                  <span style={{ color: '#64748b' }}>No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#eff6ff',
        borderLeft: '4px solid #0891b2',
        borderRadius: '0.375rem',
        pageBreakInside: 'avoid'
      }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
          Maturity Level Reference
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
          <div><strong style={{ color: '#dc2626' }}>Level 1:</strong> Initial / Ad hoc</div>
          <div><strong style={{ color: '#ea580c' }}>Level 2:</strong> Developing</div>
          <div><strong style={{ color: '#ca8a04' }}>Level 3:</strong> Defined (Minimum)</div>
          <div><strong style={{ color: '#16a34a' }}>Level 4:</strong> Managed</div>
          <div><strong style={{ color: '#0891b2' }}>Level 5:</strong> Optimised</div>
        </div>
      </div>
    </div>
  );
}
