import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, Packer } from 'docx';
import { saveAs } from 'file-saver';
import {
  generateCustomerRiskNarrative as generateCustomerRiskNarrativeLaw,
  generateProductRiskNarrative as generateProductRiskNarrativeLaw,
  generateGeographicRiskNarrative as generateGeographicRiskNarrativeLaw,
  generateTransactionRiskNarrative as generateTransactionRiskNarrativeLaw,
  generateTechnicalComplianceNarrative as generateTechnicalComplianceNarrativeLaw,
  generateEffectivenessNarrative as generateEffectivenessNarrativeLaw
} from '../services/reportNarratives';
import {
  generateCustomerRiskNarrative as generateCustomerRiskNarrativeIns,
  generateProductRiskNarrative as generateProductRiskNarrativeIns,
  generateGeographicRiskNarrative as generateGeographicRiskNarrativeIns,
  generateTransactionRiskNarrative as generateTransactionRiskNarrativeIns,
  generateTechnicalComplianceNarrative as generateTechnicalComplianceNarrativeIns,
  generateEffectivenessNarrative as generateEffectivenessNarrativeIns
} from '../data/insuranceReportNarratives';

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

  const getInstitutionType = () => {
    if (!organization) return 'N/A';

    if (organization.business_type === 'law_firm') {
      return 'Law Firm';
    }

    const categoryValue = organization.law_firm_type || organization.business_type;
    if (categoryValue) {
      const categoryLabels = {
        'bank': 'Bank',
        'insurance': 'Insurance Company',
        'securities': 'Securities Firm',
        'money_services': 'Money Services Business',
        'casino': 'Casino',
        'real_estate': 'Real Estate Agent',
        'dealer_precious_metals': 'Dealer in Precious Metals/Stones',
        'lawyer': 'Lawyer/Legal Professional',
        'accountant': 'Accountant',
        'trust_company': 'Trust and Company Service Provider',
        'law_firm_small': 'Small Law Firm',
        'law_firm_medium': 'Medium Law Firm',
        'law_firm_large': 'Large Law Firm',
        'legal_consultancy': 'Legal Consultancy',
        'notary_services': 'Notary Services',
        'other': 'Other DNFBP'
      };
      return categoryLabels[categoryValue] || categoryValue;
    }

    return organization.business_type || 'N/A';
  };

  const getReportingPeriod = () => {
    const assessmentDate = new Date(assessment.created_at);
    const oneYearBefore = new Date(assessmentDate);
    oneYearBefore.setFullYear(oneYearBefore.getFullYear() - 1);

    return {
      start: oneYearBefore,
      end: assessmentDate
    };
  };

  const isInsurer = assessment?.framework_type === 'insurer';
  const generateCustomerRiskNarrative    = isInsurer ? generateCustomerRiskNarrativeIns    : generateCustomerRiskNarrativeLaw;
  const generateProductRiskNarrative     = isInsurer ? generateProductRiskNarrativeIns     : generateProductRiskNarrativeLaw;
  const generateGeographicRiskNarrative  = isInsurer ? generateGeographicRiskNarrativeIns  : generateGeographicRiskNarrativeLaw;
  const generateTransactionRiskNarrative = isInsurer ? generateTransactionRiskNarrativeIns : generateTransactionRiskNarrativeLaw;
  const generateTechnicalComplianceNarrative = isInsurer ? generateTechnicalComplianceNarrativeIns : generateTechnicalComplianceNarrativeLaw;
  const generateEffectivenessNarrative   = isInsurer ? generateEffectivenessNarrativeIns   : generateEffectivenessNarrativeLaw;

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
    if (module2Score < 2.0) return 'Compliant';
    if (module2Score < 3.5) return 'Partially Compliant';
    return 'Non-Compliant';
  };

  const getEffectivenessRating = () => {
    const module3Score = assessment.module_3_score || 0;
    if (module3Score < 2.0) return 'Effective';
    if (module3Score < 3.5) return 'Partially Effective';
    if (module3Score < 4.5) return 'Weak';
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

  const generateResidualRiskInterpretation = (residualRating, inherentRating, tcRating, effRating) => {
    let interpretation = `This residual risk rating represents the institution's remaining ML/TF/PF vulnerability after accounting for all control measures and mitigations. `;

    // Analyze the relationship between inherent risk and controls
    const inherentRisk = inherentRating.toUpperCase();
    const residual = residualRating.toUpperCase();

    // Strong control scenario
    if ((inherentRisk === 'HIGH' || inherentRisk === 'VERY HIGH') && (residual === 'LOW' || residual === 'VERY LOW')) {
      interpretation += `Despite facing ${inherentRisk} inherent ML/TF/PF risk exposure, the institution has successfully implemented strong technical compliance (${tcRating}) and effective operational controls (${effRating}) that significantly reduce the risk to ${residual} levels. This demonstrates a mature, robust AML/CFT framework capable of managing elevated risk exposures. `;
    }
    // Effective control scenario
    else if ((inherentRisk === 'MEDIUM' || inherentRisk === 'HIGH') && residual === 'MEDIUM') {
      interpretation += `The institution faces ${inherentRisk} inherent risk exposure and has implemented controls with ${tcRating} technical compliance and ${effRating} operational effectiveness, resulting in ${residual} residual risk. This indicates controls are functioning but opportunities exist for further strengthening to achieve lower residual risk levels. `;
    }
    // Weak control scenario
    else if ((residual === 'HIGH' || residual === 'VERY HIGH')) {
      interpretation += `The institution's ${residual} residual risk reflects either elevated inherent risk exposure (${inherentRisk}) that is not adequately mitigated by current controls, or weaknesses in technical compliance (${tcRating}) and/or operational effectiveness (${effRating}). This requires immediate management attention and remediation. `;
    }
    // Low inherent, low residual scenario
    else if ((inherentRisk === 'LOW' || inherentRisk === 'VERY LOW') && (residual === 'LOW' || residual === 'VERY LOW')) {
      interpretation += `The institution operates with ${inherentRisk} inherent risk exposure due to its business model and risk profile. Controls demonstrating ${tcRating} technical compliance and ${effRating} operational effectiveness maintain residual risk at ${residual} levels appropriate for the institution's risk appetite. `;
    }
    else {
      interpretation += `The ${residual} residual risk reflects ${inherentRisk} inherent exposure combined with ${tcRating} technical compliance and ${effRating} operational effectiveness. `;
    }

    // Add action-oriented guidance based on residual risk level
    if (residual === 'VERY HIGH' || residual === 'HIGH') {
      interpretation += `IMMEDIATE ACTION REQUIRED: The institution must prioritize remediation of identified control weaknesses, enhance monitoring and oversight, allocate additional resources to compliance functions, and may require supervisory intervention. The Board and senior management should establish an urgent action plan with clear accountability and timelines for risk reduction.`;
    } else if (residual === 'MEDIUM') {
      interpretation += `MANAGEMENT ATTENTION REQUIRED: The institution should develop and implement a targeted action plan to strengthen specific control areas identified as needing improvement. Focus on enhancing technical compliance gaps, improving operational effectiveness where weaknesses exist, and ensuring adequate resource allocation. Regular monitoring and progress reporting to the Board is essential.`;
    } else if (residual === 'LOW') {
      interpretation += `MAINTAIN AND MONITOR: The institution demonstrates sound AML/CFT risk management appropriate to its risk profile. Continue maintaining current control standards, monitor for emerging risks and regulatory changes, conduct regular independent testing and validation, and ensure ongoing staff training and awareness. Periodic control enhancements should be considered as the risk environment evolves.`;
    } else if (residual === 'VERY LOW') {
      interpretation += `EXEMPLARY PERFORMANCE: The institution demonstrates mature, highly effective AML/CFT controls that comprehensively mitigate ML/TF/PF risks. Continue best practices, share knowledge across the industry, maintain vigilance for emerging risks, and ensure controls remain proportionate and risk-based. This level of performance positions the institution as a leader in AML/CFT compliance.`;
    }

    return interpretation;
  };

  const getResidualRisk = () => {
    if (!riskBreakdown) return { rating: 'UNKNOWN', formula: '', narrative: '' };

    // Use the CALCULATED residual risk (IR × (1 - CE)) not Module 3 score
    const finalScore = riskBreakdown.calculated_residual_risk || 0;
    const ce = riskBreakdown.control_effectiveness || 0;
    const ir = riskBreakdown.inherent_risk_score || 0;
    const m2Score = riskBreakdown.technical_compliance_score || 0;
    const m3Score = riskBreakdown.operational_effectiveness_score || 0;

    const rating = classify_risk_rating(finalScore);
    const cePercentage = (ce * 100).toFixed(1);
    const controlGap = ((1 - ce) * 100).toFixed(1);

    const formula = `RR = IR × (1 - CE) = ${ir.toFixed(2)} × (1 - ${ce.toFixed(3)}) = ${finalScore.toFixed(2)}`;

    // Generate narrative
    const tcRating = getTechnicalComplianceRating();
    const effRating = getEffectivenessRating();

    let narrative = `The institution's inherent ML/TF/PF risk exposure is rated at ${ir.toFixed(2)} on a 1-5 scale (${classify_risk_rating(ir).toUpperCase()}). `;
    narrative += `The institution's technical compliance with AML/CFT requirements is assessed as ${tcRating} (Module 2 score: ${m2Score.toFixed(2)}), `;
    narrative += `and operational effectiveness of controls in practice is assessed as ${effRating} (Module 3 score: ${m3Score.toFixed(2)}). `;
    narrative += `Through implementation of documented AML/CFT controls, the overall control effectiveness based on actual implementation stands at ${cePercentage}%. `;
    narrative += `This results in a control gap of ${controlGap}%, meaning ${controlGap}% of the inherent risk remains unmitigated after all controls are applied. `;
    narrative += `The residual risk after control mitigation is ${finalScore.toFixed(2)}, classified as ${rating.toUpperCase()} risk. `;

    if (ce < 0.40) {
      narrative += `The low control effectiveness (below 40%) indicates significant deficiencies in control implementation that require immediate attention and remediation.`;
    } else if (ce < 0.60) {
      narrative += `The moderate control effectiveness (40-60%) suggests controls are partially implemented but require strengthening to adequately mitigate inherent risks.`;
    } else if (ce < 0.75) {
      narrative += `The good control effectiveness (60-75%) indicates controls are substantially implemented and operating effectively, though opportunities for improvement remain in specific areas.`;
    } else {
      narrative += `The strong control effectiveness (above 75%) demonstrates robust, well-implemented controls that are effectively mitigating the majority of inherent risks.`;
    }

    return {
      rating: rating.toUpperCase(),
      formula,
      finalScore,
      narrative
    };
  };

  const classify_risk_rating = (score) => {
    if (score < 1.5) return 'Low';
    if (score < 2.5) return 'Moderate';
    if (score < 3.5) return 'High';
    return 'Very High';
  };

  const generateMaturityNarrative = (rating) => {
    const module4Responses = responses.filter(r => r.question_code?.startsWith('D'));

    if (module4Responses.length === 0) {
      return `The institution's AML/CFT control maturity has been assessed and determined to be at ${rating} level. This assessment evaluates the sophistication, integration, and continuous improvement of controls across all compliance areas.`;
    }

    const initial = module4Responses.filter(r => r.response === 'Initial');
    const developing = module4Responses.filter(r => r.response === 'Developing');
    const defined = module4Responses.filter(r => r.response === 'Defined');
    const managed = module4Responses.filter(r => r.response === 'Managed');
    const optimizing = module4Responses.filter(r => r.response === 'Optimizing');
    const total = module4Responses.length;

    let narrative = `The institution's AML/CFT control maturity has been assessed and determined to be at ${rating} level based on evaluation of ${total} control dimensions. `;

    if (initial.length > 0) {
      narrative += `${initial.length} control areas are at Initial maturity (${Math.round(initial.length/total*100)}%), indicating ad-hoc processes with minimal documentation. `;
    }
    if (developing.length > 0) {
      narrative += `${developing.length} areas are Developing (${Math.round(developing.length/total*100)}%), with basic processes established but inconsistently applied. `;
    }
    if (defined.length > 0) {
      narrative += `${defined.length} areas are Defined (${Math.round(defined.length/total*100)}%), demonstrating documented and standardized processes. `;
    }
    if (managed.length > 0) {
      narrative += `${managed.length} areas are Managed (${Math.round(managed.length/total*100)}%), with measured and controlled processes. `;
    }
    if (optimizing.length > 0) {
      narrative += `${optimizing.length} areas are Optimizing (${Math.round(optimizing.length/total*100)}%), with continuous improvement and innovation. `;
    }

    narrative += `\n\nDEVELOPMENT PRIORITIES: `;
    if (initial.length + developing.length > total * 0.5) {
      narrative += `Priority focus: Establish documented procedures, standardize processes across the organization, invest in staff training and technology infrastructure.`;
    } else if (defined.length > total * 0.4) {
      narrative += `Priority focus: Implement performance monitoring systems, establish quality assurance mechanisms, and begin automation of routine processes.`;
    } else {
      narrative += `Priority focus: Enhance data analytics capabilities, optimize existing processes, and develop predictive risk models.`;
    }

    return narrative;
  };

  const generateActionPlan = () => {
    const actions = [];
    const tcRating = getTechnicalComplianceRating();
    const effRating = getEffectivenessRating();
    const maturityRating = getMaturityRating();

    const module2Responses = responses.filter(r => r.question_code?.startsWith('B'));
    const module3Responses = responses.filter(r => r.question_code?.startsWith('C'));
    const module4Responses = responses.filter(r => r.question_code?.startsWith('D'));

    module2Responses.forEach(r => {
      if (r.response === 'Not in place') {
        actions.push({
          category: 'Technical Compliance',
          action: `Establish and document ${r.question_text?.replace(/^Does the (firm|institution) have /i, '').replace(/\?$/, '').toLowerCase()}`,
          priority: 'High',
          timeline: 'Within 3 months'
        });
      } else if (r.response === 'Partially implemented') {
        actions.push({
          category: 'Technical Compliance',
          action: `Complete implementation and documentation of ${r.question_text?.replace(/^Does the (firm|institution) have /i, '').replace(/\?$/, '').toLowerCase()}`,
          priority: 'Medium',
          timeline: 'Within 6 months'
        });
      }
    });

    module3Responses.forEach(r => {
      if (r.response === 'Ineffective') {
        actions.push({
          category: 'Operational Effectiveness',
          action: `Strengthen operational effectiveness of ${r.question_text?.replace(/^Are /i, '').replace(/\?$/, '').toLowerCase()}`,
          priority: 'High',
          timeline: 'Within 3 months'
        });
      } else if (r.response === 'Weak') {
        actions.push({
          category: 'Operational Effectiveness',
          action: `Improve quality and consistency of ${r.question_text?.replace(/^Are /i, '').replace(/\?$/, '').toLowerCase()}`,
          priority: 'Medium',
          timeline: 'Within 6 months'
        });
      }
    });

    module4Responses.forEach(r => {
      if (r.response === 'Initial' || r.response === 'Developing') {
        actions.push({
          category: 'Maturity Enhancement',
          action: `Advance maturity of ${r.question_text?.replace(/^What is the maturity level of /i, '').replace(/\?$/, '').toLowerCase()}`,
          priority: 'Medium',
          timeline: 'Within 12 months'
        });
      }
    });

    if (tcRating === 'Non-Compliant' || tcRating === 'Partially Compliant') {
      actions.push({
        category: 'Governance',
        action: 'Establish comprehensive AML/CFT governance framework with clear accountability',
        priority: 'High',
        timeline: 'Within 3 months'
      });
    }

    if (effRating === 'Ineffective' || effRating === 'Weak') {
      actions.push({
        category: 'Quality Assurance',
        action: 'Implement quality assurance program for AML/CFT operations',
        priority: 'High',
        timeline: 'Within 3 months'
      });
    }

    const groupedActions = actions.reduce((acc, action) => {
      if (!acc[action.category]) acc[action.category] = [];
      acc[action.category].push(action);
      return acc;
    }, {});

    return {
      totalActions: actions.length,
      groupedActions
    };
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
              new TextRun(getInstitutionType())
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Reporting Period: ', bold: true }),
              new TextRun(`${formatDate(getReportingPeriod().start)} – ${formatDate(getReportingPeriod().end)}`)
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date of Assessment: ', bold: true }),
              new TextRun(formatDate(assessment.created_at))
            ],
            spacing: { after: 400 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '[This report is confidential and prepared in compliance with the Anti-Money Laundering Act (Cap.423) and FIU guidelines. It should be retained for 10 years and submitted to relevant authorities as and/or when required.]', italics: true })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 800 }
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
            text: 'This category assesses ML/TF/PF exposure arising from customer characteristics before any controls are applied. Key risk factors include: customer type and legal structure (individuals, legal entities, trusts, charities); ownership and control transparency (beneficial ownership identification complexity); politically exposed persons (PEPs) and their family members or close associates; business sector and industry classification; customer location and business activities; and observable customer behaviour patterns. Higher-risk customer profiles include complex ownership structures, opaque beneficial ownership, PEP involvement, high-risk sectors (e.g., cash-intensive businesses, MSBs, casinos), customers from or doing business in high-risk jurisdictions, and unusual transaction patterns relative to expected customer profile.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1A responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateCustomerRiskNarrative(inherentRisks.customer.rating, responses),
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
            text: 'This category assesses ML/TF/PF exposure arising from the nature, features, and complexity of products and services offered before controls are applied. Risk factors include: product anonymity and bearer features; ease of transferability and negotiability; transparency of beneficial ownership and source of funds; complexity and structured layering opportunities; cross-border capabilities and foreign exchange features; involvement of third parties or intermediaries; cash intensity; settlement speed and finality; stored value features; and ability to obscure transaction trails. Higher-risk products and services include correspondent banking, private banking, trust and company formation services, wire transfers, trade finance, virtual assets, cash-intensive services, bearer instruments, and complex investment products. The institution\'s product mix and service offerings directly influence the inherent ML/TF/PF risk exposure profile.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1B responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateProductRiskNarrative(inherentRisks.product.rating, responses),
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
            text: 'This category assesses ML/TF/PF exposure arising from geographic factors, cross-border activities, and jurisdictional linkages before controls are applied. Risk factors include: countries with strategic AML/CFT deficiencies identified by FATF or other credible sources; jurisdictions subject to sanctions, embargoes, or similar measures; countries identified by credible sources as having significant levels of corruption, organized crime, drug trafficking, or terrorist activity; countries providing funding or support for terrorist activities or designated terrorist organizations; tax havens and offshore financial centres with weak transparency; conflict zones and fragile states; countries with weak legal, regulatory, and supervisory frameworks; and geographic areas identified in the institution\'s own risk assessment. The nature and volume of cross-border transactions, correspondent relationships, and international wire transfers significantly impact geographic risk exposure.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1C responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateGeographicRiskNarrative(inherentRisks.geographic.rating, responses),
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
            text: 'This category assesses ML/TF/PF exposure arising from transaction characteristics and delivery channel features before controls are applied. Key risk factors include: transaction size and frequency (large, frequent, or unusual patterns); cash intensity and currency usage; transaction velocity and settlement speed; transaction complexity and structuring indicators; use of intermediaries, third-party payments, or layering; delivery channel characteristics (non-face-to-face, digital, mobile, correspondent banking); use of new technologies or innovative payment methods; transaction patterns inconsistent with customer profile or business activity; lack of economic or lawful purpose; and ability to conduct transactions anonymously or through multiple jurisdictions. Higher-risk indicators include large cash transactions, rapid movement of funds, structured transactions just below reporting thresholds, complex layered transactions without clear purpose, frequent international wire transfers, and use of multiple accounts or entities. Digital and remote delivery channels present elevated risks due to reduced personal interaction and identity verification challenges.',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Auto-generated from Module 1D responses)',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: generateTransactionRiskNarrative(inherentRisks.transaction.rating, responses),
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
            text: 'This section assesses whether the institution has established and documented AML/CFT/CPF controls as required by law, regulation, and supervisory guidance. Technical compliance focuses on the formal existence and adequacy of control frameworks, evaluating whether required elements are "in place," not whether they work effectively in practice. Assessment criteria include: written AML/CFT policies, procedures, and manuals; customer due diligence (CDD) and enhanced due diligence (EDD) procedures; risk assessment methodologies and documentation; transaction monitoring systems and thresholds; sanctions screening systems and watch lists; suspicious transaction reporting (STR) procedures; record-keeping systems and retention policies; internal controls and independent audit functions; governance structures including MLRO/Compliance Officer designation, Board oversight, and management accountability; staff training programs; and regulatory reporting mechanisms. Ratings are assigned based on the degree of implementation: "Fully in place" indicates comprehensive documented controls meeting all regulatory requirements; "Partially implemented" indicates controls exist but have gaps, inconsistencies, or incomplete documentation; and "Not in place" indicates controls are absent or fundamentally inadequate. Technical compliance is scored on a 1-5 scale where lower scores indicate better compliance with requirements.',
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
            text: generateTechnicalComplianceNarrative(tcRating, responses),
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
            text: 'This section evaluates whether AML/CFT/CPF controls operate effectively in practice and achieve their intended risk mitigation outcomes. While technical compliance assesses whether controls exist on paper, effectiveness assessment examines whether those controls actually work in operational reality. Effectiveness is measured through multiple dimensions: Quality - are outputs accurate, complete, and appropriate to the risk context; Consistency - are controls applied uniformly across the institution and over time; Timeliness - are actions taken within appropriate timeframes to mitigate risks; Identification and escalation - are ML/TF/PF risks properly identified, investigated, and escalated when warranted; Suspicious activity reporting - are STRs filed appropriately with sufficient quality and analysis; Sanctions implementation - are screening matches identified, investigated, and resolved promptly with appropriate actions taken; Staff awareness and culture - do personnel understand their AML responsibilities and demonstrate appropriate risk awareness in daily activities; Learning and adaptation - does the institution identify control weaknesses, implement remediation, and continuously improve based on experience and regulatory feedback; and Resource adequacy - are controls supported by sufficient qualified personnel, technology, and budget. Ratings range from "Effective" (controls consistently achieve intended outcomes) through "Partially Effective" and "Weak" to "Ineffective" (controls fail to mitigate risks adequately). Effectiveness is scored on a 1-5 scale where lower scores indicate more effective controls.',
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
            text: generateEffectivenessNarrative(effRating, responses),
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
            text: 'This comprehensive section evaluates the sophistication and maturity of the institution\'s AML/CFT compliance program through detailed assessment of 20 key controls across 9 critical domains: Governance & Risk Assessment, Enterprise Risk Assessment, CDD/KYC, Transaction Monitoring, Sanctions Screening, Suspicious Activity Reporting, Internal Controls & Compliance, Audit & QA, and Training & Awareness. The maturity score is AUTO-CALCULATED from control assessments and ranges from Initial (Level 1) to Optimised (Level 5).',
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '2.7.1 Maturity Assessment Results',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: 'Narrative (Based on detailed institutional maturity control assessments)',
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
            text: 'Residual risk represents the remaining ML/TF/PF risk exposure after applying all control measures and mitigations. While inherent risk (Module 1) reflects the institution\'s exposure before considering any controls, residual risk accounts for how effectively implemented controls reduce that exposure. The calculation follows FATF risk assessment methodology using the formula: Residual Risk = Inherent Risk × (1 - Control Effectiveness). Control effectiveness is calculated from Module 2 responses, measuring the actual implementation level of required AML/CFT controls (0% = no controls, 100% = fully implemented). This approach recognizes that strong, well-implemented controls (high control effectiveness) significantly reduce inherent risks, while weak or absent controls (low control effectiveness) leave institutions highly exposed. Module 2 measures technical compliance (whether controls are documented and in place), while Module 3 measures operational effectiveness (whether controls operate consistently and achieve intended outcomes). Residual risk ratings guide resource allocation, strategic planning, and regulatory capital decisions. Institutions with HIGH or VERY HIGH residual risk require immediate remediation and enhanced monitoring. Those with MODERATE residual risk should strengthen specific control areas. Institutions with LOW or VERY LOW residual risk demonstrate effective AML/CFT frameworks appropriate to their risk profile.',
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
            text: 'FATF Risk Calculation Formula:',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: residualRisk.formula,
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Where: CE (Control Effectiveness) = Average implementation level of all Module 2 controls (0.0 - 1.0 scale)',
            italics: true,
            alignment: AlignmentType.LEFT,
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: 'Risk Assessment Narrative:',
            bold: true,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: residualRisk.narrative,
            alignment: AlignmentType.JUSTIFIED,
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
            text: 'Summary of Risk Assessment Results',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: `This comprehensive AML/CFT/CPF risk assessment has evaluated the institution's ML/TF/PF risk exposure across all material risk dimensions using the FATF-aligned risk assessment methodology. The assessment examined inherent risks arising from the institution's business model, customer base, products and services, geographic footprint, and transaction characteristics, as well as the technical compliance and operational effectiveness of controls implemented to mitigate those risks.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Key Assessment Findings:', bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Inherent ML/TF/PF Risk: ', bold: true }),
              new TextRun({ text: inherentRisks.overallRating.toUpperCase() })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `The institution's inherent risk exposure before considering any control measures is assessed as ${inherentRisks.overallRating}. This reflects the combined risk profile arising from customer characteristics (${inherentRisks.customer.rating}), product and service offerings (${inherentRisks.product.rating}), geographic exposure (${inherentRisks.geographic.rating}), and transaction/delivery channel characteristics (${inherentRisks.transaction.rating}).`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Technical Compliance: ', bold: true }),
              new TextRun({ text: tcRating.toUpperCase() })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `The institution's technical compliance with AML/CFT/CPF legal and regulatory requirements is assessed as ${tcRating}. This rating reflects the degree to which the institution has established, documented, and implemented required policies, procedures, systems, governance arrangements, training programs, and control frameworks as mandated by the Anti-Money Laundering Act (Cap.423), FIU regulations, and supervisory guidance.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Control Effectiveness: ', bold: true }),
              new TextRun({ text: effRating.toUpperCase() })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: `The operational effectiveness of the institution's AML/CFT/CPF controls in practice is assessed as ${effRating}. This rating evaluates whether controls operate consistently, achieve intended risk mitigation outcomes, and demonstrate appropriate quality, timeliness, and learning. It considers the institution's ability to identify and act upon ML/TF/PF risks, file quality suspicious transaction reports, implement sanctions promptly, maintain staff awareness, and remediate identified weaknesses.`,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Overall Residual Risk Conclusion',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Based on the comprehensive assessment of inherent risks, technical compliance, and control effectiveness, the institution\'s overall residual ML/TF/PF risk for the reporting period is assessed as: ' }),
              new TextRun({ text: residualRisk.rating.toUpperCase(), bold: true, size: 28 })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: generateResidualRiskInterpretation(residualRisk.rating, inherentRisks.overallRating, tcRating, effRating),
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
            <p><strong>Type of Institution:</strong> {getInstitutionType()}</p>
            <p><strong>Reporting Period:</strong> {formatDate(getReportingPeriod().start)} – {formatDate(getReportingPeriod().end)}</p>
            <p><strong>Date of Assessment:</strong> {formatDate(assessment.created_at)}</p>
          </div>

          <p style={{
            textAlign: 'center',
            fontStyle: 'italic',
            marginTop: '40px',
            padding: '20px',
            fontSize: '0.95em',
            lineHeight: '1.6'
          }}>
            [This report is confidential and prepared in compliance with the Anti-Money Laundering Act (Cap.423) and FIU guidelines. It should be retained for 10 years and submitted to relevant authorities as and/or when required.]
          </p>
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
            This category assesses ML/TF/PF exposure arising from customer characteristics before any controls are applied. Key risk factors include: customer type and legal structure (individuals, legal entities, trusts, charities); ownership and control transparency (beneficial ownership identification complexity); politically exposed persons (PEPs) and their family members or close associates; business sector and industry classification; customer location and business activities; and observable customer behaviour patterns. Higher-risk customer profiles include complex ownership structures, opaque beneficial ownership, PEP involvement, high-risk sectors (e.g., cash-intensive businesses, MSBs, casinos), customers from or doing business in high-risk jurisdictions, and unusual transaction patterns relative to expected customer profile.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1A responses)</p>
          <p style={styles.justifiedText}>{generateCustomerRiskNarrative(inherentRisks.customer.rating, responses)}</p>
          <p style={styles.boldText}>Customer Inherent Risk Rating: {inherentRisks.customer.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.2 Product / Service Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            This category assesses ML/TF/PF exposure arising from the nature, features, and complexity of products and services offered before controls are applied. Risk factors include: product anonymity and bearer features; ease of transferability and negotiability; transparency of beneficial ownership and source of funds; complexity and structured layering opportunities; cross-border capabilities and foreign exchange features; involvement of third parties or intermediaries; cash intensity; settlement speed and finality; stored value features; and ability to obscure transaction trails. Higher-risk products and services include correspondent banking, private banking, trust and company formation services, wire transfers, trade finance, virtual assets, cash-intensive services, bearer instruments, and complex investment products. The institution's product mix and service offerings directly influence the inherent ML/TF/PF risk exposure profile.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1B responses)</p>
          <p style={styles.justifiedText}>{generateProductRiskNarrative(inherentRisks.product.rating, responses)}</p>
          <p style={styles.boldText}>Product / Service Inherent Risk Rating: {inherentRisks.product.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.3 Geographic Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            This category assesses ML/TF/PF exposure arising from geographic factors, cross-border activities, and jurisdictional linkages before controls are applied. Risk factors include: countries with strategic AML/CFT deficiencies identified by FATF or other credible sources; jurisdictions subject to sanctions, embargoes, or similar measures; countries identified by credible sources as having significant levels of corruption, organized crime, drug trafficking, or terrorist activity; countries providing funding or support for terrorist activities or designated terrorist organizations; tax havens and offshore financial centres with weak transparency; conflict zones and fragile states; countries with weak legal, regulatory, and supervisory frameworks; and geographic areas identified in the institution's own risk assessment. The nature and volume of cross-border transactions, correspondent relationships, and international wire transfers significantly impact geographic risk exposure.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1C responses)</p>
          <p style={styles.justifiedText}>{generateGeographicRiskNarrative(inherentRisks.geographic.rating, responses)}</p>
          <p style={styles.boldText}>Geographic Inherent Risk Rating: {inherentRisks.geographic.rating.toUpperCase()}</p>

          <h4 style={styles.subSubheading}>2.4.4 Transaction & Delivery Channel Inherent Risk</h4>
          <p style={styles.boldText}>Risk Category Explanation</p>
          <p style={styles.justifiedText}>
            This category assesses ML/TF/PF exposure arising from transaction characteristics and delivery channel features before controls are applied. Key risk factors include: transaction size and frequency (large, frequent, or unusual patterns); cash intensity and currency usage; transaction velocity and settlement speed; transaction complexity and structuring indicators; use of intermediaries, third-party payments, or layering; delivery channel characteristics (non-face-to-face, digital, mobile, correspondent banking); use of new technologies or innovative payment methods; transaction patterns inconsistent with customer profile or business activity; lack of economic or lawful purpose; and ability to conduct transactions anonymously or through multiple jurisdictions. Higher-risk indicators include large cash transactions, rapid movement of funds, structured transactions just below reporting thresholds, complex layered transactions without clear purpose, frequent international wire transfers, and use of multiple accounts or entities. Digital and remote delivery channels present elevated risks due to reduced personal interaction and identity verification challenges.
          </p>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 1D responses)</p>
          <p style={styles.justifiedText}>{generateTransactionRiskNarrative(inherentRisks.transaction.rating, responses)}</p>
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
            This section assesses whether the institution has established and documented AML/CFT/CPF controls as required by law, regulation, and supervisory guidance. Technical compliance focuses on the formal existence and adequacy of control frameworks, evaluating whether required elements are "in place," not whether they work effectively in practice. Assessment criteria include: written AML/CFT policies, procedures, and manuals; customer due diligence (CDD) and enhanced due diligence (EDD) procedures; risk assessment methodologies and documentation; transaction monitoring systems and thresholds; sanctions screening systems and watch lists; suspicious transaction reporting (STR) procedures; record-keeping systems and retention policies; internal controls and independent audit functions; governance structures including MLRO/Compliance Officer designation, Board oversight, and management accountability; staff training programs; and regulatory reporting mechanisms. Ratings are assigned based on the degree of implementation: "Fully in place" indicates comprehensive documented controls meeting all regulatory requirements; "Partially implemented" indicates controls exist but have gaps, inconsistencies, or incomplete documentation; and "Not in place" indicates controls are absent or fundamentally inadequate. Technical compliance is scored on a 1-5 scale where lower scores indicate better compliance with requirements.
          </p>
          <h4 style={styles.subSubheading}>2.5.1 Technical Compliance Assessment Results</h4>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 2 responses)</p>
          <p style={styles.justifiedText}>{generateTechnicalComplianceNarrative(tcRating, responses)}</p>
          <p style={styles.boldText}>Overall Technical Compliance Rating: {tcRating.toUpperCase()}</p>

          <h3 style={styles.subheading}>2.6 Effectiveness Assessment</h3>
          <p style={styles.justifiedText}>
            This section evaluates whether AML/CFT/CPF controls operate effectively in practice and achieve their intended risk mitigation outcomes. While technical compliance assesses whether controls exist on paper, effectiveness assessment examines whether those controls actually work in operational reality. Effectiveness is measured through multiple dimensions: Quality - are outputs accurate, complete, and appropriate to the risk context; Consistency - are controls applied uniformly across the institution and over time; Timeliness - are actions taken within appropriate timeframes to mitigate risks; Identification and escalation - are ML/TF/PF risks properly identified, investigated, and escalated when warranted; Suspicious activity reporting - are STRs filed appropriately with sufficient quality and analysis; Sanctions implementation - are screening matches identified, investigated, and resolved promptly with appropriate actions taken; Staff awareness and culture - do personnel understand their AML responsibilities and demonstrate appropriate risk awareness in daily activities; Learning and adaptation - does the institution identify control weaknesses, implement remediation, and continuously improve based on experience and regulatory feedback; and Resource adequacy - are controls supported by sufficient qualified personnel, technology, and budget. Ratings range from "Effective" (controls consistently achieve intended outcomes) through "Partially Effective" and "Weak" to "Ineffective" (controls fail to mitigate risks adequately). Effectiveness is scored on a 1-5 scale where lower scores indicate more effective controls.
          </p>
          <h4 style={styles.subSubheading}>2.6.1 Effectiveness Assessment Results</h4>
          <p style={styles.boldText}>Narrative (Auto-generated from Module 3 responses)</p>
          <p style={styles.justifiedText}>{generateEffectivenessNarrative(effRating, responses)}</p>
          <p style={styles.boldText}>Overall Effectiveness Rating: {effRating.toUpperCase()}</p>

          <h2 style={styles.sectionHeading}>3. RESIDUAL ML/TF/PF RISK ASSESSMENT</h2>
          <p style={styles.justifiedText}>
            Residual risk represents the remaining ML/TF/PF risk exposure after applying all control measures and mitigations. While inherent risk (Module 1) reflects the institution's exposure before considering any controls, residual risk accounts for how effectively implemented controls reduce that exposure. The calculation follows FATF risk assessment methodology using the formula: Residual Risk = Inherent Risk × (1 - Control Effectiveness). Control effectiveness is calculated from Module 2 responses, measuring the actual implementation level of required AML/CFT controls (0% = no controls, 100% = fully implemented). This approach recognizes that strong, well-implemented controls (high control effectiveness) significantly reduce inherent risks, while weak or absent controls (low control effectiveness) leave institutions highly exposed. Module 2 measures technical compliance (whether controls are documented and in place), while Module 3 measures operational effectiveness (whether controls operate consistently and achieve intended outcomes). Residual risk ratings guide resource allocation, strategic planning, and regulatory capital decisions. Institutions with HIGH or VERY HIGH residual risk require immediate remediation and enhanced monitoring. Those with MODERATE residual risk should strengthen specific control areas. Institutions with LOW or VERY LOW residual risk demonstrate effective AML/CFT frameworks appropriate to their risk profile.
          </p>
          <p style={styles.boldText}>Overall Residual ML/TF/PF Risk: {residualRisk.rating}</p>
          <p style={styles.boldText}>FATF Risk Calculation Formula:</p>
          <p style={styles.justifiedText}>{residualRisk.formula}</p>
          <p style={styles.italicText}>Where: CE (Control Effectiveness) = Average implementation level of all Module 2 controls (0.0 - 1.0 scale)</p>
          <p style={styles.boldText}>Risk Assessment Narrative:</p>
          <p style={styles.justifiedText}>{residualRisk.narrative}</p>

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

          <h3 style={styles.subheading}>Summary of Risk Assessment Results</h3>
          <p style={styles.justifiedText}>
            This comprehensive AML/CFT/CPF risk assessment has evaluated the institution's ML/TF/PF risk exposure across all material risk dimensions using the FATF-aligned risk assessment methodology. The assessment examined inherent risks arising from the institution's business model, customer base, products and services, geographic footprint, and transaction characteristics, as well as the technical compliance and operational effectiveness of controls implemented to mitigate those risks.
          </p>

          <p style={styles.boldText}>Key Assessment Findings:</p>

          <p style={styles.boldText}>Inherent ML/TF/PF Risk: {inherentRisks.overallRating.toUpperCase()}</p>
          <p style={styles.justifiedText}>
            The institution's inherent risk exposure before considering any control measures is assessed as {inherentRisks.overallRating}. This reflects the combined risk profile arising from customer characteristics ({inherentRisks.customer.rating}), product and service offerings ({inherentRisks.product.rating}), geographic exposure ({inherentRisks.geographic.rating}), and transaction/delivery channel characteristics ({inherentRisks.transaction.rating}).
          </p>

          <p style={styles.boldText}>Technical Compliance: {tcRating.toUpperCase()}</p>
          <p style={styles.justifiedText}>
            The institution's technical compliance with AML/CFT/CPF legal and regulatory requirements is assessed as {tcRating}. This rating reflects the degree to which the institution has established, documented, and implemented required policies, procedures, systems, governance arrangements, training programs, and control frameworks as mandated by the Anti-Money Laundering Act (Cap.423), FIU regulations, and supervisory guidance.
          </p>

          <p style={styles.boldText}>Control Effectiveness: {effRating.toUpperCase()}</p>
          <p style={styles.justifiedText}>
            The operational effectiveness of the institution's AML/CFT/CPF controls in practice is assessed as {effRating}. This rating evaluates whether controls operate consistently, achieve intended risk mitigation outcomes, and demonstrate appropriate quality, timeliness, and learning. It considers the institution's ability to identify and act upon ML/TF/PF risks, file quality suspicious transaction reports, implement sanctions promptly, maintain staff awareness, and remediate identified weaknesses.
          </p>

          <h3 style={styles.subheading}>Overall Residual Risk Conclusion</h3>
          <p style={styles.justifiedText}>
            <strong>Based on the comprehensive assessment of inherent risks, technical compliance, and control effectiveness, the institution's overall residual ML/TF/PF risk for the reporting period is assessed as: <span style={{fontSize: '1.2em', color: '#1976d2'}}>{residualRisk.rating.toUpperCase()}</span></strong>
          </p>
          <p style={styles.justifiedText}>
            {generateResidualRiskInterpretation(residualRisk.rating, inherentRisks.overallRating, tcRating, effRating)}
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
