import { supabase } from '../supabaseClient';

export const integrationService = {
  async getClientCompleteProfile(clientId) {
    try {
      const { data: client, error: clientError } = await supabase
        .from('kyc_clients_decrypted')
        .select(`
          *,
          client_matter_relationships (
            matter_id,
            relationship_type,
            matters (
              id,
              matter_name,
              matter_type,
              status,
              risk_level,
              opened_date,
              estimated_value,
              currency
            )
          )
        `)
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const { data: alerts, error: alertsError } = await supabase
        .from('transaction_alerts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('Error loading alerts:', alertsError);
      }

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('module_1_score, module_2_score, module_3_score, module_4_score, overall_risk_rating, completed_at')
        .eq('organization_id', client.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const alertStats = this.calculateAlertStatistics(alerts || []);
      const riskProfile = this.calculateCompositeRisk(client, alertStats, assessment);

      return {
        client,
        alerts: alerts || [],
        alertStats,
        institutionalAssessment: assessment,
        riskProfile,
        recommendations: this.generateRecommendations(client, alertStats, assessment)
      };
    } catch (error) {
      console.error('Error fetching complete client profile:', error);
      throw error;
    }
  },

  calculateAlertStatistics(alerts) {
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.alert_severity?.toLowerCase() === 'critical').length,
      high: alerts.filter(a => a.alert_severity?.toLowerCase() === 'high').length,
      strFiled: alerts.filter(a => a.str_filed).length,
      falsePositives: alerts.filter(a => a.resolution_type === 'False Positive').length,
      pending: alerts.filter(a => a.investigation_status?.toLowerCase() === 'new' || a.investigation_status?.toLowerCase() === 'in_progress').length,
      last30Days: alerts.filter(a => {
        const alertDate = new Date(a.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return alertDate >= thirtyDaysAgo;
      }).length,
      averageScore: alerts.length > 0
        ? alerts.reduce((sum, a) => sum + (a.alert_score || 0), 0) / alerts.length
        : 0
    };
  },

  calculateCompositeRisk(client, alertStats, assessment) {
    let riskScore = 0;
    let factors = [];

    // CRITICAL: Client risk is calculated ONLY from client-specific factors
    // Institutional assessment scores are NEVER used in this calculation
    // Assessment data is passed only for context viewing in the UI

    const baseRiskMap = {
      'Very Low': 1,
      'Low': 2,
      'Medium': 3,
      'Substantial': 3.5,
      'High': 4,
      'Very High': 5
    };
    const baseRisk = baseRiskMap[client.current_risk_rating] || 3;
    riskScore += baseRisk * 20;
    factors.push({ name: 'KYC Base Risk', value: baseRisk, weight: 20 });

    if (alertStats.total > 0) {
      const alertRiskScore = Math.min(5, Math.floor(alertStats.total / 3) + 1);
      riskScore += alertRiskScore * 15;
      factors.push({ name: 'Alert History', value: alertRiskScore, weight: 15 });
    }

    if (alertStats.strFiled > 0) {
      riskScore += 5 * 15;
      factors.push({ name: 'STR Filed', value: 5, weight: 15 });
    }

    if (alertStats.last30Days > 2) {
      const recentActivityScore = Math.min(5, alertStats.last30Days);
      riskScore += recentActivityScore * 10;
      factors.push({ name: 'Recent Alert Activity', value: recentActivityScore, weight: 10 });
    }

    if (client.pep_status) {
      riskScore += 4 * 15;
      factors.push({ name: 'PEP Status', value: 4, weight: 15 });
    }

    if (client.sanctioned_entity) {
      riskScore += 5 * 15;
      factors.push({ name: 'Sanctions Match', value: 5, weight: 15 });
    }

    // Note: We check for a field that doesn't exist yet (fatf_high_risk_jurisdiction)
    // This should be added to kyc_clients table based on client's country
    if (client.fatf_high_risk_jurisdiction) {
      riskScore += 4 * 10;
      factors.push({ name: 'High Risk Jurisdiction', value: 4, weight: 10 });
    }

    const normalizedScore = Math.min(100, Math.max(0, riskScore));

    let compositeRating;
    if (normalizedScore >= 80) compositeRating = 'Very High';
    else if (normalizedScore >= 60) compositeRating = 'High';
    else if (normalizedScore >= 40) compositeRating = 'Medium';
    else if (normalizedScore >= 20) compositeRating = 'Low';
    else compositeRating = 'Very Low';

    return {
      score: normalizedScore,
      rating: compositeRating,
      factors,
      breakdown: {
        kycRisk: baseRisk,
        alertRisk: alertStats.total > 0 ? Math.min(5, Math.floor(alertStats.total / 3) + 1) : 0,
        behaviorRisk: alertStats.last30Days > 2 ? Math.min(5, alertStats.last30Days) : 0,
        // Institutional context is for DISPLAY ONLY, never used in calculations
        institutionalContext: assessment?.module_3_score || null
      }
    };
  },

  generateRecommendations(client, alertStats, assessment) {
    const recommendations = [];

    if (alertStats.total > 5 && client.current_dd_level !== 'enhanced') {
      recommendations.push({
        priority: 'High',
        action: 'Upgrade to Enhanced Due Diligence',
        reason: `Client has ${alertStats.total} alerts but is only on ${client.current_dd_level} DD`,
        category: 'kyc'
      });
    }

    if (alertStats.strFiled > 0 && !client.enhanced_dd_required) {
      recommendations.push({
        priority: 'High',
        action: 'Enable Enhanced Monitoring',
        reason: `${alertStats.strFiled} STR(s) filed but enhanced monitoring not active`,
        category: 'monitoring'
      });
    }

    if (alertStats.pending > 3) {
      recommendations.push({
        priority: 'Medium',
        action: 'Prioritize Alert Investigation',
        reason: `${alertStats.pending} alerts pending investigation`,
        category: 'operations'
      });
    }

    const daysSinceLastReview = client.last_review_date
      ? Math.floor((Date.now() - new Date(client.last_review_date)) / (1000 * 60 * 60 * 24))
      : 999;

    const reviewFrequency = {
      'Very High': 90,
      'High': 180,
      'Medium': 365,
      'Low': 730,
      'Very Low': 730
    };

    const requiredFrequency = reviewFrequency[client.current_risk_rating] || 365;
    if (daysSinceLastReview > requiredFrequency) {
      recommendations.push({
        priority: 'Medium',
        action: 'Schedule KYC Review',
        reason: `Last review was ${daysSinceLastReview} days ago (${client.current_risk_rating} risk requires ${requiredFrequency} days)`,
        category: 'kyc'
      });
    }

    if (assessment && assessment.module_3_score < 2.5 && alertStats.falsePositives > alertStats.strFiled * 3) {
      recommendations.push({
        priority: 'High',
        action: 'Review Monitoring Thresholds',
        reason: 'High false positive rate combined with low institutional control effectiveness',
        category: 'assessment'
      });
    }

    if (!client.source_of_funds_verified && client.current_risk_rating !== 'Low') {
      recommendations.push({
        priority: 'High',
        action: 'Verify Source of Funds',
        reason: 'SOF not verified for non-low risk client',
        category: 'kyc'
      });
    }

    return recommendations;
  },

  async getOrganizationRiskOverview(organizationId) {
    try {
      console.log('[IntegrationService] Loading organization risk overview for:', organizationId);

      const [clientsResult, assessmentResult, alertsResult] = await Promise.all([
        supabase
          .from('kyc_clients')
          .select('current_risk_rating, pep_status, client_status, current_dd_level')
          .eq('organization_id', organizationId),

        supabase
          .from('assessments')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('transaction_alerts')
          .select('*')
          .eq('organization_id', organizationId)
      ]);

      if (clientsResult.error) {
        console.error('[IntegrationService] Error loading clients:', clientsResult.error);
        throw clientsResult.error;
      }

      if (assessmentResult.error) {
        console.error('[IntegrationService] Error loading assessment:', assessmentResult.error);
        throw assessmentResult.error;
      }

      const clients = clientsResult.data || [];
      const alerts = alertsResult.data || [];
      const assessment = assessmentResult.data;

      console.log('[IntegrationService] Data loaded:', {
        clientCount: clients.length,
        alertCount: alerts.length,
        hasAssessment: !!assessment
      });

      const clientDistribution = {
        total: clients.length,
        byRisk: {
          veryHigh: clients.filter(c => c.current_risk_rating === 'Very High').length,
          high: clients.filter(c => c.current_risk_rating === 'High').length,
          substantial: clients.filter(c => c.current_risk_rating === 'Substantial').length,
          medium: clients.filter(c => c.current_risk_rating === 'Medium').length,
          low: clients.filter(c => c.current_risk_rating === 'Low').length,
          veryLow: clients.filter(c => c.current_risk_rating === 'Very Low').length
        },
        peps: clients.filter(c => c.pep_status).length,
        active: clients.filter(c => c.client_status === 'active').length,
        byDDLevel: {
          enhanced: clients.filter(c => c.current_dd_level === 'enhanced').length,
          standard: clients.filter(c => c.current_dd_level === 'standard').length,
          simplified: clients.filter(c => c.current_dd_level === 'simplified').length
        }
      };

      const alertMetrics = {
        total: alerts.length,
        bySeverity: {
          critical: alerts.filter(a => a.alert_severity?.toLowerCase() === 'critical').length,
          high: alerts.filter(a => a.alert_severity?.toLowerCase() === 'high').length,
          medium: alerts.filter(a => a.alert_severity?.toLowerCase() === 'medium').length,
          low: alerts.filter(a => a.alert_severity?.toLowerCase() === 'low').length
        },
        byStatus: {
          new: alerts.filter(a => a.investigation_status?.toLowerCase() === 'new').length,
          underInvestigation: alerts.filter(a => a.investigation_status?.toLowerCase() === 'in_progress').length,
          escalated: alerts.filter(a => a.investigation_status?.toLowerCase() === 'escalated').length,
          resolved: alerts.filter(a => a.investigation_status?.toLowerCase() === 'resolved').length
        },
        strFiled: alerts.filter(a => a.str_filed).length,
        last30Days: alerts.filter(a => {
          const alertDate = new Date(a.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return alertDate >= thirtyDaysAgo;
        }).length
      };

      const highRiskPercentage = (clientDistribution.byRisk.high + clientDistribution.byRisk.veryHigh) /
                                 clientDistribution.total * 100;

      const alertRate = clientDistribution.total > 0
        ? (alertMetrics.total / clientDistribution.total).toFixed(2)
        : 0;

      const strRate = alertMetrics.total > 0
        ? (alertMetrics.strFiled / alertMetrics.total * 100).toFixed(1)
        : 0;

      const healthScore = this.calculateOrganizationHealthScore(clientDistribution, alertMetrics, assessment);

      const pendingAlerts = alertMetrics.byStatus.new + alertMetrics.byStatus.underInvestigation;

      const recommendations = [];

      if (highRiskPercentage > 15 && alertMetrics.last30Days > 5) {
        recommendations.push({
          priority: 'High',
          category: 'KYC Review',
          action: 'Review high-risk clients with recent alerts',
          reason: `${clientDistribution.byRisk.high + clientDistribution.byRisk.veryHigh} high-risk clients have generated ${alertMetrics.last30Days} alerts in last 30 days`
        });
      }

      if (pendingAlerts > clientDistribution.total * 0.2) {
        recommendations.push({
          priority: 'High',
          category: 'Monitoring',
          action: 'Clear alert backlog',
          reason: `${pendingAlerts} pending alerts (${((pendingAlerts / alertMetrics.total) * 100).toFixed(0)}% of total)`
        });
      }

      if (assessment && assessment.module_3_score < 2.5) {
        recommendations.push({
          priority: 'High',
          category: 'Controls',
          action: 'Strengthen AML/CFT controls',
          reason: `Control effectiveness score is ${assessment.module_3_score.toFixed(1)}/5 (below adequate threshold)`
        });
      }

      if (clientDistribution.byDDLevel.enhanced < (clientDistribution.byRisk.high + clientDistribution.byRisk.veryHigh)) {
        const needingUpgrade = (clientDistribution.byRisk.high + clientDistribution.byRisk.veryHigh) - clientDistribution.byDDLevel.enhanced;
        recommendations.push({
          priority: 'Medium',
          category: 'Enhanced DD',
          action: `Upgrade ${needingUpgrade} clients to Enhanced DD`,
          reason: 'High-risk clients should be on Enhanced Due Diligence level'
        });
      }

      const result = {
        organizationId,
        kycStats: {
          totalClients: clientDistribution.total,
          highRiskCount: clientDistribution.byRisk.high + clientDistribution.byRisk.veryHigh,
          pepCount: clientDistribution.peps,
          activeClients: clientDistribution.active,
          distribution: clientDistribution.byRisk
        },
        alertStats: {
          totalAlerts: alertMetrics.total,
          pendingAlerts,
          strCount: alertMetrics.strFiled,
          criticalCount: alertMetrics.bySeverity.critical,
          last30Days: alertMetrics.last30Days
        },
        assessment: assessment ? {
          overall_risk_rating: assessment.overall_risk_rating,
          completed_at: assessment.completed_at,
          module_1_score: assessment.module_1_score,
          module_2_score: assessment.module_2_score,
          module_3_score: assessment.module_3_score,
          module_4_score: assessment.module_4_score
        } : null,
        healthScore: {
          score: healthScore.score,
          rating: healthScore.rating,
          breakdown: {
            kycHealth: healthScore.breakdown.kycHealth,
            alertPerformance: healthScore.breakdown.alertPerformance,
            controlEffectiveness: healthScore.breakdown.controlEffectiveness,
            riskBalance: healthScore.breakdown.riskBalance
          }
        },
        recommendations,
        keyMetrics: {
          highRiskPercentage: highRiskPercentage.toFixed(1),
          alertRate,
          strRate,
          pepPercentage: clientDistribution.total > 0
            ? (clientDistribution.peps / clientDistribution.total * 100).toFixed(1)
            : '0.0'
        }
      };

      console.log('[IntegrationService] Returning data:', {
        hasKycStats: !!result.kycStats,
        hasAlertStats: !!result.alertStats,
        hasHealthScore: !!result.healthScore,
        recommendationCount: result.recommendations.length
      });

      return result;
    } catch (error) {
      console.error('[IntegrationService] Error fetching organization risk overview:', error);
      throw error;
    }
  },

  calculateOrganizationHealthScore(clients, alerts, assessment) {
    let kycHealth = 25;
    let alertPerformance = 25;
    let controlEffectiveness = 25;
    let riskBalance = 25;

    const highRiskPercent = clients.total > 0
      ? (clients.byRisk.high + clients.byRisk.veryHigh) / clients.total * 100
      : 0;

    if (highRiskPercent > 30) {
      kycHealth -= 10;
    } else if (highRiskPercent > 20) {
      kycHealth -= 5;
    }

    const pepPercent = clients.total > 0 ? (clients.peps / clients.total * 100) : 0;
    if (pepPercent > 15) {
      kycHealth -= 5;
    } else if (pepPercent > 10) {
      kycHealth -= 2;
    }

    const pendingAlerts = alerts.byStatus.new + alerts.byStatus.underInvestigation;
    const pendingPercent = alerts.total > 0 ? (pendingAlerts / alerts.total * 100) : 0;

    if (pendingPercent > 40) {
      alertPerformance -= 10;
    } else if (pendingPercent > 25) {
      alertPerformance -= 5;
    }

    const strRate = alerts.total > 0 ? (alerts.strFiled / alerts.total * 100) : 0;
    if (strRate < 5) {
      alertPerformance -= 5;
    } else if (strRate >= 10 && strRate <= 20) {
      alertPerformance += 5;
    }

    if (alerts.total > clients.total * 0.5) {
      alertPerformance -= 5;
    }

    if (assessment) {
      const effectivenessScore = assessment.module_3_score || 0;
      const maturityScore = assessment.module_4_score || 0;

      if (effectivenessScore < 2) {
        controlEffectiveness -= 15;
      } else if (effectivenessScore < 2.5) {
        controlEffectiveness -= 10;
      } else if (effectivenessScore >= 4) {
        controlEffectiveness += 5;
      }

      if (maturityScore < 2) {
        controlEffectiveness -= 5;
      } else if (maturityScore >= 4) {
        controlEffectiveness += 5;
      }
    } else {
      controlEffectiveness -= 15;
    }

    const riskDistribution = [
      clients.byRisk.veryLow,
      clients.byRisk.low,
      clients.byRisk.medium,
      clients.byRisk.high,
      clients.byRisk.veryHigh
    ];
    const maxConcentration = Math.max(...riskDistribution);
    const concentrationPercent = clients.total > 0 ? (maxConcentration / clients.total * 100) : 0;

    if (concentrationPercent > 50) {
      riskBalance -= 10;
    } else if (concentrationPercent < 40) {
      riskBalance += 5;
    }

    kycHealth = Math.max(0, Math.min(25, kycHealth));
    alertPerformance = Math.max(0, Math.min(25, alertPerformance));
    controlEffectiveness = Math.max(0, Math.min(25, controlEffectiveness));
    riskBalance = Math.max(0, Math.min(25, riskBalance));

    const totalScore = kycHealth + alertPerformance + controlEffectiveness + riskBalance;

    let rating;
    if (totalScore >= 80) rating = 'Low';
    else if (totalScore >= 60) rating = 'Medium';
    else if (totalScore >= 40) rating = 'High';
    else rating = 'Very High';

    return {
      score: totalScore,
      rating,
      breakdown: {
        kycHealth: Math.round(kycHealth),
        alertPerformance: Math.round(alertPerformance),
        controlEffectiveness: Math.round(controlEffectiveness),
        riskBalance: Math.round(riskBalance)
      }
    };
  },

  async updateClientRiskFromAlerts(clientId) {
    try {
      // Transaction alerts feature not yet implemented
      const alerts = [];

      if (!alerts || alerts.length === 0) return;

      const criticalAlerts = alerts.filter(a => a.alert_severity === 'Critical').length;
      const strFiled = alerts.filter(a => a.str_filed).length;

      const { data: client } = await supabase
        .from('kyc_clients')
        .select('current_risk_rating, base_risk_score')
        .eq('id', clientId)
        .single();

      if (!client) return;

      let shouldUpgrade = false;
      let newRating = client.current_risk_rating;
      let reason = '';

      if (strFiled > 0 && client.current_risk_rating !== 'Very High') {
        shouldUpgrade = true;
        newRating = 'Very High';
        reason = `STR filed (${strFiled})`;
      } else if (criticalAlerts >= 3 && client.current_risk_rating !== 'Very High' && client.current_risk_rating !== 'High') {
        shouldUpgrade = true;
        newRating = 'High';
        reason = `${criticalAlerts} critical alerts in 180 days`;
      } else if (alerts.length >= 5 && client.current_risk_rating === 'Medium') {
        shouldUpgrade = true;
        newRating = 'High';
        reason = `${alerts.length} alerts in 180 days`;
      }

      if (shouldUpgrade) {
        await supabase
          .from('kyc_clients')
          .update({
            current_risk_rating: newRating,
            enhanced_dd_required: true,
            edd_reason: reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        return { upgraded: true, newRating, reason };
      }

      return { upgraded: false };
    } catch (error) {
      console.error('Error updating client risk from alerts:', error);
      throw error;
    }
  }
};

export default integrationService;
