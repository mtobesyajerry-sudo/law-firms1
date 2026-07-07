/**
 * Control Assessment Service
 *
 * Manages control-level assessments, evidence mapping, gap analysis,
 * and remediation planning for the AML/CFT maturity framework
 */

import { supabase } from '../supabaseClient';
import {
  calculateMaturityScore,
  calculateDomainScore,
  calculateOverallMaturity,
  identifyControlGaps,
  classifyGapSeverity,
  generateRemediationPlan,
  generateSnapshotData
} from '../utils/maturityUtils';

export class ControlAssessmentService {
  /**
   * Get all domains with their controls
   */
  static async getDomainsAndControls(entityTier = 1) {
    try {
      const { data: domains, error: domainsError } = await supabase
        .from('aml_domains')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (domainsError) throw domainsError;

      const { data: controls, error: controlsError } = await supabase
        .from('aml_controls')
        .select('*')
        .lte('min_entity_tier', entityTier)
        .order('sort_order');

      if (controlsError) throw controlsError;

      // Group controls by domain
      const domainsWithControls = domains.map(domain => ({
        ...domain,
        controls: controls.filter(c => c.domain_id === domain.id)
      }));

      return domainsWithControls;
    } catch (error) {
      console.error('Error fetching domains and controls:', error);
      throw error;
    }
  }

  /**
   * Get maturity levels reference data
   */
  static async getMaturityLevels() {
    try {
      const { data, error } = await supabase
        .from('maturity_levels')
        .select('*')
        .order('level');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching maturity levels:', error);
      throw error;
    }
  }

  /**
   * Initialize control assessments for an assessment
   */
  static async initializeControlAssessments(assessmentId, entityTier) {
    try {
      // Get applicable controls for this tier
      const { data: controls, error: controlsError } = await supabase
        .from('aml_controls')
        .select('id')
        .lte('min_entity_tier', entityTier);

      if (controlsError) throw controlsError;

      // Check which controls already have assessments
      const { data: existing, error: existingError } = await supabase
        .from('control_assessments')
        .select('control_id')
        .eq('assessment_id', assessmentId);

      if (existingError) throw existingError;

      const existingControlIds = new Set(existing.map(e => e.control_id));

      // Create assessments for controls that don't have them
      const newAssessments = controls
        .filter(c => !existingControlIds.has(c.id))
        .map(c => ({
          assessment_id: assessmentId,
          control_id: c.id,
          maturity_level: 1,
          implementation_status: 'not-implemented',
          testing_result: 'not-tested'
        }));

      if (newAssessments.length > 0) {
        const { error: insertError } = await supabase
          .from('control_assessments')
          .insert(newAssessments);

        // Ignore duplicate key errors (23505) - records already exist
        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }
      }

      return { initialized: newAssessments.length };
    } catch (error) {
      console.error('Error initializing control assessments:', error);
      throw error;
    }
  }

  /**
   * Get all control assessments for an assessment
   */
  static async getControlAssessments(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('control_assessments')
        .select(`
          *,
          control:aml_controls(*),
          evidence:control_evidence_mapping(*)
        `)
        .eq('assessment_id', assessmentId)
        .order('created_at');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching control assessments:', error);
      throw error;
    }
  }

  /**
   * Update control assessment
   */
  static async updateControlAssessment(controlAssessmentId, updates) {
    try {
      // Calculate maturity score if implementation status, evidence quality, or testing result changed
      if (updates.implementation_status || updates.evidence_quality || updates.testing_result) {
        const { data: current } = await supabase
          .from('control_assessments')
          .select('*')
          .eq('id', controlAssessmentId)
          .single();

        const implementationStatus = updates.implementation_status || current.implementation_status;
        const evidenceQuality = updates.evidence_quality || current.evidence_quality;
        const testingResult = updates.testing_result || current.testing_result;

        const maturityLevel = calculateMaturityScore(implementationStatus, evidenceQuality, testingResult);
        const maturityScore = (maturityLevel / 5) * 100;

        updates.maturity_level = maturityLevel;
        updates.maturity_score = maturityScore;
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('control_assessments')
        .update(updates)
        .eq('id', controlAssessmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating control assessment:', error);
      throw error;
    }
  }

  /**
   * Map evidence (document) to control assessment
   */
  static async mapEvidence(controlAssessmentId, documentId, evidenceType, coveragePercentage = 100) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('control_evidence_mapping')
        .insert({
          control_assessment_id: controlAssessmentId,
          document_id: documentId,
          evidence_type: evidenceType,
          coverage_percentage: coveragePercentage,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error mapping evidence:', error);
      throw error;
    }
  }

  /**
   * Calculate and update domain scores
   */
  static async calculateAndUpdateDomainScores(assessmentId) {
    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('organization_id')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      // Get all control assessments with their controls and domains
      const { data: controlAssessments, error: caError } = await supabase
        .from('control_assessments')
        .select(`
          *,
          control:aml_controls(
            *,
            domain:aml_domains(*)
          )
        `)
        .eq('assessment_id', assessmentId);

      if (caError) throw caError;

      // Group by domain
      const domainGroups = {};
      controlAssessments.forEach(ca => {
        const domainId = ca.control.domain_id;
        if (!domainGroups[domainId]) {
          domainGroups[domainId] = {
            domain: ca.control.domain,
            assessments: []
          };
        }
        domainGroups[domainId].assessments.push(ca);
      });

      // Calculate scores for each domain
      const domainScoreUpdates = [];
      for (const [domainId, group] of Object.entries(domainGroups)) {
        const scores = calculateDomainScore(group.assessments, group.domain.weight);

        // Count gaps by severity
        const gaps = group.assessments.flatMap(ca =>
          identifyControlGaps(ca, ca.control)
        );

        const gapCounts = {
          critical: gaps.filter(g => g.severity === 'critical').length,
          high: gaps.filter(g => g.severity === 'high').length,
          medium: gaps.filter(g => g.severity === 'medium').length,
          low: gaps.filter(g => g.severity === 'low').length
        };

        domainScoreUpdates.push({
          assessment_id: assessmentId,
          domain_id: domainId,
          organization_id: assessment.organization_id,
          average_maturity: scores.averageMaturity,
          weighted_score: scores.weightedScore,
          controls_assessed: scores.controlsAssessed,
          controls_total: group.assessments.length,
          compliance_percentage: scores.compliancePercentage,
          gaps_critical: gapCounts.critical,
          gaps_high: gapCounts.high,
          gaps_medium: gapCounts.medium,
          gaps_low: gapCounts.low
        });
      }

      // Upsert domain scores
      const { error: upsertError } = await supabase
        .from('domain_scores')
        .upsert(domainScoreUpdates, {
          onConflict: 'assessment_id,domain_id'
        });

      if (upsertError) throw upsertError;

      // Calculate overall maturity
      const { data: domainScores, error: dsError } = await supabase
        .from('domain_scores')
        .select('*, domain:aml_domains(*)')
        .eq('assessment_id', assessmentId);

      if (dsError) throw dsError;

      const overallMaturity = calculateOverallMaturity(domainScores);

      // Update assessment with overall maturity
      const { error: updateError } = await supabase
        .from('assessments')
        .update({
          overall_risk_score: overallMaturity,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (updateError) throw updateError;

      return {
        domainScores,
        overallMaturity
      };
    } catch (error) {
      console.error('Error calculating domain scores:', error);
      throw error;
    }
  }

  /**
   * Perform gap analysis for assessment
   */
  static async performGapAnalysis(assessmentId) {
    try {
      // Get all control assessments with controls
      const { data: controlAssessments, error: caError } = await supabase
        .from('control_assessments')
        .select(`
          *,
          control:aml_controls(
            *,
            domain:aml_domains(*)
          )
        `)
        .eq('assessment_id', assessmentId);

      if (caError) throw caError;

      // Identify gaps for each control
      const allGaps = [];
      controlAssessments.forEach(ca => {
        const gaps = identifyControlGaps(ca, ca.control);
        gaps.forEach(gap => {
          allGaps.push({
            assessment_id: assessmentId,
            control_assessment_id: ca.id,
            ...gap
          });
        });
      });

      // Delete existing gaps for this assessment
      await supabase
        .from('gap_analysis')
        .delete()
        .eq('assessment_id', assessmentId);

      // Insert new gaps
      if (allGaps.length > 0) {
        const { error: insertError } = await supabase
          .from('gap_analysis')
          .insert(allGaps);

        if (insertError) throw insertError;
      }

      return allGaps;
    } catch (error) {
      console.error('Error performing gap analysis:', error);
      throw error;
    }
  }

  /**
   * Generate remediation plans from gaps
   */
  static async generateRemediationPlans(assessmentId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get all gaps
      const { data: gaps, error: gapsError } = await supabase
        .from('gap_analysis')
        .select(`
          *,
          control_assessment:control_assessments(
            *,
            control:aml_controls(*)
          )
        `)
        .eq('assessment_id', assessmentId)
        .eq('status', 'identified');

      if (gapsError) throw gapsError;

      // Generate remediation plans
      const remediationPlans = gaps.map(gap => {
        const plan = generateRemediationPlan(
          gap,
          gap.control_assessment,
          gap.control_assessment.control
        );

        return {
          assessment_id: assessmentId,
          gap_id: gap.id,
          control_id: gap.control_assessment.control_id,
          created_by: user.id,
          ...plan
        };
      });

      if (remediationPlans.length > 0) {
        const { data, error: insertError } = await supabase
          .from('remediation_plans')
          .insert(remediationPlans)
          .select();

        if (insertError) throw insertError;
        return data;
      }

      return [];
    } catch (error) {
      console.error('Error generating remediation plans:', error);
      throw error;
    }
  }

  /**
   * Create assessment snapshot for trending
   */
  static async createSnapshot(assessmentId, organizationId, snapshotType = 'periodic') {
    try {
      // Get current domain scores and control assessments
      const { data: domainScores, error: dsError } = await supabase
        .from('domain_scores')
        .select('*, domain:aml_domains(*)')
        .eq('assessment_id', assessmentId);

      if (dsError) throw dsError;

      const { data: controlAssessments, error: caError } = await supabase
        .from('control_assessments')
        .select('*')
        .eq('assessment_id', assessmentId);

      if (caError) throw caError;

      const { data: assessment, error: aError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (aError) throw aError;

      // Generate snapshot data
      const snapshotData = generateSnapshotData(assessment, domainScores, controlAssessments);

      const { data, error: insertError } = await supabase
        .from('assessment_snapshots')
        .insert({
          organization_id: organizationId,
          assessment_id: assessmentId,
          snapshot_type: snapshotType,
          ...snapshotData
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Get domain scores for an assessment
   */
  static async getDomainScores(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('domain_scores')
        .select('*, domain:aml_domains(*)')
        .eq('assessment_id', assessmentId)
        .order('domain(sort_order)');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching domain scores:', error);
      throw error;
    }
  }

  /**
   * Get gaps for an assessment
   */
  static async getGaps(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('gap_analysis')
        .select(`
          *,
          control_assessment:control_assessments(
            *,
            control:aml_controls(
              *,
              domain:aml_domains(*)
            )
          )
        `)
        .eq('assessment_id', assessmentId)
        .order('priority_score', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching gaps:', error);
      throw error;
    }
  }

  /**
   * Get remediation plans for an assessment
   */
  static async getRemediationPlans(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('remediation_plans')
        .select(`
          *,
          gap:gap_analysis(*),
          control:aml_controls(*)
        `)
        .eq('assessment_id', assessmentId)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching remediation plans:', error);
      throw error;
    }
  }

  /**
   * Update remediation plan progress
   */
  static async updateRemediationProgress(planId, updates) {
    try {
      updates.updated_at = new Date().toISOString();

      // Auto-complete if progress reaches 100%
      if (updates.progress_percentage === 100 && !updates.status) {
        updates.status = 'completed';
        updates.completion_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('remediation_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating remediation progress:', error);
      throw error;
    }
  }

  /**
   * Get historical snapshots for trending
   */
  static async getSnapshots(organizationId, limit = 12) {
    try {
      const { data, error } = await supabase
        .from('assessment_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .order('snapshot_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      throw error;
    }
  }
}
