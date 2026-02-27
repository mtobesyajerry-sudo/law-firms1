import {
  responseOptions,
  riskRatingOptions,
  calculateSectionScore,
  getRiskColor,
  calculateRiskLevel,
  getTotalQuestionCount
} from '../data/assessmentData';

import {
  banksFinancialInstitutionsFramework,
  banksFinancialInstitutionsAssessmentData,
  calculateBankInherentRisk,
  calculateBankCompliance,
  calculateBankEffectiveness,
  calculateBankResidualRisk,
  calculateBankMaturity
} from '../data/bankAssessmentData';

export function getFrameworkData(frameworkType) {
  return {
    type: 'banks_financial_institutions',
    framework: banksFinancialInstitutionsFramework,
    assessmentData: banksFinancialInstitutionsAssessmentData
  };
}

export function determineEntityTier(frameworkType, numberOfEmployees, annualTurnover, entityCategory) {
  return determineBankTier(numberOfEmployees, annualTurnover, entityCategory);
}

function determineBankTier(numberOfEmployees, annualTurnover, entityCategory) {
  const highRiskCategories = ['commercial_bank', 'investment_bank', 'bureau_de_change', 'money_transfer'];

  if (highRiskCategories.includes(entityCategory)) {
    return 3;
  }

  const isVeryLargeEmployeeBase = numberOfEmployees === '201+';
  const isLargeEmployeeBase = numberOfEmployees === '51-200';
  const isMediumEmployeeBase = numberOfEmployees === '11-50';
  const isLargeTurnover = annualTurnover === '1b_plus';
  const isMediumTurnover = annualTurnover === '101m_1b';

  if (isVeryLargeEmployeeBase || isLargeTurnover) {
    return 3;
  }

  if (isLargeEmployeeBase || isMediumTurnover) {
    return 2;
  }

  if (isMediumEmployeeBase) {
    return 2;
  }

  return 1;
}

export function getFilteredSections(frameworkType, tier) {
  return getBankFilteredSections(tier);
}

function getBankFilteredSections(tier) {
  const modules = [];
  const moduleKeys = Object.keys(banksFinancialInstitutionsAssessmentData.modules);
  console.log('📊 getBankFilteredSections called with tier:', tier);
  console.log('📊 Available module keys:', moduleKeys);

  moduleKeys.forEach(moduleKey => {
    const moduleData = banksFinancialInstitutionsAssessmentData.modules[moduleKey];
    console.log(`📊 Processing module ${moduleKey}:`, moduleData.title);
    const subsections = [];

    Object.keys(moduleData.sections).forEach(sectionCode => {
      const section = moduleData.sections[sectionCode];
      const applicableQuestions = section.questions.filter(q => q.minTier <= tier);

      if (applicableQuestions.length > 0) {
        subsections.push({
          code: sectionCode,
          name: section.title,
          questions: applicableQuestions
        });
      }
    });

    if (subsections.length > 0) {
      console.log(`📊 Module ${moduleKey} has ${subsections.length} subsections - ADDED`);
      modules.push({
        code: `MODULE_${moduleKey}`,
        name: moduleData.title,
        description: moduleData.description,
        subsections: subsections
      });
    } else {
      console.log(`📊 Module ${moduleKey} has 0 subsections - SKIPPED`);
    }
  });

  console.log('📊 Final modules array length:', modules.length);
  return modules;
}

export function getTierDescription(frameworkType, tier) {
  return banksFinancialInstitutionsFramework.tiers[tier]?.description || '';
}

export function getQuestionCountForTier(frameworkType, tier) {
  const modules = getBankFilteredSections(tier);
  let total = 0;
  modules.forEach(module => {
    module.subsections.forEach(subsection => {
      total += subsection.questions.length;
    });
  });
  return total;
}

export function calculateScores(frameworkType, responses, tier) {
  return calculateBankScores(responses, tier);
}

function calculateBankScores(responses, tier) {
  const inherentResult = calculateBankInherentRisk(responses, tier);
  const complianceResult = calculateBankCompliance(responses, tier);
  const effectivenessResult = calculateBankEffectiveness(responses, tier);
  const maturityResult = calculateBankMaturity(responses, tier);
  const residualResult = calculateBankResidualRisk(inherentResult.score, complianceResult, effectivenessResult);

  return {
    module1: inherentResult,
    module2: complianceResult,
    module3: effectivenessResult,
    module4: maturityResult,
    residualRisk: residualResult,
    overallRisk: residualResult.rating,
    hasRedFlags: residualResult.criticalGaps && residualResult.criticalGaps.length > 0,
    redFlags: residualResult.criticalGaps || [],
    criticalGaps: residualResult.criticalGaps || []
  };
}

export function getTotalQuestionCountForFramework(frameworkType) {
  return getQuestionCountForTier('banks_financial_institutions', 3);
}

export function getFrameworkLabel(frameworkType) {
  return 'Bank / Financial Institution';
}

export function getModuleTitle(frameworkType, moduleCode) {
  return `Module ${moduleCode.replace('module', '')}`;
}
