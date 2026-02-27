import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, Packer } from 'docx';
import { saveAs } from 'file-saver';

export default function FIUComplianceReport({ assessment, sectionScores, responses, onClose }) {
  const [organization, setOrganization] = useState(null);
  const [riskBreakdown, setRiskBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [assessment]);

  const loadData = async () => {
    try {
      const [orgResult, breakdownResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', assessment.organization_id)
          .maybeSingle(),
        supabase
          .from('assessment_risk_breakdown')
          .select('*')
          .eq('assessment_id', assessment.id)
          .maybeSingle()
      ]);

      if (orgResult.error) throw orgResult.error;
      if (breakdownResult.error) throw breakdownResult.error;

      setOrganization(orgResult.data);
      setRiskBreakdown(breakdownResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInherentRiskScores = () => {
    if (!riskBreakdown) {
      return {
        customer: { score: 0, rating: 'Unknown', numeric: 0 },
        product: { score: 0, rating: 'Unknown', numeric: 0 },
        geographic: { score: 0, rating: 'Unknown', numeric: 0 },
        transaction: { score: 0, rating: 'Unknown', numeric: 0 },
        weightedScore: 0,
        overallRating: 'UNKNOWN'
      };
    }

    const clientScore = riskBreakdown.client_risk_score || 0;
    const productScore = riskBreakdown.product_risk_score || 0;
    const geoScore = riskBreakdown.geographic_risk_score || 0;
    const txScore = riskBreakdown.transaction_risk_score || 0;
    const irScore = riskBreakdown.inherent_risk_score || 0;

    return {
      customer: {
        score: clientScore,
        rating: riskBreakdown.client_risk_rating || 'Unknown',
        numeric: getNumericValue(riskBreakdown.client_risk_rating || 'Moderate')
      },
      product: {
        score: productScore,
        rating: riskBreakdown.product_risk_rating || 'Unknown',
        numeric: getNumericValue(riskBreakdown.product_risk_rating || 'Moderate')
      },
      geographic: {
        score: geoScore,
        rating: riskBreakdown.geographic_risk_rating || 'Unknown',
        numeric: getNumericValue(riskBreakdown.geographic_risk_rating || 'Moderate')
      },
      transaction: {
        score: txScore,
        rating: riskBreakdown.transaction_risk_rating || 'Unknown',
        numeric: getNumericValue(riskBreakdown.transaction_risk_rating || 'Moderate')
      },
      weightedScore: irScore,
      overallRating: getRating(irScore).toUpperCase()
    };
  };

  const getRating = (score) => {
    if (score < 1.5) return 'Low';
    if (score < 2.5) return 'Moderate';
    return 'High';
  };

  const getNumericValue = (rating) => {
    if (rating === 'Low') return 1;
    if (rating === 'Moderate') return 2;
    return 3;
  };

  const getOverallRating = (weightedScore) => {
    if (weightedScore < 1.5) return 'LOW';
    if (weightedScore < 2.5) return 'MODERATE';
    return 'HIGH';
  };

  const getTechnicalComplianceRating = () => {
    const module2Score = assessment.module_2_score || 0;
    if (module2Score < 1.5) return 'Compliant';
    if (module2Score < 2.5) return 'Partially Compliant';
    return 'Non-Compliant';
  };

  const getEffectivenessRating = () => {
    const module3Score = assessment.module_3_score || 0;
    if (module3Score < 1.5) return 'Effective';
    if (module3Score < 2.5) return 'Partially Effective';
    return 'Ineffective';
  };

  const getMaturityRating = () => {
    const module4Score = assessment.module_4_score || 0;
    if (module4Score < 1.5) return 'Initial';
    if (module4Score < 2.5) return 'Developing';
    if (module4Score < 3.5) return 'Defined';
    if (module4Score < 4.5) return 'Managed';
    return 'Optimized';
  };

  const getMaturityDescription = (rating) => {
    const descriptions = {
      'Initial': 'Ad-hoc and reactive processes with minimal documentation',
      'Developing': 'Basic processes exist but inconsistently applied',
      'Defined': 'Documented and standardized processes consistently followed',
      'Managed': 'Processes are monitored, measured, and controlled',
      'Optimized': 'Continuous improvement with proactive risk management'
    };
    return descriptions[rating] || 'Unknown maturity level';
  };

  const getResidualRisk = () => {
    if (!riskBreakdown) return { rating: 'UNKNOWN', formula: '' };

    const finalScore = riskBreakdown.residual_risk_score || 0;
    const ce = riskBreakdown.control_effectiveness || 0;
    const ir = riskBreakdown.inherent_risk_score || 0;

    const rating = classify_risk_rating(finalScore);
    const formula = `RR = IR × (1 - CE) = ${ir.toFixed(2)} × (1 - ${ce.toFixed(3)}) = ${finalScore.toFixed(2)}`;

    return {
      rating: rating.toUpperCase(),
      formula,
      finalScore
    };
  };

  const classify_risk_rating = (score) => {
    if (score < 1.5) return 'Low';
    if (score < 2.5) return 'Moderate';
    if (score < 3.5) return 'High';
    return 'Very High';
  };

  const generateCustomerNarrative = (rating) => {
    // Extract Module 1A responses (Products & Services for banks and financial institutions)
    const module1AResponses = responses.filter(r => r.question_code?.startsWith('1A.'));

    if (module1AResponses.length === 0) {
      return `Customer inherent risk is assessed as ${rating}. No specific service-related risk factors were identified during the assessment.`;
    }

    const highRiskServices = [];
    const partialRiskServices = [];
    const noRiskServices = [];

    module1AResponses.forEach(r => {
      const response = r.response?.toLowerCase();
      if (response === 'yes') highRiskServices.push(r);
      else if (response === 'partially' || response === 'partial') partialRiskServices.push(r);
      else if (response === 'no') noRiskServices.push(r);
    });

    let narrative = `Customer inherent risk is assessed as ${rating}. `;

    if (highRiskServices.length > 0) {
      const examples = highRiskServices.slice(0, 3).map(r => {
        const text = r.question_text || '';
        return text.replace(/^Does the (firm|institution) (assist clients in |assist in |provide |act as |create, operate, or manage )?/i, '').replace(/\?$/, '');
      }).join('; ');
      narrative += `The assessment confirms the firm provides the following higher-risk services: ${examples}. These service offerings involve handling client funds, creating legal structures, or facilitating transactions that present elevated money laundering and terrorist financing risks. `;
    }

    if (partialRiskServices.length > 0) {
      narrative += `The firm has partial or limited exposure to ${partialRiskServices.length} additional service area${partialRiskServices.length > 1 ? 's' : ''}, requiring case-by-case assessment. `;
    }

    if (noRiskServices.length >= module1AResponses.length * 0.6) {
      narrative += `The firm does not provide ${noRiskServices.length} of the assessed higher-risk services, which reduces overall inherent risk exposure.`;
    } else if (highRiskServices.length + partialRiskServices.length > 0) {
      narrative += `These service exposures collectively contribute to the ${rating} customer inherent risk profile and require risk-based customer due diligence, enhanced monitoring, and appropriate controls.`;
    }

    return narrative;
  };

  const generateProductNarrative = (rating) => {
    // Extract Module 1B responses specifically (Customer Profile for banks and financial institutions framework)
    const module1BResponses = responses.filter(r => r.question_code?.startsWith('1B.'));

    if (module1BResponses.length === 0) {
      return `Product and service inherent risk is assessed as ${rating}. The assessment did not identify specific client profile risk exposures.`;
    }

    const clientRiskExposures = module1BResponses.filter(r => r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially');

    let narrative = `Product and service inherent risk is assessed as ${rating}. `;

    if (clientRiskExposures.length > 0) {
      const clientTypes = clientRiskExposures.slice(0, 4).map(r => {
        const text = r.question_text || '';
        return text.replace(/^Does the (firm|institution) (serve |assist )?/i, '').replace(/\?$/, '');
      }).join('; ');

      narrative += `The assessment identified the following client profile risk characteristics: ${clientTypes}. These client types present elevated inherent risk due to their complexity, geographic factors, sector exposure, or potential links to higher-risk activities. `;

      const pepsExposure = module1BResponses.find(r => r.question_text?.toLowerCase().includes('politically exposed') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
      const foreignExposure = module1BResponses.find(r => (r.question_text?.toLowerCase().includes('non-resident') || r.question_text?.toLowerCase().includes('foreign')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));

      if (pepsExposure || foreignExposure) {
        narrative += `The firm's exposure to politically exposed persons and/or foreign clients requires enhanced due diligence procedures. `;
      }
    } else {
      narrative += `The firm serves predominantly low-risk domestic clients with transparent ownership structures and verifiable sources of funds. `;
    }

    narrative += `The ${rating} risk rating requires proportionate client acceptance, due diligence, and ongoing monitoring procedures.`;

    return narrative;
  };

  const generateGeographicNarrative = (rating) => {
    // Extract Module 1D responses (Geographic risk for banks and financial institutions)
    const module1DResponses = responses.filter(r => r.question_code?.startsWith('1D.'));

    if (module1DResponses.length === 0) {
      return `Geographic inherent risk is assessed as ${rating}. No significant geographic or jurisdictional risk exposures were identified.`;
    }

    const geographicRiskFactors = module1DResponses.filter(r => r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially');

    let narrative = `Geographic inherent risk is assessed as ${rating}. `;

    if (geographicRiskFactors.length > 0) {
      const factors = geographicRiskFactors.slice(0, 4).map(r => {
        const text = r.question_text || '';
        return text.replace(/^Does the (firm|institution) (engage in |deal with |rely on |provide services )?/i, '').replace(/\?$/, '');
      }).join('; ');

      narrative += `The assessment identified the following geographic and cross-border risk factors: ${factors}. These exposures involve jurisdictions with varying AML/CFT regulatory standards, potential sanctions risks, or regions with weak enforcement and high informality. `;

      const sanctionedJurisdictions = module1DResponses.find(r => (r.question_text?.toLowerCase().includes('sanction') || r.question_text?.toLowerCase().includes('fatf')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
      const crossBorder = module1DResponses.find(r => r.question_text?.toLowerCase().includes('cross-border') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));

      if (sanctionedJurisdictions) {
        narrative += `The firm's exposure to sanctioned or FATF-monitored jurisdictions requires enhanced screening, compliance procedures, and source-of-funds verification. `;
      } else if (crossBorder) {
        narrative += `Cross-border activities require enhanced due diligence and monitoring of correspondent relationships. `;
      }
    } else {
      narrative += `The firm operates primarily within domestic jurisdiction with limited cross-border exposure, minimizing geographic and jurisdictional risk factors. `;
    }

    narrative += `The ${rating} risk rating requires appropriate geographic risk assessment and jurisdiction-specific controls.`;

    return narrative;
  };

  const generateTransactionNarrative = (rating) => {
    // Extract Module 1C responses (Transaction & Structural risk for banks and financial institutions)
    const module1CResponses = responses.filter(r => r.question_code?.startsWith('1C.'));

    if (module1CResponses.length === 0) {
      return `Transaction and delivery channel inherent risk is assessed as ${rating}. No specific transaction or structural risk factors were documented.`;
    }

    const transactionRiskFactors = module1CResponses.filter(r => r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially');

    let narrative = `Transaction and delivery channel inherent risk is assessed as ${rating}. `;

    if (transactionRiskFactors.length > 0) {
      const factors = transactionRiskFactors.slice(0, 4).map(r => {
        const text = r.question_text || '';
        return text.replace(/^Does the (firm|institution) (facilitate |encounter |assist in )?/i, '').replace(/\?$/, '');
      }).join('; ');

      narrative += `The assessment identified the following transaction and structural risk characteristics: ${factors}. These factors involve transaction complexity, value, velocity, unusual payment patterns, or beneficial ownership arrangements that may obscure the source, ownership, or ultimate purpose of funds. `;

      const largeValueTransactions = module1CResponses.find(r => r.question_text?.toLowerCase().includes('large-value') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
      const complexStructures = module1CResponses.find(r => (r.question_text?.toLowerCase().includes('complex') || r.question_text?.toLowerCase().includes('third-party')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
      const rapidMovement = module1CResponses.find(r => r.question_text?.toLowerCase().includes('rapid movement') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));

      if (largeValueTransactions || rapidMovement) {
        narrative += `The presence of large-value or rapidly moving transactions requires enhanced transaction monitoring and source-of-funds verification. `;
      } else if (complexStructures) {
        narrative += `Complex beneficial ownership arrangements require enhanced scrutiny and beneficial ownership verification procedures. `;
      }
    } else {
      narrative += `The firm's transaction profile is characterized by straightforward, transparent transactions with clear commercial rationale and verifiable counterparties. `;
    }

    narrative += `The ${rating} risk rating requires appropriate transaction monitoring, record-keeping, and customer due diligence measures.`;

    return narrative;
  };

  const generateTechnicalComplianceNarrative = (rating) => {
    // Extract Module 2 responses (Technical Compliance)
    const module2Responses = responses.filter(r => r.question_code?.startsWith('2'));

    if (module2Responses.length === 0) {
      return `The technical compliance assessment indicates that the institution is ${rating}, based on the presence and documentation of AML/CFT/CPF governance arrangements, customer due diligence procedures, transaction monitoring and reporting processes, sanctions controls, record-keeping, and staff training.`;
    }

    const fullyCompliant = module2Responses.filter(r => r.response === 'Fully implemented & documented');
    const partiallyCompliant = module2Responses.filter(r => r.response === 'Partially implemented');
    const nonCompliant = module2Responses.filter(r => r.response === 'Not in place');
    const total = module2Responses.length;

    let narrative = `The technical compliance assessment indicates that the institution is ${rating}.\n\n`;

    // Summary statistics
    narrative += `ASSESSMENT SUMMARY:\n`;
    narrative += `• ${fullyCompliant.length} of ${total} controls fully implemented (${Math.round(fullyCompliant.length/total*100)}%)\n`;
    narrative += `• ${partiallyCompliant.length} partially implemented (${Math.round(partiallyCompliant.length/total*100)}%)\n`;
    narrative += `• ${nonCompliant.length} not in place (${Math.round(nonCompliant.length/total*100)}%)\n\n`;

    // Show top 5 critical gaps
    if (nonCompliant.length > 0) {
      narrative += `CRITICAL GAPS (Not in Place):\n`;
      const topGaps = nonCompliant.slice(0, 5);
      topGaps.forEach((r, index) => {
        const cleanText = r.question_text?.replace(/\?$/, '') || '';
        narrative += `${index + 1}. ${cleanText}\n`;
      });
      if (nonCompliant.length > 5) {
        narrative += `...and ${nonCompliant.length - 5} additional critical gaps.\n`;
      }
      narrative += `\n`;
    }

    // Show top 5 partial implementations
    if (partiallyCompliant.length > 0) {
      narrative += `PARTIAL IMPLEMENTATIONS (Requiring Strengthening):\n`;
      const topPartial = partiallyCompliant.slice(0, 5);
      topPartial.forEach((r, index) => {
        const cleanText = r.question_text?.replace(/\?$/, '') || '';
        narrative += `${index + 1}. ${cleanText}\n`;
      });
      if (partiallyCompliant.length > 5) {
        narrative += `...and ${partiallyCompliant.length - 5} additional areas requiring strengthening.\n`;
      }
      narrative += `\n`;
    }

    // Concise overall assessment
    narrative += `OVERALL ASSESSMENT:\n`;
    if (fullyCompliant.length >= total * 0.75) {
      narrative += `The firm has established comprehensive AML/CFT/CPF controls. Address remaining deficiencies to achieve full compliance.`;
    } else if (fullyCompliant.length >= total * 0.5) {
      narrative += `Foundational controls exist but require significant strengthening. Priority: address critical gaps and complete partial implementations.`;
    } else {
      narrative += `Substantial control development required. Immediate action needed: establish comprehensive compliance program and remediate critical gaps.`;
    }

    return narrative;
  };

  const generateActionPlan = () => {
    const module2Responses = responses.filter(r => r.question_code?.startsWith('2'));
    const module3Responses = responses.filter(r => r.question_code?.startsWith('3'));

    const criticalGaps = module2Responses.filter(r => r.response === 'Not in place');
    const partialImplementations = module2Responses.filter(r => r.response === 'Partially implemented');
    const ineffectiveAreas = module3Responses.filter(r => r.response === 'Ineffective');
    const weakAreas = module3Responses.filter(r => r.response === 'Weak');

    const actionItems = [];

    criticalGaps.forEach(gap => {
      const questionText = gap.question_text || '';
      let action = '';
      let category = 'General Compliance';
      let timeline = 'Immediate (0-3 months)';

      if (questionText.includes('compliance officer')) {
        action = 'Appoint a designated AML/CFT Compliance Officer with defined responsibilities, authority, and reporting lines to senior management.';
        category = 'Governance & Leadership';
      } else if (questionText.includes('risk assessment')) {
        action = 'Conduct and document a comprehensive ML/TF/PF risk assessment covering all business activities, client types, and service delivery channels.';
        category = 'Risk Assessment';
      } else if (questionText.includes('policies') || questionText.includes('approved')) {
        action = 'Develop and obtain senior management approval for comprehensive AML/CFT/CPF policies and procedures.';
        category = 'Governance & Leadership';
      } else if (questionText.includes('customer due diligence') || questionText.includes('CDD') || questionText.includes('identification')) {
        action = 'Establish and document comprehensive Customer Due Diligence (CDD) procedures including client identification and verification requirements.';
        category = 'Customer Due Diligence';
      } else if (questionText.includes('beneficial ownership')) {
        action = 'Implement procedures to identify and verify beneficial ownership for all legal entity clients.';
        category = 'Customer Due Diligence';
      } else if (questionText.includes('PEP')) {
        action = 'Develop PEP identification and enhanced due diligence procedures with senior management approval requirements.';
        category = 'Customer Due Diligence';
      } else if (questionText.includes('enhanced due diligence') || questionText.includes('EDD')) {
        action = 'Document and implement risk-based Enhanced Due Diligence (EDD) procedures for high-risk clients and transactions.';
        category = 'Customer Due Diligence';
      } else if (questionText.includes('source of funds') || questionText.includes('source-of-wealth')) {
        action = 'Establish procedures for verifying source of funds and source of wealth, particularly for high-risk matters.';
        category = 'Customer Due Diligence';
      } else if (questionText.includes('ongoing monitoring')) {
        action = 'Implement ongoing transaction monitoring procedures to detect unusual or suspicious activity.';
        category = 'Transaction Monitoring';
      } else if (questionText.includes('STR') || questionText.includes('suspicious')) {
        action = 'Develop and document STR reporting procedures including identification criteria, escalation process, and reporting timelines.';
        category = 'Reporting & Compliance';
      } else if (questionText.includes('internal reporting')) {
        action = 'Establish internal reporting mechanisms for staff to escalate suspicious activity to the Compliance Officer.';
        category = 'Reporting & Compliance';
      } else if (questionText.includes('tipping-off')) {
        action = 'Document tipping-off prohibitions and ensure all staff understand confidentiality requirements.';
        category = 'Reporting & Compliance';
      } else if (questionText.includes('sanctions screening')) {
        action = 'Implement sanctions screening procedures for all clients against UN, OFAC, and relevant sanctions lists.';
        category = 'Sanctions Compliance';
      } else if (questionText.includes('asset-freezing')) {
        action = 'Establish procedures for immediate asset freezing when sanctions matches are identified.';
        category = 'Sanctions Compliance';
      } else if (questionText.includes('record retention') || questionText.includes('records')) {
        action = 'Implement record retention procedures ensuring all AML/CFT records are retained for at least 10 years as required by law.';
        category = 'Record Keeping';
      } else if (questionText.includes('training')) {
        action = 'Develop and deliver comprehensive AML/CFT training program including induction training and annual refresher courses.';
        category = 'Training & Awareness';
      } else if (questionText.includes('vetting')) {
        action = 'Implement staff vetting procedures for all employees with access to client information or AML/CFT responsibilities.';
        category = 'Human Resources';
      } else if (questionText.includes('risk-rated') || questionText.includes('risk rating')) {
        action = 'Implement client risk rating methodology and assign risk ratings (Low/Medium/High) to all active clients.';
        category = 'Risk Assessment';
      } else {
        action = questionText.replace(/\?$/, '') + ' - Implement required controls and documentation.';
        category = 'General Compliance';
      }

      actionItems.push({ action, category, timeline, priority: 'Critical', source: 'Module 2 - Not in Place' });
    });

    partialImplementations.forEach(partial => {
      const questionText = partial.question_text || '';
      let action = 'Review and strengthen: ' + questionText.replace(/\?$/, '').toLowerCase();
      let category = 'General Compliance';
      let timeline = 'Short-term (3-6 months)';

      if (questionText.includes('risk assessment')) {
        category = 'Risk Assessment';
      } else if (questionText.includes('CDD') || questionText.includes('identification') || questionText.includes('beneficial ownership') || questionText.includes('PEP')) {
        category = 'Customer Due Diligence';
      } else if (questionText.includes('training')) {
        category = 'Training & Awareness';
      } else if (questionText.includes('record')) {
        category = 'Record Keeping';
      } else if (questionText.includes('monitoring')) {
        category = 'Transaction Monitoring';
      }

      actionItems.push({ action, category, timeline, priority: 'High', source: 'Module 2 - Partial' });
    });

    ineffectiveAreas.forEach(ineffective => {
      const questionText = ineffective.question_text || '';
      let action = 'Urgently improve operational effectiveness: ' + questionText.replace(/\?$/, '').toLowerCase();
      let category = 'Operational Effectiveness';
      let timeline = 'Immediate (0-3 months)';

      if (questionText.includes('risk assessment')) {
        category = 'Risk Assessment';
      } else if (questionText.includes('monitoring') || questionText.includes('transaction')) {
        category = 'Transaction Monitoring';
      } else if (questionText.includes('STR') || questionText.includes('suspicious')) {
        category = 'Reporting & Compliance';
      } else if (questionText.includes('sanctions')) {
        category = 'Sanctions Compliance';
      } else if (questionText.includes('management')) {
        category = 'Governance & Leadership';
      }

      actionItems.push({ action, category, timeline, priority: 'Critical', source: 'Module 3 - Ineffective' });
    });

    weakAreas.forEach(weak => {
      const questionText = weak.question_text || '';
      let action = 'Strengthen operational performance: ' + questionText.replace(/\?$/, '').toLowerCase();
      let category = 'Operational Effectiveness';
      let timeline = 'Short-term (3-6 months)';

      if (questionText.includes('risk assessment')) {
        category = 'Risk Assessment';
      } else if (questionText.includes('monitoring') || questionText.includes('transaction')) {
        category = 'Transaction Monitoring';
      } else if (questionText.includes('STR') || questionText.includes('suspicious')) {
        category = 'Reporting & Compliance';
      }

      actionItems.push({ action, category, timeline, priority: 'Medium', source: 'Module 3 - Weak' });
    });

    const groupedActions = {};
    actionItems.forEach(item => {
      if (!groupedActions[item.category]) {
        groupedActions[item.category] = [];
      }
      groupedActions[item.category].push(item);
    });

    Object.keys(groupedActions).forEach(category => {
      groupedActions[category].sort((a, b) => {
        const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });

    return { groupedActions, totalActions: actionItems.length };
  };

  const generateEffectivenessNarrative = (rating) => {
    // Extract Module 3 responses (Effectiveness)
    const module3Responses = responses.filter(r => r.question_code?.startsWith('3'));

    if (module3Responses.length === 0) {
      return `The effectiveness assessment indicates that AML/CFT/CPF controls are ${rating}, based on observed outcomes relating to risk identification, transaction monitoring performance, STR quality and timeliness, sanctions implementation, management oversight, and remediation of weaknesses.`;
    }

    const effective = module3Responses.filter(r => r.response === 'Effective');
    const weak = module3Responses.filter(r => r.response === 'Weak');
    const ineffective = module3Responses.filter(r => r.response === 'Ineffective');
    const total = module3Responses.length;

    let narrative = `The effectiveness assessment indicates that AML/CFT/CPF controls are ${rating}.\n\n`;

    // Summary statistics
    narrative += `EFFECTIVENESS SUMMARY:\n`;
    narrative += `• ${effective.length} of ${total} criteria demonstrate effective implementation (${Math.round(effective.length/total*100)}%)\n`;
    narrative += `• ${weak.length} show weak performance (${Math.round(weak.length/total*100)}%)\n`;
    narrative += `• ${ineffective.length} are ineffective (${Math.round(ineffective.length/total*100)}%)\n\n`;

    // Show top 5 ineffective areas
    if (ineffective.length > 0) {
      narrative += `INEFFECTIVE AREAS (Requiring Immediate Attention):\n`;
      const topIneffective = ineffective.slice(0, 5);
      topIneffective.forEach((r, index) => {
        const cleanText = r.question_text?.replace(/\?$/, '') || '';
        narrative += `${index + 1}. ${cleanText}\n`;
      });
      if (ineffective.length > 5) {
        narrative += `...and ${ineffective.length - 5} additional ineffective areas.\n`;
      }
      narrative += `\n`;
    }

    // Show top 5 weak areas
    if (weak.length > 0) {
      narrative += `WEAK PERFORMANCE (Requiring Strengthening):\n`;
      const topWeak = weak.slice(0, 5);
      topWeak.forEach((r, index) => {
        const cleanText = r.question_text?.replace(/\?$/, '') || '';
        narrative += `${index + 1}. ${cleanText}\n`;
      });
      if (weak.length > 5) {
        narrative += `...and ${weak.length - 5} additional weak areas.\n`;
      }
      narrative += `\n`;
    }

    // Concise overall assessment
    narrative += `OVERALL ASSESSMENT:\n`;
    if (effective.length >= total * 0.75) {
      narrative += `Controls are demonstrably effective. Address weaknesses through targeted enhancements to procedures and monitoring.`;
    } else if (effective.length >= total * 0.5) {
      narrative += `Moderate effectiveness but requires strengthening. Priority: enhance operational oversight, staff training, and quality assurance.`;
    } else {
      narrative += `Significant deficiencies - policies not consistently applied. Immediate action: improve operational performance and supervision.`;
    }

    return narrative;
  };

  const generateMaturityNarrative = (rating) => {
    // Extract Module 4 responses (Control Maturity)
    const module4Responses = responses.filter(r => r.question_code?.startsWith('4'));

    if (module4Responses.length === 0) {
      return `The institutional maturity assessment indicates that the AML/CFT compliance program is at the ${rating} stage. This evaluation measures the sophistication, integration, and evolution of the institution's risk management processes, including automation, data analytics, process optimization, and continuous improvement capabilities.`;
    }

    const optimized = module4Responses.filter(r => r.response === 'Optimized' || r.response === 'Level 5 - Optimized');
    const managed = module4Responses.filter(r => r.response === 'Managed' || r.response === 'Level 4 - Managed');
    const defined = module4Responses.filter(r => r.response === 'Defined' || r.response === 'Level 3 - Defined');
    const developing = module4Responses.filter(r => r.response === 'Developing' || r.response === 'Level 2 - Developing');
    const initial = module4Responses.filter(r => r.response === 'Initial' || r.response === 'Level 1 - Initial');
    const total = module4Responses.length;

    let narrative = `The institutional maturity assessment indicates that the AML/CFT compliance program is at the ${rating} stage.\n\n`;

    narrative += `MATURITY ASSESSMENT SUMMARY:\n`;
    narrative += `• ${optimized.length} of ${total} controls at Optimized level (${Math.round(optimized.length/total*100)}%)\n`;
    narrative += `• ${managed.length} at Managed level (${Math.round(managed.length/total*100)}%)\n`;
    narrative += `• ${defined.length} at Defined level (${Math.round(defined.length/total*100)}%)\n`;
    narrative += `• ${developing.length} at Developing level (${Math.round(developing.length/total*100)}%)\n`;
    narrative += `• ${initial.length} at Initial level (${Math.round(initial.length/total*100)}%)\n\n`;

    narrative += `MATURITY CHARACTERISTICS:\n`;
    if (rating === 'Optimized') {
      narrative += `The institution demonstrates advanced AML/CFT capabilities with continuous improvement mechanisms, predictive analytics, and proactive risk management. Controls are highly automated, integrated across business functions, and regularly optimized based on performance data.`;
    } else if (rating === 'Managed') {
      narrative += `The institution has established quantitative controls with performance monitoring and measurement. Processes are well-documented, consistently followed, and supported by management information systems. There is evidence of data-driven decision making and periodic process improvements.`;
    } else if (rating === 'Defined') {
      narrative += `The institution has documented and standardized AML/CFT processes that are consistently followed across the organization. Controls are understood by staff, but monitoring and continuous improvement mechanisms are limited. Process automation and integration opportunities exist.`;
    } else if (rating === 'Developing') {
      narrative += `Basic AML/CFT processes exist but are inconsistently applied. Documentation is incomplete, and procedures vary by department or individual. There is limited automation, and controls rely heavily on manual intervention. Systematic monitoring and measurement are absent.`;
    } else {
      narrative += `AML/CFT processes are ad-hoc and reactive. Controls lack documentation and standardization. The institution responds to issues as they arise without systematic procedures. Significant investment in process development, documentation, and training is required.`;
    }

    narrative += `\n\n`;
    narrative += `DEVELOPMENT PRIORITIES:\n`;
    if (initial.length + developing.length > total * 0.5) {
      narrative += `Priority focus: Establish documented procedures, standardize processes across the organization, invest in staff training and technology infrastructure.`;
    } else if (defined.length > total * 0.4) {
      narrative += `Priority focus: Implement performance monitoring systems, establish quality assurance mechanisms, and begin automation of routine processes.`;
    } else {
      narrative += `Priority focus: Enhance data analytics capabilities, optimize existing processes, and develop predictive risk models.`;
    }

    return narrative;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const exportToWord = async () => {
    const inherentRisks = calculateInherentRiskScores();
    const tcRating = getTechnicalComplianceRating();
    const effRating = getEffectivenessRating();
    const maturityRating = getMaturityRating();
    const residualRisk = getResidualRisk();
    const actionPlan = generateActionPlan();

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph({
            text: 'THE UNITED REPUBLIC OF TANZANIA',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: 'FINANCIAL INTELLIGENCE UNIT (FIU)',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            bold: true
          }),
          new Paragraph({
            text: 'Anti-Money Laundering, Counter-Terrorist Financing and Counter-Proliferation Financing Risk Assessment Report',
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            bold: true
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Name of Reporting Person: ', bold: true }),
              new TextRun(organization?.name || 'N/A')
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Type of Institution: ', bold: true }),
              new TextRun(assessment.dnfbp_category || 'N/A')
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Reporting Period: ', bold: true }),
              new TextRun(`${formatDate(assessment.created_at)} – ${formatDate(new Date())}`)
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date of Assessment: ', bold: true }),
              new TextRun(formatDate(assessment.created_at))
            ],
            spacing: { after: 800 }
          }),

          new Paragraph({
            text: '1. INTRODUCTION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '1.1 Overview of Business Activities',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: assessment.business_description || `${organization?.name} is a designated non-financial business and profession operating in the United Republic of Tanzania.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '1.2 Purpose of the Risk Assessment',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'This AML/CFT/CPF Risk Assessment is conducted in accordance with the Anti-Money Laundering Act, Cap. 423, and the AML/CFT Institutional Risk Assessment Guidelines issued by the Financial Intelligence Unit (FIU). The assessment applies a Risk-Based Approach to identify, assess, and understand inherent ML/TF/PF risks, the existence of AML/CFT/CPF controls, and the effectiveness of those controls in practice.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '1.3 Period and Frequency',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: `This assessment covers the period ${formatDate(assessment.created_at)} to ${formatDate(new Date())} and is conducted at least annually or when material changes occur in the institution's risk profile.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2. AML/CFT/CPF RISK ASSESSMENT METHODOLOGY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '2.1 Assessment Framework',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'The AML/CFT/CPF Risk Assessment was conducted using a structured three-module framework; Module 1 – Inherent Risk Assessment: Identification of ML/TF/PF risk exposure arising from the institution\'s business, prior to consideration of any controls. Module 2 – Technical Compliance Assessment: Evaluation of the existence and adequacy of AML/CFT/CPF controls as required by law and regulation. Module 3 – Effectiveness Assessment: Evaluation of whether AML/CFT/CPF controls operate effectively in practice and achieve intended outcomes. The results of these modules are used to determine the institution\'s residual ML/TF/PF risk.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.2 Inherent Risk Factors and Weights',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'For the purposes of assessing inherent ML/TF/PF risk, the institution\'s exposure is analysed across Customer Risk, Product and Service Risk, Geographic Risk and Transaction and Delivery Channel Risk. Each inherent risk factor is assessed independently based on the institution\'s responses to the inherent risk questionnaire and assigned a qualitative rating of Low, Moderate, or High.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'To derive an overall inherent ML/TF/PF risk rating, the inherent risk factors are weighted to reflect their relative importance, as follows:',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Inherent Risk Factor', bold: true })],
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Weight', bold: true })],
                    shading: { fill: 'D3D3D3' }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Customer Risk')] }),
                  new TableCell({ children: [new Paragraph('30%')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Product / Service Risk')] }),
                  new TableCell({ children: [new Paragraph('20%')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Geographic Risk')] }),
                  new TableCell({ children: [new Paragraph('25%')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Transaction & Delivery Channel Risk')] }),
                  new TableCell({ children: [new Paragraph('25%')] })
                ]
              })
            ]
          }),

          new Paragraph({
            text: 'The overall inherent ML/TF/PF risk rating represents the consolidated outcome of applying these weights to the institution\'s inherent risk profile before consideration of any AML/CFT/CPF controls.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 200, after: 400 }
          }),

          new Paragraph({
            text: '2.3 Scoring and Rating Methodology',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'For scoring purposes, qualitative inherent risk ratings are mapped to numeric values as follows: Low = 1, Moderate = 2, High = 3. The weighted inherent risk score is calculated by applying the weights set out in Section 2.2 above. The resulting score is translated into an overall inherent ML/TF/PF risk rating as follows: Low: ≤ 1.5, Moderate: 1.6 – 2.3, High: ≥ 2.4',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.4 Inherent ML/TF/PF Risk Assessment Results',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: '(Results of Module 1 – Risk exposure before controls)',
            italics: true,
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: '2.4.1 Customer Inherent Risk',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Risk Category Explanation',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Assesses exposure arising from customer types, ownership structures, political exposure, sectoral risk, and customer behaviour.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1A responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateCustomerNarrative(inherentRisks.customer.rating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Customer Inherent Risk Rating: ', bold: true }),
              new TextRun({ text: inherentRisks.customer.rating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.4.2 Product / Service Inherent Risk',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Risk Category Explanation',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Assesses exposure arising from the nature and complexity of products and services offered.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1B responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateProductNarrative(inherentRisks.product.rating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Product / Service Inherent Risk Rating: ', bold: true }),
              new TextRun({ text: inherentRisks.product.rating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.4.3 Geographic Inherent Risk',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Risk Category Explanation',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Assesses exposure arising from cross-border activities and links to higher-risk jurisdictions.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1C responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateGeographicNarrative(inherentRisks.geographic.rating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Geographic Inherent Risk Rating: ', bold: true }),
              new TextRun({ text: inherentRisks.geographic.rating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.4.4 Transaction & Delivery Channel Inherent Risk',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Risk Category Explanation',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Assesses exposure arising from transaction size, volume, patterns, and delivery channels.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1D responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateTransactionNarrative(inherentRisks.transaction.rating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Transaction & Delivery Channel Inherent Risk Rating: ', bold: true }),
              new TextRun({ text: inherentRisks.transaction.rating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.4.5 Overall Inherent ML/TF/PF Risk',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Risk Factor', bold: true })],
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Rating', bold: true })],
                    shading: { fill: 'D3D3D3' }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Customer Risk')] }),
                  new TableCell({ children: [new Paragraph(inherentRisks.customer.rating)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Product / Service Risk')] }),
                  new TableCell({ children: [new Paragraph(inherentRisks.product.rating)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Geographic Risk')] }),
                  new TableCell({ children: [new Paragraph(inherentRisks.geographic.rating)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Transaction & Delivery Channel Risk')] }),
                  new TableCell({ children: [new Paragraph(inherentRisks.transaction.rating)] })
                ]
              })
            ]
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '\n\nOverall Inherent ML/TF/PF Risk: ', bold: true }),
              new TextRun({ text: inherentRisks.overallRating, bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.5 Technical Compliance Assessment',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'This section assesses whether the institution has established and documented AML/CFT/CPF controls as required by law and regulation. It evaluates the existence and adequacy of policies, procedures, systems, governance arrangements, and training.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '2.5.1 Technical Compliance Assessment Results',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 2 responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateTechnicalComplianceNarrative(tcRating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Overall Technical Compliance Rating: ', bold: true }),
              new TextRun({ text: tcRating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.6 Effectiveness Assessment',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'This section evaluates whether AML/CFT/CPF controls operate effectively in practice and achieve intended outcomes. It focuses on quality, consistency, timeliness, and learning, including whether risks are identified and acted upon, suspicious activity is reported appropriately, sanctions are implemented promptly, and identified weaknesses are remediated.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '2.6.1 Effectiveness Assessment Results',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 3 responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateEffectivenessNarrative(effRating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Overall Effectiveness Rating: ', bold: true }),
              new TextRun({ text: effRating.toUpperCase(), bold: true })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '2.7 Institutional Maturity Assessment (Module 4)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'This section evaluates the sophistication and maturity of the institution\'s AML/CFT compliance program. It assesses the level of process standardization, automation, integration, performance monitoring, and continuous improvement. The maturity model ranges from Initial (Level 1) to Optimized (Level 5).',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '2.7.1 Maturity Assessment Results',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 4 responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateMaturityNarrative(maturityRating),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Overall Institutional Maturity Level: ', bold: true }),
              new TextRun({ text: maturityRating.toUpperCase(), bold: true }),
              new TextRun({ text: ` (${getMaturityDescription(maturityRating)})` })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Maturity Score: ', bold: true }),
              new TextRun({ text: `${(assessment.module_4_score || 0).toFixed(2)} / 5.00` })
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '3. RESIDUAL ML/TF/PF RISK ASSESSMENT',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'Residual risk is determined by combining: inherent risk exposure (Module 1), technical compliance (Module 2), effectiveness of controls (Module 3), and institutional maturity (Module 4). The maturity level influences the institution\'s ability to detect, prevent, and respond to ML/TF/PF risks.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Overall Residual ML/TF/PF Risk: ', bold: true }),
              new TextRun({ text: residualRisk.rating, bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'FATF Risk Calculation:',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: residualRisk.formula,
            alignment: AlignmentType.LEFT,
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: '4. RISK MITIGATION MEASURES AND ACTION PLAN',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '(Auto-generated from gaps identified in Modules 2 and 3)',
            italics: true,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 }
          }),

          new Paragraph({
            text: '4.1 Overview',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: `Based on the assessment findings, ${actionPlan.totalActions} specific remediation actions have been identified across multiple compliance areas. These actions are organized by functional category and prioritized according to urgency and risk impact. Each action includes specific implementation timelines aligned with regulatory expectations and best practices.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 }
          }),

          new Paragraph({
            text: '4.2 Priority Classification Framework',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Priority Level', bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: 'Implementation Timeline', bold: true })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: 'Description', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'CRITICAL', bold: true })] }),
                  new TableCell({ children: [new Paragraph('Immediate (0-3 months)')] }),
                  new TableCell({ children: [new Paragraph('Significant compliance gaps or operational failures requiring urgent remediation')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'HIGH', bold: true })] }),
                  new TableCell({ children: [new Paragraph('Short-term (3-6 months)')] }),
                  new TableCell({ children: [new Paragraph('Partial implementations requiring strengthening and documentation')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'MEDIUM', bold: true })] }),
                  new TableCell({ children: [new Paragraph('Medium-term (6-12 months)')] }),
                  new TableCell({ children: [new Paragraph('Areas requiring ongoing improvement and enhancement')] })
                ]
              })
            ]
          }),

          ...(actionPlan.totalActions > 0 ? [
            new Paragraph({
              text: '4.3 Remediation Action Plan by Compliance Category',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 }
            }),

            ...Object.keys(actionPlan.groupedActions).flatMap((category, categoryIndex) => [
              new Paragraph({
                text: `4.3.${categoryIndex + 1} ${category}`,
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 200 }
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    tableHeader: true,
                    children: [
                      new TableCell({ children: [new Paragraph({ text: 'No.', bold: true })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                      new TableCell({ children: [new Paragraph({ text: 'Priority', bold: true })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                      new TableCell({ children: [new Paragraph({ text: 'Required Action', bold: true })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                      new TableCell({ children: [new Paragraph({ text: 'Timeline', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } })
                    ]
                  }),
                  ...actionPlan.groupedActions[category].map((item, index) =>
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph({ text: String(index + 1), alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: item.priority.toUpperCase(), bold: true, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: item.action, alignment: AlignmentType.JUSTIFIED })] }),
                        new TableCell({ children: [new Paragraph({ text: item.timeline, alignment: AlignmentType.CENTER })] })
                      ]
                    })
                  )
                ]
              })
            ]),

            new Paragraph({
              text: '4.4 Implementation Recommendations',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 }
            }),
            new Paragraph({
              text: 'To ensure successful implementation of this action plan, the institution should:',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: 'Assign clear ownership and accountability for each remediation action',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              bullet: { level: 0 }
            }),
            new Paragraph({
              text: 'Establish a monitoring mechanism to track progress against stated timelines',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              bullet: { level: 0 }
            }),
            new Paragraph({
              text: 'Allocate appropriate resources (financial, human, and technological) for implementation',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              bullet: { level: 0 }
            }),
            new Paragraph({
              text: 'Report progress to senior management and the Board on a quarterly basis',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              bullet: { level: 0 }
            }),
            new Paragraph({
              text: 'Document all remediation activities and maintain evidence of completion',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 100 },
              bullet: { level: 0 }
            }),
            new Paragraph({
              text: 'Review and update the action plan as circumstances change or new risks emerge',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 },
              bullet: { level: 0 }
            })
          ] : [
            new Paragraph({
              text: 'No critical gaps or significant weaknesses identified. The institution demonstrates strong technical compliance and operational effectiveness across all assessed areas. Continue to maintain robust controls and monitor for emerging risks.',
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 }
            })
          ]),

          new Paragraph({
            text: '5. OVERALL CONCLUSION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: `Based on the assessment: Inherent ML/TF/PF risk is assessed as ${inherentRisks.overallRating}. Technical compliance is assessed as ${tcRating}. Effectiveness of AML/CFT/CPF controls is assessed as ${effRating}. Accordingly, the institution's overall residual ML/TF/PF risk for the reporting period is assessed as: ${residualRisk.rating}`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: 'This report is confidential and prepared in compliance with the Anti-Money Laundering Act (Cap.423) and FIU guidelines. It should be retained for 10 years and submitted to relevant authorities as required.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 800 }
          }),

          new Paragraph({
            text: 'Prepared By:\t\t\t\tApproved By:',
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: 'Name: _______________________\t\tName: ____________________________',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Designation: ___________________\tDesignation: ______________________',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Date: __________________________\tDate: ____________________________',
            spacing: { after: 200 }
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `FIU_AML_Risk_Assessment_Report_${organization?.name || 'Report'}_${formatDate(new Date())}.docx`);
    });
  };

  if (loading) {
    return <div style={styles.loading}>Loading report data...</div>;
  }

  const inherentRisks = calculateInherentRiskScores();
  const tcRating = getTechnicalComplianceRating();
  const effRating = getEffectivenessRating();
  const residualRisk = getResidualRisk();
  const actionPlan = generateActionPlan();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onClose} style={styles.closeButton}>← Back</button>
        <button onClick={exportToWord} style={styles.exportButton}>Export to Word</button>
      </div>

      <div style={styles.reportContainer}>
        <div style={styles.titlePage}>
          <h1 style={styles.mainTitle}>THE UNITED REPUBLIC OF TANZANIA</h1>
          <h2 style={styles.subtitle}>FINANCIAL INTELLIGENCE UNIT (FIU)</h2>
          <h3 style={styles.reportTitle}>
            Anti-Money Laundering, Counter-Terrorist Financing and Counter-Proliferation Financing Risk Assessment Report
          </h3>

          <div style={styles.metadata}>
            <p><strong>Name of Reporting Person:</strong> {organization?.name || 'N/A'}</p>
            <p><strong>Type of Institution:</strong> {assessment.dnfbp_category || 'N/A'}</p>
            <p><strong>Reporting Period:</strong> {formatDate(assessment.created_at)} – {formatDate(new Date())}</p>
            <p><strong>Date of Assessment:</strong> {formatDate(assessment.created_at)}</p>
          </div>
        </div>

        <div style={styles.content}>
          <h2 style={styles.sectionHeading}>1. INTRODUCTION</h2>

          <h3 style={styles.subheading}>1.1 Overview of Business Activities</h3>
          <p style={styles.justifiedText}>
            {assessment.business_description || `${organization?.name} is a designated non-financial business and profession operating in the United Republic of Tanzania.`}
          </p>

          <h3 style={styles.subheading}>1.2 Purpose of the Risk Assessment</h3>
          <p style={styles.justifiedText}>
            This AML/CFT/CPF Risk Assessment is conducted in accordance with the Anti-Money Laundering Act, Cap. 423, and the AML/CFT Institutional Risk Assessment Guidelines issued by the Financial Intelligence Unit (FIU). The assessment applies a Risk-Based Approach to identify, assess, and understand inherent ML/TF/PF risks, the existence of AML/CFT/CPF controls, and the effectiveness of those controls in practice.
          </p>

          <h3 style={styles.subheading}>1.3 Period and Frequency</h3>
          <p style={styles.justifiedText}>
            This assessment covers the period {formatDate(assessment.created_at)} to {formatDate(new Date())} and is conducted at least annually or when material changes occur in the institution's risk profile.
          </p>

          <h2 style={styles.sectionHeading}>2. AML/CFT/CPF RISK ASSESSMENT METHODOLOGY</h2>

          <h3 style={styles.subheading}>2.1 Assessment Framework</h3>
          <p style={styles.justifiedText}>
            The AML/CFT/CPF Risk Assessment was conducted using a structured three-module framework; Module 1 – Inherent Risk Assessment: Identification of ML/TF/PF risk exposure arising from the institution's business, prior to consideration of any controls. Module 2 – Technical Compliance Assessment: Evaluation of the existence and adequacy of AML/CFT/CPF controls as required by law and regulation. Module 3 – Effectiveness Assessment: Evaluation of whether AML/CFT/CPF controls operate effectively in practice and achieve intended outcomes. The results of these modules are used to determine the institution's residual ML/TF/PF risk.
          </p>

          <h3 style={styles.subheading}>2.2 Inherent Risk Factors and Weights</h3>
          <p style={styles.justifiedText}>
            For the purposes of assessing inherent ML/TF/PF risk, the institution's exposure is analysed across Customer Risk, Product and Service Risk, Geographic Risk and Transaction and Delivery Channel Risk. Each inherent risk factor is assessed independently based on the institution's responses to the inherent risk questionnaire and assigned a qualitative rating of Low, Moderate, or High.
          </p>
          <p style={styles.justifiedText}>
            To derive an overall inherent ML/TF/PF risk rating, the inherent risk factors are weighted to reflect their relative importance, as follows:
          </p>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Inherent Risk Factor</th>
                <th style={styles.tableHeader}>Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tableCell}>Customer Risk</td>
                <td style={styles.tableCell}>30%</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Product / Service Risk</td>
                <td style={styles.tableCell}>20%</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Geographic Risk</td>
                <td style={styles.tableCell}>25%</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Transaction & Delivery Channel Risk</td>
                <td style={styles.tableCell}>25%</td>
              </tr>
            </tbody>
          </table>

          <p style={styles.justifiedText}>
            The overall inherent ML/TF/PF risk rating represents the consolidated outcome of applying these weights to the institution's inherent risk profile before consideration of any AML/CFT/CPF controls.
          </p>

          <h3 style={styles.subheading}>2.3 Scoring and Rating Methodology</h3>
          <p style={styles.justifiedText}>
            For scoring purposes, qualitative inherent risk ratings are mapped to numeric values as follows: Low = 1, Moderate = 2, High = 3. The weighted inherent risk score is calculated by applying the weights set out in Section 2.2 above. The resulting score is translated into an overall inherent ML/TF/PF risk rating as follows: Low: ≤ 1.5, Moderate: 1.6 – 2.3, High: ≥ 2.4
          </p>

          <h3 style={styles.subheading}>2.4 Inherent ML/TF/PF Risk Assessment Results</h3>
          <p style={styles.italicText}>(Results of Module 1 – Risk exposure before controls)</p>

          <h4 style={styles.subSubheading}>2.4.1 Customer Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            Assesses exposure arising from customer types, ownership structures, political exposure, sectoral risk, and customer behaviour.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1A responses)</p>
          <p style={styles.justifiedText}>{generateCustomerNarrative(inherentRisks.customer.rating)}</p>
          <p style={styles.boldText}>Customer Inherent Risk Rating: {inherentRisks.customer.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.2 Product / Service Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            Assesses exposure arising from the nature and complexity of products and services offered.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1B responses)</p>
          <p style={styles.justifiedText}>{generateProductNarrative(inherentRisks.product.rating)}</p>
          <p style={styles.boldText}>Product / Service Inherent Risk Rating: {inherentRisks.product.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.3 Geographic Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            Assesses exposure arising from cross-border activities and links to higher-risk jurisdictions.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1C responses)</p>
          <p style={styles.justifiedText}>{generateGeographicNarrative(inherentRisks.geographic.rating)}</p>
          <p style={styles.boldText}>Geographic Inherent Risk Rating: {inherentRisks.geographic.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.4 Transaction & Delivery Channel Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            Assesses exposure arising from transaction size, volume, patterns, and delivery channels.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1D responses)</p>
          <p style={styles.justifiedText}>{generateTransactionNarrative(inherentRisks.transaction.rating)}</p>
          <p style={styles.boldText}>Transaction & Delivery Channel Inherent Risk Rating: {inherentRisks.transaction.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.5 Overall Inherent ML/TF/PF Risk</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Risk Factor</th>
                <th style={styles.tableHeader}>Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tableCell}>Customer Risk</td>
                <td style={styles.tableCell}>{inherentRisks.customer.rating}</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Product / Service Risk</td>
                <td style={styles.tableCell}>{inherentRisks.product.rating}</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Geographic Risk</td>
                <td style={styles.tableCell}>{inherentRisks.geographic.rating}</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Transaction & Delivery Channel Risk</td>
                <td style={styles.tableCell}>{inherentRisks.transaction.rating}</td>
              </tr>
            </tbody>
          </table>
          <p style={styles.boldText}>Overall Inherent ML/TF/PF Risk: {inherentRisks.overallRating}</p>

          <h3 style={styles.subheading}>2.5 Technical Compliance Assessment</h3>
          <p style={styles.justifiedText}>
            This section assesses whether the institution has established and documented AML/CFT/CPF controls as required by law and regulation. It evaluates the existence and adequacy of policies, procedures, systems, governance arrangements, and training.
          </p>
          <h4 style={styles.subSubheading}>2.5.1 Technical Compliance Assessment Results</h4>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 2 responses)</p>
          <p style={styles.justifiedText}>{generateTechnicalComplianceNarrative(tcRating)}</p>
          <p style={styles.boldText}>Overall Technical Compliance Rating: {tcRating.toUpperCase()}</p>

          <h3 style={styles.subheading}>2.6 Effectiveness Assessment</h3>
          <p style={styles.justifiedText}>
            This section evaluates whether AML/CFT/CPF controls operate effectively in practice and achieve intended outcomes. It focuses on quality, consistency, timeliness, and learning, including whether risks are identified and acted upon, suspicious activity is reported appropriately, sanctions are implemented promptly, and identified weaknesses are remediated.
          </p>
          <h4 style={styles.subSubheading}>2.6.1 Effectiveness Assessment Results</h4>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 3 responses)</p>
          <p style={styles.justifiedText}>{generateEffectivenessNarrative(effRating)}</p>
          <p style={styles.boldText}>Overall Effectiveness Rating: {effRating.toUpperCase()}</p>

          <h2 style={styles.sectionHeading}>3. RESIDUAL ML/TF/PF RISK ASSESSMENT</h2>
          <p style={styles.justifiedText}>
            Residual risk is determined by combining: inherent risk exposure (Module 1), technical compliance (Module 2), and effectiveness of controls (Module 3).
          </p>
          <p style={styles.boldText}>Overall Residual ML/TF/PF Risk: {residualRisk.rating}</p>
          <p style={styles.boldText}>FATF Risk Calculation:</p>
          <p style={styles.justifiedText}>{residualRisk.formula}</p>

          <h2 style={styles.sectionHeading}>4. RISK MITIGATION MEASURES AND ACTION PLAN</h2>
          <p style={styles.italicText}>(Auto-generated from gaps identified in Modules 2 and 3)</p>

          <h3 style={styles.subheading}>4.1 Overview</h3>
          <p style={styles.justifiedText}>
            Based on the assessment findings, <strong>{actionPlan.totalActions}</strong> specific remediation actions have been identified across multiple compliance areas. These actions are organized by functional category and prioritized according to urgency and risk impact. Each action includes specific implementation timelines aligned with regulatory expectations and best practices.
          </p>

          <h3 style={styles.subheading}>4.2 Priority Classification Framework</h3>
          <table style={{...styles.table, marginBottom: '24px'}}>
            <thead>
              <tr>
                <th style={{...styles.tableHeader, width: '20%'}}>Priority Level</th>
                <th style={{...styles.tableHeader, width: '30%'}}>Implementation Timeline</th>
                <th style={{...styles.tableHeader, width: '50%'}}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{...styles.tableCell, fontWeight: 'bold', color: '#d32f2f'}}>CRITICAL</td>
                <td style={styles.tableCell}>Immediate (0-3 months)</td>
                <td style={styles.tableCell}>Significant compliance gaps or operational failures requiring urgent remediation</td>
              </tr>
              <tr>
                <td style={{...styles.tableCell, fontWeight: 'bold', color: '#f57c00'}}>HIGH</td>
                <td style={styles.tableCell}>Short-term (3-6 months)</td>
                <td style={styles.tableCell}>Partial implementations requiring strengthening and documentation</td>
              </tr>
              <tr>
                <td style={{...styles.tableCell, fontWeight: 'bold', color: '#1976d2'}}>MEDIUM</td>
                <td style={styles.tableCell}>Medium-term (6-12 months)</td>
                <td style={styles.tableCell}>Areas requiring ongoing improvement and enhancement</td>
              </tr>
            </tbody>
          </table>

          {actionPlan.totalActions > 0 ? (
            <>
              <h3 style={styles.subheading}>4.3 Remediation Action Plan by Compliance Category</h3>
              {Object.keys(actionPlan.groupedActions).map((category, categoryIndex) => (
                <div key={category} style={{marginTop: '24px', marginBottom: '24px'}}>
                  <h4 style={styles.subSubheading}>4.3.{categoryIndex + 1} {category}</h4>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{...styles.tableHeader, width: '5%'}}>No.</th>
                        <th style={{...styles.tableHeader, width: '10%'}}>Priority</th>
                        <th style={{...styles.tableHeader, width: '60%'}}>Required Action</th>
                        <th style={{...styles.tableHeader, width: '25%'}}>Timeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionPlan.groupedActions[category].map((item, index) => (
                        <tr key={index}>
                          <td style={{...styles.tableCell, textAlign: 'center'}}>{index + 1}</td>
                          <td style={{
                            ...styles.tableCell,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: item.priority === 'Critical' ? '#d32f2f' : item.priority === 'High' ? '#f57c00' : '#1976d2'
                          }}>
                            {item.priority.toUpperCase()}
                          </td>
                          <td style={{...styles.tableCell, textAlign: 'left'}}>{item.action}</td>
                          <td style={{...styles.tableCell, textAlign: 'center'}}>{item.timeline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <h3 style={styles.subheading}>4.4 Implementation Recommendations</h3>
              <p style={styles.justifiedText}>
                To ensure successful implementation of this action plan, the institution should:
              </p>
              <ul style={{...styles.justifiedText, marginLeft: '20px', lineHeight: '1.8', marginBottom: '24px'}}>
                <li>Assign clear ownership and accountability for each remediation action</li>
                <li>Establish a monitoring mechanism to track progress against stated timelines</li>
                <li>Allocate appropriate resources (financial, human, and technological) for implementation</li>
                <li>Report progress to senior management and the Board on a quarterly basis</li>
                <li>Document all remediation activities and maintain evidence of completion</li>
                <li>Review and update the action plan as circumstances change or new risks emerge</li>
              </ul>
            </>
          ) : (
            <div style={{padding: '24px', background: '#e8f5e9', borderRadius: '8px', marginTop: '16px'}}>
              <p style={{...styles.justifiedText, margin: 0, color: '#2e7d32', fontWeight: '600'}}>
                No critical gaps or significant weaknesses identified. The institution demonstrates strong technical compliance and operational effectiveness across all assessed areas. Continue to maintain robust controls and monitor for emerging risks.
              </p>
            </div>
          )}

          <h2 style={styles.sectionHeading}>5. OVERALL CONCLUSION</h2>
          <p style={styles.justifiedText}>
            Based on the assessment: Inherent ML/TF/PF risk is assessed as {inherentRisks.overallRating}. Technical compliance is assessed as {tcRating}. Effectiveness of AML/CFT/CPF controls is assessed as {effRating}. Accordingly, the institution's overall residual ML/TF/PF risk for the reporting period is assessed as: <strong>{residualRisk.rating}</strong>
          </p>
          <p style={styles.justifiedText}>
            This report is confidential and prepared in compliance with the Anti-Money Laundering Act (Cap.423) and FIU guidelines. It should be retained for 10 years and submitted to relevant authorities as required.
          </p>

          <div style={styles.signatureSection}>
            <div style={styles.signatureBlock}>
              <p>Prepared By:</p>
              <p>Name: _______________________</p>
              <p>Designation: ___________________</p>
              <p>Date: __________________________</p>
            </div>
            <div style={styles.signatureBlock}>
              <p>Approved By:</p>
              <p>Name: ____________________________</p>
              <p>Designation: ______________________</p>
              <p>Date: ____________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2332 100%)',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    maxWidth: '1000px',
    margin: '0 auto 24px auto'
  },
  closeButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: 'white',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    marginBottom: '16px'
  },
  exportButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)'
  },
  reportContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  titlePage: {
    padding: '80px 60px',
    textAlign: 'center',
    borderBottom: '3px solid #0a1929'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '24px',
    textTransform: 'uppercase'
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '40px'
  },
  reportTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '60px',
    lineHeight: '1.6'
  },
  metadata: {
    textAlign: 'left',
    maxWidth: '600px',
    margin: '0 auto',
    fontSize: '14px',
    lineHeight: '2'
  },
  content: {
    padding: '60px',
    fontFamily: 'Times New Roman, serif',
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#000'
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '700',
    marginTop: '40px',
    marginBottom: '16px',
    color: '#0a1929'
  },
  subheading: {
    fontSize: '16px',
    fontWeight: '700',
    marginTop: '24px',
    marginBottom: '12px',
    color: '#0a1929'
  },
  subSubheading: {
    fontSize: '14px',
    fontWeight: '700',
    marginTop: '16px',
    marginBottom: '8px',
    color: '#0a1929'
  },
  justifiedText: {
    textAlign: 'justify',
    marginBottom: '16px'
  },
  boldText: {
    fontWeight: '700',
    marginTop: '12px',
    marginBottom: '8px'
  },
  italicText: {
    fontStyle: 'italic',
    marginBottom: '12px',
    color: '#666'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '20px 0',
    border: '1px solid #333'
  },
  tableHeader: {
    background: '#d3d3d3',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '700',
    border: '1px solid #333'
  },
  tableCell: {
    padding: '12px',
    border: '1px solid #333'
  },
  signatureSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginTop: '60px',
    paddingTop: '40px',
    borderTop: '1px solid #ccc'
  },
  signatureBlock: {
    lineHeight: '2.5'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: 'white',
    fontSize: '18px'
  }
};
