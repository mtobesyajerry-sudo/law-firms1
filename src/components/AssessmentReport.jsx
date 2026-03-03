import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRiskColor, getRiskLabel, institutionCategories, requiresEDD, getRequiredAction } from '../data/assessmentData';
import { getFrameworkLabel, getFilteredSections } from '../utils/frameworkUtils';
import { useAuth } from '../contexts/AuthContext';
import DetailedAssessmentReport from './DetailedAssessmentReport';
import PrintableAssessmentReport from './PrintableAssessmentReport';
import FIUComplianceReport from './FIUComplianceReport';
import LoadingSpinner from './LoadingSpinner';

export default function AssessmentReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [sectionScores, setSectionScores] = useState([]);
  const [responses, setResponses] = useState([]);
  const [remediationActions, setRemediationActions] = useState([]);
  const [riskBreakdown, setRiskBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddRemediation, setShowAddRemediation] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showPrintableReport, setShowPrintableReport] = useState(false);
  const [showFIUReport, setShowFIUReport] = useState(false);
  const [newRemediation, setNewRemediation] = useState({
    section_code: '',
    weakness_description: '',
    mitigation_measure: '',
    priority: 'medium',
    responsible_party: '',
    target_date: '',
  });

  const navigateToDashboard = () => {
    if (profile?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/client/dashboard');
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  useEffect(() => {
    // Add print-ready class to body
    document.body.classList.add('assessment-report-active');

    // Store original styles
    const originalStyles = new Map();

    const handleBeforePrint = () => {
      // Get all elements in the document
      const allElements = document.querySelectorAll('*');

      allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const inlineStyle = el.style.cssText;

        // Store original inline styles
        if (inlineStyle) {
          originalStyles.set(el, inlineStyle);
        }

        // Remove problematic inline styles
        if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
          el.style.position = 'static';
        }
        if (computedStyle.overflow === 'hidden' || computedStyle.overflow === 'auto' || computedStyle.overflow === 'scroll') {
          el.style.overflow = 'visible';
        }
        if (computedStyle.maxHeight !== 'none') {
          el.style.maxHeight = 'none';
        }
        if (computedStyle.height !== 'auto' && !el.classList.contains('page-break')) {
          el.style.height = 'auto';
        }
      });

      // Force document and body to be printable
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.height = 'auto';
      document.body.style.overflow = 'visible';
      document.body.style.height = 'auto';
    };

    const handleAfterPrint = () => {
      // Restore all original inline styles
      originalStyles.forEach((styleText, el) => {
        el.style.cssText = styleText;
      });
      originalStyles.clear();

      // Restore document and body
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };

    // Add event listeners
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.body.classList.remove('assessment-report-active');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const loadReport = async () => {
    try {
      setError(null);
      const { data: assessData, error: assessError } = await supabase
        .from('assessments')
        .select('*, organizations(*)')
        .eq('id', id)
        .maybeSingle();

      if (assessError) {
        console.error('Error loading assessment:', assessError);
        setError(`Error loading assessment: ${assessError.message}`);
        setLoading(false);
        return;
      }

      if (!assessData) {
        setError('Assessment not found');
        setLoading(false);
        return;
      }

      setAssessment(assessData);

      const { data: scoresData, error: scoresError } = await supabase
        .from('section_scores')
        .select('*')
        .eq('assessment_id', id)
        .order('section_code');

      if (scoresError) {
        console.error('Error loading section scores:', scoresError);
        setError(`Error loading section scores: ${scoresError.message}`);
        setLoading(false);
        return;
      }
      setSectionScores(scoresData || []);

      const { data: responsesData, error: responsesError } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('assessment_id', id)
        .order('question_code');

      if (responsesError) {
        console.error('Error loading responses:', responsesError);
        setError(`Error loading responses: ${responsesError.message}`);
        setLoading(false);
        return;
      }
      setResponses(responsesData || []);

      const { data: remediationData, error: remediationError } = await supabase
        .from('remediation_actions')
        .select('*')
        .eq('assessment_id', id)
        .order('priority', { ascending: false });

      if (remediationError) {
        console.error('Error loading remediation actions:', remediationError);
        setError(`Error loading remediation actions: ${remediationError.message}`);
        setLoading(false);
        return;
      }
      setRemediationActions(remediationData || []);

      const { data: riskBreakdownData, error: riskBreakdownError } = await supabase
        .from('assessment_risk_breakdown')
        .select('*')
        .eq('assessment_id', id)
        .maybeSingle();

      if (riskBreakdownError) {
        console.error('Error loading risk breakdown:', riskBreakdownError);
      }
      setRiskBreakdown(riskBreakdownData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading report:', error);
      setError(`Unexpected error: ${error.message}`);
      setLoading(false);
    }
  };


  const addRemediationAction = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('remediation_actions')
        .insert([{ ...newRemediation, assessment_id: id }])
        .select()
        .single();

      if (error) throw error;

      setRemediationActions([data, ...remediationActions]);
      setNewRemediation({
        section_code: '',
        weakness_description: '',
        mitigation_measure: '',
        priority: 'medium',
        responsible_party: '',
        target_date: '',
      });
      setShowAddRemediation(false);
    } catch (error) {
      console.error('Error adding remediation action:', error);
    }
  };

  const updateRemediationStatus = async (actionId, newStatus, completedDate = null) => {
    try {
      const updateData = { status: newStatus };
      if (completedDate) {
        updateData.completed_date = completedDate;
      }

      const { error } = await supabase
        .from('remediation_actions')
        .update(updateData)
        .eq('id', actionId);

      if (error) throw error;

      setRemediationActions(remediationActions.map(action =>
        action.id === actionId ? { ...action, ...updateData } : action
      ));
    } catch (error) {
      console.error('Error updating remediation status:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading report..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Error Loading Report</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={navigateToDashboard} style={styles.primaryButton}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return <div style={styles.loading}>Assessment not found</div>;
  }

  const tier = assessment.entity_tier || assessment.dnfbp_tier || 2;
  const filteredSections = getFilteredSections('banks_financial_institutions', tier);

  const assessmentSections = [];
  filteredSections.forEach(module => {
    module.subsections.forEach(subsection => {
      assessmentSections.push({
        code: subsection.code,
        name: subsection.name
      });
    });
  });

  const overallRiskColor = getRiskColor(assessment.overall_risk_rating);

  if (showPrintableReport) {
    return (
      <PrintableAssessmentReport
        assessment={assessment}
        sectionScores={sectionScores}
        responses={responses}
        remediationActions={remediationActions}
        onClose={() => {
          setShowPrintableReport(false);
          loadReport();
        }}
      />
    );
  }

  if (showDetailedReport) {
    return (
      <DetailedAssessmentReport
        assessment={assessment}
        sectionScores={sectionScores}
        responses={responses}
        onClose={() => {
          setShowDetailedReport(false);
          loadReport();
        }}
      />
    );
  }

  if (showFIUReport) {
    return (
      <FIUComplianceReport
        assessment={assessment}
        sectionScores={sectionScores}
        responses={responses}
        onClose={() => {
          setShowFIUReport(false);
          loadReport();
        }}
      />
    );
  }

  return (
    <>
      <style>
        {`
          /* Screen-only styles */
          @media screen {
            .print-container {
              min-height: 100vh;
            }

            .report-button-hover:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
            }

            .back-button-hover:hover {
              background: rgba(212, 175, 55, 0.15) !important;
              transform: translateX(-4px);
              border-color: #d4af37 !important;
            }

            .back-button-hover:hover svg {
              stroke: #f4d03f !important;
            }
          }

          /* Print styles */
          @media print {
            /* Page setup */
            @page {
              margin: 1.5cm;
              size: A4 portrait;
            }

            /* Force visibility and preserve colors */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            /* Hide buttons and interactive elements */
            button,
            .no-print {
              display: none !important;
            }

            /* NUCLEAR OPTION: Reset absolutely everything */
            body.assessment-report-active,
            body.assessment-report-active *,
            body.assessment-report-active *::before,
            body.assessment-report-active *::after {
              position: static !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
              min-height: 0 !important;
              transform: none !important;
              top: auto !important;
              left: auto !important;
              right: auto !important;
              bottom: auto !important;
              z-index: auto !important;
              display: block !important;
              float: none !important;
              clip: auto !important;
              clip-path: none !important;
            }

            body.assessment-report-active {
              margin: 0 !important;
              padding: 0 !important;
            }

            /* Ensure content flows properly */
            .print-container {
              overflow: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 15px !important;
              background: white !important;
            }

            /* Header adjustments */
            .print-header {
              page-break-after: avoid !important;
              margin-bottom: 15px !important;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
              -webkit-print-color-adjust: exact !important;
            }

            /* Content adjustments */
            .print-content {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }

            /* Content sections - try to keep together */
            .print-section {
              page-break-inside: auto;
              margin-bottom: 15px !important;
              overflow: visible !important;
            }

            /* Cards - try to keep together but allow breaks if needed */
            .print-card {
              page-break-inside: auto;
              margin-bottom: 8px !important;
              overflow: visible !important;
            }

            /* Grid layouts for print */
            .print-grid {
              display: block !important;
              overflow: visible !important;
            }

            .print-grid > * {
              display: block !important;
              margin-bottom: 8px !important;
              overflow: visible !important;
            }

            /* Allow page breaks everywhere except where specified */
            * {
              page-break-inside: auto !important;
            }

            /* Ensure headings stay with content */
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }

            /* Tables */
            table {
              width: 100% !important;
            }

            /* Special handling for specific elements that should show */
            table, tr, td, th, p, div, section, article, ul, ol, li {
              display: revert !important;
            }
          }
        `}
      </style>
      <div style={styles.container} className="print-container">
        <header style={styles.header} className="print-header">
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>AML/CFT Risk Assessment Report</h1>
          <button onClick={navigateToDashboard} style={styles.backButton} className="back-button-hover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={async () => {
              await loadReport();
              setShowFIUReport(true);
            }}
            style={styles.reportButton}
            className="report-button-hover"
            title="Compliance Report"
          >
            Compliance Report
          </button>
          <button
            onClick={async () => {
              await loadReport();
              setShowDetailedReport(true);
            }}
            style={styles.reportButton}
            className="report-button-hover"
            title="Detailed Assessment Report"
          >
            Detailed Report
          </button>
        </div>
      </header>

      <div style={styles.content} className="print-content">
        {(assessment.dnfbp_category || assessment.entity_category) && (
          <section style={styles.infoSection} className="print-section">
            <h2 style={styles.sectionTitle}>Financial Institution Information</h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <h4 style={styles.infoLabel}>Institution Type</h4>
                <p style={styles.infoValue}>
                  {institutionCategories.find(c => c.value === (assessment.entity_category || assessment.dnfbp_category))?.label || assessment.entity_category || assessment.dnfbp_category}
                </p>
              </div>

              {assessment.contact_person && (
                <div style={styles.infoCard}>
                  <h4 style={styles.infoLabel}>Contact Person</h4>
                  <p style={styles.infoValue}>{assessment.contact_person}</p>
                  {assessment.contact_position && (
                    <p style={styles.infoSubtext}>{assessment.contact_position}</p>
                  )}
                </div>
              )}

              {assessment.number_of_employees && (
                <div style={styles.infoCard}>
                  <h4 style={styles.infoLabel}>Employees</h4>
                  <p style={styles.infoValue}>{assessment.number_of_employees}</p>
                </div>
              )}

              {assessment.annual_turnover && (
                <div style={styles.infoCard}>
                  <h4 style={styles.infoLabel}>Annual Turnover</h4>
                  <p style={styles.infoValue}>{assessment.annual_turnover}</p>
                </div>
              )}
            </div>

            {assessment.business_description && (
              <div style={styles.infoDescription}>
                <h4 style={styles.infoLabel}>Business Description</h4>
                <p style={styles.infoText}>{assessment.business_description}</p>
              </div>
            )}

            {assessment.geographical_presence && (
              <div style={styles.infoDescription}>
                <h4 style={styles.infoLabel}>Geographical Presence</h4>
                <p style={styles.infoText}>{assessment.geographical_presence}</p>
              </div>
            )}
          </section>
        )}

        <section style={styles.summarySection} className="print-section print-grid">
          <div style={styles.summaryCard} className="print-card">
            <h3 style={styles.summaryLabel}>Overall Risk Rating</h3>
            <div style={{
              ...styles.riskBadge,
              background: overallRiskColor,
              color: 'white'
            }}>
              {getRiskLabel(assessment.overall_risk_rating)}
            </div>
            {assessment.overall_risk_score && (
              <p style={{...styles.summaryValue, fontSize: '14px', marginTop: '8px', color: '#64748b'}}>
                Score: {assessment.overall_risk_score.toFixed(2)} / 5.0
              </p>
            )}
          </div>

          <div style={styles.summaryCard} className="print-card">
            <h3 style={styles.summaryLabel}>Assessment Date</h3>
            <p style={styles.summaryValue}>
              {new Date(assessment.assessment_date).toLocaleDateString()}
            </p>
          </div>

          <div style={styles.summaryCard} className="print-card">
            <h3 style={styles.summaryLabel}>Completed</h3>
            <p style={styles.summaryValue}>
              {assessment.completed_at ? new Date(assessment.completed_at).toLocaleDateString() : 'In Progress'}
            </p>
          </div>

          <div style={styles.summaryCard} className="print-card">
            <h3 style={styles.summaryLabel}>Sections Assessed</h3>
            <p style={styles.summaryValue}>{sectionScores.length} / {assessmentSections.length}</p>
          </div>
        </section>

        {(assessment.module_1_score || assessment.module_2_score || assessment.module_3_score || assessment.module_4_score) && (
          <section style={styles.section} className="print-section">
            <h2 style={styles.sectionTitle}>FATF Risk Assessment Modules</h2>
            <div style={{...styles.maturityInfoBox, marginBottom: '20px'}} className="print-card">
              <p style={styles.maturityInfoText}>
                <strong>FATF-Compliant Methodology:</strong> This assessment uses the international standard three-pillar approach with a unified 1-5 risk scale:
                <span style={styles.maturityInfoItem}>
                  <strong style={{color: '#667eea'}}>Module 1: Inherent Risk (1-5 scale)</strong> - Assesses exposure to ML/TF risk factors before considering controls (higher = greater risk exposure)
                </span>
                <span style={styles.maturityInfoItem}>
                  <strong style={{color: '#10b981'}}>Module 2: Technical Compliance (1-5 scale)</strong> - AUTO-CALCULATED from institutional control assessments measuring existence and documentation of AML/CFT controls (higher = more control gaps)
                </span>
                <span style={styles.maturityInfoItem}>
                  <strong style={{color: '#f59e0b'}}>Module 3: Effectiveness (1-5 scale)</strong> - AUTO-CALCULATED from institutional control assessments measuring how well controls operate in practice (higher = less effective)
                </span>
                <span style={styles.maturityInfoItem}>
                  <strong style={{color: '#0891b2'}}>Module 4: Institutional Maturity (1-5 scale)</strong> - AUTO-CALCULATED from detailed control assessments across 9 AML/CFT domains with 20 evidence-based controls (1=Initial/Ad hoc, 5=Optimised/Continuously Improved)
                </span>
                <span style={styles.maturityInfoItem}>
                  <strong style={{color: '#dc2626'}}>Residual Risk Formula:</strong> Inherent Risk × (1 - Overall Control Effectiveness)
                </span>
                <span style={{...styles.maturityInfoItem, marginTop: '12px', display: 'block', padding: '12px', background: '#e0f2fe', borderLeft: '4px solid #0891b2'}}>
                  <strong style={{color: '#0891b2'}}>Integration Note:</strong> Module 2 and 3 scores are derived from the detailed institutional control maturity assessments below. This ensures a single, evidence-based source of truth for compliance and effectiveness measurements.
                </span>
              </p>
            </div>
            <div style={styles.scoreGrid} className="print-grid">
              {assessment.module_1_score && (
                <div style={styles.summaryCard} className="print-card">
                  <h3 style={styles.summaryLabel}>Module 1 - Inherent Risk</h3>
                  <p style={{...styles.summaryValue, fontSize: '32px', fontWeight: '700', color: '#667eea'}}>
                    {assessment.module_1_score.toFixed(2)}
                  </p>
                  <p style={{...styles.scoreText, marginTop: '8px'}}>Scale: 1.0 - 5.0</p>
                  {assessment.module_1_rating && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 12px',
                      background: getRiskColor(assessment.module_1_rating) + '20',
                      color: getRiskColor(assessment.module_1_rating),
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {assessment.module_1_rating}
                    </span>
                  )}
                </div>
              )}
              {assessment.module_2_score && (
                <div style={styles.summaryCard} className="print-card">
                  <h3 style={styles.summaryLabel}>Module 2 - Technical Compliance</h3>
                  <p style={{...styles.summaryValue, fontSize: '32px', fontWeight: '700', color: '#10b981'}}>
                    {assessment.module_2_score.toFixed(2)}
                  </p>
                  <p style={{...styles.scoreText, marginTop: '8px'}}>Scale: 1.0 - 5.0</p>
                  {assessment.module_2_rating && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 12px',
                      background: assessment.module_2_rating === 'Compliant' ? '#10b98120' :
                                  assessment.module_2_rating === 'Partially Compliant' ? '#f59e0b20' : '#dc262620',
                      color: assessment.module_2_rating === 'Compliant' ? '#10b981' :
                             assessment.module_2_rating === 'Partially Compliant' ? '#f59e0b' : '#dc2626',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {assessment.module_2_rating}
                    </span>
                  )}
                </div>
              )}
              {assessment.module_3_score && (
                <div style={styles.summaryCard} className="print-card">
                  <h3 style={styles.summaryLabel}>Module 3 - Effectiveness</h3>
                  <p style={{...styles.summaryValue, fontSize: '32px', fontWeight: '700', color: '#f59e0b'}}>
                    {assessment.module_3_score.toFixed(2)}
                  </p>
                  <p style={{...styles.scoreText, marginTop: '8px'}}>Scale: 1.0 - 5.0</p>
                  {assessment.module_3_rating && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 12px',
                      background: assessment.module_3_rating === 'Effective' ? '#10b98120' :
                                  assessment.module_3_rating === 'Partially Effective' ? '#f59e0b20' : '#dc262620',
                      color: assessment.module_3_rating === 'Effective' ? '#10b981' :
                             assessment.module_3_rating === 'Partially Effective' ? '#f59e0b' : '#dc2626',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {assessment.module_3_rating}
                    </span>
                  )}
                </div>
              )}
              {assessment.module_4_score && (
                <div style={styles.summaryCard} className="print-card">
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <h3 style={{...styles.summaryLabel, marginBottom: 0}}>Module 4 - Institutional Maturity</h3>
                  </div>
                  <p style={{...styles.summaryValue, fontSize: '32px', fontWeight: '700', color: '#0891b2'}}>
                    {assessment.module_4_score.toFixed(2)}
                  </p>
                  <p style={{...styles.scoreText, marginTop: '8px'}}>AUTO-CALCULATED from 20 controls across 9 domains</p>
                  {assessment.module_4_rating && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 12px',
                      background: assessment.module_4_rating === 'Optimised' ? '#0891b220' :
                                  assessment.module_4_rating === 'Managed' ? '#10b98120' :
                                  assessment.module_4_rating === 'Defined' ? '#f59e0b20' :
                                  assessment.module_4_rating === 'Developing' ? '#fb923c20' : '#dc262620',
                      color: assessment.module_4_rating === 'Optimised' ? '#0891b2' :
                             assessment.module_4_rating === 'Managed' ? '#10b981' :
                             assessment.module_4_rating === 'Defined' ? '#f59e0b' :
                             assessment.module_4_rating === 'Developing' ? '#fb923c' : '#dc2626',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {assessment.module_4_rating}
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {(assessment.module_1_score && assessment.module_2_score && assessment.module_3_score) && (
          <section style={styles.section} className="print-section">
            <h2 style={styles.sectionTitle}>Risk Assessment Analysis</h2>
            {assessment.module_4_score && (
              <div style={{...styles.maturityInfoBox, marginBottom: '20px', background: '#f0f9ff', border: '1px solid #bae6fd'}} className="print-card">
                <p style={{margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#0c4a6e'}}>
                  <strong>Four-Pillar Assessment:</strong> This comprehensive assessment evaluates inherent risk exposure (Module 1), technical compliance (Module 2), operational effectiveness (Module 3), and institutional maturity (Module 4) to provide a complete picture of the firm's AML/CFT risk profile and capability.
                </p>
              </div>
            )}

            {/* Residual Risk Calculation */}
            <div style={{...styles.maturityInfoBox, marginBottom: '20px', background: '#f8fafc'}} className="print-card">
              <h4 style={{margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
                Residual Risk Calculation
              </h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px'}}>
                <div>
                  <p style={{margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '600'}}>INHERENT RISK</p>
                  <p style={{margin: 0, fontSize: '24px', fontWeight: '700', color: '#667eea'}}>
                    {assessment.module_1_score.toFixed(2)} / 5.0
                  </p>
                  <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#64748b'}}>
                    Exposure before controls
                  </p>
                </div>
                <div>
                  <p style={{margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '600'}}>CONTROL EFFECTIVENESS</p>
                  <p style={{margin: 0, fontSize: '24px', fontWeight: '700', color: '#10b981'}}>
                    {(() => {
                      const complianceEffectiveness = ((5 - assessment.module_2_score) / 4) * 100;
                      const effectivenessScore = ((5 - assessment.module_3_score) / 4) * 100;
                      const overall = (complianceEffectiveness * 0.6 + effectivenessScore * 0.4);
                      return overall.toFixed(0);
                    })()}%
                  </p>
                  <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#64748b'}}>
                    Technical 60% + Effectiveness 40%
                  </p>
                </div>
                <div>
                  <p style={{margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: '600'}}>RESIDUAL RISK</p>
                  <p style={{margin: 0, fontSize: '24px', fontWeight: '700', color: getRiskColor(assessment.overall_risk_rating)}}>
                    {assessment.overall_risk_score ? `${assessment.overall_risk_score.toFixed(2)} / 5.0` : 'N/A'}
                  </p>
                  <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#64748b'}}>
                    Final risk after controls
                  </p>
                </div>
              </div>
              <div style={{padding: '12px', background: '#e0e7ff', borderRadius: '6px', borderLeft: '4px solid #667eea'}}>
                <p style={{margin: 0, fontSize: '13px', color: '#1e293b', fontFamily: 'monospace'}}>
                  <strong>FATF Formula:</strong> Residual Risk = Inherent Risk × (1 - Control Effectiveness)
                </p>
                <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#475569'}}>
                  Control Effectiveness = 60% Technical Compliance + 40% Effectiveness Assessment
                </p>
              </div>
              {riskBreakdown?.governance_override_applied && (
                <div style={{padding: '12px', background: '#fff3cd', borderRadius: '6px', borderLeft: '4px solid #ff9800', marginTop: '12px'}}>
                  <p style={{margin: 0, fontSize: '13px', color: '#856404', fontWeight: '600'}}>
                    ⚠️ Governance Override Applied
                  </p>
                  <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#856404'}}>
                    Critical control gaps identified. Minimum risk level enforced per FATF guidelines. The calculated residual risk of {riskBreakdown.calculated_residual_risk?.toFixed(2)} has been overridden to {riskBreakdown.residual_risk_score?.toFixed(2)} due to significant compliance deficiencies.
                  </p>
                </div>
              )}
            </div>

            {/* Overall Risk Assessment Narrative */}
            <div style={{...styles.maturityInfoBox, marginBottom: '20px'}} className="print-card">
              <h4 style={{margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>
                Overall Risk Assessment
              </h4>
              <p style={{margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#475569'}}>
                {(() => {
                  const inherentRisk = assessment.module_1_score;
                  const complianceScore = assessment.module_2_score;
                  const effectivenessScore = assessment.module_3_score;
                  const maturityScore = assessment.module_4_score || 0;
                  const residualRisk = assessment.overall_risk_score;

                  // CRITICAL: Recalculate risk rating from score using correct FATF thresholds
                  // Don't trust database value - it may have been calculated with old thresholds
                  let riskRating = 'Low';
                  if (residualRisk >= 2.5) riskRating = 'High';
                  else if (residualRisk >= 1.5) riskRating = 'Moderate';

                  // Convert 1-5 scores to effectiveness percentages (lower score = better)
                  const complianceEffectiveness = ((5 - complianceScore) / 4 * 100).toFixed(0);
                  const effectivenessPercent = ((5 - effectivenessScore) / 4 * 100).toFixed(0);

                  // Classify inherent risk
                  const inherentRiskLevel = inherentRisk < 1.5 ? 'low' : inherentRisk < 2.5 ? 'moderate' : inherentRisk < 3.5 ? 'high' : 'very high';

                  // Classify control scores
                  const complianceLevel = complianceScore < 1.5 ? 'strong' : complianceScore < 2.5 ? 'adequate' : 'weak';
                  const effectivenessLevel = effectivenessScore < 1.5 ? 'strong' : effectivenessScore < 2.5 ? 'adequate' : 'weak';

                  // Classify maturity level
                  const maturityLevel = maturityScore < 1.5 ? 'initial' : maturityScore < 2.5 ? 'developing' : maturityScore < 3.5 ? 'defined' : maturityScore < 4.5 ? 'managed' : 'optimized';
                  const maturityText = maturityScore > 0 ? ` The institutional maturity is at the ${maturityLevel} stage (${maturityScore.toFixed(2)}/5.0), ${maturityScore < 2.5 ? 'indicating that processes require standardization and documentation' : maturityScore < 3.5 ? 'indicating standardized processes are in place' : maturityScore < 4.5 ? 'indicating well-monitored and measured processes' : 'indicating optimized processes with continuous improvement'}.` : '';

                  if (riskRating === 'High') {
                    if (complianceScore >= 2.5 || effectivenessScore >= 2.5) {
                      return `CRITICAL ASSESSMENT: The firm's residual risk is classified as HIGH (${residualRisk.toFixed(2)}/5.0). Significant control deficiencies exist with ${complianceLevel} compliance (score: ${complianceScore.toFixed(2)}/5.0, ${complianceEffectiveness}% effective) and ${effectivenessLevel} operational effectiveness (score: ${effectivenessScore.toFixed(2)}/5.0, ${effectivenessPercent}% effective).${maturityText} Critical control gaps prevent effective risk mitigation. Immediate remediation with senior management oversight, Enhanced Due Diligence (EDD) procedures, and comprehensive control strengthening are required.`;
                    } else {
                      return `HIGH RISK ASSESSMENT: The firm faces HIGH residual risk (${residualRisk.toFixed(2)}/5.0) primarily due to significant inherent risk exposure (${inherentRisk.toFixed(2)}/5.0 - ${inherentRiskLevel}). Despite ${complianceLevel} controls (${complianceEffectiveness}% compliance, ${effectivenessPercent}% effectiveness), the nature and extent of risk exposures require Enhanced Due Diligence (EDD) procedures, enhanced monitoring, and senior management oversight for all high-risk activities.${maturityText}`;
                    }
                  } else if (riskRating === 'Moderate') {
                    return `MODERATE RISK ASSESSMENT: The firm's residual risk is classified as MODERATE (${residualRisk.toFixed(2)}/5.0). The inherent risk exposure is ${inherentRiskLevel} (${inherentRisk.toFixed(2)}/5.0), with ${complianceLevel} control compliance (${complianceEffectiveness}% effective) and ${effectivenessLevel} operational effectiveness (${effectivenessPercent}% effective).${maturityText} Enhanced review procedures are recommended for high-risk clients and transactions. ${complianceScore >= 2.5 ? 'Strengthening control implementation would further reduce risk exposure.' : 'Continue monitoring and periodic review of controls.'}`;
                  } else {
                    return `LOW RISK ASSESSMENT: The firm's residual risk is classified as LOW (${residualRisk.toFixed(2)}/5.0). ${inherentRisk >= 2.5 ? `Although inherent risk exposure is ${inherentRiskLevel} (${inherentRisk.toFixed(2)}/5.0), comprehensive controls (${complianceEffectiveness}% compliance, ${effectivenessPercent}% effectiveness) effectively mitigate risk.` : `The firm has ${inherentRiskLevel} inherent risk exposure (${inherentRisk.toFixed(2)}/5.0) with ${complianceLevel} controls in place (${complianceEffectiveness}% compliance, ${effectivenessPercent}% effectiveness).`}${maturityText} Standard monitoring procedures are appropriate. Continue regular assessment and maintain control effectiveness.`;
                  }
                })()}
              </p>
            </div>

            {/* Red Flags Section - if any critical control gaps */}
            {(assessment.module_2_score >= 2.5 || assessment.module_3_score >= 2.5) && (
              <div style={{
                ...styles.maturityInfoBox,
                marginBottom: '20px',
                background: '#fef2f2',
                border: '2px solid #fca5a5'
              }} className="print-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <h4 style={{margin: 0, fontSize: '16px', fontWeight: '600', color: '#dc2626'}}>
                    Critical Control Deficiencies Identified
                  </h4>
                </div>
                <p style={{margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.6', color: '#991b1b'}}>
                  The assessment has identified critical deficiencies in the AML/CFT control framework:
                </p>
                <ul style={{margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#991b1b', lineHeight: '1.6'}}>
                  {assessment.module_2_score >= 2.5 && (
                    <li style={{marginBottom: '8px'}}>
                      <strong>Control Implementation:</strong> Risk score of {assessment.module_2_score.toFixed(2)}/5.0 indicates significant control gaps. Critical policies, procedures, or documentation are missing or inadequate.
                    </li>
                  )}
                  {assessment.module_3_score >= 2.5 && (
                    <li style={{marginBottom: '8px'}}>
                      <strong>Operational Effectiveness:</strong> Risk score of {assessment.module_3_score.toFixed(2)}/5.0 indicates controls are not operating as intended or achieving their risk mitigation objectives.
                    </li>
                  )}
                  <li style={{marginBottom: '8px'}}>
                    <strong>Enhanced Due Diligence Required:</strong> Due to these HIGH risk scores (≥ 2.5), Enhanced Due Diligence procedures and senior management sign-off are required.
                  </li>
                </ul>
                <p style={{margin: '12px 0 0 0', fontSize: '14px', fontWeight: '600', color: '#991b1b'}}>
                  Immediate action required: Remediate control gaps, implement missing controls, and enhance monitoring before resuming high-risk activities.
                </p>
              </div>
            )}
          </section>
        )}

        <section style={styles.section} className="print-section">
          <h2 style={styles.sectionTitle}>Section Risk Breakdown</h2>
          <div style={styles.maturityInfoBox} className="print-card">
            <p style={styles.maturityInfoText}>
              <strong>Assessment Framework:</strong> Each section is evaluated across two dimensions:
              <span style={styles.maturityInfoItem}>
                <strong style={{color: '#667eea'}}>Technical Compliance</strong> - Measures the existence and documentation of AML/CFT policies, procedures, and controls.
              </span>
              <span style={styles.maturityInfoItem}>
                <strong style={{color: '#10b981'}}>Effectiveness</strong> - Assesses how well policies, procedures, and controls operate in practice and achieve their intended purpose.
              </span>
            </p>
          </div>
          <div style={styles.scoreGrid} className="print-grid">
            {sectionScores.map((score) => {
              const section = assessmentSections.find(s => s.code === score.section_code);
              const technicalScore = (score.technical_compliance_score || 0);
              const effectivenessScore = (score.effectiveness_score || 0);

              const isModule1 = score.section_code.startsWith('1');
              const isModule2 = score.section_code.startsWith('2');
              const isModule3 = score.section_code.startsWith('3');

              return (
                <div key={score.id} style={styles.scoreCard} className="print-card">
                  <div style={styles.scoreHeader}>
                    <span style={styles.sectionCode}>{score.section_code}</span>
                    <span style={{
                      ...styles.scoreBadge,
                      background: getRiskColor(score.risk_level) + '20',
                      color: getRiskColor(score.risk_level)
                    }}>
                      {getRiskLabel(score.risk_level)}
                    </span>
                  </div>
                  <h4 style={styles.scoreTitle}>{score.section_name}</h4>
                  <div style={styles.scoreProgress}>
                    <div style={{
                      ...styles.scoreProgressFill,
                      width: `${(score.answered_questions / score.total_questions) * 100}%`,
                      background: getRiskColor(score.risk_level)
                    }} />
                  </div>
                  <p style={styles.scoreText}>
                    {score.answered_questions} / {score.total_questions} questions answered
                  </p>

                  {(isModule2 || isModule3) && (
                    <div style={styles.maturityScoresBox}>
                      {isModule2 && (
                        <>
                          <div style={styles.maturityScoreItem}>
                            <span style={{...styles.maturityScoreLabel, color: '#667eea'}}>Technical</span>
                            <span style={{...styles.maturityScoreValue, color: '#667eea'}}>
                              {technicalScore.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                      {isModule3 && (
                        <>
                          <div style={styles.maturityScoreItem}>
                            <span style={{...styles.maturityScoreLabel, color: '#10b981'}}>Effectiveness</span>
                            <span style={{...styles.maturityScoreValue, color: '#10b981'}}>
                              {effectivenessScore.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <p style={styles.scoreValue}>Risk Score: {score.risk_score ? `${score.risk_score.toFixed(2)} / 5.0` : 'N/A'}</p>
                  {score.risk_score && (
                    <p style={{
                      ...styles.scoreText,
                      color: requiresEDD(score.risk_score) ? '#dc2626' : '#059669',
                      fontWeight: '600',
                      marginTop: '8px'
                    }}>
                      {getRequiredAction(score.risk_score)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).length > 0 && (
          <section style={{...styles.section, background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '8px'}} className="print-section">
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h2 style={{...styles.sectionTitle, color: '#dc2626', margin: 0}}>
                Enhanced Due Diligence Required
              </h2>
            </div>
            <p style={{fontSize: '14px', color: '#991b1b', marginBottom: '16px'}}>
              The following areas have HIGH risk ratings (≥ 2.5/5.0) and require Enhanced Due Diligence (EDD) procedures with senior management sign-off:
            </p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {sectionScores.filter(s => s.risk_score && requiresEDD(s.risk_score)).map(score => (
                <div key={score.id} style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                    <div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <span style={{
                          ...styles.sectionCode,
                          background: '#dc2626',
                          color: 'white'
                        }}>
                          {score.section_code}
                        </span>
                        <h4 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>
                          {score.section_name}
                        </h4>
                      </div>
                      <p style={{margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280'}}>
                        Risk Score: {score.risk_score ? `${score.risk_score.toFixed(1)} / 5.0` : 'N/A'}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      background: '#dc2626',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      EDD REQUIRED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={styles.section} className="print-section">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Remediation Actions</h2>
            <button
              onClick={() => setShowAddRemediation(!showAddRemediation)}
              style={styles.primaryButton}
            >
              {showAddRemediation ? 'Cancel' : '+ Add Action'}
            </button>
          </div>

          {showAddRemediation && (
            <form onSubmit={addRemediationAction} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Section</label>
                  <select
                    value={newRemediation.section_code}
                    onChange={(e) => setNewRemediation({ ...newRemediation, section_code: e.target.value })}
                    style={styles.select}
                    required
                  >
                    <option value="">Select section</option>
                    {assessmentSections.map(section => (
                      <option key={section.code} value={section.code}>
                        {section.code} - {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    value={newRemediation.priority}
                    onChange={(e) => setNewRemediation({ ...newRemediation, priority: e.target.value })}
                    style={styles.select}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Weakness Description</label>
                  <textarea
                    value={newRemediation.weakness_description}
                    onChange={(e) => setNewRemediation({ ...newRemediation, weakness_description: e.target.value })}
                    style={styles.textarea}
                    required
                  />
                </div>

                <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Mitigation Measure</label>
                  <textarea
                    value={newRemediation.mitigation_measure}
                    onChange={(e) => setNewRemediation({ ...newRemediation, mitigation_measure: e.target.value })}
                    style={styles.textarea}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Responsible Party</label>
                  <input
                    type="text"
                    value={newRemediation.responsible_party}
                    onChange={(e) => setNewRemediation({ ...newRemediation, responsible_party: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Target Date</label>
                  <input
                    type="date"
                    value={newRemediation.target_date}
                    onChange={(e) => setNewRemediation({ ...newRemediation, target_date: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <button type="submit" style={styles.submitButton}>
                Add Remediation Action
              </button>
            </form>
          )}

          <div style={styles.remediationList}>
            {remediationActions.length === 0 ? (
              <p style={styles.emptyState}>No remediation actions recorded yet.</p>
            ) : (
              remediationActions.map((action) => (
                <div key={action.id} style={styles.remediationCard} className="print-card">
                  <div style={styles.remediationHeader}>
                    <span style={styles.sectionBadge}>Section {action.section_code}</span>
                    <span style={{
                      ...styles.priorityBadge,
                      background: action.priority === 'high' ? '#fee2e2' : action.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                      color: action.priority === 'high' ? '#991b1b' : action.priority === 'medium' ? '#92400e' : '#1e40af'
                    }}>
                      {action.priority} priority
                    </span>
                  </div>

                  <h4 style={styles.remediationTitle}>Weakness</h4>
                  <p style={styles.remediationText}>{action.weakness_description}</p>

                  <h4 style={styles.remediationTitle}>Mitigation Measure</h4>
                  <p style={styles.remediationText}>{action.mitigation_measure}</p>

                  <div style={styles.remediationFooter}>
                    <div>
                      <p style={styles.remediationMeta}>
                        <strong>Responsible:</strong> {action.responsible_party}
                      </p>
                      {action.target_date && (
                        <p style={styles.remediationMeta}>
                          <strong>Target:</strong> {new Date(action.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <select
                      value={action.status}
                      onChange={(e) => updateRemediationStatus(
                        action.id,
                        e.target.value,
                        e.target.value === 'completed' ? new Date().toISOString().split('T')[0] : null
                      )}
                      style={{
                        ...styles.statusSelect,
                        background: action.status === 'completed' ? '#d1fae5' : action.status === 'in_progress' ? '#fef3c7' : '#e5e7eb'
                      }}
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '32px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-end',
  },
  reportButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
    background: '#d4af37',
    color: '#0a1929',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-end',
    background: 'transparent',
    color: 'white',
    border: '2px solid #d4af37',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 24px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    marginBottom: '16px',
    marginLeft: 'auto',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '600',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  summarySection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  summaryCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  summaryLabel: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
  },
  riskBadge: {
    display: 'inline-block',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: '700',
  },
  section: {
    marginBottom: '48px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  scoreCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  scoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionCode: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#667eea',
    color: 'white',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '14px',
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scoreTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  scoreProgress: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  scoreProgressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  scoreText: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    color: '#718096',
  },
  scoreValue: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  form: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  textarea: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
  },
  submitButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  remediationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  remediationCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  remediationHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  sectionBadge: {
    padding: '4px 12px',
    background: '#eef2ff',
    color: '#667eea',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  remediationTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#2d3748',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  remediationText: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.6',
  },
  remediationFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  remediationMeta: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    color: '#718096',
  },
  statusSelect: {
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#718096',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: '16px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
    textAlign: 'center',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
  },
  infoSection: {
    marginBottom: '32px',
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  infoCard: {
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  infoLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  infoValue: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
  },
  infoSubtext: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#4a5568',
  },
  infoDescription: {
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  infoText: {
    margin: 0,
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.6',
  },
  maturityInfoBox: {
    background: '#f7fafc',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
  },
  maturityInfoText: {
    margin: 0,
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.8',
  },
  maturityInfoItem: {
    display: 'block',
    marginTop: '8px',
    paddingLeft: '16px',
  },
  maturityScoresBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    background: '#f7fafc',
    borderRadius: '8px',
    marginTop: '12px',
    marginBottom: '12px',
  },
  maturityScoreItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  maturityScoreLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  maturityScoreValue: {
    fontSize: '20px',
    fontWeight: '700',
  },
  maturityScoreDivider: {
    width: '1px',
    height: '40px',
    background: '#cbd5e0',
    margin: '0 8px',
  },
};
