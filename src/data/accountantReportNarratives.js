// ACCOUNTANTS & AUDITORS FIU REPORT NARRATIVES
// Drop-in sector variant of reportNarratives.js: identical function names and (rating, responses)
// signatures, identical code-prefix filtering and output shape (returns a prose string), with
// accountant-specific wording. Preserves the FIU four-category structure. The accounting-specific
// vulnerability section (A5) is folded into the product/service (engagement) narrative.

function stripQ(text) {
  return (text || '')
    .replace(/^Does the firm (provide |act \(?or arrange to act\)? as |act as |handle,? |assist |audit |make |advise |serve |receive |onboard |rely on |process |encounter |take on |form |act for |act on )?/i, '')
    .replace(/\?$/, '')
    .toLowerCase();
}

// Client inherent risk (Module 1 / Section A2)
export function generateCustomerRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A2.'));
  if (rows.length === 0) {
    return `The firm's client inherent risk profile has been assessed and determined to be ${rating}. This assessment considers the client base, beneficial-ownership transparency, political exposure, cash-intensive sectors, and clients presenting opaque or complex ownership structures. No detailed client exposure data was available for this assessment.`;
  }
  const high = rows.filter(r => r.response?.toLowerCase() === 'yes');
  const partial = rows.filter(r => ['partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The firm's client inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from client types, beneficial-ownership transparency, political exposure, cash-intensive sectors, and clients whose profile or structure is difficult to reconcile.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} client risk ${high.length === 1 ? 'characteristic' : 'characteristics'} that ${high.length === 1 ? 'presents' : 'present'} elevated inherent risk: ${list}. These present heightened money laundering, terrorist financing, or proliferation financing vulnerabilities — for example politically exposed clients or beneficial owners, opaque ownership behind shell or nominee structures, unexplained third-party funding, or clients whose activities are inconsistent with their profile.`;
  } else {
    narrative += `The firm serves predominantly lower-risk clients with transparent beneficial ownership, minimal political exposure, and structures consistent with their known business.`;
  }
  narrative += `\n\n`;
  if (partial.length > 0) {
    narrative += `Additionally, the firm has partial or limited exposure across ${partial.length} client ${partial.length === 1 ? 'category' : 'categories'} requiring case-by-case assessment and proportionate due diligence. `;
  }
  narrative += `The ${rating} client inherent risk rating requires risk-based customer due diligence, identification and verification of ultimate beneficial owners (including detection of nominee and bearer-share arrangements), mandatory PEP determination, and source-of-funds and source-of-wealth verification commensurate with the assessed exposure.`;
  return narrative;
}

// Service / engagement inherent risk (Module 1 / Section A1, plus accounting-specific vulnerability A5)
export function generateProductRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A1.') || r.question_code?.startsWith('A5.'));
  if (rows.length === 0) {
    return `The firm's service and engagement inherent risk profile has been assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature of engagements undertaken - in particular company and trust formation, client-fund handling, and nominee arrangements, which carry the highest inherent risk. No detailed engagement data was available for this assessment.`;
  }
  const high = rows.filter(r => r.response?.toLowerCase() === 'yes');
  const partial = rows.filter(r => ['partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The firm's service and engagement inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature of engagements - company and trust formation and management, handling or administering client funds, nominee director/shareholder services, offshore structuring, and the buying and selling of business entities.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} higher-risk engagement or vulnerability ${high.length === 1 ? 'feature' : 'features'}, specifically: ${list}. Such services are recognised under the FATF Risk-Based Approach for the Accounting Profession as susceptible to misuse - the formation and management of companies and trusts is identified as a particular area of vulnerability, and the handling of client funds, nominee arrangements, and lending professional legitimacy to opaque structures can be exploited to obscure the beneficial ownership, source, or destination of illicit proceeds.`;
  } else {
    narrative += `The firm provides predominantly lower-risk services such as audit, bookkeeping and payroll, with limited exposure to company/trust formation, client-fund handling, or nominee arrangements.`;
  }
  narrative += `\n\n`;
  if (partial.length > 0) {
    narrative += `Additionally, the firm has partial or limited exposure to ${partial.length} engagement ${partial.length === 1 ? 'area' : 'areas'} requiring proportionate, service-specific controls. `;
  }
  narrative += `The ${rating} service and engagement inherent risk rating requires engagement-specific controls, including scrutiny of formations lacking clear economic rationale, detection of nominee and undisclosed-control arrangements, controls over client-fund handling, and vigilance for incomplete or inconsistent client records.`;
  return narrative;
}

// Geographic inherent risk (Module 1 / Section A3)
export function generateGeographicRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A3.'));
  if (rows.length === 0) {
    return `The firm's geographic inherent risk profile has been assessed and determined to be ${rating}. This assessment considers cross-border engagements, foreign clients, offshore structures, and links to higher-risk jurisdictions. No detailed geographic data was available for this assessment.`;
  }
  const high = rows.filter(r => ['yes', 'partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The firm's geographic inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment considers exposure arising from cross-border engagements, foreign clients, offshore financial centres, and clients or structures connected to higher-risk jurisdictions.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} geographic risk ${high.length === 1 ? 'factor' : 'factors'}: ${list}. Exposure to FATF-listed or sanctioned jurisdictions, offshore structures, or foreign intermediaries increases the risk that the firm's services are used to move or obscure value across borders with reduced transparency.`;
  } else {
    narrative += `The firm's engagements are predominantly domestic, with limited cross-border elements, offshore structures, or exposure to higher-risk jurisdictions.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} geographic inherent risk rating requires jurisdiction screening of clients and beneficial owners, enhanced scrutiny of cross-border structures and fund flows, and ongoing monitoring of exposure to higher-risk and sanctioned jurisdictions.`;
  return narrative;
}

// Transaction & delivery channel inherent risk (Module 1 / Section A4)
export function generateTransactionRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A4.'));
  if (rows.length === 0) {
    return `The firm's transaction and delivery channel inherent risk profile has been assessed and determined to be ${rating}. This assessment considers cash payments, non-face-to-face onboarding, reliance on intermediaries, engagement value, and the routing of client funds. No detailed transaction or channel data was available for this assessment.`;
  }
  const high = rows.filter(r => ['yes', 'partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The firm's transaction and delivery channel inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment considers exposure arising from cash handling, non-face-to-face onboarding, reliance on intermediaries and introducers, engagement value relative to client profile, and the routing of client funds through the firm's own accounts.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} transaction or channel risk ${high.length === 1 ? 'factor' : 'factors'}: ${list}. Cash handling, unidentified third-party funds, intermediary-introduced or fully remote engagements, and routing of client money reduce visibility over the source and destination of funds and warrant proportionate control.`;
  } else {
    narrative += `The firm's engagements, payments and onboarding arrangements are predominantly lower-risk, with limited cash, transparent fund flows, and direct or well-controlled channels.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} transaction and delivery channel inherent risk rating requires controls over cash and third-party funds, oversight of intermediaries and introducers, identity controls for non-face-to-face onboarding, and monitoring of client-fund routing, commensurate with the assessed exposure.`;
  return narrative;
}

// Technical compliance (Module 2 / Section B)
export function generateTechnicalComplianceNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('B'));
  if (rows.length === 0) {
    return `The firm's technical compliance with AML/CFT/CPF legal and regulatory requirements has been assessed and determined to be ${rating}. This assessment evaluates whether the firm has established and documented the governance, business-wide risk assessment, customer due diligence, sanctions screening, and reporting controls required by law, regulation and NBAA guidance. No detailed technical compliance data was available for this assessment.`;
  }
  const full = rows.filter(r => r.response === 'Fully implemented & documented');
  const part = rows.filter(r => r.response === 'Partially implemented');
  const none = rows.filter(r => r.response === 'Not in place');

  let narrative = `The firm's technical compliance with AML/CFT/CPF legal and regulatory requirements has been comprehensively assessed and determined to be ${rating}. This assessment evaluates whether the firm has established and documented the governance, business-wide risk assessment, customer due diligence (including ultimate beneficial ownership and nominee detection), sanctions screening, and suspicious-transaction reporting controls required by the AML Act, the AML Regulations as amended, and NBAA/FIU guidance.\n\n`;

  narrative += `Of the controls assessed, ${full.length} ${full.length === 1 ? 'is' : 'are'} fully implemented and documented, ${part.length} ${part.length === 1 ? 'is' : 'are'} partially implemented, and ${none.length} ${none.length === 1 ? 'is' : 'are'} not in place.`;
  if (none.length > 0) {
    const gaps = none.slice(0, 6).map(r => stripQ(r.question_text)).join('; ');
    narrative += ` The principal gaps requiring remediation include: ${gaps}.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} technical compliance rating reflects the degree to which required controls are documented and operating. Remediation should prioritise the appointment and empowerment of a compliance officer at management level, a documented business-wide risk assessment, ultimate-beneficial-ownership and nominee detection, mandatory PEP determination, source-of-funds and source-of-wealth verification, sanctions screening, and a functioning suspicious-transaction reporting process, with employee screening, training, and independent audit as required by regulation.`;
  return narrative;
}

// Effectiveness (Module 3 / Section C)
export function generateEffectivenessNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('C'));
  if (rows.length === 0) {
    return `The effectiveness of the firm's AML/CFT/CPF controls has been assessed and determined to be ${rating}. This assessment evaluates whether established controls operate effectively in practice and consistently achieve their intended risk-mitigation objectives. No detailed effectiveness data was available for this assessment.`;
  }
  const eff = rows.filter(r => r.response === 'Effective');
  const weak = rows.filter(r => r.response === 'Weak');
  const ineff = rows.filter(r => r.response === 'Ineffective');

  let narrative = `The effectiveness of the firm's AML/CFT/CPF controls has been comprehensively assessed and determined to be ${rating}. This assessment evaluates whether established controls operate effectively in practice, consistently achieve their intended risk-mitigation objectives, and demonstrate appropriate quality, timeliness, and continuous improvement.\n\n`;

  narrative += `Of the areas assessed, ${eff.length} ${eff.length === 1 ? 'is' : 'are'} operating effectively, ${weak.length} ${weak.length === 1 ? 'shows' : 'show'} weaknesses, and ${ineff.length} ${ineff.length === 1 ? 'is' : 'are'} ineffective.`;
  if (weak.length + ineff.length > 0) {
    const areas = [...ineff, ...weak].slice(0, 6).map(r => stripQ(r.question_text)).join('; ');
    narrative += ` Areas requiring strengthening include: ${areas}.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} effectiveness rating reflects how well controls function in practice rather than on paper. The firm should focus on the practical detection of accounting red flags (nominee arrangements, formations without rationale, incomplete records), the timeliness and quality of suspicious-transaction reporting, the responsiveness of sanctions screening, and the use of monitoring outputs to drive continuous improvement.`;
  return narrative;
}
