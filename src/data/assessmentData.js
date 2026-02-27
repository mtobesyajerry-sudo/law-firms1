// Standard declaration for all attachments
export const ATTACHMENT_DECLARATION = 'I confirm that the attached document is accurate, current, and applicable to the assessment period.';

// Law Firm Categories - Tanzania Framework
export const institutionCategories = [
  { value: 'law_firm_small', label: 'Small / Sole Practitioner Firm', tier: 1 },
  { value: 'law_firm_medium', label: 'Medium / Corporate Firm', tier: 2 },
  { value: 'law_firm_large', label: 'Large / International / Specialist Firm', tier: 3 },
  { value: 'legal_consultancy', label: 'Legal Consultancy', tier: 2 },
  { value: 'notary_services', label: 'Notary Services', tier: 2 },
  { value: 'trust_company', label: 'Trust and Company Service Provider', tier: 3 }
];

// Backward compatibility export
export const dnfbpCategories = institutionCategories;

export function getFrameworkForCategory(categoryValue) {
  return 'legal_professionals';
}

export const employeeRanges = [
  { value: '1-10', label: '1-10 employees (Solo/Small Firm)' },
  { value: '11-50', label: '11-50 employees (Medium Firm)' },
  { value: '51-200', label: '51-200 employees (Large Firm)' },
  { value: '201+', label: '201+ employees (National/International Firm)' }
];

export const employeeRangesByCategory = {
  default: [
    { value: '1-10', label: '1-10 employees (Solo/Small Firm)' },
    { value: '11-50', label: '11-50 employees (Medium Firm)' },
    { value: '51-200', label: '51-200 employees (Large Firm)' },
    { value: '201+', label: '201+ employees (National/International Firm)' }
  ]
};

export function getEmployeeRangesForCategory(categoryValue) {
  return employeeRangesByCategory.default;
}

export const turnoverRanges = [
  { value: '0_100m', label: '0 - 100 Million TZS' },
  { value: '101m_1b', label: '101 Million - 1 Billion TZS' },
  { value: '1b_plus', label: 'Over 1 Billion TZS' }
];

// Response options with 5-point FATF risk scale
// Lower scores = better controls = lower risk
export const responseOptions = [
  { value: 'yes', label: 'Yes', score: 1 },      // Good controls = Low risk (1)
  { value: 'partial', label: 'Partially', score: 3 },  // Partial controls = Medium risk (3)
  { value: 'no', label: 'No', score: 5 },        // No controls = High risk (5)
  { value: 'na', label: 'Not Applicable', score: 0 }
];

export const riskRatingOptions = [
  { value: 'low', label: 'Low', score: 1 },
  { value: 'moderate', label: 'Moderate', score: 2 },
  { value: 'high', label: 'High', score: 3 }
];

export const riskLevels = {
  low: { threshold: 1.5, label: 'Low', color: '#10b981', action: 'Standard monitoring' },
  moderate: { threshold: 2.5, label: 'Moderate', color: '#f59e0b', action: 'Enhanced review' },
  high: { threshold: 3.0, label: 'High', color: '#ef4444', action: 'EDD + senior sign-off' }
};

// Calculate risk level based on score
export function calculateRiskLevel(score) {
  if (score < 1.5) return 'Low';
  if (score < 2.5) return 'Moderate';
  return 'High';
}

export function getRiskColor(level) {
  const levelLower = level?.toLowerCase();
  return riskLevels[levelLower]?.color || '#6b7280';
}

export function getRiskLabel(level) {
  const levelLower = level?.toLowerCase();
  return riskLevels[levelLower]?.label || level;
}

// Calculate section score on 5-point FATF risk scale
export function calculateSectionScore(responses, section) {
  let totalWeight = 0;
  let weightedScore = 0;
  let answeredCount = 0;
  let totalCount = 0;

  // Separate TC and E question scoring
  let tcWeightedScore = 0;
  let tcTotalWeight = 0;
  let eWeightedScore = 0;
  let eTotalWeight = 0;

  if (section.subsections) {
    section.subsections.forEach(subsection => {
      subsection.questions.forEach(question => {
        totalCount++;
        const response = responses.find(r => r.question_code === question.code);
        if (response && response.response && response.response !== 'na') {
          const option = responseOptions.find(opt => opt.value === response.response);
          if (option) {
            const weight = question.weight || 1;
            const scoreValue = option.score * weight;

            weightedScore += scoreValue;
            totalWeight += weight;
            answeredCount++;

            // Separate TC (technical compliance) and E (effectiveness) questions
            if (question.code && question.code.endsWith('-E')) {
              eWeightedScore += scoreValue;
              eTotalWeight += weight;
            } else {
              tcWeightedScore += scoreValue;
              tcTotalWeight += weight;
            }
          }
        }
      });
    });
  }

  // Calculate scores on 5-point scale
  const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const tcScore = tcTotalWeight > 0 ? tcWeightedScore / tcTotalWeight : 0;
  const eScore = eTotalWeight > 0 ? eWeightedScore / eTotalWeight : 0;

  return {
    score: overallScore,
    technical_compliance_score: tcScore,
    effectiveness_score: eScore,
    answeredCount,
    totalCount
  };
}

export function getTotalQuestionCount() {
  return 90; // Maximum for Tier 3 law firms in Tanzania (35+24+14+17)
}

export function requiresEDD(score) {
  return score >= 2.5;
}

export function getRequiredAction(score) {
  if (score >= 2.5) {
    return 'EDD + senior sign-off';
  } else if (score >= 1.5) {
    return 'Enhanced review';
  } else {
    return 'Standard monitoring';
  }
}
