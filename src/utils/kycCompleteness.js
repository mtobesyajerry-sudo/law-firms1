export function isKycComplete({
  riskFactors,
  sourceOfFunds,
  amlTriggers,
  clientType,
  beneficialOwners = [],
  checkBeneficialOwners = false,
}) {
  const missing = [];

  const hasRiskFactors =
    riskFactors &&
    typeof riskFactors === 'object' &&
    Object.values(riskFactors).some(
      (cat) => cat && typeof cat === 'object' && Object.keys(cat).length > 0
    );
  if (!hasRiskFactors) missing.push('Risk assessment not completed');

  const sofStr =
    typeof sourceOfFunds === 'string'
      ? sourceOfFunds.trim()
      : sourceOfFunds && typeof sourceOfFunds === 'object'
      ? JSON.stringify(sourceOfFunds)
      : '';
  const isSofSubstantive = sofStr.length >= 3 && /[a-zA-Z]{3}/.test(sofStr);
  if (!sofStr || sofStr === '{}' || !isSofSubstantive) missing.push('Source of funds not provided');

  if (!amlTriggers || amlTriggers.length === 0) {
    missing.push('AML trigger activities not assessed (select "None apply" if none)');
  }

  if (checkBeneficialOwners) {
    const corporateTypes = ['company', 'corporate', 'trust', 'partnership', 'llp'];
    const isCorporate = corporateTypes.some((t) =>
      (clientType || '').toLowerCase().includes(t)
    );
    if (isCorporate && beneficialOwners.length === 0) {
      missing.push('Beneficial owner information required for corporate/trust clients');
    }
  }

  return { complete: missing.length === 0, missing };
}
