import React from 'react';
import { getRiskColor, getRiskLabel, institutionCategories, requiresEDD, getRequiredAction } from '../data/assessmentData';
import { getFilteredSections, resolveFrameworkType } from '../utils/frameworkUtils';
import MaturityAssessmentSection from './MaturityAssessmentSection';

export default function PrintableAssessmentReport({ assessment, sectionScores, responses, remediationActions, onClose }) {
  const tier = assessment.entity_tier || assessment.dnfbp_tier || 2;
  const frameworkType = assessment.framework_type || resolveFrameworkType(assessment?.organizations?.sector);
  const filteredSections = getFilteredSections(frameworkType, tier);
  React.useEffect(() => {
    document.body.classList.add('printable-assessment-active');
    return () => {
      document.body.classList.remove('printable-assessment-active');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getInstitutionLabel = (value) => {
    const category = institutionCategories.find(c => c.value === value);
    return category ? category.label : value;
  };

  // Recalculate rating from score using correct FATF thresholds
  const recalculatedRating = (() => {
    const score = assessment.overall_risk_score || 0;
    if (score >= 2.5) return 'High';
    if (score >= 1.5) return 'Moderate';
    return 'Low';
  })();

  const overallRiskColor = getRiskColor(recalculatedRating);

  return (
    <div style={styles.overlay} className="printable-overlay">
      <div style={styles.container} className="printable-container">
        <div style={styles.actions} className="printable-actions">
          <button onClick={handlePrint} style={styles.button}>
            Print / Save as PDF
          </button>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>

        <div style={styles.report} className="printable-content">
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Assessment Report</h1>
            <p style={styles.subtitle}>{assessment.organizations?.name}</p>
          </div>

          {/* Financial Institution Information */}
          {assessment.dnfbp_category && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Financial Institution Information</h2>

              <table style={styles.infoTable}>
                <tbody>
                  <tr>
                    <td style={styles.infoLabel}>Institution Type</td>
                    <td style={styles.infoValue}>{getInstitutionLabel(assessment.dnfbp_category)}</td>
                  </tr>
                  {assessment.contact_person && (
                    <tr>
                      <td style={styles.infoLabel}>Contact Person</td>
                      <td style={styles.infoValue}>
                        {assessment.contact_person}
                        {assessment.contact_position && ` (${assessment.contact_position})`}
                      </td>
                    </tr>
                  )}
                  {assessment.number_of_employees && (
                    <tr>
                      <td style={styles.infoLabel}>Number of Employees</td>
                      <td style={styles.infoValue}>{assessment.number_of_employees}</td>
                    </tr>
                  )}
                  {assessment.annual_turnover && (
                    <tr>
                      <td style={styles.infoLabel}>Annual Turnover</td>
                      <td style={styles.infoValue}>{assessment.annual_turnover}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {assessment.business_description && (
                <div style={styles.descriptionBox}>
                  <h4 style={styles.descLabel}>Business Description</h4>
                  <p style={styles.descText}>{assessment.business_description}</p>
                </div>
              )}

              {assessment.geographical_presence && (
                <div style={styles.descriptionBox}>
                  <h4 style={styles.descLabel}>Geographical Presence</h4>
                  <p style={styles.descText}>{assessment.geographical_presence}</p>
                </div>
              )}
            </section>
          )}

          {/* Assessment Summary */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Assessment Summary</h2>

            <table style={styles.summaryTable}>
              <tbody>
                <tr>
                  <td style={styles.summaryLabel}>Overall Risk Rating</td>
                  <td style={{
                    ...styles.summaryValue,
                    background: overallRiskColor + '20',
                    color: overallRiskColor,
                    fontWeight: 'bold',
                    padding: '8px'
                  }}>
                    {getRiskLabel(recalculatedRating)}
                  </td>
                </tr>
                <tr>
                  <td style={styles.summaryLabel}>Assessment Date</td>
                  <td style={styles.summaryValue}>{formatDate(assessment.assessment_date)}</td>
                </tr>
                <tr>
                  <td style={styles.summaryLabel}>Completed</td>
                  <td style={styles.summaryValue}>
                    {assessment.completed_at ? formatDate(assessment.completed_at) : 'In Progress'}
                  </td>
                </tr>
                <tr>
                  <td style={styles.summaryLabel}>Sections Assessed</td>
                  <td style={styles.summaryValue}>{sectionScores.length} / {filteredSections.length}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section Risk Breakdown */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Section Risk Breakdown</h2>

            <div style={styles.frameworkBox}>
              <p style={styles.frameworkText}>
                <strong>Assessment Framework:</strong> This assessment uses a four-module approach where each module measures a different dimension:
              </p>
              <div style={styles.frameworkItem}>
                <strong style={{color: '#ef4444'}}>Module 1</strong> - Inherent Risk Exposure (what risks exist in your business environment)
              </div>
              <div style={styles.frameworkItem}>
                <strong style={{color: '#667eea'}}>Module 2</strong> - Technical Compliance (are AML/CFT policies, procedures, and controls documented)
              </div>
              <div style={styles.frameworkItem}>
                <strong style={{color: '#10b981'}}>Module 3</strong> - Control Effectiveness (how well do controls work in practice)
              </div>
              <div style={styles.frameworkItem}>
                <strong style={{color: '#8b5cf6'}}>Module 4</strong> - Institutional Maturity (sophistication and integration of AML/CFT processes)
              </div>
            </div>

            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: '10%'}}>Code</th>
                  <th style={{...styles.th, width: '30%'}}>Section</th>
                  <th style={{...styles.th, width: '12%'}}>Questions</th>
                  <th style={{...styles.th, width: '20%'}}>Module Measure</th>
                  <th style={{...styles.th, width: '12%'}}>Score</th>
                  <th style={{...styles.th, width: '16%'}}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {sectionScores.map((score) => {
                  const moduleCode = score.section_code;
                  let moduleMeasure = '';
                  let moduleScore = 0;
                  let scoreColor = '#667eea';

                  if (moduleCode === 'MODULE_1') {
                    moduleMeasure = 'Inherent Risk Exposure';
                    moduleScore = score.risk_score || 0;
                    scoreColor = '#ef4444';
                  } else if (moduleCode === 'MODULE_2') {
                    moduleMeasure = 'Technical Compliance';
                    moduleScore = score.technical_compliance_score || 0;
                    scoreColor = '#667eea';
                  } else if (moduleCode === 'MODULE_3') {
                    moduleMeasure = 'Control Effectiveness';
                    moduleScore = score.effectiveness_score || 0;
                    scoreColor = '#10b981';
                  } else if (moduleCode === 'MODULE_4') {
                    moduleMeasure = 'Institutional Maturity';
                    moduleScore = score.risk_score || 0;
                    scoreColor = '#8b5cf6';
                  }

                  const hasResponses = score.answered_questions > 0;
                  const riskColor = getRiskColor(score.risk_level);

                  return (
                    <tr key={score.id}>
                      <td style={styles.td}>{score.section_code}</td>
                      <td style={styles.td}>{score.section_name}</td>
                      <td style={styles.td}>{score.answered_questions} / {score.total_questions}</td>
                      <td style={{...styles.td, fontStyle: 'italic', color: '#64748b', fontSize: '11px'}}>
                        {moduleMeasure}
                      </td>
                      <td style={{...styles.td, fontWeight: '600', color: hasResponses ? scoreColor : '#94a3b8'}}>
                        {hasResponses ? moduleScore.toFixed(1) : 'N/A'}
                      </td>
                      <td style={{
                        ...styles.td,
                        background: hasResponses ? (riskColor + '20') : '#f1f5f9',
                        color: hasResponses ? riskColor : '#64748b',
                        fontWeight: 'bold'
                      }}>
                        {hasResponses ? getRiskLabel(score.risk_level) : 'Not Assessed'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.actionRequiredBox}>
              <h4 style={styles.actionRequiredTitle}>Required Actions by Section</h4>
              {sectionScores.map((score) => (
                <div key={score.id} style={styles.actionItem}>
                  <span style={styles.actionCode}>{score.section_code}</span>
                  <span style={styles.actionName}>{score.section_name}</span>
                  <span style={{
                    ...styles.actionBadge,
                    color: requiresEDD(score.risk_score) ? '#dc2626' : '#059669',
                    fontWeight: '600'
                  }}>
                    {getRequiredAction(score.risk_score)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Enhanced Due Diligence Required */}
          {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).length > 0 && (
            <section style={styles.section}>
              <h2 style={{...styles.sectionTitle, color: '#dc2626'}}>
                Enhanced Due Diligence Required
              </h2>

              <div style={styles.warningBox}>
                <p style={styles.warningText}>
                  The following areas have HIGH risk ratings (≥ 2.5) and require Enhanced Due Diligence (EDD) procedures with senior management sign-off:
                </p>
              </div>

              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Section</th>
                    <th style={styles.th}>Risk Score</th>
                    <th style={styles.th}>Required Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).map((score) => (
                    <tr key={score.id}>
                      <td style={styles.td}>{score.section_code}</td>
                      <td style={styles.td}>{score.section_name}</td>
                      <td style={styles.td}>{score.risk_score ? `${score.risk_score.toFixed(1)} / 5.0` : 'N/A'}</td>
                      <td style={{...styles.td, color: '#dc2626', fontWeight: 'bold'}}>
                        {getRequiredAction(score.risk_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Remediation Actions */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Remediation Actions</h2>

            {remediationActions.length === 0 ? (
              <p style={styles.emptyText}>No remediation actions recorded yet.</p>
            ) : (
              <div>
                {remediationActions.map((action, index) => (
                  <div key={action.id} style={styles.remediationBox}>
                    <div style={styles.remediationHeader}>
                      <span style={styles.remediationNumber}>Action {index + 1}</span>
                      <span style={styles.sectionBadge}>Section {action.section_code}</span>
                      <span style={{
                        ...styles.priorityBadge,
                        background: action.priority === 'high' ? '#fee2e2' : action.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                        color: action.priority === 'high' ? '#991b1b' : action.priority === 'medium' ? '#92400e' : '#1e40af'
                      }}>
                        {action.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    <div style={styles.remediationContent}>
                      <h4 style={styles.remediationSubtitle}>Weakness Identified:</h4>
                      <p style={styles.remediationText}>{action.weakness_description}</p>

                      <h4 style={styles.remediationSubtitle}>Mitigation Measure:</h4>
                      <p style={styles.remediationText}>{action.mitigation_measure}</p>
                    </div>

                    <div style={styles.remediationFooter}>
                      <div style={styles.remediationMeta}>
                        <strong>Responsible Party:</strong> {action.responsible_party}
                      </div>
                      {action.target_date && (
                        <div style={styles.remediationMeta}>
                          <strong>Target Date:</strong> {formatDate(action.target_date)}
                        </div>
                      )}
                      <div style={styles.remediationMeta}>
                        <strong>Status:</strong> {action.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <MaturityAssessmentSection assessmentId={assessment.id} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  closeButton: {
    padding: '10px 20px',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginLeft: 'auto',
  },
  report: {
    flex: 1,
    overflow: 'auto',
    padding: '30px',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11pt',
    lineHeight: '1.4',
    color: '#1a202c',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '20px',
    color: 'white',
    borderRadius: '6px',
    marginBottom: '20px',
    borderBottom: '3px solid #d4af37',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '24pt',
    fontWeight: 'bold',
  },
  subtitle: {
    margin: 0,
    fontSize: '12pt',
    opacity: 0.9,
  },
  section: {
    marginBottom: '20px',
    pageBreakInside: 'avoid',
  },
  sectionTitle: {
    fontSize: '16pt',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '10px',
    marginTop: '0',
    paddingBottom: '5px',
    borderBottom: '2px solid #1e3a8a',
  },
  infoTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '10px',
  },
  infoLabel: {
    padding: '8px',
    border: '1px solid #e2e8f0',
    fontWeight: 'bold',
    width: '30%',
    backgroundColor: '#f8fafc',
  },
  infoValue: {
    padding: '8px',
    border: '1px solid #e2e8f0',
  },
  descriptionBox: {
    padding: '10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  descLabel: {
    margin: '0 0 5px 0',
    fontSize: '11pt',
    fontWeight: 'bold',
    color: '#475569',
  },
  descText: {
    margin: 0,
    fontSize: '10pt',
    lineHeight: '1.5',
  },
  summaryTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '10px',
  },
  summaryLabel: {
    padding: '10px',
    border: '1px solid #e2e8f0',
    fontWeight: 'bold',
    width: '35%',
    backgroundColor: '#f8fafc',
  },
  summaryValue: {
    padding: '10px',
    border: '1px solid #e2e8f0',
  },
  frameworkBox: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  frameworkText: {
    margin: '0 0 8px 0',
    fontSize: '10pt',
  },
  frameworkItem: {
    margin: '5px 0',
    paddingLeft: '15px',
    fontSize: '10pt',
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '12px',
  },
  th: {
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '8px',
    textAlign: 'left',
    fontWeight: 'bold',
    border: '1px solid #cbd5e1',
    fontSize: '10pt',
  },
  td: {
    padding: '6px 8px',
    border: '1px solid #cbd5e1',
    fontSize: '10pt',
  },
  actionRequiredBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
  },
  actionRequiredTitle: {
    margin: '0 0 10px 0',
    fontSize: '12pt',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '10pt',
  },
  actionCode: {
    width: '50px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  actionName: {
    flex: 1,
    marginRight: '10px',
  },
  actionBadge: {
    fontSize: '9pt',
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fee2e2',
    border: '2px solid #dc2626',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  warningText: {
    margin: 0,
    fontSize: '10pt',
    color: '#991b1b',
  },
  remediationBox: {
    border: '1px solid #e2e8f0',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '12px',
    pageBreakInside: 'avoid',
  },
  remediationHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  remediationNumber: {
    fontWeight: 'bold',
    color: '#1e3a8a',
    fontSize: '11pt',
  },
  sectionBadge: {
    padding: '3px 8px',
    backgroundColor: '#eef2ff',
    color: '#667eea',
    borderRadius: '4px',
    fontSize: '9pt',
    fontWeight: 'bold',
  },
  priorityBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '9pt',
    fontWeight: 'bold',
  },
  remediationContent: {
    marginBottom: '10px',
  },
  remediationSubtitle: {
    fontSize: '10pt',
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: '8px',
    marginBottom: '4px',
  },
  remediationText: {
    margin: '0 0 8px 0',
    fontSize: '10pt',
    lineHeight: '1.5',
  },
  remediationFooter: {
    display: 'flex',
    gap: '15px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '9pt',
    color: '#64748b',
  },
  remediationMeta: {
    fontSize: '9pt',
  },
  emptyText: {
    padding: '20px',
    textAlign: 'center',
    color: '#718096',
    fontStyle: 'italic',
  },
};
