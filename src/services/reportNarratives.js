/**
 * Professional Narrative Generation Service for AML/CFT Compliance Reports
 *
 * Generates comprehensive, data-driven narratives for institutional risk assessments
 * aligned with FATF Recommendations and Tanzania AML/CFT regulatory requirements.
 */

/**
 * Generate Customer Inherent Risk Narrative (Module 1 / Section A2 - Client Types)
 * @param {string} rating - Risk rating (Low, Moderate, High, Very High)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateCustomerRiskNarrative(rating, responses) {
  const a1Responses = responses.filter(r => r.question_code?.startsWith('A2.'));

  if (a1Responses.length === 0) {
    return `The institution's customer inherent risk profile has been assessed and determined to be ${rating}. This assessment considers the institution's customer base, client types, ownership structures, political exposure, sectoral risk, and customer behavior patterns. No detailed client exposure data was available for this assessment.`;
  }

  const highRiskClients = a1Responses.filter(r => r.response?.toLowerCase() === 'yes');
  const partialRiskClients = a1Responses.filter(r => r.response?.toLowerCase() === 'partially' || r.response?.toLowerCase() === 'partial');

  let narrative = `The institution's customer inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from client types, ownership structures, political exposure, sectoral risk factors, and customer behavior patterns.`;

  narrative += `\n\n`;

  if (highRiskClients.length > 0) {
    const clientList = highRiskClients.slice(0, 7).map(r => {
      const text = r.question_text || '';
      return text.replace(/^Does the (firm|institution) (serve |provide services to |assist |deal with )?/i, '').replace(/\?$/, '').toLowerCase();
    }).join('; ');

    narrative += `The assessment identified ${highRiskClients.length} client profile or customer risk ${highRiskClients.length === 1 ? 'characteristic' : 'characteristics'} that ${highRiskClients.length === 1 ? 'presents' : 'present'} elevated inherent risk: ${clientList}. These client types present heightened money laundering, terrorist financing, or proliferation financing vulnerabilities due to factors such as complex ownership structures, cross-border elements, involvement in cash-intensive sectors, political exposure, geographic risk factors, or potential links to higher-risk activities.`;
  } else {
    narrative += `The institution serves predominantly lower-risk client segments with standard ownership structures, transparent beneficial ownership, minimal political exposure, and operations in lower-risk sectors and jurisdictions.`;
  }

  narrative += `\n\n`;

  if (partialRiskClients.length > 0) {
    narrative += `Additionally, the institution has partial or limited exposure to ${partialRiskClients.length} client ${partialRiskClients.length === 1 ? 'category' : 'categories'}, which requires case-by-case risk assessment and proportionate due diligence measures. `;
  }

  narrative += `The ${rating} customer inherent risk rating necessitates implementation of robust risk-based customer due diligence procedures, enhanced screening and monitoring mechanisms for higher-risk client segments, comprehensive source of funds and source of wealth verification, and appropriate mitigation controls commensurate with the identified risk exposures. The institution is required to maintain heightened vigilance, conduct enhanced ongoing monitoring, and ensure that adequate resources, systems, and expertise are deployed to effectively manage and mitigate these inherent customer risk factors in accordance with regulatory expectations and international best practices.`;

  return narrative;
}

/**
 * Generate Product/Service Inherent Risk Narrative (Module 1 / Section A1 - Services)
 * @param {string} rating - Risk rating (Low, Moderate, High, Very High)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateProductRiskNarrative(rating, responses) {
  const a2Responses = responses.filter(r => r.question_code?.startsWith('A1.'));

  if (a2Responses.length === 0) {
    return `The institution's product and service inherent risk profile has been assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature, complexity, and characteristics of products and services offered. No detailed client profile exposure data was available for this assessment.`;
  }

  const highRiskServices = a2Responses.filter(r => r.response?.toLowerCase() === 'yes');
  const partialRiskServices = a2Responses.filter(r => r.response?.toLowerCase() === 'partially' || r.response?.toLowerCase() === 'partial');

  let narrative = `The institution's product and service inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature, features, complexity, opacity, cross-border elements, and cash-intensity of products and services offered by the institution.`;

  narrative += `\n\n`;

  if (highRiskServices.length > 0) {
    const serviceList = highRiskServices.slice(0, 7).map(r => {
      const text = r.question_text || '';
      return text.replace(/^Does the (firm|institution) (provide |assist clients in |assist in |act as |create, operate, or manage |handle )?/i, '').replace(/\?$/, '').toLowerCase();
    }).join('; ');

    narrative += `The assessment identified ${highRiskServices.length} higher-risk service ${highRiskServices.length === 1 ? 'offering' : 'offerings'}, specifically including: ${serviceList}. These service offerings are designated as higher-risk under the Financial Action Task Force (FATF) Recommendations and Tanzania's Anti-Money Laundering and Counter-Terrorist Financing regulatory framework due to their inherent susceptibility to money laundering, terrorist financing, and proliferation financing risks. Such services typically involve the handling of client funds, creation or management of legal entities and arrangements, facilitation of property or asset transfers, and provision of professional intermediation that can potentially be exploited to obscure the beneficial ownership, source, or destination of illicit proceeds.`;
  } else {
    narrative += `The institution provides predominantly lower-risk services with minimal exposure to higher-risk service categories that present elevated money laundering or terrorist financing vulnerabilities.`;
  }

  narrative += `\n\n`;

  if (partialRiskServices.length > 0) {
    narrative += `Additionally, the institution has partial or limited exposure to ${partialRiskServices.length} service ${partialRiskServices.length === 1 ? 'area' : 'areas'}, which requires case-by-case risk assessment and proportionate due diligence measures. `;
  }

  narrative += `The ${rating} product and service inherent risk rating requires implementation of proportionate customer acceptance policies, risk-based due diligence procedures commensurate with identified risk factors, service-specific controls, and ongoing monitoring mechanisms to detect unusual or suspicious activity patterns. The institution must ensure that its risk management framework appropriately addresses the specific vulnerabilities associated with its product and service offerings.`;

  return narrative;
}

/**
 * Generate Geographic Inherent Risk Narrative (Module 1 / Section A3)
 * @param {string} rating - Risk rating (Low, Moderate, High, Very High)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateGeographicRiskNarrative(rating, responses) {
  const a3Responses = responses.filter(r => r.question_code?.startsWith('A3.'));

  if (a3Responses.length === 0) {
    return `The institution's geographic inherent risk profile has been assessed and determined to be ${rating}. This assessment considers exposure arising from cross-border activities, correspondent relationships, and links to higher-risk jurisdictions. No detailed geographic exposure data was available for this assessment.`;
  }

  const geographicRiskFactors = a3Responses.filter(r => r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially');
  const lowRiskAreas = a3Responses.filter(r => r.response?.toLowerCase() === 'no');

  let narrative = `The institution's geographic inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from cross-border activities, correspondent banking relationships, links to jurisdictions with varying AML/CFT regulatory standards, and potential exposure to sanctioned or higher-risk geographic regions.`;

  narrative += `\n\n`;

  if (geographicRiskFactors.length > 0) {
    const factors = geographicRiskFactors.slice(0, 4).map(r => {
      const text = r.question_text || '';
      return text.replace(/^Does the (firm|institution) (engage in |deal with |have |provide services involving |rely on )?/i, '').replace(/\?$/, '').toLowerCase();
    }).join('; ');

    narrative += `The assessment identified ${geographicRiskFactors.length} geographic or cross-border risk ${geographicRiskFactors.length === 1 ? 'factor' : 'factors'}: ${factors}. These exposures involve jurisdictions or activities with varying levels of AML/CFT regulatory oversight, enforcement effectiveness, transparency standards, and potential sanctions risks, as well as regions characterized by weak governance, high corruption, significant informality, or elevated financial crime exposure.`;

    const sanctionedJurisdictions = a3Responses.find(r => (r.question_text?.toLowerCase().includes('sanction') || r.question_text?.toLowerCase().includes('fatf') || r.question_text?.toLowerCase().includes('high-risk jurisdiction')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
    const crossBorder = a3Responses.find(r => r.question_text?.toLowerCase().includes('cross-border') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
    const correspondent = a3Responses.find(r => r.question_text?.toLowerCase().includes('correspondent') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));

    narrative += `\n\n`;

    if (sanctionedJurisdictions) {
      narrative += `The institution's exposure to sanctioned jurisdictions, FATF-identified high-risk jurisdictions, or jurisdictions subject to enhanced monitoring requires implementation of enhanced due diligence procedures, comprehensive sanctions screening protocols, enhanced source of funds and source of wealth verification, senior management approval for transactions or relationships involving such jurisdictions, and heightened ongoing monitoring to detect potential sanctions evasion or elevated money laundering risks. `;
    }

    if (crossBorder) {
      narrative += `The institution's engagement in cross-border transactions or relationships requires enhanced due diligence procedures, assessment of jurisdiction-specific risks, verification of the legitimacy and commercial rationale of cross-border activities, and appropriate monitoring mechanisms to detect unusual cross-border transaction patterns. `;
    }

    if (correspondent) {
      narrative += `The institution's maintenance of correspondent banking relationships requires comprehensive due diligence on correspondent institutions, assessment of respondent banks' AML/CFT controls, understanding of the nature of correspondent services provided, and ongoing monitoring of correspondent relationship activity. `;
    }
  } else {
    narrative += `The assessment confirms that the institution operates primarily within domestic jurisdiction with limited or no cross-border exposure, minimal links to higher-risk jurisdictions, and no significant correspondent banking relationships, thereby minimizing geographic and jurisdictional risk factors.`;
  }

  narrative += `\n\n`;
  narrative += `The ${rating} geographic inherent risk rating requires implementation of appropriate geographic risk assessment methodologies, jurisdiction-specific enhanced due diligence procedures where warranted, comprehensive sanctions screening protocols, and ongoing monitoring mechanisms to detect changes in geographic risk exposure. The institution must maintain current knowledge of jurisdiction-specific risks, sanctions developments, and international risk assessments published by the FATF and relevant authorities.`;

  return narrative;
}

/**
 * Generate Transaction & Delivery Channel Inherent Risk Narrative (Module 1 / Section A4)
 * @param {string} rating - Risk rating (Low, Moderate, High, Very High)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateTransactionRiskNarrative(rating, responses) {
  const a4Responses = responses.filter(r => r.question_code?.startsWith('A4.'));

  if (a4Responses.length === 0) {
    return `The institution's transaction and delivery channel inherent risk profile has been assessed and determined to be ${rating}. This assessment considers exposure arising from transaction size, volume, velocity, complexity, payment patterns, and delivery channel characteristics. No detailed transaction or structural risk data was available for this assessment.`;
  }

  const transactionRiskFactors = a4Responses.filter(r => r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially');
  const lowRiskAreas = a4Responses.filter(r => r.response?.toLowerCase() === 'no');

  let narrative = `The institution's transaction and delivery channel inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from transaction size, volume, velocity, complexity, unusual payment patterns, beneficial ownership opacity, use of intermediaries, and characteristics of service delivery channels employed by the institution.`;

  narrative += `\n\n`;

  if (transactionRiskFactors.length > 0) {
    const factors = transactionRiskFactors.slice(0, 4).map(r => {
      const text = r.question_text || '';
      return text.replace(/^Does the (firm|institution) (facilitate |encounter |handle |deal with |assist in )?/i, '').replace(/\?$/, '').toLowerCase();
    }).join('; ');

    narrative += `The assessment identified ${transactionRiskFactors.length} transaction or delivery channel risk ${transactionRiskFactors.length === 1 ? 'characteristic' : 'characteristics'}: ${factors}. These factors involve transaction complexity, high value, rapid velocity, unusual payment patterns, involvement of multiple parties or intermediaries, beneficial ownership arrangements that may obscure true ownership, or delivery channel characteristics that reduce transparency or increase opportunities for money laundering or terrorist financing.`;

    const largeValueTransactions = a4Responses.find(r => (r.question_text?.toLowerCase().includes('large-value') || r.question_text?.toLowerCase().includes('high-value')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
    const complexStructures = a4Responses.find(r => (r.question_text?.toLowerCase().includes('complex') || r.question_text?.toLowerCase().includes('third-party') || r.question_text?.toLowerCase().includes('intermediar')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
    const rapidMovement = a4Responses.find(r => (r.question_text?.toLowerCase().includes('rapid') || r.question_text?.toLowerCase().includes('frequent')) && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));
    const cashTransactions = a4Responses.find(r => r.question_text?.toLowerCase().includes('cash') && (r.response?.toLowerCase() === 'yes' || r.response?.toLowerCase() === 'partially'));

    narrative += `\n\n`;

    if (largeValueTransactions || rapidMovement) {
      narrative += `The institution's exposure to large-value or rapidly moving transactions requires implementation of enhanced transaction monitoring systems, enhanced source of funds and source of wealth verification, assessment of the commercial rationale and legitimacy of high-value or frequent transactions, and appropriate thresholds and alert mechanisms to detect unusual transaction patterns. `;
    }

    if (complexStructures) {
      narrative += `The institution's handling of transactions involving complex beneficial ownership arrangements, nominee structures, or multiple intermediaries requires enhanced scrutiny, comprehensive beneficial ownership verification procedures, understanding of the purpose and intended nature of complex arrangements, and ongoing monitoring to detect potential misuse of legal entities or arrangements to obscure illicit proceeds. `;
    }

    if (cashTransactions) {
      narrative += `The institution's handling of cash transactions requires enhanced controls including verification of the source and legitimacy of cash, monitoring of cash transaction patterns and volumes, and appropriate mechanisms to detect potential cash-based money laundering or structuring activities. `;
    }
  } else {
    narrative += `The assessment confirms that the institution's transaction profile is characterized by straightforward, transparent transactions with clear commercial rationale, verifiable counterparties, appropriate transaction sizes consistent with customer profiles, and limited exposure to complex structures or high-risk delivery channels.`;
  }

  narrative += `\n\n`;
  narrative += `The ${rating} transaction and delivery channel inherent risk rating requires implementation of appropriate transaction monitoring systems, risk-based transaction thresholds and alert parameters, comprehensive record-keeping procedures, and customer due diligence measures commensurate with the transaction and delivery channel risks identified. The institution must ensure that its monitoring systems and procedures are capable of detecting unusual transaction patterns, structuring activities, and other indicators of potential money laundering or terrorist financing associated with transaction characteristics and delivery channel vulnerabilities.`;

  return narrative;
}

/**
 * Generate Technical Compliance Narrative (Module 2 / Section B)
 * @param {string} rating - Compliance rating (Compliant, Largely Compliant, Partially Compliant, Non-Compliant)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateTechnicalComplianceNarrative(rating, responses) {
  const module2Responses = responses.filter(r => r.question_code?.startsWith('B'));

  if (module2Responses.length === 0) {
    return `The institution's technical compliance with AML/CFT/CPF legal and regulatory requirements has been assessed and determined to be ${rating}. This assessment evaluates whether the institution has established and documented required controls, policies, procedures, governance arrangements, and training programs as mandated by law and regulation. No detailed technical compliance data was available for this assessment.`;
  }

  const fullyImplemented = module2Responses.filter(r => r.response === 'Fully implemented & documented');
  const partiallyImplemented = module2Responses.filter(r => r.response === 'Partially implemented');
  const notInPlace = module2Responses.filter(r => r.response === 'Not in place');
  const total = module2Responses.length;

  let narrative = `The institution's technical compliance with AML/CFT/CPF legal and regulatory requirements has been comprehensively assessed and determined to be ${rating}. This assessment is based on systematic evaluation of ${total} technical compliance criteria encompassing governance and accountability frameworks, institutional risk assessment methodologies, customer due diligence procedures, transaction monitoring and suspicious transaction reporting mechanisms, sanctions screening protocols, record-keeping and data retention systems, staff training and awareness programs, and internal controls and audit functions.`;

  narrative += `\n\n`;

  if (fullyImplemented.length > 0) {
    narrative += `The assessment confirms that ${fullyImplemented.length} of the evaluated technical compliance requirements ${fullyImplemented.length === 1 ? 'is' : 'are'} fully implemented and appropriately documented (${Math.round(fullyImplemented.length/total*100)}% of assessed criteria), demonstrating the institution's commitment to establishing robust foundational controls.`;
  }

  if (partiallyImplemented.length > 0) {
    narrative += ` However, ${partiallyImplemented.length} requirement${partiallyImplemented.length === 1 ? ' is' : 's are'} only partially implemented (${Math.round(partiallyImplemented.length/total*100)}%), indicating that while foundational elements exist, significant gaps, incomplete documentation, or insufficient operationalization require remediation to achieve full compliance.`;
  }

  if (notInPlace.length > 0) {
    narrative += ` Critically, ${notInPlace.length} required control${notInPlace.length === 1 ? ' is' : 's are'} not in place (${Math.round(notInPlace.length/total*100)}%), representing fundamental deficiencies that expose the institution to significant regulatory and operational risk and require immediate remediation.`;
  }

  narrative += `\n\n`;

  if (rating === 'Compliant') {
    narrative += `The Compliant technical compliance rating indicates that the institution has established comprehensive AML/CFT/CPF controls that meet or exceed regulatory requirements across all assessed areas. The high level of full implementation across assessed criteria indicates that the institution has established a comprehensive technical compliance framework aligned with the requirements of the Anti-Money Laundering Act (Cap 423), the Anti-Money Laundering Regulations, Financial Intelligence Unit directives, and internationally recognized standards including the FATF Recommendations.`;
  } else if (rating === 'Largely Compliant') {
    narrative += `The Largely Compliant technical compliance rating indicates that the institution has established substantial AML/CFT/CPF controls but specific deficiencies or gaps require attention. The institution should prioritize completion of partially implemented requirements and remediation of any critical gaps to achieve full compliance. Priority remediation efforts should focus on areas where controls are not in place or only partially implemented, with particular attention to customer due diligence, transaction monitoring, suspicious transaction reporting, and sanctions screening capabilities.`;
  } else if (rating === 'Partially Compliant') {
    narrative += `The Partially Compliant technical compliance rating indicates that foundational controls exist but substantial deficiencies require urgent remediation. The institution must prioritize establishment of missing controls, completion of partially implemented requirements, and comprehensive documentation of all AML/CFT/CPF policies, procedures, and systems. Immediate management attention and resource allocation are required to achieve an acceptable level of regulatory compliance and operational risk management.`;
  } else {
    narrative += `The Non-Compliant technical compliance rating indicates fundamental deficiencies across multiple areas of the institution's AML/CFT/CPF control framework. Substantial investment in policy development, system implementation, staff training, and control establishment is urgently required. The institution must develop and execute a comprehensive remediation plan with defined timelines, accountability, and resource allocation to establish foundational controls and achieve minimum regulatory compliance standards.`;
  }

  narrative += `\n\n`;
  narrative += `The ${rating} technical compliance rating reflects the presence and adequacy of documented policies, procedures, and controls as required by law. However, technical compliance alone does not ensure effective risk management; the institution must ensure that established controls operate effectively in practice, are consistently applied, achieve intended outcomes, and are subject to ongoing monitoring, testing, and continuous improvement processes.`;

  return narrative;
}

/**
 * Generate Effectiveness Narrative (Module 3 / Section C)
 * @param {string} rating - Effectiveness rating (Effective, Mixed, Weak, Ineffective)
 * @param {Array} responses - Assessment responses array
 * @returns {string} Professional narrative
 */
export function generateEffectivenessNarrative(rating, responses) {
  const module3Responses = responses.filter(r => r.question_code?.startsWith('C'));

  if (module3Responses.length === 0) {
    return `The effectiveness of the institution's AML/CFT/CPF controls has been assessed and determined to be ${rating}. This assessment evaluates whether established controls operate effectively in practice, consistently achieve intended risk mitigation objectives, and demonstrate appropriate quality, timeliness, and continuous improvement. No detailed effectiveness data was available for this assessment.`;
  }

  const effective = module3Responses.filter(r => r.response === 'Effective');
  const weak = module3Responses.filter(r => r.response === 'Weak');
  const ineffective = module3Responses.filter(r => r.response === 'Ineffective');
  const total = module3Responses.length;

  let narrative = `The effectiveness of the institution's AML/CFT/CPF controls has been rigorously assessed and determined to be ${rating}. This assessment moves beyond technical compliance to evaluate whether established controls operate effectively in practice, consistently achieve intended risk mitigation and detection objectives, and demonstrate appropriate quality, timeliness, and continuous improvement. The effectiveness assessment encompasses ${total} critical operational areas including risk identification and assessment practices, transaction monitoring performance and suspicious activity detection, quality and timeliness of suspicious transaction reporting, sanctions screening implementation and match resolution, management information and oversight mechanisms, and remediation of identified control weaknesses and deficiencies.`;

  narrative += `\n\n`;

  if (effective.length > 0) {
    narrative += `The assessment confirms that ${effective.length} of the evaluated effectiveness criteria demonstrate effective operational performance (${Math.round(effective.length/total*100)}% of assessed areas), indicating that controls in these areas are functioning as intended, consistently applied, and producing desired outcomes.`;
  }

  if (weak.length > 0) {
    narrative += ` However, ${weak.length} operational ${weak.length === 1 ? 'area demonstrates' : 'areas demonstrate'} weak effectiveness (${Math.round(weak.length/total*100)}%), indicating that while technical controls may be formally established, their operational implementation, consistency of application, quality of outcomes, or timeliness of execution falls short of regulatory expectations and best practice standards. These weaknesses create potential vulnerabilities and increase residual risk exposure.`;
  }

  if (ineffective.length > 0) {
    narrative += ` Critically, ${ineffective.length} ${ineffective.length === 1 ? 'area is' : 'areas are'} assessed as ineffective (${Math.round(ineffective.length/total*100)}%), indicating fundamental operational deficiencies where established controls fail to achieve intended objectives, are inconsistently applied, produce poor quality outcomes, or demonstrate insufficient timeliness. Ineffective controls expose the institution to significant money laundering, terrorist financing, and regulatory risk and require immediate remediation.`;
  }

  narrative += `\n\n`;

  if (rating === 'Effective') {
    narrative += `The Effective rating indicates that the institution's AML/CFT/CPF controls consistently operate as intended, achieve desired risk mitigation and detection outcomes, demonstrate appropriate quality and timeliness, and are subject to ongoing monitoring and continuous improvement. The institution demonstrates strong operational capability, consistent application of policies and procedures, high-quality suspicious transaction reporting, effective sanctions implementation, robust management oversight, and appropriate responsiveness to identified weaknesses. This level of effectiveness indicates a mature and well-functioning compliance program that meets or exceeds regulatory expectations.`;
  } else if (rating === 'Partially Effective') {
    narrative += `The Partially Effective rating indicates that while foundational controls are established and operational, significant inconsistencies or quality gaps prevent the institution from achieving optimal risk mitigation outcomes across all areas. The institution demonstrates effective performance in some areas but must prioritize enhancement of operational effectiveness in weaker areas through targeted remediation efforts, additional training, process improvements, quality assurance mechanisms, and strengthened management oversight. Specific attention should be directed to areas demonstrating weak performance, with focus on improving consistency of application, enhancing quality of outputs, strengthening timeliness of execution, and ensuring adequate resources and expertise are allocated to compliance functions. The institution should develop and implement a structured effectiveness enhancement plan with clear priorities, accountability, timelines, and performance metrics.`;
  } else if (rating === 'Weak') {
    narrative += `The Weak effectiveness rating indicates substantial operational deficiencies across multiple areas of the institution's AML/CFT/CPF control framework. While technical controls may exist, their operational implementation is inadequate, inconsistent, or fails to achieve intended outcomes. Urgent management intervention is required to enhance operational effectiveness through comprehensive staff training, process redesign, quality assurance mechanisms, enhanced supervision and oversight, and allocation of adequate resources and expertise to critical compliance functions. The institution must develop and execute a detailed effectiveness enhancement plan with clear accountability, timelines, and performance metrics.`;
  } else if (rating === 'Ineffective') {
    narrative += `The Ineffective rating indicates fundamental operational failures across the institution's AML/CFT/CPF control framework. Established controls, if present, fail to operate as intended, are not consistently applied, produce poor quality outcomes, or demonstrate severe deficiencies in timeliness and responsiveness. This level of operational deficiency exposes the institution to significant money laundering, terrorist financing, sanctions violations, and regulatory enforcement risk. Immediate and comprehensive management intervention is required, including senior leadership engagement, emergency resource allocation, comprehensive staff training and capability building, process redesign and quality assurance implementation, and establishment of robust oversight and accountability mechanisms. The institution must treat effectiveness remediation as a critical priority requiring sustained executive attention and investment.`;
  }

  narrative += `\n\n`;
  narrative += `Effectiveness is the ultimate measure of an institution's AML/CFT/CPF capabilities. The ${rating} effectiveness rating underscores the importance of moving beyond formal policy adoption to ensure consistent, high-quality operational implementation that achieves intended risk mitigation, detection, and reporting objectives in accordance with regulatory requirements and international best practices.`;

  return narrative;
}
