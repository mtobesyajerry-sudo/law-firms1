// Risk calculation utilities for the Insurance KYC/CDD framework.
// Aligned with Tanzania AML Act, AML Regulations 2022, and FIU AML/CFT Guidelines to Insurers.

const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
};

function yesScore(value, score) {
  return value === 'Yes' ? score : 0;
}

export function calculateKycRiskScore(formData) {
  if (!formData || typeof formData !== 'object') {
    return buildResult(0, {});
  }

  const {
    customer_data = {},
    policy_information = {},
    source_of_funds = {},
    pep_declaration = {},
    customer_risk = {},
    ongoing_monitoring = {},
    suspicious_indicators = {},
    beneficiaries = [],
  } = formData;

  const riskAssessment = {};

  // Customer risk
  const customerRiskMap = { Low: 5, Medium: 15, High: 25, 'Very High': 35 };
  riskAssessment.customerRisk = customerRiskMap[customer_risk.customer_risk_rating] ?? 10;

  // Geographic risk
  const geoMap = {
    'Low – Tanzania domestic': 5,
    'Medium – East Africa': 15,
    'High – High-risk jurisdiction': 25,
    'Very High – FATF grey/blacklisted': 35,
  };
  riskAssessment.geographicRisk = geoMap[customer_risk.geographic_risk] ?? 10;

  // Product risk
  const productMap = { Low: 5, Medium: 15, High: 25 };
  riskAssessment.productRisk = productMap[customer_risk.product_risk] ?? 10;

  // Transaction risk — based on premium size
  const premium = parseFloat(policy_information.premium_amount || 0);
  if (premium > 50000000) riskAssessment.transactionRisk = 25;
  else if (premium > 10000000) riskAssessment.transactionRisk = 15;
  else riskAssessment.transactionRisk = 5;

  // Channel risk
  const channelMap = {
    'Direct (Low)': 5,
    'Broker (Medium)': 15,
    'Third-party (High)': 25,
  };
  riskAssessment.channelRisk = channelMap[customer_risk.channel_risk] ?? 10;

  // Beneficiary risk — multiple or unrelated beneficiaries
  const beneficiaryCount = Array.isArray(beneficiaries) ? beneficiaries.length : 0;
  riskAssessment.beneficiaryRisk = beneficiaryCount > 3 ? 15 : beneficiaryCount > 1 ? 8 : 3;

  // Behavioural risk — suspicious indicators
  const si = suspicious_indicators;
  riskAssessment.behaviouralRisk =
    yesScore(si.unusual_premium_size, 10) +
    yesScore(si.early_policy_surrender, 10) +
    yesScore(si.third_party_premium_payer, 15) +
    yesScore(si.unusual_beneficiary, 10) +
    yesScore(si.reluctant_to_provide_info, 15);

  // PEP adjustment
  const pepBoost =
    yesScore(pep_declaration.is_pep, 20) +
    yesScore(pep_declaration.related_to_pep, 10);

  const rawTotal =
    Object.values(riskAssessment).reduce((s, v) => s + (v || 0), 0) + pepBoost;

  const totalScore = Math.min(rawTotal, 100);

  let riskLevel;
  if (totalScore <= RISK_THRESHOLDS.LOW) riskLevel = 'Low';
  else if (totalScore <= RISK_THRESHOLDS.MEDIUM) riskLevel = 'Medium';
  else if (totalScore <= RISK_THRESHOLDS.HIGH) riskLevel = 'High';
  else riskLevel = 'Very High';

  const enhancedDdRequired = riskLevel === 'High' || riskLevel === 'Very High';
  const monitoringFrequencyMap = { Low: 'Annual', Medium: 'Semi-Annual', High: 'Quarterly', 'Very High': 'Monthly' };
  const monitoringFrequency = monitoringFrequencyMap[riskLevel];

  return {
    totalScore,
    riskLevel,
    riskAssessment,
    enhancedDdRequired,
    monitoringFrequency,
  };
}

function buildResult(score, breakdown) {
  return {
    totalScore: score,
    riskLevel: 'Low',
    riskAssessment: breakdown,
    enhancedDdRequired: false,
    monitoringFrequency: 'Annual',
  };
}

export function validateKycSection(section, sectionData) {
  const errors = {};
  if (!section || !section.fields) return errors;

  for (const field of section.fields) {
    if (!field.required) continue;
    const value = sectionData[field.name];
    if (value === undefined || value === null || value === '') {
      errors[field.name] = `${field.label} is required`;
    }
  }
  return errors;
}

export function getNextReviewDate(riskLevel) {
  const d = new Date();
  switch (riskLevel) {
    case 'Very High': d.setMonth(d.getMonth() + 1); break;
    case 'High': d.setMonth(d.getMonth() + 3); break;
    case 'Medium': d.setMonth(d.getMonth() + 6); break;
    default: d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

export function checkSuspiciousActivity(formData) {
  if (!formData || typeof formData !== 'object') return [];

  const alerts = [];
  const si = formData.suspicious_indicators || {};
  const policyInfo = formData.policy_information || {};
  const ongoingMonitoring = formData.ongoing_monitoring || {};

  if (si.unusual_premium_size === 'Yes') {
    alerts.push({
      severity: 'high',
      message: 'Unusually large premium relative to stated income',
      recommendation: 'Obtain source-of-funds evidence and senior compliance approval before proceeding.',
    });
  }
  if (si.early_policy_surrender === 'Yes') {
    alerts.push({
      severity: 'high',
      message: 'Request for early policy surrender with refund',
      recommendation: 'Investigate reason for early surrender. Consider filing an STR if no satisfactory explanation.',
    });
  }
  if (si.third_party_premium_payer === 'Yes') {
    alerts.push({
      severity: 'high',
      message: 'Premium paid by unrelated third party',
      recommendation: 'Apply EDD to the third-party payer. Obtain explanation and documentary evidence.',
    });
  }
  if (si.unusual_beneficiary === 'Yes') {
    alerts.push({
      severity: 'medium',
      message: 'Unusual or unrelated beneficiary designation',
      recommendation: 'Verify beneficiary identity and relationship. Document rationale.',
    });
  }
  if (si.reluctant_to_provide_info === 'Yes') {
    alerts.push({
      severity: 'medium',
      message: 'Customer reluctant to provide required information',
      recommendation: 'Do not proceed without complete KYC documentation. Consider declining if information withheld.',
    });
  }

  const premium = parseFloat(policyInfo.premium_amount || 0);
  if (premium > 50000000) {
    alerts.push({
      severity: 'medium',
      message: 'Premium amount exceeds TZS 50,000,000',
      recommendation: 'Enhanced source-of-funds verification required for high-value policies.',
    });
  }

  return alerts;
}
