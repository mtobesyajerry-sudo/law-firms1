import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ControlAssessmentService } from '../services/controlAssessmentService';
import { useAuth } from '../contexts/AuthContext';

export default function ControlAssessmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [domainsWithControls, setDomainsWithControls] = useState([]);
  const [controlAssessments, setControlAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState({});
  const [selectedControl, setSelectedControl] = useState(null);
  const [maturityLevels, setMaturityLevels] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);

      const [domains, levels, existingAssessments] = await Promise.all([
        ControlAssessmentService.getDomainsAndControls(assessmentData.dnfbp_tier || 1),
        ControlAssessmentService.getMaturityLevels(),
        ControlAssessmentService.getControlAssessments(id)
      ]);

      setDomainsWithControls(domains);
      setMaturityLevels(levels);

      const assessmentsMap = {};
      existingAssessments.forEach(ca => {
        assessmentsMap[ca.control_id] = ca;
      });
      setControlAssessments(assessmentsMap);

      if (Object.keys(assessmentsMap).length === 0) {
        await ControlAssessmentService.initializeControlAssessments(
          id,
          assessmentData.dnfbp_tier || 1
        );
        const refreshed = await ControlAssessmentService.getControlAssessments(id);
        const refreshedMap = {};
        refreshed.forEach(ca => {
          refreshedMap[ca.control_id] = ca;
        });
        setControlAssessments(refreshedMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading assessment data');
    } finally {
      setLoading(false);
    }
  }

  function toggleDomain(domainId) {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId]
    }));
  }

  async function updateControlAssessment(controlId, field, value) {
    try {
      const ca = controlAssessments[controlId];
      if (!ca) return;

      const updates = { [field]: value };
      await ControlAssessmentService.updateControlAssessment(ca.id, updates);

      setControlAssessments(prev => ({
        ...prev,
        [controlId]: {
          ...prev[controlId],
          ...updates
        }
      }));
    } catch (error) {
      console.error('Error updating control assessment:', error);
      alert('Error saving assessment');
    }
  }

  async function calculateScores() {
    try {
      setSaving(true);
      await ControlAssessmentService.calculateAndUpdateDomainScores(id);
      await ControlAssessmentService.performGapAnalysis(id);
      await ControlAssessmentService.generateRemediationPlans(id);
      await ControlAssessmentService.createSnapshot(
        id,
        assessment.organization_id,
        'periodic'
      );
      alert('Scores calculated successfully! You can now view the maturity assessment in the report.');
      navigate(`/assessment/${id}`);
    } catch (error) {
      console.error('Error calculating scores:', error);
      alert('Error calculating scores');
    } finally {
      setSaving(false);
    }
  }

  const getMaturityColor = (level) => {
    const colors = {
      1: '#dc2626',
      2: '#ea580c',
      3: '#ca8a04',
      4: '#16a34a',
      5: '#0891b2'
    };
    return colors[level] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'not-implemented': 'Not Implemented',
      'partial': 'Partially Implemented',
      'implemented': 'Fully Implemented',
      'optimised': 'Optimised'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#0891b2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#64748b' }}>Loading control assessment...</p>
        </div>
      </div>
    );
  }

  const totalControls = domainsWithControls.reduce((sum, d) => sum + d.controls.length, 0);
  const assessedControls = Object.keys(controlAssessments).length;
  const completionRate = totalControls > 0 ? (assessedControls / totalControls * 100).toFixed(1) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
                Control Maturity Assessment
              </h1>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1rem' }}>
                {assessment.institution_name}
              </p>
            </div>
            <button
              onClick={() => navigate(`/assessment/${id}`)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                color: '#0a1929',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                flexShrink: 0
              }}
            >
              ← Back
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Total Controls
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                {totalControls}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Progress
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0891b2' }}>
                {completionRate}%
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Domains
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                {domainsWithControls.length}
              </div>
            </div>
          </div>

          <button
            onClick={calculateScores}
            disabled={saving}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '1rem',
              background: saving ? '#94a3b8' : '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Calculating...' : 'Calculate Maturity Scores & Generate Report'}
          </button>
        </div>

        {/* Assessment Instructions */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #0891b2',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
            How to Complete the Assessment
          </h3>
          <ol style={{ marginLeft: '1.5rem', color: '#475569', lineHeight: '1.75' }}>
            <li>Expand each domain to view its controls</li>
            <li>For each control, assess the implementation status, evidence quality, and testing result</li>
            <li>The system will automatically calculate maturity levels (1-5) based on your responses</li>
            <li>When complete, click "Calculate Maturity Scores" to generate the full maturity report</li>
          </ol>
        </div>

        {/* Domains and Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {domainsWithControls.map((domain) => {
            const isExpanded = expandedDomains[domain.id];
            const domainControls = domain.controls.length;
            const domainAssessed = domain.controls.filter(c => controlAssessments[c.id]).length;

            return (
              <div
                key={domain.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div
                  onClick={() => toggleDomain(domain.id)}
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isExpanded ? '#f8fafc' : 'white'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#0891b2',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {domain.code}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '1.125rem', color: '#1e293b' }}>
                        {domain.name}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        (Weight: {(parseFloat(domain.weight) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {domainAssessed} of {domainControls} controls assessed
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

                {isExpanded && (
                  <div style={{ padding: '1.5rem', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {domain.controls.map((control) => {
                        const ca = controlAssessments[control.id] || {};

                        return (
                          <div
                            key={control.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '1rem',
                              background: '#fafafa'
                            }}
                          >
                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontFamily: 'monospace',
                                  padding: '0.25rem 0.5rem',
                                  background: '#f1f5f9',
                                  borderRadius: '4px'
                                }}>
                                  {control.control_code}
                                </span>
                                {control.is_mandatory && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                  }}>
                                    MANDATORY
                                  </span>
                                )}
                                {ca.maturity_level && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    background: getMaturityColor(ca.maturity_level) + '20',
                                    color: getMaturityColor(ca.maturity_level),
                                    borderRadius: '4px',
                                    fontWeight: '700'
                                  }}>
                                    Level {ca.maturity_level}
                                  </span>
                                )}
                              </div>
                              <h4 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                                {control.control_name}
                              </h4>
                              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                {control.control_description}
                              </p>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                              gap: '1rem'
                            }}>
                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#475569',
                                  marginBottom: '0.5rem'
                                }}>
                                  Implementation Status *
                                </label>
                                <select
                                  value={ca.implementation_status || 'not-implemented'}
                                  onChange={(e) => updateControlAssessment(control.id, 'implementation_status', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  <option value="not-implemented">Not Implemented</option>
                                  <option value="partial">Partially Implemented</option>
                                  <option value="implemented">Fully Implemented</option>
                                  <option value="optimised">Optimised</option>
                                </select>
                              </div>

                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#475569',
                                  marginBottom: '0.5rem'
                                }}>
                                  Evidence Quality
                                </label>
                                <select
                                  value={ca.evidence_quality || ''}
                                  onChange={(e) => updateControlAssessment(control.id, 'evidence_quality', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  <option value="">Not assessed</option>
                                  <option value="poor">Poor</option>
                                  <option value="fair">Fair</option>
                                  <option value="good">Good</option>
                                  <option value="excellent">Excellent</option>
                                </select>
                              </div>

                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#475569',
                                  marginBottom: '0.5rem'
                                }}>
                                  Testing Result
                                </label>
                                <select
                                  value={ca.testing_result || 'not-tested'}
                                  onChange={(e) => updateControlAssessment(control.id, 'testing_result', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  <option value="not-tested">Not Tested</option>
                                  <option value="passed">Passed</option>
                                  <option value="partial">Partial Pass</option>
                                  <option value="failed">Failed</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#475569',
                                marginBottom: '0.5rem'
                              }}>
                                Assessor Notes
                              </label>
                              <textarea
                                value={ca.assessor_notes || ''}
                                onChange={(e) => updateControlAssessment(control.id, 'assessor_notes', e.target.value)}
                                placeholder="Add notes about this control assessment..."
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  minHeight: '80px',
                                  resize: 'vertical'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Action Button */}
        <div style={{
          position: 'sticky',
          bottom: '1rem',
          marginTop: '2rem',
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
        }}>
          <button
            onClick={calculateScores}
            disabled={saving}
            style={{
              width: '100%',
              padding: '1rem',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Calculating...' : 'Calculate Maturity Scores & View Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
