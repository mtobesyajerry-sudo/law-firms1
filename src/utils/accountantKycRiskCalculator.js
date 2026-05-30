// Risk calculation utilities for the Accountants & Auditors KYC/CDD framework.
// Aligned with NBAA AML Guidelines 2025, Tanzania AML Act, and AML Regulations 2022.

const RISK_LEVELS = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
  VERY_HIGH: 'Very High Risk',
};

const RISK_COLORS = {
  [RISK_LEVELS.LOW]: '#38a169',
  [RISK_LEVELS.MEDIUM]: '#d69e2e',
  [RISK_LEVELS.HIGH]: '#e53e3e',
  [RISK_LEVELS.VERY_HIGH]: '#742a2a',
};

function scoreField(formData, fieldId, scoreMap, defaultScore = 0) {
  const value = formData[fieldId];
  if (value === undefined || value === null || value === '') return defaultScore;
  return scoreMap[value] ?? defaultScore;
}

export function calculateAccountantKycRisk(formData) {
  if (!formData || typeof formData !== 'object') {
    return {
      totalScore: 0,
      riskLevel: RISK_LEVELS.LOW,
      riskColor: RISK_COLORS[RISK_LEVELS.LOW],
      riskBreakdown: {},
    };
  }

  const breakdown = {};

  // PEP / Sanctions (high weight)
  breakdown.pep_status = scoreField(formData, 'is_pep', { Yes: 25, No: 0 });
  breakdown.pep_family = scoreField(formData, 'pep_family_member', { Yes: 15, No: 0 });
  breakdown.pep_associate = scoreField(formData, 'pep_close_associate', { Yes: 10, No: 0 });
  breakdown.sanctions = scoreField(formData, 'un_sanctions_list', { Yes: 30, No: 0 });
  breakdown.financial_crimes = scoreField(formData, 'financial_crimes_conviction', { Yes: 30, No: 0 });
  breakdown.regulatory_investigation = scoreField(formData, 'regulatory_investigation', { Yes: 15, No: 0 });
  breakdown.associated_sanctioned = scoreField(formData, 'associated_with_sanctioned', { Yes: 20, No: 0 });

  // Services requested (high-risk services)
  breakdown.managing_funds = formData.managing_client_funds ? 10 : 0;
  breakdown.nominee_director = formData.nominee_director ? 10 : 0;
  breakdown.opening_bank_accounts = formData.opening_bank_accounts ? 8 : 0;
  breakdown.company_formation = formData.company_formation ? 5 : 0;
  breakdown.buying_selling_business = formData.buying_selling_business ? 7 : 0;

  // Risk evaluation section
  breakdown.complex_ownership = scoreField(formData, 'complex_ownership_structures', { Yes: 15, No: 0 });
  breakdown.multi_jurisdiction = scoreField(formData, 'multiple_jurisdictions', { Yes: 10, No: 0 });
  breakdown.managing_client_funds_request = scoreField(formData, 'managing_client_funds_request', { Yes: 12, No: 0 });
  breakdown.aggressive_tax = scoreField(formData, 'aggressive_tax_structures', { Yes: 8, No: 0 });
  breakdown.buying_businesses = scoreField(formData, 'buying_selling_businesses', { Yes: 7, No: 0 });

  // Red flags
  breakdown.reluctant_id = scoreField(formData, 'reluctant_to_provide_id', { Yes: 20, No: 0 });
  breakdown.complex_no_rationale = scoreField(formData, 'complex_structures_no_rationale', { Yes: 15, No: 0 });
  breakdown.inconsistent_transactions = scoreField(formData, 'inconsistent_transactions', { Yes: 15, No: 0 });
  breakdown.fund_movement_requests = scoreField(formData, 'requests_fund_movement', { Yes: 18, No: 0 });
  breakdown.unusual_arrangements = scoreField(formData, 'unusual_arrangements', { Yes: 12, No: 0 });

  // Source of funds risk
  const highRiskFunds = ['Loan', 'Other'];
  const sofValue = formData.source_of_funds;
  breakdown.source_of_funds_risk = sofValue && highRiskFunds.includes(sofValue) ? 8 : 0;

  // Third-party intermediaries
  breakdown.third_party_intermediaries = scoreField(formData, 'third_party_intermediaries', { Yes: 8, No: 0 });

  // Sum all scores; cap at 100 for display
  const rawTotal = Object.values(breakdown).reduce((sum, v) => sum + (v || 0), 0);
  const totalScore = Math.min(rawTotal, 100);

  let riskLevel;
  if (totalScore <= 20) {
    riskLevel = RISK_LEVELS.LOW;
  } else if (totalScore <= 45) {
    riskLevel = RISK_LEVELS.MEDIUM;
  } else if (totalScore <= 70) {
    riskLevel = RISK_LEVELS.HIGH;
  } else {
    riskLevel = RISK_LEVELS.VERY_HIGH;
  }

  return {
    totalScore,
    riskLevel,
    riskColor: RISK_COLORS[riskLevel],
    riskBreakdown: breakdown,
  };
}

export function getMonitoringFrequency(riskLevel) {
  switch (riskLevel) {
    case RISK_LEVELS.VERY_HIGH: return 'Monthly';
    case RISK_LEVELS.HIGH: return 'Quarterly';
    case RISK_LEVELS.MEDIUM: return 'Semi-Annual';
    default: return 'Annual';
  }
}

export function getRiskMitigationAction(riskLevel) {
  switch (riskLevel) {
    case RISK_LEVELS.VERY_HIGH:
      return 'IMMEDIATE ACTION REQUIRED: Escalate to MLRO. Do not proceed without senior compliance approval. Consider declining engagement. File STR if suspicious activity confirmed.';
    case RISK_LEVELS.HIGH:
      return 'Enhanced Due Diligence required. Obtain senior management approval before engagement. Collect additional documentation on source of funds and beneficial ownership. Schedule quarterly reviews.';
    case RISK_LEVELS.MEDIUM:
      return 'Standard Due Diligence with enhanced monitoring. Verify all source of funds documentation. Schedule semi-annual reviews. Document rationale for engagement.';
    default:
      return 'Simplified Due Diligence applies. Maintain standard KYC documentation. Annual review schedule.';
  }
}

export function calculateNextReviewDate(riskLevel) {
  const now = new Date();
  switch (riskLevel) {
    case RISK_LEVELS.VERY_HIGH: {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    }
    case RISK_LEVELS.HIGH: {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 3);
      return d.toISOString().split('T')[0];
    }
    case RISK_LEVELS.MEDIUM: {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split('T')[0];
    }
    default: {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    }
  }
}
