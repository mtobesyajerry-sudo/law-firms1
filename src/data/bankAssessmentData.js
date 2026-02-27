// RE-EXPORT LAW FIRMS FRAMEWORK
// This file now exports the Tanzania Law Firms assessment framework
// All bank/financial institution data has been replaced with law firm questionnaires

import {
  lawFirmsFramework,
  lawFirmsModules,
  lawFirmsCategories,
  lawFirmsTierProfiles,
  getLawFirmsQuestionsForTier,
  lawFirmsAssessmentData,
  generateInherentRiskNarrative,
  generateComplianceNarrative,
  generateEffectivenessNarrative,
  generateMaturityNarrative,
  generateResidualRiskNarrative,
  generateExecutiveSummary,
  determineAutomaticTier
} from './lawFirmAssessmentData';

// Export as banks framework for backward compatibility with existing code
export const banksFinancialInstitutionsFramework = lawFirmsFramework;

// Export modules with law firm questions
export const banksFinancialInstitutionsModules = lawFirmsModules;

// Export categories as law firms
export const banksFinancialInstitutionsCategories = lawFirmsCategories;

// Export tier profiles
export const banksFinancialInstitutionsTierProfiles = lawFirmsTierProfiles;

// Export function to get questions for tier
export function getBanksFinancialInstitutionsQuestionsForTier(tier) {
  return getLawFirmsQuestionsForTier(tier);
}

// Calculation functions remain unchanged - they work with any questionnaire structure
export function calculateBankInherentRisk(responses, tier) {
  const sectionScores = {};

  // FATF-compliant weights for inherent risk factors (per specification)
  const weights = {
    'A1': 0.25,  // Service & Practice Area Risk (25%)
    'A2': 0.25,  // Client Risk (25%)
    'A3': 0.15,  // Geographic Risk (15%)
    'A4': 0.20,  // Transaction & Structural Risk (20%)
    'A5': 0.15   // Professional Vulnerability (15%)
  };

  // FATF 1-5 scale: Higher score = Higher inherent risk
  const scoring = {
    'Yes': 5,        // High exposure to risk factor
    'Partially': 3,  // Moderate exposure
    'No': 1          // Low exposure (baseline risk, never zero)
  };

  const module1 = lawFirmsModules.module1;
  Object.keys(module1.sections).forEach(sectionCode => {
    const section = module1.sections[sectionCode];
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    if (applicableQuestions.length === 0) {
      sectionScores[sectionCode] = 1;
      return;
    }

    let totalScore = 0;
    let answeredCount = 0;

    applicableQuestions.forEach(q => {
      const response = responses[q.code];
      if (response && scoring[response] !== undefined) {
        totalScore += scoring[response];
        answeredCount++;
      } else {
        totalScore += 2;
        answeredCount++;
      }
    });

    sectionScores[sectionCode] = answeredCount > 0 ? totalScore / answeredCount : 1;
  });

  let weightedScore = 0;
  Object.keys(weights).forEach(sectionCode => {
    if (sectionScores[sectionCode] !== undefined) {
      weightedScore += sectionScores[sectionCode] * weights[sectionCode];
    }
  });

  weightedScore = Math.max(weightedScore, 1.5);

  let rating = 'Low';
  if (weightedScore >= 3.5) rating = 'High';
  else if (weightedScore >= 2.5) rating = 'Moderate';

  return {
    score: weightedScore,
    rating,
    sectionScores,
    details: sectionScores
  };
}

export function calculateBankCompliance(responses, tier) {
  const scoring = {
    'Fully implemented & documented': 1.0,
    'Partially implemented': 0.5,
    'Not in place': 0.0
  };

  let totalScore = 0;
  let maxScore = 0;
  const criticalGaps = [];
  const redFlags = [];

  const criticalControls = ['B1.1', 'B2.1', 'B3.1', 'B4.1', 'B5.1'];

  const module2 = lawFirmsModules.module2;
  Object.values(module2.sections).forEach(section => {
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    applicableQuestions.forEach(q => {
      maxScore += 1.0;
      const response = responses[q.code];

      if (response && scoring[response] !== undefined) {
        totalScore += scoring[response];

        if (criticalControls.includes(q.code) && response === 'Not in place') {
          criticalGaps.push({
            code: q.code,
            text: q.text
          });
          redFlags.push(`CRITICAL: ${q.text} is not in place`);
        }
      } else {
        if (criticalControls.includes(q.code)) {
          criticalGaps.push({
            code: q.code,
            text: q.text
          });
          redFlags.push(`CRITICAL: ${q.text} - status not assessed`);
        }
      }
    });
  });

  const effectiveness = maxScore > 0 ? totalScore / maxScore : 0;
  const percentage = Math.round(effectiveness * 100);
  const fatfScore = 5.0 - (effectiveness * 4.0);

  let rating = 'Non-Compliant';
  if (percentage >= 80) rating = 'Compliant';
  else if (percentage >= 60) rating = 'Partially Compliant';
  else if (percentage >= 40) rating = 'Weak';

  return {
    score: fatfScore,
    rawScore: totalScore,
    maxScore,
    effectiveness,
    percentage,
    rating,
    criticalGaps,
    redFlags,
    hasRedFlags: redFlags.length > 0
  };
}

export function calculateBankEffectiveness(responses, tier) {
  const scoring = {
    'Effective': 1.0,
    'Weak': 0.25,
    'Ineffective': 0.0
  };

  let totalScore = 0;
  let maxScore = 0;

  const module3 = lawFirmsModules.module3;
  Object.values(module3.sections).forEach(section => {
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    applicableQuestions.forEach(q => {
      maxScore += 1.0;
      const response = responses[q.code];
      if (response && scoring[response] !== undefined) {
        totalScore += scoring[response];
      }
    });
  });

  const effectiveness = maxScore > 0 ? totalScore / maxScore : 0;
  const percentage = Math.round(effectiveness * 100);
  const fatfScore = 5.0 - (effectiveness * 4.0);

  let rating = 'Ineffective';
  if (percentage >= 75) rating = 'Effective';
  else if (percentage >= 55) rating = 'Partially Effective';
  else if (percentage >= 30) rating = 'Weak';

  return {
    score: fatfScore,
    rawScore: totalScore,
    maxScore,
    effectiveness,
    percentage,
    rating
  };
}

export function calculateBankResidualRisk(inherentScore, complianceResult, effectivenessResult) {
  const complianceWeight = 0.60;
  const effectivenessWeight = 0.40;

  const overallControlEffectiveness =
    (complianceResult.effectiveness * complianceWeight) +
    (effectivenessResult.effectiveness * effectivenessWeight);

  const riskMultiplier = Math.max(1 - overallControlEffectiveness, 0.2);
  let residualScore = inherentScore * riskMultiplier;

  const hasRedFlags = complianceResult.hasRedFlags;
  if (hasRedFlags) {
    residualScore = Math.max(residualScore, 3.5);
  }

  if (effectivenessResult.percentage < 30) {
    residualScore = Math.max(residualScore, 3.0);
  }

  residualScore = Math.min(residualScore, 5.0);

  let rating = 'Low';
  if (residualScore >= 2.5) rating = 'High';
  else if (residualScore >= 1.5) rating = 'Moderate';

  return {
    score: residualScore,
    rating,
    inherentScore,
    overallControlEffectiveness: Math.round(overallControlEffectiveness * 100),
    riskMultiplier,
    complianceRating: complianceResult.rating,
    effectivenessRating: effectivenessResult.rating,
    redFlags: complianceResult.redFlags || [],
    criticalGaps: complianceResult.criticalGaps || [],
    hasRedFlags,
    formula: `${inherentScore.toFixed(2)} × ${riskMultiplier.toFixed(2)} = ${residualScore.toFixed(2)}`
  };
}

export function calculateBankMaturity(responses, tier) {
  // Updated scoring for 3-level maturity model (Basic, Developing, Advanced)
  const scoring = {
    'Basic': 1.0,
    'Developing': 2.0,
    'Advanced': 3.0
  };

  let totalScore = 0;
  let maxScore = 0;
  const domainScores = {};

  const module4 = lawFirmsModules.module4;
  Object.keys(module4.sections).forEach(sectionCode => {
    const section = module4.sections[sectionCode];
    const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

    if (applicableQuestions.length === 0) {
      return;
    }

    let sectionTotal = 0;
    let sectionMax = 0;

    applicableQuestions.forEach(q => {
      sectionMax += 3.0; // Maximum score per question (Advanced)
      const response = responses[q.code];
      if (response && scoring[response] !== undefined) {
        sectionTotal += scoring[response];
      } else {
        sectionTotal += 1.0; // Default to Basic if unanswered
      }
    });

    totalScore += sectionTotal;
    maxScore += sectionMax;

    domainScores[sectionCode] = sectionMax > 0 ? sectionTotal / sectionMax : 1.0;
  });

  // Calculate maturity as percentage of maximum
  const maturityPercentage = maxScore > 0 ? (totalScore / maxScore) : 0;
  const percentage = Math.round(maturityPercentage * 100);

  // Maturity rating based on 3-level scale
  let rating = 'Basic';
  if (maturityPercentage >= 0.75) rating = 'Advanced';      // 75%+ = Advanced
  else if (maturityPercentage >= 0.50) rating = 'Developing'; // 50-74% = Developing
  // else stays 'Basic' for < 50%

  return {
    score: maturityPercentage * 3, // Scale to 3.0 max for consistency
    rating,
    rawScore: totalScore,
    maxScore,
    percentage,
    domainScores,
    details: domainScores
  };
}

export const banksFinancialInstitutionsAssessmentData = lawFirmsAssessmentData;

// Export narrative generation functions
export {
  generateInherentRiskNarrative,
  generateComplianceNarrative,
  generateEffectivenessNarrative,
  generateMaturityNarrative,
  generateResidualRiskNarrative,
  generateExecutiveSummary,
  determineAutomaticTier
};
