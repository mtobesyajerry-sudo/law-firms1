import { supabase } from '../supabaseClient';

export const maturityAssessmentService = {
  async getDomains() {
    const { data, error } = await supabase
      .from('aml_domains')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async getControls(domainId = null) {
    let query = supabase
      .from('aml_controls')
      .select('*, aml_domains(code, name)')
      .eq('is_active', true)
      .order('control_code');

    if (domainId) {
      query = query.eq('domain_id', domainId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getMaturityLevels() {
    const { data, error } = await supabase
      .from('maturity_levels')
      .select('*')
      .order('level');

    if (error) throw error;
    return data || [];
  },

  async getControlAssessments(assessmentId) {
    const { data, error } = await supabase
      .from('control_assessments')
      .select(`
        *,
        aml_controls (
          control_code,
          control_name,
          domain_id,
          is_mandatory,
          aml_domains (code, name, weight)
        )
      `)
      .eq('assessment_id', assessmentId);

    if (error) throw error;
    return data || [];
  },

  async getDomainScores(assessmentId) {
    const { data, error } = await supabase
      .from('domain_scores')
      .select(`
        *,
        aml_domains (code, name, weight, sort_order)
      `)
      .eq('assessment_id', assessmentId)
      .order('aml_domains(sort_order)');

    if (error) throw error;
    return data || [];
  },

  async getMaturitySummary(assessmentId) {
    const [domains, controlAssessments, domainScores] = await Promise.all([
      this.getDomains(),
      this.getControlAssessments(assessmentId),
      this.getDomainScores(assessmentId)
    ]);

    if (controlAssessments.length === 0 || domainScores.length === 0) {
      return null;
    }

    const domainMap = {};
    domains.forEach(domain => {
      domainMap[domain.id] = {
        ...domain,
        controls: [],
        domainScore: null
      };
    });

    controlAssessments.forEach(ca => {
      const domainId = ca.aml_controls?.domain_id;
      if (domainId && domainMap[domainId]) {
        domainMap[domainId].controls.push({
          controlCode: ca.aml_controls.control_code,
          controlName: ca.aml_controls.control_name,
          maturityLevel: ca.maturity_level,
          maturityScore: ca.maturity_score,
          implementationStatus: ca.implementation_status,
          evidenceQuality: ca.evidence_quality,
          testingResult: ca.testing_result,
          isMandatory: ca.aml_controls.is_mandatory
        });
      }
    });

    domainScores.forEach(ds => {
      if (domainMap[ds.domain_id]) {
        domainMap[ds.domain_id].domainScore = {
          averageMaturity: ds.average_maturity,
          weightedScore: ds.weighted_score,
          compliancePercentage: ds.compliance_percentage,
          gapsCritical: ds.gaps_critical,
          gapsHigh: ds.gaps_high,
          gapsMedium: ds.gaps_medium,
          gapsLow: ds.gaps_low
        };
      }
    });

    const overallMaturity = domainScores.reduce((sum, ds) => {
      const domain = domains.find(d => d.id === ds.domain_id);
      if (domain && ds.average_maturity) {
        return sum + (parseFloat(ds.average_maturity) * parseFloat(domain.weight));
      }
      return sum;
    }, 0);

    const totalControls = controlAssessments.length;
    const controlsAtLevel3Plus = controlAssessments.filter(ca => ca.maturity_level >= 3).length;
    const overallComplianceRate = totalControls > 0 ? (controlsAtLevel3Plus / totalControls) * 100 : 0;

    const totalGaps = {
      critical: domainScores.reduce((sum, ds) => sum + (ds.gaps_critical || 0), 0),
      high: domainScores.reduce((sum, ds) => sum + (ds.gaps_high || 0), 0),
      medium: domainScores.reduce((sum, ds) => sum + (ds.gaps_medium || 0), 0),
      low: domainScores.reduce((sum, ds) => sum + (ds.gaps_low || 0), 0)
    };

    return {
      overallMaturity: overallMaturity.toFixed(2),
      overallComplianceRate: overallComplianceRate.toFixed(1),
      totalControls,
      controlsAtLevel3Plus,
      totalGaps,
      domains: Object.values(domainMap).sort((a, b) => a.sort_order - b.sort_order)
    };
  },

  getMaturityLevelName(level) {
    const levels = {
      1: 'Initial / Ad hoc',
      2: 'Developing',
      3: 'Defined',
      4: 'Managed',
      5: 'Optimised'
    };
    return levels[level] || 'Unknown';
  },

  getMaturityLevelColor(level) {
    const colors = {
      1: '#dc2626',
      2: '#ea580c',
      3: '#ca8a04',
      4: '#16a34a',
      5: '#0891b2'
    };
    return colors[level] || '#6b7280';
  },

  getImplementationStatusLabel(status) {
    const labels = {
      'not_implemented': 'Not Implemented',
      'partial': 'Partially Implemented',
      'implemented': 'Fully Implemented',
      'optimised': 'Optimised'
    };
    return labels[status] || status;
  }
};
