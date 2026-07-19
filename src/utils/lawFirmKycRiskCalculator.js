// Risk calculation utilities for the Law Firm / Legal Professionals KYC/CDD framework.
// Aligned with FATF RBA Guidance for Legal Professionals (2019), FIU Guide to DNFBPs 2023,
// Anti-Money Laundering Act Cap. 423, and AML Regulations 2022 (GN 397).
//
// §7 client-account fund flows are weighted as the primary ML risk vector for legal
// professionals, per FATF RBA service risk factors (a)-(c), (i), (p), (q).

const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
};

function yesScore(value, score) {
  return value === 'Yes' ? score : 0;
}

function scoreSelect(value, scoreMap, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  return scoreMap[value] ?? fallback;
}

export function calculateLawFirmKycRisk(formData) {
  if (!formData || typeof formData !== 'object') {
    return buildResult(0, {}, 'Low', 'Annual');
  }

  const {
    customer_data = {},
    source_of_funds = {},
    pep_declaration = {},
    sanctions_screening = {},
    customer_risk = {},
    suspicious_indicators = {},
  } = formData;

  const breakdown = {};

  // ── §7 Client Account and Fund Flows (PRIMARY ML RISK) ──────────────
  // FATF RBA (a) firm as financial intermediary, (b) trust account unconnected
  // to legal work, (c) transactions outside client account, (i) third-party
  // payer, (p)(q) unusual payment methods.
  breakdown.firm_as_intermediary =      yesScore(customer_data.firm_as_intermediary, 18);
  breakdown.funds_not_tied_to_activity = yesScore(customer_data.funds_not_tied_to_activity, 18);
  breakdown.transactions_outside_account = yesScore(customer_data.transactions_outside_account, 12);
  breakdown.third_party_payer =         yesScore(customer_data.third_party_payer, 10);
  breakdown.payment_method_risk =       scoreSelect(customer_data.payment_method, {
    'Precious metals or stones': 10,
    'Virtual assets': 10,
    'Cash': 6,
    'Other': 4,
    'Bank transfer': 0,
    'Cheque': 0,
    'Mobile money': 0,
  });
  breakdown.funds_through_client_account = yesScore(customer_data.funds_through_client_account, 3);

  const inflow = parseFloat(customer_data.expected_inflow || 0);
  breakdown.expected_inflow_risk = inflow > 50000000 ? 5 : inflow > 10000000 ? 3 : 0;

  // ── §6 Designated Activity (FATF R.22) ──────────────────────────────
  breakdown.activity_real_estate =           yesScore(customer_data.activity_real_estate, 4);
  breakdown.activity_client_money =          yesScore(customer_data.activity_client_money, 4);
  breakdown.activity_accounts =              yesScore(customer_data.activity_accounts, 4);
  breakdown.activity_company_contributions = yesScore(customer_data.activity_company_contributions, 4);
  breakdown.activity_entity_formation =      yesScore(customer_data.activity_entity_formation, 4);
  breakdown.acting_as_formation_agent =      yesScore(customer_data.acting_as_formation_agent, 5);
  breakdown.acting_as_nominee =              yesScore(customer_data.acting_as_nominee, 8);

  // ── §5 Service Type (inherent risk taxonomy 1-5) ────────────────────
  breakdown.service_type_risk = scoreSelect(customer_data.service_type, {
    'General legal advice and consultation': 2,
    'Family law and personal matters': 2,
    'Employment and labour law': 3,
    'Corporate and commercial transactions': 5,
    'Real estate and property transactions': 7,
    'Mergers, acquisitions and business sales': 10,
    'Trust formation and estate planning': 10,
    'International transactions and offshore structures': 10,
  });

  // ── §11 Client Risk Assessment (assessor's own rating) ──────────────
  breakdown.client_risk_level = scoreSelect(customer_risk.client_risk_level, {
    'Low - long-standing, transparent, domestic': 0,
    'Medium - new client, standard profile': 4,
    'High - PEP, complex structure, adverse media, reluctance to provide information': 8,
  });
  breakdown.geographic_risk_level = scoreSelect(customer_risk.geographic_risk_level, {
    'Low - Tanzania or equivalent jurisdiction': 0,
    'Medium - other foreign jurisdiction': 4,
    'High - jurisdiction subject to FATF call for action or increased monitoring': 8,
  });
  breakdown.service_risk_level = scoreSelect(customer_risk.service_risk_level, {
    'Low - advisory or litigation, no fund handling': 0,
    'Medium - transactional, limited fund handling': 3,
    'High - fund handling, entity formation, offshore or nominee arrangements': 6,
  });
  breakdown.delivery_channel_risk = scoreSelect(customer_risk.delivery_channel_risk, {
    'Face to face': 0,
    'Remote with verified identity': 2,
    'Remote, non-face-to-face, unverified': 6,
    'Through an intermediary': 4,
  });
  breakdown.overall_risk_rating = scoreSelect(customer_risk.overall_risk_rating, {
    'Low': 0,
    'Medium': 2,
    'High': 4,
  });

  // ── §9 PEP Declaration ──────────────────────────────────────────────
  breakdown.is_pep =             yesScore(pep_declaration.is_pep, 25);
  breakdown.pep_family_associate = yesScore(pep_declaration.pep_family_associate, 12);

  // ── §10 Sanctions Screening ─────────────────────────────────────────
  breakdown.sanctions_screening = scoreSelect(sanctions_screening.screening_result, {
    'No match': 0,
    'Potential match - under review': 15,
    'Confirmed match': 30,
  });

  // ── §8 Source of Funds ──────────────────────────────────────────────
  breakdown.funds_from_high_risk_jurisdiction = yesScore(source_of_funds.funds_from_high_risk_jurisdiction, 12);

  // ── §12 Red Flags (count-based) ─────────────────────────────────────
  const flagsCount = Array.isArray(suspicious_indicators.flags_observed)
    ? suspicious_indicators.flags_observed.length
    : 0;
  breakdown.red_flags_count = Math.min(flagsCount * 3, 15);

  // ── Aggregate ───────────────────────────────────────────────────────
  const rawTotal = Object.values(breakdown).reduce((s, v) => s + (v || 0), 0);
  const totalScore = Math.min(rawTotal, 100);

  let riskLevel;
  if (totalScore <= RISK_THRESHOLDS.LOW) riskLevel = 'Low';
  else if (totalScore <= RISK_THRESHOLDS.MEDIUM) riskLevel = 'Medium';
  else if (totalScore <= RISK_THRESHOLDS.HIGH) riskLevel = 'High';
  else riskLevel = 'Very High';

  const monitoringFrequencyMap = {
    Low: 'Annual',
    Medium: 'Semi-Annual',
    High: 'Quarterly',
    'Very High': 'Monthly',
  };

  return {
    totalScore,
    riskLevel,
    riskAssessment: breakdown,
    monitoringFrequency: monitoringFrequencyMap[riskLevel],
  };
}

function buildResult(score, breakdown, level, freq) {
  return {
    totalScore: score,
    riskLevel: level,
    riskAssessment: breakdown,
    monitoringFrequency: freq,
  };
}
