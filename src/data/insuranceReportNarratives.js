// INSURANCE-SPECIFIC FIU REPORT NARRATIVES
// Drop-in sector variant of reportNarratives.js: identical function names and (rating, responses)
// signatures, identical code-prefix filtering and output shape (returns a prose string), with
// insurance-specific wording. Preserves the FIU four-category structure. The insurance-specific
// vulnerability section (A5) is folded into the product/service narrative.

function stripQ(text) {
  return (text || '')
    .replace(/^Does the (insurer|firm|institution|company) (write |offer |provide |issue |distribute |accept |handle |deal with |rely on |serve )?/i, '')
    .replace(/\?$/, '')
    .toLowerCase();
}

// Customer & Beneficiary inherent risk (Module 1 / Section A2)
export function generateCustomerRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A2.'));
  if (rows.length === 0) {
    return `The insurer's customer and beneficiary inherent risk profile has been assessed and determined to be ${rating}. This assessment considers the policyholder base, beneficiary designations, ownership structures of corporate policyholders, political exposure, third-party premium payers, and customer behaviour patterns. No detailed customer exposure data was available for this assessment.`;
  }
  const high = rows.filter(r => r.response?.toLowerCase() === 'yes');
  const partial = rows.filter(r => ['partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The insurer's customer and beneficiary inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from policyholder types, beneficiary designations, beneficial ownership of corporate policyholders, political exposure, third-party premium payers, and customer behaviour patterns.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} customer or beneficiary risk ${high.length === 1 ? 'characteristic' : 'characteristics'} that ${high.length === 1 ? 'presents' : 'present'} elevated inherent risk: ${list}. These present heightened money laundering, terrorist financing, or proliferation financing vulnerabilities — for example through politically exposed policyholders or beneficiaries, beneficiaries designated by class or changed shortly before payout, premiums funded by unrelated third parties, or opaque ownership behind corporate policyholders.`;
  } else {
    narrative += `The insurer serves predominantly lower-risk policyholders with transparent beneficial ownership, clearly identified beneficiaries, minimal political exposure, and premiums funded by the policyholders themselves.`;
  }
  narrative += `\n\n`;
  if (partial.length > 0) {
    narrative += `Additionally, the insurer has partial or limited exposure across ${partial.length} customer ${partial.length === 1 ? 'category' : 'categories'} requiring case-by-case assessment and proportionate due diligence. `;
  }
  narrative += `The ${rating} customer and beneficiary inherent risk rating requires risk-based customer due diligence, identification and verification of beneficiaries at designation and again before payout, screening of policyholders, payers and beneficiaries against sanctions and PEP lists, and source-of-funds verification for premiums commensurate with the assessed exposure. The insurer must maintain heightened vigilance over beneficiary changes and third-party payment arrangements in line with regulatory expectations.`;
  return narrative;
}

// Product & Service inherent risk (Module 1 / Section A1, plus insurance-specific vulnerability A5)
export function generateProductRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A1.') || r.question_code?.startsWith('A5.'));
  if (rows.length === 0) {
    return `The insurer's product and service inherent risk profile has been assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature and features of the products written — in particular life and investment-linked business that accumulates value or permits surrender. No detailed product data was available for this assessment.`;
  }
  const high = rows.filter(r => r.response?.toLowerCase() === 'yes');
  const partial = rows.filter(r => ['partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The insurer's product and service inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment evaluates exposure arising from the nature, features, and redeemability of products written — including life and investment-linked policies that accumulate cash value, permit surrender, accept single or flexible premiums, or pay benefits to third parties.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} higher-risk product or vulnerability ${high.length === 1 ? 'feature' : 'features'}, specifically: ${list}. Such features are recognised under the FATF Recommendations and Tanzania's AML/CFT framework as susceptible to misuse — life and investment products that build redeemable value, single-premium and unit-linked policies, and arrangements permitting early surrender, overpayment and refund, or assignment can be exploited to place, layer, or integrate illicit proceeds through the insurance sector.`;
  } else {
    narrative += `The insurer writes predominantly lower-risk business, such as general (non-life) and pure-protection cover, with limited exposure to redeemable, investment-linked, or single-premium products.`;
  }
  narrative += `\n\n`;
  if (partial.length > 0) {
    narrative += `Additionally, the insurer has partial or limited exposure to ${partial.length} product ${partial.length === 1 ? 'feature' : 'features'} requiring proportionate, product-specific controls. `;
  }
  narrative += `The ${rating} product and service inherent risk rating requires product-specific controls, including scrutiny of single-premium and early-surrender activity, controls over premium refunds and policy assignment, and monitoring for churn. The insurer must ensure its risk management framework addresses the specific vulnerabilities of redeemable and investment-linked products.`;
  return narrative;
}

// Geographic inherent risk (Module 1 / Section A3)
export function generateGeographicRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A3.'));
  if (rows.length === 0) {
    return `The insurer's geographic inherent risk profile has been assessed and determined to be ${rating}. This assessment considers cross-border premiums and payouts, foreign intermediaries and reinsurers, and links to higher-risk jurisdictions. No detailed geographic data was available for this assessment.`;
  }
  const high = rows.filter(r => ['yes', 'partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The insurer's geographic inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment considers exposure arising from cross-border premium payments and benefit payouts, foreign intermediaries and reinsurers, and policyholders or beneficiaries connected to higher-risk jurisdictions.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} geographic risk ${high.length === 1 ? 'factor' : 'factors'}: ${list}. Exposure to FATF-listed or sanctioned jurisdictions, offshore premium flows, or foreign intermediaries increases the risk that the insurer is used to move value across borders with reduced transparency.`;
  } else {
    narrative += `The insurer's business is predominantly domestic, with limited cross-border premium flows, foreign intermediation, or exposure to higher-risk jurisdictions.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} geographic inherent risk rating requires jurisdiction screening of policyholders, payers, beneficiaries and intermediaries, enhanced scrutiny of cross-border premium and payout flows, and ongoing monitoring of exposure to higher-risk and sanctioned jurisdictions in line with regulatory expectations.`;
  return narrative;
}

// Transaction & delivery channel inherent risk (Module 1 / Section A4)
export function generateTransactionRiskNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('A4.'));
  if (rows.length === 0) {
    return `The insurer's transaction and delivery channel inherent risk profile has been assessed and determined to be ${rating}. This assessment considers premium size and velocity, cash premiums, refund and payout patterns, and the use of intermediaries and remote distribution channels. No detailed transaction or channel data was available for this assessment.`;
  }
  const high = rows.filter(r => ['yes', 'partially', 'partial'].includes(r.response?.toLowerCase()));

  let narrative = `The insurer's transaction and delivery channel inherent risk profile has been comprehensively assessed and determined to be ${rating}. This assessment considers exposure arising from premium size, frequency and velocity, cash premium payments, refund and surrender payout patterns, and the distribution model — including reliance on brokers and agents and non-face-to-face onboarding.\n\n`;

  if (high.length > 0) {
    const list = high.slice(0, 7).map(r => stripQ(r.question_text)).join('; ');
    narrative += `The assessment identified ${high.length} transaction or channel risk ${high.length === 1 ? 'factor' : 'factors'}: ${list}. Cash premiums, large or rapid single-premium payments, refunds directed to third parties, and intermediary-introduced or fully remote business reduce visibility over the source and destination of funds and warrant proportionate control.`;
  } else {
    narrative += `The insurer's premiums, payouts and distribution arrangements are predominantly lower-risk, with limited cash, transparent payment flows, and direct or well-controlled intermediary channels.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} transaction and delivery channel inherent risk rating requires monitoring of premium and payout patterns, controls over cash and third-party payments, oversight of intermediaries acting on the insurer's behalf, and identity controls for non-face-to-face onboarding, commensurate with the assessed exposure.`;
  return narrative;
}

// Technical compliance (Module 2 / Section B)
export function generateTechnicalComplianceNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('B'));
  if (rows.length === 0) {
    return `The insurer's technical compliance with AML/CFT/CPF legal and regulatory requirements has been assessed and determined to be ${rating}. This assessment evaluates whether the insurer has established and documented the controls, policies, governance, and training required by law, regulation and TIRA guidance. No detailed technical compliance data was available for this assessment.`;
  }
  const full = rows.filter(r => r.response === 'Fully implemented & documented');
  const part = rows.filter(r => r.response === 'Partially implemented');
  const none = rows.filter(r => r.response === 'Not in place');

  let narrative = `The insurer's technical compliance with AML/CFT/CPF legal and regulatory requirements has been comprehensively assessed and determined to be ${rating}. This assessment evaluates whether the insurer has established and documented the governance, business-wide risk assessment, customer and beneficiary due diligence, sanctions screening, and suspicious-transaction reporting controls required by the AML Act, the AML Regulations as amended, and TIRA guidance.\n\n`;

  narrative += `Of the controls assessed, ${full.length} ${full.length === 1 ? 'is' : 'are'} fully implemented and documented, ${part.length} ${part.length === 1 ? 'is' : 'are'} partially implemented, and ${none.length} ${none.length === 1 ? 'is' : 'are'} not in place.`;
  if (none.length > 0) {
    const gaps = none.slice(0, 6).map(r => stripQ(r.question_text)).join('; ');
    narrative += ` The principal gaps requiring remediation include: ${gaps}.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} technical compliance rating reflects the degree to which required controls are documented and operating. Remediation should prioritise the appointment and empowerment of a compliance officer at management level, a documented business-wide risk assessment, beneficiary due diligence at designation and payout, sanctions and PEP screening, source-of-funds verification, and a functioning suspicious-transaction reporting process, with employee screening, training, and independent audit as required by regulation.`;
  return narrative;
}

// Effectiveness (Module 3 / Section C)
export function generateEffectivenessNarrative(rating, responses) {
  const rows = responses.filter(r => r.question_code?.startsWith('C'));
  if (rows.length === 0) {
    return `The effectiveness of the insurer's AML/CFT/CPF controls has been assessed and determined to be ${rating}. This assessment evaluates whether established controls operate effectively in practice and consistently achieve their intended risk-mitigation objectives. No detailed effectiveness data was available for this assessment.`;
  }
  const eff = rows.filter(r => r.response === 'Effective');
  const weak = rows.filter(r => r.response === 'Weak');
  const ineff = rows.filter(r => r.response === 'Ineffective');

  let narrative = `The effectiveness of the insurer's AML/CFT/CPF controls has been comprehensively assessed and determined to be ${rating}. This assessment evaluates whether established controls operate effectively in practice, consistently achieve their intended risk-mitigation objectives, and demonstrate appropriate quality, timeliness, and continuous improvement.\n\n`;

  narrative += `Of the areas assessed, ${eff.length} ${eff.length === 1 ? 'is' : 'are'} operating effectively, ${weak.length} ${weak.length === 1 ? 'shows' : 'show'} weaknesses, and ${ineff.length} ${ineff.length === 1 ? 'is' : 'are'} ineffective.`;
  if (weak.length + ineff.length > 0) {
    const areas = [...ineff, ...weak].slice(0, 6).map(r => stripQ(r.question_text)).join('; ');
    narrative += ` Areas requiring strengthening include: ${areas}.`;
  }
  narrative += `\n\n`;
  narrative += `The ${rating} effectiveness rating reflects how well controls function in practice rather than merely on paper. The insurer should focus on the operational quality of beneficiary due diligence, the timeliness and quality of suspicious-transaction reporting, the responsiveness of sanctions screening, and the use of monitoring outputs to drive continuous improvement.`;
  return narrative;
}
