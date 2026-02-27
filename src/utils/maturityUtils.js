/**
 * Maturity Assessment Utility Functions
 *
 * Provides utility functions for:
 * - Maturity level calculations
 * - Control assessment scoring
 * - Gap identification
 * - Domain score aggregation
 */

// Maturity level constants
export const MATURITY_LEVELS = {
  INITIAL: 1,
  DEVELOPING: 2,
  DEFINED: 3,
  MANAGED: 4,
  OPTIMISED: 5
};

export const MATURITY_NAMES = {
  1: 'Initial / Ad hoc',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimised'
};

export const MATURITY_COLORS = {
  1: '#ef4444', // red-500
  2: '#f97316', // orange-500
  3: '#eab308', // yellow-500
  4: '#22c55e', // green-500
  5: '#3b82f6'  // blue-500
};

export const MATURITY_DESCRIPTIONS = {
  1: 'No formal control exists',
  2: 'Basic control exists but incomplete',
  3: 'Control formally defined and implemented',
  4: 'Control monitored and reviewed',
  5: 'Control continuously improved'
};

// Gap severity constants
export const GAP_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const GAP_SEVERITY_COLORS = {
  critical: '#dc2626', // red-600
  high: '#ea580c',    // orange-600
  medium: '#ca8a04',  // yellow-600
  low: '#16a34a'      // green-600
};

export const GAP_SEVERITY_SCORES = {
  critical: 10,
  high: 7,
  medium: 5,
  low: 3
};

/**
 * Calculate maturity score from implementation status and evidence quality
 */
export function calculateMaturityScore(implementationStatus, evidenceQuality, testingResult) {
  let baseScore = 0;

  // Base score from implementation status
  switch (implementationStatus) {
    case 'not-implemented':
      baseScore = 1;
      break;
    case 'partial':
      baseScore = 2;
      break;
    case 'implemented':
      baseScore = 3;
      break;
    case 'optimised':
      baseScore = 5;
      break;
    default:
      baseScore = 1;
  }

  // Adjust based on evidence quality (if implemented)
  if (baseScore >= 3) {
    switch (evidenceQuality) {
      case 'excellent':
        baseScore = Math.min(baseScore + 1, 5);
        break;
      case 'good':
        // No change
        break;
      case 'fair':
        baseScore = Math.max(baseScore - 0.5, 2);
        break;
      case 'poor':
        baseScore = Math.max(baseScore - 1, 1);
        break;
    }
  }

  // Adjust based on testing result (if tested)
  if (testingResult && baseScore >= 3) {
    switch (testingResult) {
      case 'passed':
        baseScore = Math.min(baseScore + 0.5, 5);
        break;
      case 'partial':
        baseScore = Math.max(baseScore - 0.5, 2);
        break;
      case 'failed':
        baseScore = Math.max(baseScore - 1, 1);
        break;
    }
  }

  return Math.round(baseScore);
}

/**
 * Calculate domain-level maturity score
 */
export function calculateDomainScore(controlAssessments, domainWeight) {
  if (!controlAssessments || controlAssessments.length === 0) {
    return {
      averageMaturity: 0,
      weightedScore: 0,
      controlsAssessed: 0,
      compliancePercentage: 0
    };
  }

  const totalMaturity = controlAssessments.reduce((sum, ca) => sum + (ca.maturity_level || 0), 0);
  const averageMaturity = totalMaturity / controlAssessments.length;

  // Weighted score: average maturity * 20 * domain weight (to get 0-100 scale)
  const weightedScore = (averageMaturity / 5) * 100 * domainWeight;

  // Compliance percentage: % of controls at level 3 or higher
  const compliantControls = controlAssessments.filter(ca => ca.maturity_level >= 3).length;
  const compliancePercentage = (compliantControls / controlAssessments.length) * 100;

  return {
    averageMaturity: parseFloat(averageMaturity.toFixed(2)),
    weightedScore: parseFloat(weightedScore.toFixed(2)),
    controlsAssessed: controlAssessments.length,
    compliancePercentage: parseFloat(compliancePercentage.toFixed(2))
  };
}

/**
 * Calculate overall institutional maturity
 */
export function calculateOverallMaturity(domainScores) {
  if (!domainScores || domainScores.length === 0) {
    return 0;
  }

  // Overall maturity is weighted average of domain maturity levels
  const totalWeightedMaturity = domainScores.reduce((sum, ds) => {
    return sum + (ds.average_maturity * ds.domain.weight);
  }, 0);

  return parseFloat(totalWeightedMaturity.toFixed(2));
}

/**
 * Identify gaps based on control assessment
 */
export function identifyControlGaps(controlAssessment, control) {
  const gaps = [];

  const maturityLevel = controlAssessment.maturity_level || 1;
  const implementationStatus = controlAssessment.implementation_status || 'not-implemented';
  const evidenceQuality = controlAssessment.evidence_quality;
  const testingResult = controlAssessment.testing_result;

  // Critical gap: Control not implemented
  if (implementationStatus === 'not-implemented' && control.is_mandatory) {
    gaps.push({
      gap_category: 'missing-control',
      severity: control.min_entity_tier === 1 ? 'critical' : 'high',
      gap_description: `Mandatory control "${control.control_name}" is not implemented`,
      regulatory_risk: `Non-compliance with ${control.regulatory_reference || 'regulatory requirements'}`,
      business_impact: 'High regulatory risk and potential enforcement action',
      recommended_action: `Immediately implement ${control.control_name} with documented policies and procedures`,
      priority_score: 10
    });
  }

  // High gap: Partial implementation
  if (implementationStatus === 'partial' && control.is_mandatory) {
    gaps.push({
      gap_category: 'weak-implementation',
      severity: maturityLevel === 1 ? 'high' : 'medium',
      gap_description: `Control "${control.control_name}" is only partially implemented`,
      regulatory_risk: `Partial compliance with ${control.regulatory_reference || 'requirements'}`,
      business_impact: 'Increased ML/TF risk exposure',
      recommended_action: `Complete implementation of ${control.control_name} and address identified gaps`,
      priority_score: 7
    });
  }

  // Medium gap: Poor evidence quality
  if (evidenceQuality === 'poor' && maturityLevel >= 3) {
    gaps.push({
      gap_category: 'inadequate-evidence',
      severity: 'medium',
      gap_description: `Insufficient evidence for control "${control.control_name}"`,
      regulatory_risk: 'Unable to demonstrate compliance during examination',
      business_impact: 'Risk of regulatory findings',
      recommended_action: `Improve documentation and evidence collection for ${control.control_name}`,
      priority_score: 5
    });
  }

  // Medium gap: Failed testing
  if (testingResult === 'failed') {
    gaps.push({
      gap_category: 'ineffective-testing',
      severity: 'high',
      gap_description: `Control "${control.control_name}" failed effectiveness testing`,
      regulatory_risk: 'Control not operating as designed',
      business_impact: 'Control deficiency may not prevent/detect ML/TF',
      recommended_action: `Remediate control deficiencies and retest ${control.control_name}`,
      priority_score: 8
    });
  }

  // Low maturity for mandatory controls
  if (maturityLevel < 3 && control.is_mandatory) {
    gaps.push({
      gap_category: 'weak-implementation',
      severity: maturityLevel === 1 ? 'critical' : 'high',
      gap_description: `Control "${control.control_name}" below minimum maturity level`,
      regulatory_risk: 'Control not meeting regulatory expectations',
      business_impact: 'Elevated ML/TF risk',
      recommended_action: `Enhance ${control.control_name} to achieve at least "Defined" maturity level`,
      priority_score: maturityLevel === 1 ? 9 : 6
    });
  }

  return gaps;
}

/**
 * Classify gap severity based on multiple factors
 */
export function classifyGapSeverity(controlAssessment, control, domainWeight) {
  let severityScore = 0;

  // Factor 1: Control importance (domain weight)
  severityScore += domainWeight * 10;

  // Factor 2: Mandatory vs optional
  if (control.is_mandatory) {
    severityScore += 3;
  } else {
    severityScore += 1;
  }

  // Factor 3: Minimum tier requirement
  if (control.min_entity_tier === 1) {
    severityScore += 3;
  } else if (control.min_entity_tier === 2) {
    severityScore += 2;
  } else {
    severityScore += 1;
  }

  // Factor 4: Current maturity level (inverse)
  const maturityLevel = controlAssessment.maturity_level || 1;
  severityScore += (6 - maturityLevel);

  // Classify based on total score
  if (severityScore >= 8) {
    return GAP_SEVERITY.CRITICAL;
  } else if (severityScore >= 6) {
    return GAP_SEVERITY.HIGH;
  } else if (severityScore >= 4) {
    return GAP_SEVERITY.MEDIUM;
  } else {
    return GAP_SEVERITY.LOW;
  }
}

/**
 * Generate remediation recommendation
 */
export function generateRemediationPlan(gap, controlAssessment, control) {
  const currentMaturity = controlAssessment.maturity_level || 1;
  const targetMaturity = Math.min(currentMaturity + 2, 5);

  // Estimate effort based on gap severity and maturity gap
  let estimatedDays = 0;
  const maturityGap = targetMaturity - currentMaturity;

  switch (gap.severity) {
    case 'critical':
      estimatedDays = maturityGap * 30;
      break;
    case 'high':
      estimatedDays = maturityGap * 20;
      break;
    case 'medium':
      estimatedDays = maturityGap * 10;
      break;
    case 'low':
      estimatedDays = maturityGap * 5;
      break;
  }

  return {
    action_description: gap.recommended_action,
    responsible_party: 'AML Compliance Team',
    accountable_party: 'MLRO',
    target_maturity_level: targetMaturity,
    estimated_effort_days: estimatedDays,
    priority: gap.severity,
    status: 'planned'
  };
}

/**
 * Calculate compliance percentage across all domains
 */
export function calculateCompliancePercentage(controlAssessments) {
  if (!controlAssessments || controlAssessments.length === 0) {
    return 0;
  }

  const compliantControls = controlAssessments.filter(ca => ca.maturity_level >= 3).length;
  return parseFloat(((compliantControls / controlAssessments.length) * 100).toFixed(2));
}

/**
 * Get maturity level label with color
 */
export function getMaturityLabel(level) {
  return {
    level,
    name: MATURITY_NAMES[level] || 'Unknown',
    color: MATURITY_COLORS[level] || '#6b7280',
    description: MATURITY_DESCRIPTIONS[level] || ''
  };
}

/**
 * Get gap severity label with color
 */
export function getGapSeverityLabel(severity) {
  return {
    severity,
    color: GAP_SEVERITY_COLORS[severity] || '#6b7280',
    score: GAP_SEVERITY_SCORES[severity] || 0
  };
}

/**
 * Generate snapshot data for trending
 */
export function generateSnapshotData(assessment, domainScores, controlAssessments) {
  const controlCountByLevel = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  controlAssessments.forEach(ca => {
    const level = ca.maturity_level || 1;
    controlCountByLevel[level]++;
  });

  const gapCountBySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  // This would be populated from gap_analysis table
  // For now, estimate from maturity levels
  controlAssessments.forEach(ca => {
    if (ca.maturity_level === 1) {
      gapCountBySeverity.critical++;
    } else if (ca.maturity_level === 2) {
      gapCountBySeverity.high++;
    }
  });

  return {
    overall_maturity: calculateOverallMaturity(domainScores),
    domain_scores: domainScores.reduce((obj, ds) => {
      obj[ds.domain.code] = ds.average_maturity;
      return obj;
    }, {}),
    control_count_by_level: controlCountByLevel,
    gap_count_by_severity: gapCountBySeverity
  };
}
