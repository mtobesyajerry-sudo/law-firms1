import {
  banksFinancialInstitutionsFramework,
  banksFinancialInstitutionsAssessmentData,
  calculateBankInherentRisk,
  calculateBankCompliance,
  calculateBankEffectiveness,
  calculateBankResidualRisk
} from '../data/bankAssessmentData';

import {
  insurersAssessmentData,
  insurersModules
} from '../data/insuranceAssessmentData';

import {
  accountantsAssessmentData,
  accountantsModules
} from '../data/accountantAssessmentData';

// ---------------------------------------------------------------------------
// Sector → storage value mapping.
// Call when creating a new assessment to translate an org's sector field
// into the value stored in assessments.framework_type.
// ---------------------------------------------------------------------------
export function resolveFrameworkType(sector) {
  switch (sector) {
    case 'insurance':
    case 'insurer':             return 'insurer';
    case 'accounting':
    case 'audit_firm':          return 'audit_firm';
    case 'general_dnfbp':
    case 'dnfbp':               return 'general_dnfbp';
    case 'law_firm':
    case 'legal_professionals': return 'legal_professionals';
    default:                    return 'legal_professionals';
  }
}

// ---------------------------------------------------------------------------
// Framework data
// banks_financial_institutions and legal_professionals both return the same
// law-firm/bank content (the bank shim re-exports law-firm data), keeping
// the live tenant byte-for-byte identical to before.
// ---------------------------------------------------------------------------
export function getFrameworkData(frameworkType) {
  switch (frameworkType) {
    case 'insurer':
      return {
        type: 'insurer',
        framework: insurersAssessmentData.framework,
        assessmentData: insurersAssessmentData
      };

    case 'audit_firm':
      return {
        type: 'audit_firm',
        framework: accountantsAssessmentData.framework,
        assessmentData: accountantsAssessmentData
      };

    case 'general_dnfbp':
    case 'dnfbp':
      return { type: 'general_dnfbp', notConfigured: true, label: 'General DNFBP' };

    case 'banks_financial_institutions':
    case 'legal_professionals':
    default:
      return {
        type: frameworkType || 'legal_professionals',
        framework: banksFinancialInstitutionsFramework,
        assessmentData: banksFinancialInstitutionsAssessmentData
      };
  }
}

// ---------------------------------------------------------------------------
// Tier determination — same size-based logic for all sectors.
// The highRiskCategories list is bank-specific but harmless for other sectors
// because those category values never appear in insurer/audit-firm dropdowns.
// ---------------------------------------------------------------------------
export function determineEntityTier(frameworkType, numberOfEmployees, annualTurnover, entityCategory) {
  const highRiskCategories = ['commercial_bank', 'investment_bank', 'bureau_de_change', 'money_transfer'];
  if (highRiskCategories.includes(entityCategory)) return 3;
  if (numberOfEmployees === '201+' || annualTurnover === '1b_plus')   return 3;
  if (numberOfEmployees === '51-200' || annualTurnover === '101m_1b') return 2;
  if (numberOfEmployees === '11-50')                                   return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Section filtering — produces modules shaped as:
//   [{ code: 'MODULE_module1', name, description, subsections: [{code, name, questions}] }]
// The MODULE_${moduleKey} wrapper is identical across all sectors so that
// DetailedAssessmentReport / PrintableAssessmentReport keep working.
// ---------------------------------------------------------------------------
function buildFilteredSections(modulesObj, tier, profileFirst = false) {
  const modules = [];
  Object.keys(modulesObj).forEach(moduleKey => {
    const moduleData = modulesObj[moduleKey];
    const subsections = [];
    const isModule1 = moduleKey === 'module1';

    Object.keys(moduleData.sections).forEach(sectionCode => {
      const section = moduleData.sections[sectionCode];
      const applicableQuestions = (profileFirst && isModule1)
        ? section.questions
        : section.questions.filter(q => q.minTier <= tier);
      if (applicableQuestions.length > 0) {
        subsections.push({ code: sectionCode, name: section.title, questions: applicableQuestions });
      }
    });

    if (subsections.length > 0) {
      modules.push({
        code: `MODULE_${moduleKey}`,
        name: moduleData.title,
        description: moduleData.description,
        subsections
      });
    }
  });
  return modules;
}

export function getFilteredSections(frameworkType, tier, profileFirst = false) {
  switch (frameworkType) {
    case 'insurer':
      return buildFilteredSections(insurersModules, tier, profileFirst);
    case 'audit_firm':
      return buildFilteredSections(accountantsModules, tier, profileFirst);
    case 'general_dnfbp':
    case 'dnfbp':
      return [];
    case 'banks_financial_institutions':
    case 'legal_professionals':
    default:
      return buildFilteredSections(banksFinancialInstitutionsAssessmentData.modules, tier, profileFirst);
  }
}

// ---------------------------------------------------------------------------
// Tier description
// ---------------------------------------------------------------------------
export function getTierDescription(frameworkType, tier) {
  switch (frameworkType) {
    case 'insurer':    return insurersAssessmentData.tierProfiles[tier]?.description || '';
    case 'audit_firm': return accountantsAssessmentData.tierProfiles[tier]?.description || '';
    case 'banks_financial_institutions':
    case 'legal_professionals':
    default:           return banksFinancialInstitutionsFramework.tiers[tier]?.description || '';
  }
}

// ---------------------------------------------------------------------------
// Question counts
// ---------------------------------------------------------------------------
export function getQuestionCountForTier(frameworkType, tier) {
  const modules = getFilteredSections(frameworkType, tier);
  let total = 0;
  modules.forEach(module => module.subsections.forEach(sub => { total += sub.questions.length; }));
  return total;
}

export function getTotalQuestionCountForFramework(frameworkType) {
  return getQuestionCountForTier(frameworkType, 3);
}

// ---------------------------------------------------------------------------
// Score calculation
//
// module4 (maturity) is sourced from the Institutional Maturity Assessment
// (MaturityDashboard / controlAssessmentService), not from the question bank.
// calculateBankMaturity references lawFirmsModules.module4 which does not
// exist in any data file — calling it would throw a TypeError at runtime.
// module4 is set to null for all sectors; the maturity path is unaffected.
// ---------------------------------------------------------------------------
export function calculateScores(frameworkType, responses, tier) {
  switch (frameworkType) {
    case 'insurer': {
      const inherentResult      = calculateBankInherentRisk(responses, tier, insurersModules);
      const complianceResult    = calculateBankCompliance(responses, tier, insurersModules);
      const effectivenessResult = calculateBankEffectiveness(responses, tier, insurersModules);
      const residualResult      = calculateBankResidualRisk(
        inherentResult.score, complianceResult, effectivenessResult
      );
      return {
        module1: inherentResult,
        module2: complianceResult,
        module3: effectivenessResult,
        module4: null,
        residualRisk: residualResult,
        overallRisk: residualResult.rating,
        hasRedFlags: residualResult.criticalGaps?.length > 0,
        redFlags: residualResult.criticalGaps || [],
        criticalGaps: residualResult.criticalGaps || []
      };
    }

    case 'audit_firm': {
      const inherentResult      = calculateBankInherentRisk(responses, tier, accountantsModules);
      const complianceResult    = calculateBankCompliance(responses, tier, accountantsModules);
      const effectivenessResult = calculateBankEffectiveness(responses, tier, accountantsModules);
      const residualResult      = calculateBankResidualRisk(
        inherentResult.score, complianceResult, effectivenessResult
      );
      return {
        module1: inherentResult,
        module2: complianceResult,
        module3: effectivenessResult,
        module4: null,
        residualRisk: residualResult,
        overallRisk: residualResult.rating,
        hasRedFlags: residualResult.criticalGaps?.length > 0,
        redFlags: residualResult.criticalGaps || [],
        criticalGaps: residualResult.criticalGaps || []
      };
    }

    case 'general_dnfbp':
    case 'dnfbp':
      return null;

    case 'banks_financial_institutions':
    case 'legal_professionals':
    default: {
      // Preserves prior logic exactly — calculateBankMaturity is NOT called
      // (lawFirmsModules.module4 is undefined; calling it would throw).
      const inherentResult      = calculateBankInherentRisk(responses, tier);
      const complianceResult    = calculateBankCompliance(responses, tier);
      const effectivenessResult = calculateBankEffectiveness(responses, tier);
      const residualResult      = calculateBankResidualRisk(
        inherentResult.score, complianceResult, effectivenessResult
      );
      return {
        module1: inherentResult,
        module2: complianceResult,
        module3: effectivenessResult,
        module4: null,
        residualRisk: residualResult,
        overallRisk: residualResult.rating,
        hasRedFlags: residualResult.criticalGaps && residualResult.criticalGaps.length > 0,
        redFlags: residualResult.criticalGaps || [],
        criticalGaps: residualResult.criticalGaps || []
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export function getFrameworkLabel(frameworkType) {
  switch (frameworkType) {
    case 'insurer':                      return 'Insurance Company';
    case 'audit_firm':                   return 'Audit Firm';
    case 'general_dnfbp':
    case 'dnfbp':                        return 'General DNFBP';
    case 'legal_professionals':          return 'Law Firm / Legal Professional';
    case 'banks_financial_institutions':
    default:                             return 'Bank / Financial Institution';
  }
}

export function getModuleTitle(frameworkType, moduleCode) {
  return `Module ${moduleCode.replace('module', '')}`;
}
