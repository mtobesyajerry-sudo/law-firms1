import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  responseOptions,
  institutionCategories,
  getRiskLabel,
  getRiskColor,
  requiresEDD,
  getRequiredAction,
  calculateRiskLevel
} from '../data/assessmentData';
import { getFilteredSections } from '../utils/frameworkUtils';
import MaturityAssessmentSection from './MaturityAssessmentSection';

export default function DetailedAssessmentReport({ assessment, sectionScores = [], responses = [], onClose }) {
  const [keyFindings, setKeyFindings] = useState(null);
  const tier = assessment.entity_tier || assessment.dnfbp_tier || 2;
  const filteredSections = getFilteredSections('banks_financial_institutions', tier);

  useEffect(() => {
    const loadKeyFindings = async () => {
      const { data, error } = await supabase
        .from('assessment_key_findings')
        .select('*')
        .eq('assessment_id', assessment.id)
        .maybeSingle();

      if (!error && data) {
        setKeyFindings(data);
      }
    };

    loadKeyFindings();
  }, [assessment.id]);

  const getAllQuestions = () => {
    const allQuestions = [];
    filteredSections.forEach(module => {
      module.subsections.forEach(subsection => {
        subsection.questions.forEach(q => {
          allQuestions.push({
            questionCode: q.code,
            questionText: q.text
          });
        });
      });
    });
    return allQuestions;
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

  const getResponseLabel = (value) => {
    const option = responseOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getResponseScore = (value) => {
    const option = responseOptions.find(opt => opt.value === value);
    return option ? option.score : 0;
  };

  const handlePrint = () => {
    window.print();
  };

  const overallScore = assessment.overall_risk_score || (sectionScores.length > 0
    ? sectionScores.reduce((sum, s) => sum + s.risk_score, 0) / sectionScores.length
    : 0);

  const getScoreLabel = (score) => {
    if (score < 1.5) return 'Low Risk - Effective Controls';
    if (score < 2.5) return 'Moderate Risk - Requires Monitoring';
    return 'High Risk - Requires Action';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.toolbar} className="no-print">
          <button onClick={handlePrint} style={styles.printButton}>
            Print Report
          </button>
          <button onClick={onClose} style={styles.closeButton}>
            Close
          </button>
        </div>

        <div style={styles.document}>
          <div style={styles.cover}>
            <h1 style={styles.coverTitle}>AML/CFT Detailed Assessment Report</h1>
            <div style={styles.coverInfo}>
              <p style={styles.orgName}>{assessment.organizations?.name}</p>
              <p>{getInstitutionLabel(assessment.dnfbp_category)}</p>
              <p style={styles.coverDate}>
                Assessment Date: {formatDate(assessment.created_at)}
              </p>
              <div style={styles.coverScore}>
                <p style={styles.scoreLabel}>Overall Risk Score</p>
                <p style={styles.scoreLarge}>{overallScore.toFixed(2)} / 5.0</p>
                <p style={styles.scoreSubtext}>{getScoreLabel(overallScore)}</p>
              </div>
            </div>
          </div>

          <div style={styles.pageBreak} />

          <div style={styles.content}>
            <h2 style={styles.mainHeading}>Executive Summary</h2>

            <div style={styles.summaryBox}>
              <h3 style={styles.summaryTitle}>Assessment Overview</h3>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Organization:</span>
                  <span style={styles.summaryValue}>{assessment.organizations?.name}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Institution Category:</span>
                  <span style={styles.summaryValue}>{getInstitutionLabel(assessment.dnfbp_category)}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Assessment Date:</span>
                  <span style={styles.summaryValue}>{formatDate(assessment.created_at)}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Overall Risk Rating:</span>
                  <span style={{...styles.summaryValue, fontWeight: '700', color: '#e53e3e'}}>
                    {overallScore.toFixed(2)} / 5.0 - {getScoreLabel(overallScore)}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.keyFindingsBox}>
              <h3 style={styles.summaryTitle}>Key Findings</h3>
              <div style={styles.findingsList}>
                <div style={styles.findingItem}>
                  <strong>Assessment Scope:</strong> Comprehensive four-module evaluation with {keyFindings?.total_criteria || getAllQuestions().length} questionnaire criteria plus 20 institutional maturity controls across inherent risk exposure (Module 1), control implementation (Module 2), control effectiveness (Module 3), and institutional maturity (Module 4 - derived from detailed control assessments across 9 AML/CFT domains).
                </div>
                <div style={styles.findingItem}>
                  <strong>Inherent Risk Profile (Module 1):</strong> {keyFindings
                    ? `${keyFindings.m1_high_risk_count} high-risk exposure areas, ${keyFindings.m1_moderate_risk_count} moderate-risk areas, and ${keyFindings.m1_low_risk_count} low-risk areas identified.`
                    : 'Loading...'
                  }
                </div>
                <div style={styles.findingItem}>
                  <strong>Control Implementation Status (Module 2):</strong> {keyFindings
                    ? `${keyFindings.m2_not_implemented_count} critical control gaps, ${keyFindings.m2_partially_implemented_count} partially implemented controls, ${keyFindings.m2_fully_implemented_count} fully implemented controls.`
                    : 'Loading...'
                  }
                </div>
                <div style={styles.findingItem}>
                  <strong>Control Effectiveness (Module 3):</strong> {keyFindings
                    ? `${keyFindings.m3_ineffective_count} ineffective control areas, ${keyFindings.m3_weak_count} weak areas, ${keyFindings.m3_effective_count} effective control operations.`
                    : 'Loading...'
                  }
                </div>
                <div style={styles.findingItem}>
                  <strong>Institutional Maturity (Module 4):</strong> {keyFindings
                    ? `Overall maturity level assessed as "${keyFindings.computed_maturity_rating}" (${(assessment.module_4_score || 0).toFixed(2)}/5.0) based on 20 control assessments. Distribution across maturity spectrum: ${keyFindings.m4_initial_count} Initial, ${keyFindings.m4_developing_count} Developing, ${keyFindings.m4_defined_count} Defined, ${keyFindings.m4_managed_count} Managed, ${keyFindings.m4_optimised_count} Optimised.`
                    : 'Loading...'
                  }
                </div>
                <div style={styles.findingItem}>
                  <strong>Overall Risk Rating:</strong> {keyFindings?.risk_rating || 'Low'} - Based on FATF risk formula combining inherent risk, control implementation, effectiveness, and institutional maturity.
                </div>
                <div style={styles.findingItem}>
                  <strong>Priority Actions:</strong> {(() => {
                    if (!keyFindings) return 'Loading...';

                    const module2Gaps = keyFindings.m2_not_implemented_count;
                    const module3Weak = keyFindings.m3_ineffective_count + keyFindings.m3_weak_count;
                    const maturityScore = assessment.module_4_score || 0;

                    if (module2Gaps >= 5) {
                      return `Immediate implementation of ${module2Gaps} missing critical controls, enhanced due diligence procedures, and senior management oversight required.`;
                    } else if (module2Gaps > 0 || module3Weak > 5) {
                      return `Address ${module2Gaps} control implementation gaps and strengthen ${module3Weak} areas with weak or ineffective controls.`;
                    } else if (maturityScore < 2.5) {
                      return `Focus on advancing institutional maturity from "${keyFindings.computed_maturity_rating}" level by establishing standardized processes, comprehensive documentation, and consistent control application.`;
                    } else if (maturityScore < 3.5) {
                      return `Continue advancing maturity from "${keyFindings.computed_maturity_rating}" level by implementing measurement frameworks, KPIs, and quantitative control monitoring.`;
                    } else {
                      return 'Continue monitoring and maintain current control framework with regular effectiveness reviews and continuous improvement initiatives.';
                    }
                  })()}
                </div>
              </div>
            </div>

            <div style={styles.maturityAnalysisBox}>
              <h3 style={styles.summaryTitle}>AML/CFT Institutional Maturity Assessment (Module 4)</h3>
              <p style={styles.paragraph}>
                This comprehensive assessment evaluates the maturity level of the organization's AML/CFT control framework through detailed analysis of 20 key controls across 9 critical domains: Governance & Risk Assessment (GOV), Enterprise Risk Assessment (ERA), CDD/KYC (CDD), Transaction Monitoring (TM), Sanctions Screening (SAN), Suspicious Activity Reporting (SAR), Internal Controls & Compliance (ICC), Audit & QA (AUD), and Training & Awareness (TRN). Module 4 score is AUTO-CALCULATED as the average maturity across all assessed controls.
              </p>

              <div style={styles.maturityScoreCard}>
                <div style={styles.maturityScoreHeader}>
                  <h4 style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#2563eb'}}>
                    Overall Institutional Maturity
                  </h4>
                  <div style={{fontSize: '48px', fontWeight: '700', color: '#2563eb', marginTop: '12px'}}>
                    {(assessment.module_4_score || 0).toFixed(2)} / 5.0
                  </div>
                  <div style={{fontSize: '20px', fontWeight: '600', color: '#64748b', marginTop: '8px'}}>
                    {keyFindings?.computed_maturity_rating || 'Loading...'}
                  </div>
                </div>

                <div style={styles.maturityBreakdown}>
                  <h4 style={{fontSize: '14px', fontWeight: '700', color: '#475569', marginBottom: '12px'}}>
                    Maturity Distribution Across {keyFindings?.m4_initial_count + keyFindings?.m4_developing_count + keyFindings?.m4_defined_count + keyFindings?.m4_managed_count + keyFindings?.m4_optimised_count || 0} Assessed Controls
                  </h4>
                  {keyFindings && (
                    <div style={styles.maturityLevelsList}>
                      <div style={styles.maturityLevelItem}>
                        <span style={styles.maturityLevelLabel}>🔴 Initial (Level 1):</span>
                        <span style={styles.maturityLevelValue}>{keyFindings.m4_initial_count} controls</span>
                      </div>
                      <div style={styles.maturityLevelItem}>
                        <span style={styles.maturityLevelLabel}>🟠 Developing (Level 2):</span>
                        <span style={styles.maturityLevelValue}>{keyFindings.m4_developing_count} controls</span>
                      </div>
                      <div style={styles.maturityLevelItem}>
                        <span style={styles.maturityLevelLabel}>🟡 Defined (Level 3):</span>
                        <span style={styles.maturityLevelValue}>{keyFindings.m4_defined_count} controls</span>
                      </div>
                      <div style={styles.maturityLevelItem}>
                        <span style={styles.maturityLevelLabel}>🟢 Managed (Level 4):</span>
                        <span style={styles.maturityLevelValue}>{keyFindings.m4_managed_count} controls</span>
                      </div>
                      <div style={styles.maturityLevelItem}>
                        <span style={styles.maturityLevelLabel}>🔵 Optimised (Level 5):</span>
                        <span style={styles.maturityLevelValue}>{keyFindings.m4_optimised_count} controls</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.maturityInsightBox}>
                <h4 style={styles.maturityInsightTitle}>Maturity Level Interpretation</h4>
                <p style={styles.paragraph}>
                  {(() => {
                    const maturityScore = assessment.module_4_score || 0;
                    const rating = keyFindings?.computed_maturity_rating || 'Initial';

                    if (maturityScore >= 4.5) {
                      return `The organization demonstrates OPTIMISED maturity (${maturityScore.toFixed(1)}/5.0). AML/CFT processes are continuously monitored, measured, and improved through innovation and automation. The organization demonstrates industry-leading practices with proactive risk management and continuous enhancement of control effectiveness.`;
                    } else if (maturityScore >= 3.5) {
                      return `The organization demonstrates MANAGED maturity (${maturityScore.toFixed(1)}/5.0). AML/CFT processes are quantitatively managed with established metrics and KPIs. Controls are measured, monitored, and adjusted based on performance data. Continue to enhance automation and move toward continuous improvement practices.`;
                    } else if (maturityScore >= 2.5) {
                      return `The organization demonstrates DEFINED maturity (${maturityScore.toFixed(1)}/5.0). AML/CFT processes are documented, standardized, and integrated across the organization. Controls are established and consistently applied. Focus should be placed on implementing measurement frameworks and enhancing control monitoring.`;
                    } else if (maturityScore >= 1.5) {
                      return `The organization demonstrates DEVELOPING maturity (${maturityScore.toFixed(1)}/5.0). Basic AML/CFT processes exist but may not be fully documented or consistently applied. Significant improvement is needed to establish standardized controls, comprehensive documentation, and consistent implementation across all areas.`;
                    } else {
                      return `The organization demonstrates INITIAL maturity (${maturityScore.toFixed(1)}/5.0). AML/CFT processes are ad-hoc, reactive, and inconsistently applied. Immediate priority should be given to establishing fundamental controls, creating policy documentation, and implementing basic risk assessment processes.`;
                    }
                  })()}
                </p>
              </div>
            </div>

            <div style={styles.scaleExplanation}>
              <h3 style={styles.subsectionTitle}>Risk Scoring Scale</h3>
              <p style={styles.paragraph}>
                This assessment uses a 5-point risk scoring scale where:
              </p>
              <ul style={styles.scaleList}>
                <li><strong>1 - Excellent (Low Risk):</strong> Comprehensive controls in place, minimal vulnerabilities</li>
                <li><strong>2 - Good (Low Risk):</strong> Strong controls with minor gaps</li>
                <li><strong>3 - Fair (Medium Risk):</strong> Adequate controls but notable improvements needed</li>
                <li><strong>4 - Poor (High Risk):</strong> Significant control gaps requiring immediate attention</li>
                <li><strong>5 - Critical (High Risk):</strong> Severe vulnerabilities, urgent remediation required</li>
              </ul>
            </div>

            <h3 style={styles.subsectionTitle}>Section Risk Summary</h3>
            <table style={styles.summaryTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Section</th>
                  <th style={styles.th}>Section Name</th>
                  <th style={styles.th}>Questions</th>
                  <th style={styles.th}>Module Measure</th>
                  <th style={styles.th}>Module Score</th>
                  <th style={styles.th}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {sectionScores.map(score => {
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

                  return (
                    <tr key={score.id}>
                      <td style={styles.td}>{score.section_code}</td>
                      <td style={styles.td}>{score.section_name}</td>
                      <td style={styles.tdCenter}>{score.answered_questions} / {score.total_questions}</td>
                      <td style={{...styles.td, fontStyle: 'italic', color: '#64748b'}}>{moduleMeasure}</td>
                      <td style={{...styles.tdCenter, fontWeight: '600', color: hasResponses ? scoreColor : '#94a3b8'}}>
                        {hasResponses ? moduleScore.toFixed(1) : 'N/A'}
                      </td>
                      <td style={styles.tdCenter}>
                        {hasResponses ? (
                          <span style={{
                            ...styles.levelBadge,
                            background: score.risk_level?.toLowerCase() === 'low' ? '#d1fae5' :
                                       score.risk_level?.toLowerCase() === 'medium' ? '#fef3c7' : '#fecaca',
                            color: score.risk_level?.toLowerCase() === 'low' ? '#065f46' :
                                  score.risk_level?.toLowerCase() === 'medium' ? '#92400e' : '#991b1b'
                          }}>
                            {getRiskLabel(score.risk_level)}
                          </span>
                        ) : (
                          <span style={{
                            ...styles.levelBadge,
                            background: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            Not Assessed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.scoreExplanation}>
              <p style={styles.smallText}>
                <strong>Module Measure:</strong> Each module assesses a different dimension:
                <strong style={{marginLeft: '10px', color: '#ef4444'}}>Module 1</strong> measures inherent risk exposure,
                <strong style={{marginLeft: '10px', color: '#667eea'}}>Module 2</strong> measures technical compliance (policies/procedures),
                <strong style={{marginLeft: '10px', color: '#10b981'}}>Module 3</strong> measures control effectiveness (how well controls work),
                <strong style={{marginLeft: '10px', color: '#8b5cf6'}}>Module 4</strong> measures institutional maturity (process sophistication).
              </p>
            </div>

            {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).length > 0 && (
              <>
                <div style={styles.eddSection}>
                  <h3 style={styles.eddTitle}>Enhanced Due Diligence Requirements</h3>
                  <div style={styles.eddBox}>
                    <p style={styles.eddIntro}>
                      <strong>IMPORTANT:</strong> The following areas have been identified as HIGH RISK (≥ 2.5/5.0) and require
                      Enhanced Due Diligence (EDD) procedures with mandatory senior management sign-off:
                    </p>
                    <table style={{...styles.summaryTable, marginTop: '16px'}}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Section</th>
                          <th style={styles.th}>Area</th>
                          <th style={styles.th}>Risk Score</th>
                          <th style={styles.th}>Required Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).map(score => {
                          const fivePointScore = score.risk_score;
                          return (
                            <tr key={score.id} style={{background: '#fef2f2'}}>
                              <td style={{...styles.td, fontWeight: '700'}}>{score.section_code}</td>
                              <td style={styles.td}>{score.section_name}</td>
                              <td style={{...styles.tdCenter, fontWeight: '700', color: '#dc2626'}}>
                                {fivePointScore ? `${fivePointScore.toFixed(1)} / 5.0` : 'N/A'}
                              </td>
                              <td style={{...styles.td, color: '#dc2626', fontWeight: '600'}}>
                                {getRequiredAction(score.risk_score)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={styles.eddActionBox}>
                      <h4 style={styles.eddActionTitle}>Required Actions:</h4>
                      <ul style={styles.eddActionList}>
                        <li>Implement Enhanced Due Diligence procedures for all activities in these areas</li>
                        <li>Obtain senior management approval for all high-risk transactions and relationships</li>
                        <li>Establish enhanced monitoring and review protocols</li>
                        <li>Document all EDD procedures and decisions comprehensively</li>
                        <li>Conduct immediate remediation planning for identified vulnerabilities</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={styles.pageBreak} />

            <h2 style={styles.mainHeading}>Section-by-Section Findings and Analysis</h2>
            <p style={styles.paragraph}>
              This section provides detailed findings, gap analysis, and specific recommendations for each of the {filteredSections.length} assessment areas. Each section includes:
            </p>
            <ul style={styles.bulletList}>
              <li><strong>Overall Assessment:</strong> Summary of section performance and risk rating</li>
              <li><strong>Key Findings:</strong> Critical observations based on responses</li>
              <li><strong>Control Gaps:</strong> Identified deficiencies requiring attention</li>
              <li><strong>Recommendations:</strong> Specific, actionable steps for improvement</li>
            </ul>

            {filteredSections.map((section, sectionIndex) => {
              const sectionResponses = (responses || []).filter(r => r?.section_code === section?.code);
              const sectionScore = (sectionScores || []).find(s => s?.section_code === section?.code);
              const fivePointScore = sectionScore?.risk_score || 0;

              // Get all questions from subsections
              const allQuestions = section?.subsections?.flatMap(sub => sub?.questions || []) || [];

              const noResponses = sectionResponses.filter(r => r?.response && r.response.toLowerCase().includes('no'));
              const partialResponses = sectionResponses.filter(r => r?.response && (r.response.toLowerCase().includes('partial') || r.response.toLowerCase().includes('weak')));
              const yesResponses = sectionResponses.filter(r => r?.response && (r.response.toLowerCase().includes('yes') || r.response.toLowerCase().includes('full')));

              const sectionCode = section?.code || '';
              const sectionCodeLower = sectionCode.toLowerCase();

              // Detect module type from section code (handles all formats: MODULE_module1, module1, 1, M1, etc.)
              const isInherentRiskModule = sectionCodeLower.includes('module1') || sectionCodeLower === '1' || /\bm1\b/i.test(sectionCode);
              const isComplianceModule = sectionCodeLower.includes('module2') || sectionCodeLower === '2' || /\bm2\b/i.test(sectionCode);
              const isEffectivenessModule = sectionCodeLower.includes('module3') || sectionCodeLower === '3' || /\bm3\b/i.test(sectionCode);

              console.log(`=== SECTION: ${sectionCode} ===`);
              console.log('Section Code Lower:', sectionCodeLower);
              console.log('Module Type Detection:', {
                isInherentRiskModule,
                isComplianceModule,
                isEffectivenessModule
              });
              console.log('Response Counts:', {
                total: sectionResponses.length,
                yes: yesResponses.length,
                no: noResponses.length,
                partial: partialResponses.length
              });
              console.log('Five Point Score:', fivePointScore);

              // Calculate percentage based on module type
              let percentageScore;

              if (isInherentRiskModule) {
                // Module 1: Risk Exposure Level - convert 1-5 score to percentage
                // Higher score = higher risk exposure
                const clampedScore = Math.max(1, Math.min(5, fivePointScore));
                percentageScore = ((clampedScore - 1) / 4 * 100).toFixed(0);
                console.log('Module 1 Calculation:', { clampedScore, percentageScore });
              } else {
                // Module 2 & 3: Control Effectiveness - calculate from actual responses
                // Effectiveness = (Fully Effective / Total) × 100
                const totalResponses = sectionResponses.length;
                const effectiveControls = yesResponses.length;

                if (totalResponses === 0) {
                  percentageScore = "0";
                } else {
                  percentageScore = ((effectiveControls / totalResponses) * 100).toFixed(0);
                }
                console.log('Module 2/3 Calculation:', { totalResponses, effectiveControls, percentageScore });
              }

              return (
                <div key={section.code} style={styles.analysisBlock}>
                  {sectionIndex > 0 && sectionIndex % 2 === 0 && <div style={styles.pageBreak} />}

                  <div style={styles.analysisSectionHeader}>
                    <div style={styles.analysisSectionTitleRow}>
                      <h3 style={styles.analysisSectionTitle}>
                        Section {section.code}: {section.name}
                      </h3>
                      <div style={styles.analysisSectionScoreBox}>
                        <div style={styles.sectionScoreLabel}>Risk Score</div>
                        <div style={{...styles.sectionScoreValue, color: fivePointScore >= 2.5 ? '#dc2626' : fivePointScore >= 1.5 ? '#d97706' : '#059669'}}>
                          {fivePointScore.toFixed(1)} / 5
                        </div>
                      </div>
                    </div>
                    <p style={styles.sectionDescription}>{section.description}</p>
                  </div>

                  <div style={styles.analysisContent}>
                    <div style={styles.analysisMetrics}>
                      <div style={styles.metricItem}>
                        <div style={styles.metricLabel}>Questions Answered</div>
                        <div style={styles.metricValue}>{sectionResponses.length} / {allQuestions.length}</div>
                      </div>
                      <div style={styles.metricItem}>
                        <div style={styles.metricLabel}>
                          {isInherentRiskModule ? 'Risk Exposure Level' :
                           isComplianceModule ? 'Control Implementation' :
                           'Control Effectiveness'}
                        </div>
                        <div style={{
                          ...styles.metricValue,
                          color: isInherentRiskModule
                            ? (percentageScore >= 70 ? '#dc2626' : percentageScore >= 40 ? '#d97706' : '#059669')
                            : (percentageScore >= 70 ? '#059669' : percentageScore >= 40 ? '#d97706' : '#dc2626')
                        }}>
                          {percentageScore}%
                        </div>
                      </div>
                      <div style={styles.metricItem}>
                        <div style={styles.metricLabel}>
                          {isInherentRiskModule ? 'High Risk Factors' :
                           isComplianceModule ? 'Control Gaps' :
                           'Ineffective Controls'}
                        </div>
                        <div style={{...styles.metricValue, color: '#dc2626'}}>{noResponses.length}</div>
                      </div>
                      <div style={styles.metricItem}>
                        <div style={styles.metricLabel}>
                          {isInherentRiskModule ? 'Moderate Risk Factors' :
                           isComplianceModule ? 'Partial Implementation' :
                           'Partially Effective'}
                        </div>
                        <div style={{...styles.metricValue, color: '#d97706'}}>{partialResponses.length}</div>
                      </div>
                    </div>

                    <h4 style={styles.analysisSubheading}>Overall Assessment</h4>
                    <p style={styles.analysisParagraph}>
                      {(() => {
                        const sectionCode = section?.code || '';
                        const sectionCodeLower = sectionCode.toLowerCase();
                        // Detect module type from section code (handles all formats: MODULE_module1, module1, 1, M1, etc.)
                        const isInherentRisk = sectionCodeLower.includes('module1') || sectionCodeLower === '1' || /\bm1\b/i.test(sectionCode);
                        const isCompliance = sectionCodeLower.includes('module2') || sectionCodeLower === '2' || /\bm2\b/i.test(sectionCode);
                        const isEffectiveness = sectionCodeLower.includes('module3') || sectionCodeLower === '3' || /\bm3\b/i.test(sectionCode);

                        if (fivePointScore < 1.5) {
                          if (isInherentRisk) {
                            return `Section ${section.code} shows low inherent risk exposure with a score of ${fivePointScore.toFixed(1)}. The firm has limited exposure to the risk factors assessed in this area. Continue monitoring and ensure controls remain appropriate for the level of risk.`;
                          } else if (isCompliance) {
                            return `Section ${section.code} demonstrates strong control implementation with ${percentageScore}% of required controls fully in place. The low risk rating of ${fivePointScore.toFixed(1)} indicates comprehensive AML/CFT measures. Continue current practices with regular monitoring.`;
                          } else {
                            return `Section ${section.code} shows effective operational controls with ${percentageScore}% effectiveness rating. Controls are operating as intended and achieving their objectives. Continue current practices with regular monitoring.`;
                          }
                        } else if (fivePointScore < 2.5) {
                          if (isInherentRisk) {
                            return `Section ${section.code} shows moderate inherent risk with a score of ${fivePointScore.toFixed(1)}. The firm has material exposure to some risk factors in this area. Ensure controls are calibrated to the risk level and conduct regular reviews.`;
                          } else if (isCompliance) {
                            return `Section ${section.code} shows moderate control implementation with ${percentageScore}% of controls in place. While basic controls exist, ${noResponses.length + partialResponses.length} gaps require attention. Strengthen documentation, policies, and procedures to reduce risk exposure.`;
                          } else {
                            return `Section ${section.code} shows moderate operational effectiveness with ${percentageScore}% effectiveness. Controls are partially achieving objectives but require strengthening. Enhance monitoring, testing, and remediation processes.`;
                          }
                        } else {
                          if (isInherentRisk) {
                            return `CRITICAL: Section ${section.code} presents HIGH inherent risk with a score of ${fivePointScore.toFixed(1)}. The firm has significant exposure to multiple high-risk factors. Enhanced Due Diligence (EDD), senior management oversight, and robust controls are essential.`;
                          } else if (isCompliance) {
                            return `CRITICAL: Section ${section.code} presents high risk due to significant control gaps (score ${fivePointScore.toFixed(1)}). Only ${percentageScore}% of controls are implemented. ${noResponses.length} critical deficiencies and ${partialResponses.length} partial implementations exist. Immediate remediation with senior management oversight is required.`;
                          } else {
                            return `CRITICAL: Section ${section.code} shows ineffective controls with a score of ${fivePointScore.toFixed(1)} and only ${percentageScore}% effectiveness. Controls are not operating as intended. Immediate remediation, enhanced testing, and senior management intervention are required.`;
                          }
                        }
                      })()}
                    </p>

                    {(noResponses.length > 0 || partialResponses.length > 0) && (
                      <>
                        <h4 style={styles.analysisSubheading}>
                          {isInherentRiskModule ? 'Identified Risk Factors' :
                           isComplianceModule ? 'Identified Control Gaps' :
                           'Identified Effectiveness Issues'}
                        </h4>
                        {noResponses.length > 0 && (
                          <div style={styles.gapSection}>
                            <div style={styles.gapHeader}>
                              <span style={{...styles.gapBadge, background: '#fecaca', color: '#991b1b'}}>
                                {isInherentRiskModule ? 'High Risk' : 'Critical'}
                              </span>
                              <span style={styles.gapCount}>
                                {noResponses.length} {
                                  isInherentRiskModule ? 'high risk factor(s) identified' :
                                  isComplianceModule ? 'control(s) not implemented' :
                                  'control(s) ineffective'
                                }
                                {noResponses.length > 5 && ` (showing first 5)`}
                              </span>
                            </div>
                            <ul style={styles.gapList}>
                              {noResponses.slice(0, 5).map(resp => {
                                const question = allQuestions.find(q => q.code === resp.question_code);
                                return question ? (
                                  <li key={resp.question_code} style={styles.gapListItem}>
                                    <strong>{question.code}:</strong> {question.text}
                                    {resp.notes && <div style={styles.gapNotes}>Note: {resp.notes}</div>}
                                  </li>
                                ) : null;
                              })}
                            </ul>
                          </div>
                        )}
                        {partialResponses.length > 0 && (
                          <div style={styles.gapSection}>
                            <div style={styles.gapHeader}>
                              <span style={{...styles.gapBadge, background: '#fef3c7', color: '#92400e'}}>
                                {isInherentRiskModule ? 'Moderate Risk' : 'Moderate'}
                              </span>
                              <span style={styles.gapCount}>
                                {partialResponses.length} {
                                  isInherentRiskModule ? 'moderate risk factor(s) identified' :
                                  isComplianceModule ? 'control(s) partially implemented' :
                                  'control(s) partially effective'
                                }
                                {partialResponses.length > 5 && ` (showing first 5)`}
                              </span>
                            </div>
                            <ul style={styles.gapList}>
                              {partialResponses.slice(0, 5).map(resp => {
                                const question = allQuestions.find(q => q.code === resp.question_code);
                                return question ? (
                                  <li key={resp.question_code} style={styles.gapListItem}>
                                    <strong>{question.code}:</strong> {question.text}
                                    {resp.notes && <div style={styles.gapNotes}>Note: {resp.notes}</div>}
                                  </li>
                                ) : null;
                              })}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    <h4 style={styles.analysisSubheading}>Specific Recommendations</h4>
                    <div style={styles.recommendationsBox}>
                      {fivePointScore >= 2.5 ? (
                        <div style={styles.recommendationsList}>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>PRIORITY 1 - IMMEDIATE:</div>
                            <div style={styles.recommendationText}>
                              Implement Enhanced Due Diligence (EDD) procedures with documented senior management approval for all activities in this section. Establish enhanced monitoring and reporting protocols.
                            </div>
                          </div>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>PRIORITY 2 - 30 DAYS:</div>
                            <div style={styles.recommendationText}>
                              Address all critical control gaps identified above. Develop and document comprehensive policies and procedures for each deficient area with clear roles and responsibilities.
                            </div>
                          </div>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>PRIORITY 3 - 60 DAYS:</div>
                            <div style={styles.recommendationText}>
                              Conduct specialized training for all personnel involved in these activities. Implement regular testing and monitoring to ensure control effectiveness. Establish quarterly reviews with Board reporting.
                            </div>
                          </div>
                        </div>
                      ) : fivePointScore >= 1.5 ? (
                        <div style={styles.recommendationsList}>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>PRIORITY 1 - 30 DAYS:</div>
                            <div style={styles.recommendationText}>
                              Strengthen partially implemented controls and address critical gaps. Document all procedures and ensure staff understanding through targeted training.
                            </div>
                          </div>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>PRIORITY 2 - 90 DAYS:</div>
                            <div style={styles.recommendationText}>
                              Implement enhanced review procedures with documented evidence of control operation. Establish regular monitoring and periodic testing protocols.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={styles.recommendationsList}>
                          <div style={styles.recommendation}>
                            <div style={styles.recommendationPriority}>MAINTAIN & MONITOR:</div>
                            <div style={styles.recommendationText}>
                              Continue current control practices. Conduct annual reviews to ensure ongoing effectiveness. Address any minor gaps identified to maintain optimal control environment.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={styles.pageBreak} />

            <h2 style={styles.mainHeading}>Detailed Question-by-Question Results</h2>
            <p style={styles.paragraph}>
              The following sections provide complete documentation of all {getAllQuestions().length} assessment questions with responses, scores, and notes.
            </p>

            {filteredSections.map((section, sectionIndex) => {
              const sectionResponses = responses.filter(r => r.section_code === section.code);
              const sectionScore = sectionScores.find(s => s.section_code === section.code);
              const fivePointScore = sectionScore ? sectionScore.risk_score : 0;

              // Get all questions from subsections
              const allQuestions = section.subsections?.flatMap(sub => sub.questions) || [];

              return (
                <div key={section.code} style={styles.sectionBlock}>
                  {sectionIndex > 0 && sectionIndex % 3 === 0 && <div style={styles.pageBreak} />}

                  <div style={styles.sectionHeader}>
                    <div>
                      <h3 style={styles.sectionTitle}>
                        Section {section.code}: {section.name}
                      </h3>
                      <p style={styles.sectionDescription}>{section.description}</p>
                    </div>
                    <div style={styles.sectionScoreBox}>
                      <div style={styles.sectionScoreLabel}>Section Score</div>
                      <div style={styles.sectionScoreValue}>{fivePointScore} / 5</div>
                    </div>
                  </div>

                  {allQuestions.map((question, qIndex) => {
                    const response = sectionResponses.find(r => r.question_code === question.code);

                    return (
                      <div key={question.code} style={styles.questionBlock}>
                        <div style={styles.questionRow}>
                          <span style={styles.questionNumber}>Q{qIndex + 1}</span>
                          <div style={styles.questionContent}>
                            <p style={styles.questionText}>{question.text}</p>
                            <div style={styles.answerRow}>
                              <div style={styles.answerLabel}>Response:</div>
                              <div style={{
                                ...styles.answerValue,
                                color: !response ? '#a0aec0' :
                                       response.response === 'Yes' || response.response === 'Fully implemented & documented' || response.response === 'Effective' ? '#059669' :
                                       response.response === 'No' || response.response === 'Not in place' || response.response === 'Ineffective' ? '#dc2626' :
                                       response.response === 'Partially' || response.response === 'Partially implemented' || response.response === 'Weak' ? '#d97706' : '#6b7280'
                              }}>
                                {response ? getResponseLabel(response.response) : 'Not Answered'}
                              </div>
                            </div>
                            {response?.notes && (
                              <div style={styles.notesBox}>
                                <strong>Notes:</strong> {response.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div style={styles.pageBreak} />

            <div style={styles.signatureSection}>
              <h3 style={styles.subsectionTitle}>Report Certification</h3>
              <p style={styles.paragraph}>
                This report represents a comprehensive AML/CFT risk assessment conducted for {assessment.organizations?.name}.
              </p>

              <div style={styles.pageBreak} />

              <MaturityAssessmentSection assessmentId={assessment.id} />

              <div style={styles.pageBreak} />

              <div style={styles.signatureBlock}>
                <div style={styles.signatureLine}>
                  <div style={styles.signatureLabel}>Assessed by:</div>
                  <div style={styles.signatureSpace}>_______________________________</div>
                  <div style={styles.signatureInfo}>
                    {assessment.contact_person && <p>{assessment.contact_person}</p>}
                    {assessment.contact_position && <p>{assessment.contact_position}</p>}
                  </div>
                </div>

                <div style={styles.signatureLine}>
                  <div style={styles.signatureLabel}>Date:</div>
                  <div style={styles.signatureSpace}>_______________________________</div>
                  <div style={styles.signatureInfo}>
                    <p>{formatDate(assessment.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
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
    background: 'white',
    zIndex: 2000,
    overflow: 'auto',
  },
  container: {
    minHeight: '100vh',
  },
  toolbar: {
    position: 'sticky',
    top: 0,
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    zIndex: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '2px solid #d4af37',
  },
  printButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    fontWeight: '700',
    boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
    transition: 'all 0.3s ease',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  closeButton: {
    padding: '10px 20px',
    background: '#f0f0f0',
    color: '#0a1929',
    border: '2px solid #cbd5e0',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  document: {
    maxWidth: '210mm',
    margin: '0 auto',
    background: 'white',
    padding: '40px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '11pt',
    lineHeight: '1.6',
    color: '#000',
  },
  cover: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  coverTitle: {
    fontSize: '32pt',
    fontWeight: '700',
    marginBottom: '60px',
    color: '#1a202c',
  },
  coverInfo: {
    fontSize: '14pt',
    lineHeight: '2',
  },
  orgName: {
    fontSize: '18pt',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px',
  },
  coverDate: {
    marginTop: '40px',
    fontStyle: 'italic',
    color: '#4a5568',
  },
  coverScore: {
    marginTop: '60px',
    padding: '30px',
    background: '#f7fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
  },
  scoreLabel: {
    fontSize: '12pt',
    color: '#718096',
    marginBottom: '8px',
  },
  scoreLarge: {
    fontSize: '48pt',
    fontWeight: '700',
    color: '#2d3748',
    margin: '16px 0',
  },
  scoreSubtext: {
    fontSize: '14pt',
    fontWeight: '600',
    color: '#4a5568',
  },
  pageBreak: {
    pageBreakAfter: 'always',
  },
  content: {
    padding: '20px 0',
  },
  mainHeading: {
    fontSize: '20pt',
    fontWeight: '700',
    marginTop: '30px',
    marginBottom: '20px',
    color: '#1a202c',
    borderBottom: '3px solid #667eea',
    paddingBottom: '8px',
  },
  subsectionTitle: {
    fontSize: '14pt',
    fontWeight: '700',
    marginTop: '24px',
    marginBottom: '12px',
    color: '#2d3748',
  },
  paragraph: {
    marginBottom: '12px',
    textAlign: 'justify',
    color: '#4a5568',
  },
  summaryBox: {
    background: '#f7fafc',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
  },
  summaryTitle: {
    fontSize: '14pt',
    fontWeight: '700',
    marginTop: 0,
    marginBottom: '16px',
    color: '#2d3748',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryLabel: {
    fontSize: '10pt',
    color: '#718096',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: '12pt',
    color: '#2d3748',
  },
  scaleExplanation: {
    marginBottom: '24px',
  },
  scaleList: {
    marginLeft: '30px',
    marginBottom: '16px',
    lineHeight: '1.8',
  },
  summaryTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '24px',
    fontSize: '10pt',
  },
  th: {
    border: '1px solid #cbd5e0',
    padding: '10px',
    background: '#edf2f7',
    fontWeight: '700',
    textAlign: 'left',
  },
  td: {
    border: '1px solid #e2e8f0',
    padding: '10px',
  },
  tdCenter: {
    border: '1px solid #e2e8f0',
    padding: '10px',
    textAlign: 'center',
  },
  levelBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '9pt',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionBlock: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '14pt',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#2d3748',
  },
  sectionDescription: {
    fontSize: '10pt',
    margin: 0,
    color: '#718096',
  },
  sectionScoreBox: {
    textAlign: 'center',
    minWidth: '80px',
  },
  sectionScoreLabel: {
    fontSize: '9pt',
    color: '#718096',
    marginBottom: '4px',
  },
  sectionScoreValue: {
    fontSize: '20pt',
    fontWeight: '700',
    color: '#667eea',
  },
  questionBlock: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  questionRow: {
    display: 'flex',
    gap: '12px',
  },
  questionNumber: {
    fontSize: '10pt',
    fontWeight: '700',
    color: '#667eea',
    minWidth: '40px',
    paddingTop: '2px',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    margin: '0 0 8px 0',
    fontSize: '11pt',
    color: '#2d3748',
    fontWeight: '500',
  },
  answerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  answerLabel: {
    fontSize: '10pt',
    fontWeight: '600',
    color: '#718096',
  },
  answerValue: {
    fontSize: '11pt',
    fontWeight: '700',
  },
  answerScore: {
    fontSize: '9pt',
    padding: '2px 8px',
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontWeight: '600',
  },
  notesBox: {
    fontSize: '10pt',
    padding: '8px',
    background: '#fffbeb',
    borderLeft: '3px solid #f59e0b',
    color: '#78350f',
    marginTop: '8px',
  },
  signatureSection: {
    marginTop: '40px',
  },
  signatureBlock: {
    marginTop: '40px',
  },
  signatureLine: {
    marginBottom: '40px',
  },
  signatureLabel: {
    fontWeight: '700',
    marginBottom: '8px',
  },
  signatureSpace: {
    marginTop: '30px',
    marginBottom: '8px',
  },
  signatureInfo: {
    fontSize: '10pt',
    color: '#4a5568',
  },
  eddSection: {
    marginTop: '32px',
    marginBottom: '32px',
  },
  eddTitle: {
    fontSize: '16pt',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#dc2626',
  },
  eddBox: {
    background: '#fef2f2',
    padding: '24px',
    borderRadius: '8px',
    border: '2px solid #fca5a5',
  },
  eddIntro: {
    fontSize: '11pt',
    lineHeight: '1.6',
    color: '#991b1b',
    marginBottom: '16px',
  },
  eddActionBox: {
    marginTop: '20px',
    padding: '16px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #fca5a5',
  },
  eddActionTitle: {
    fontSize: '12pt',
    fontWeight: '700',
    marginTop: 0,
    marginBottom: '12px',
    color: '#991b1b',
  },
  eddActionList: {
    marginLeft: '20px',
    color: '#4a5568',
  },
  keyFindingsBox: {
    background: '#fffbeb',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '2px solid #fbbf24',
  },
  findingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  findingItem: {
    fontSize: '10pt',
    lineHeight: '1.6',
    color: '#4a5568',
  },
  bulletList: {
    marginLeft: '30px',
    marginBottom: '20px',
    lineHeight: '1.8',
  },
  analysisBlock: {
    marginBottom: '32px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  analysisSectionHeader: {
    padding: '20px',
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  analysisSectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  analysisSectionTitle: {
    fontSize: '14pt',
    fontWeight: '700',
    margin: 0,
    color: '#2d3748',
  },
  analysisSectionScoreBox: {
    textAlign: 'center',
    minWidth: '80px',
  },
  analysisContent: {
    padding: '20px',
  },
  analysisMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '6px',
  },
  metricItem: {
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: '9pt',
    color: '#718096',
    marginBottom: '4px',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: '18pt',
    fontWeight: '700',
    color: '#2d3748',
  },
  analysisSubheading: {
    fontSize: '12pt',
    fontWeight: '700',
    marginTop: '20px',
    marginBottom: '12px',
    color: '#2d3748',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  analysisParagraph: {
    fontSize: '11pt',
    lineHeight: '1.6',
    marginBottom: '16px',
    textAlign: 'justify',
    color: '#4a5568',
  },
  gapSection: {
    marginBottom: '16px',
  },
  gapHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  gapBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '9pt',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gapCount: {
    fontSize: '10pt',
    fontWeight: '600',
    color: '#4a5568',
  },
  gapList: {
    marginLeft: '20px',
    marginBottom: '8px',
  },
  gapListItem: {
    marginBottom: '8px',
    fontSize: '10pt',
    color: '#4a5568',
    lineHeight: '1.6',
  },
  gapNotes: {
    marginTop: '4px',
    fontSize: '9pt',
    fontStyle: 'italic',
    color: '#718096',
    paddingLeft: '16px',
  },
  recommendationsBox: {
    background: '#f7fafc',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recommendation: {
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  },
  recommendationPriority: {
    fontSize: '10pt',
    fontWeight: '700',
    color: '#667eea',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  recommendationText: {
    fontSize: '10pt',
    lineHeight: '1.6',
    color: '#4a5568',
  },
  scoreExplanation: {
    marginTop: '12px',
    padding: '12px',
    background: '#f7fafc',
    borderRadius: '6px',
    borderLeft: '4px solid #667eea',
  },
  smallText: {
    margin: 0,
    fontSize: '9pt',
    color: '#4a5568',
    lineHeight: '1.6',
  },
  maturityAnalysisBox: {
    marginTop: '24px',
    padding: '24px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
  },
  maturityDimensionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  maturityDimensionCard: {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  maturityDimensionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  maturityDimensionText: {
    fontSize: '10pt',
    lineHeight: '1.6',
    color: '#4a5568',
    marginBottom: '16px',
  },
  maturityScoreDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f7fafc',
    borderRadius: '6px',
  },
  maturityScoreLabel: {
    fontSize: '10pt',
    fontWeight: '600',
    color: '#718096',
  },
  maturityScoreValue: {
    fontSize: '18pt',
    fontWeight: '700',
  },
  maturityInsightBox: {
    padding: '16px',
    background: '#fffbeb',
    borderRadius: '6px',
    borderLeft: '4px solid #f59e0b',
  },
  maturityInsightTitle: {
    margin: '0 0 12px 0',
    fontSize: '12pt',
    fontWeight: '700',
    color: '#92400e',
  },
  maturityScoreCard: {
    marginTop: '20px',
    padding: '24px',
    background: 'white',
    borderRadius: '8px',
    border: '2px solid #dbeafe',
  },
  maturityScoreHeader: {
    textAlign: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '20px',
  },
  maturityBreakdown: {
    marginTop: '20px',
  },
  maturityLevelsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  maturityLevelItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  maturityLevelLabel: {
    fontSize: '10pt',
    fontWeight: '600',
    color: '#475569',
  },
  maturityLevelValue: {
    fontSize: '10pt',
    fontWeight: '700',
    color: '#1e293b',
  },
};
