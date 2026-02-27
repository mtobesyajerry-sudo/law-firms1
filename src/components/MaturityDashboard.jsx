import React, { useState, useEffect } from 'react';
import { ControlAssessmentService } from '../services/controlAssessmentService';
import { getMaturityLabel, getGapSeverityLabel } from '../utils/maturityUtils';
import LoadingSpinner from './LoadingSpinner';

export default function MaturityDashboard({ assessment }) {
  const [loading, setLoading] = useState(true);
  const [domainScores, setDomainScores] = useState([]);
  const [controlAssessments, setControlAssessments] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [remediationPlans, setRemediationPlans] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (assessment) {
      loadDashboardData();
    }
  }, [assessment]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [domains, controls, gapsData, plans, snapshotsData] = await Promise.all([
        ControlAssessmentService.getDomainScores(assessment.id),
        ControlAssessmentService.getControlAssessments(assessment.id),
        ControlAssessmentService.getGaps(assessment.id),
        ControlAssessmentService.getRemediationPlans(assessment.id),
        ControlAssessmentService.getSnapshots(assessment.organization_id, 12)
      ]);

      setDomainScores(domains);
      setControlAssessments(controls);
      setGaps(gapsData);
      setRemediationPlans(plans);
      setSnapshots(snapshotsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const overallMaturity = assessment.overall_risk_score || 0;
  const maturityInfo = getMaturityLabel(Math.round(overallMaturity));

  // Calculate statistics
  const totalControls = controlAssessments.length;
  const compliantControls = controlAssessments.filter(ca => ca.maturity_level >= 3).length;
  const complianceRate = totalControls > 0 ? (compliantControls / totalControls * 100).toFixed(1) : 0;

  const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
  const highGaps = gaps.filter(g => g.severity === 'high').length;

  const completedPlans = remediationPlans.filter(p => p.status === 'completed').length;
  const inProgressPlans = remediationPlans.filter(p => p.status === 'in-progress').length;

  if (loading) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading maturity dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          AML/CFT Maturity Assessment Dashboard
        </h2>
        <p className="text-gray-600">
          {assessment.institution_name} - {new Date(assessment.assessment_date).toLocaleDateString()}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Maturity</p>
              <p className="text-3xl font-bold" style={{ color: maturityInfo.color }}>
                {overallMaturity.toFixed(2)}
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: maturityInfo.color }}>
                {maturityInfo.name}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                 style={{ backgroundColor: maturityInfo.color + '20', color: maturityInfo.color }}>
              {Math.round(overallMaturity)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Compliance Rate</p>
          <p className="text-3xl font-bold text-green-600">{complianceRate}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {compliantControls} of {totalControls} controls
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${complianceRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Critical & High Gaps</p>
          <p className="text-3xl font-bold text-red-600">{criticalGaps + highGaps}</p>
          <p className="text-sm text-gray-500 mt-1">
            {criticalGaps} critical, {highGaps} high
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Remediation Progress</p>
          <p className="text-3xl font-bold text-blue-600">{completedPlans}/{remediationPlans.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {inProgressPlans} in progress
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('domains')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'domains'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Domain Analysis
            </button>
            <button
              onClick={() => setSelectedTab('gaps')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'gaps'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Gap Analysis
            </button>
            <button
              onClick={() => setSelectedTab('remediation')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'remediation'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Remediation
            </button>
            <button
              onClick={() => setSelectedTab('trending')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'trending'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Trending
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <OverviewTab
              domainScores={domainScores}
              controlAssessments={controlAssessments}
              gaps={gaps}
            />
          )}
          {selectedTab === 'domains' && (
            <DomainsTab domainScores={domainScores} controlAssessments={controlAssessments} />
          )}
          {selectedTab === 'gaps' && <GapsTab gaps={gaps} />}
          {selectedTab === 'remediation' && (
            <RemediationTab plans={remediationPlans} onUpdate={loadDashboardData} />
          )}
          {selectedTab === 'trending' && <TrendingTab snapshots={snapshots} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ domainScores, controlAssessments, gaps }) {
  const maturityDistribution = {
    1: controlAssessments.filter(ca => ca.maturity_level === 1).length,
    2: controlAssessments.filter(ca => ca.maturity_level === 2).length,
    3: controlAssessments.filter(ca => ca.maturity_level === 3).length,
    4: controlAssessments.filter(ca => ca.maturity_level === 4).length,
    5: controlAssessments.filter(ca => ca.maturity_level === 5).length
  };

  const gapDistribution = {
    critical: gaps.filter(g => g.severity === 'critical').length,
    high: gaps.filter(g => g.severity === 'high').length,
    medium: gaps.filter(g => g.severity === 'medium').length,
    low: gaps.filter(g => g.severity === 'low').length
  };

  return (
    <div className="space-y-6">
      {/* Maturity Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Control Maturity Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(level => {
            const count = maturityDistribution[level];
            const percentage = controlAssessments.length > 0
              ? (count / controlAssessments.length * 100).toFixed(1)
              : 0;
            const info = getMaturityLabel(level);

            return (
              <div key={level} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium" style={{ color: info.color }}>
                  Level {level}: {info.name}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: info.color,
                        minWidth: count > 0 ? '40px' : '0'
                      }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-600">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Gap Severity Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['critical', 'high', 'medium', 'low'].map(severity => {
            const count = gapDistribution[severity];
            const info = getGapSeverityLabel(severity);

            return (
              <div key={severity} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold" style={{ color: info.color }}>
                  {count}
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1 capitalize">
                  {severity}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Heatmap */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Domain Maturity Heatmap</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {domainScores.map(ds => {
            const maturityInfo = getMaturityLabel(Math.round(ds.average_maturity));

            return (
              <div key={ds.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{ds.domain.name}</h4>
                    <p className="text-sm text-gray-500">Weight: {(ds.domain.weight * 100).toFixed(0)}%</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: maturityInfo.color + '20', color: maturityInfo.color }}
                  >
                    {ds.average_maturity.toFixed(1)}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Compliance:</span>
                    <span className="font-medium">{ds.compliance_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Controls:</span>
                    <span className="font-medium">{ds.controls_assessed}/{ds.controls_total}</span>
                  </div>
                  {(ds.gaps_critical + ds.gaps_high) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Critical/High Gaps:</span>
                      <span className="font-medium text-red-600">
                        {ds.gaps_critical + ds.gaps_high}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DomainsTab({ domainScores, controlAssessments }) {
  const [selectedDomain, setSelectedDomain] = useState(null);

  const domainControls = selectedDomain
    ? controlAssessments.filter(ca => ca.control.domain_id === selectedDomain.domain_id)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {domainScores.map(ds => {
          const maturityInfo = getMaturityLabel(Math.round(ds.average_maturity));

          return (
            <button
              key={ds.id}
              onClick={() => setSelectedDomain(ds)}
              className={`text-left border rounded-lg p-4 transition-all ${
                selectedDomain?.id === ds.id
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{ds.domain.code}</h4>
                  <p className="text-xs text-gray-500 mt-1">{ds.domain.name}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: maturityInfo.color + '20', color: maturityInfo.color }}
                >
                  {ds.average_maturity.toFixed(1)}
                </div>
              </div>
              <div className="text-xs text-gray-600">
                {ds.controls_assessed} controls · {ds.compliance_percentage.toFixed(0)}% compliant
              </div>
            </button>
          );
        })}
      </div>

      {selectedDomain && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{selectedDomain.domain.name} - Control Details</h3>
          <p className="text-sm text-gray-600 mb-6">{selectedDomain.domain.description}</p>

          <div className="space-y-3">
            {domainControls.map(ca => {
              const maturityInfo = getMaturityLabel(ca.maturity_level);

              return (
                <div key={ca.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {ca.control.control_code}
                        </span>
                        <h4 className="font-medium text-gray-900">{ca.control.control_name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{ca.control.control_description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Status: <span className="font-medium capitalize">{ca.implementation_status?.replace('-', ' ')}</span></span>
                        {ca.evidence_quality && (
                          <span>Evidence: <span className="font-medium capitalize">{ca.evidence_quality}</span></span>
                        )}
                        {ca.testing_result && (
                          <span>Testing: <span className="font-medium capitalize">{ca.testing_result}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: maturityInfo.color + '20', color: maturityInfo.color }}
                      >
                        {ca.maturity_level}
                      </div>
                      <div className="text-xs text-center mt-1 font-medium" style={{ color: maturityInfo.color }}>
                        {maturityInfo.name.split(' / ')[0]}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GapsTab({ gaps }) {
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filteredGaps = filterSeverity === 'all'
    ? gaps
    : gaps.filter(g => g.severity === filterSeverity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Identified Gaps ({filteredGaps.length})</h3>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredGaps.map(gap => {
          const severityInfo = getGapSeverityLabel(gap.severity);

          return (
            <div key={gap.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium text-white capitalize"
                      style={{ backgroundColor: severityInfo.color }}
                    >
                      {gap.severity}
                    </span>
                    <span className="text-xs text-gray-500">Priority: {gap.priority_score}/10</span>
                    <span className="text-xs text-gray-500 capitalize">{gap.gap_category?.replace('-', ' ')}</span>
                  </div>
                  <h4 className="font-medium text-gray-900">{gap.gap_description}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Regulatory Risk:</span>
                  <p className="text-gray-600">{gap.regulatory_risk}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Business Impact:</span>
                  <p className="text-gray-600">{gap.business_impact}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Recommended Action:</span>
                  <p className="text-gray-600">{gap.recommended_action}</p>
                </div>
              </div>

              {gap.control_assessment && (
                <div className="mt-3 text-xs text-gray-500">
                  Related Control: {gap.control_assessment.control.control_code} - {gap.control_assessment.control.control_name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGaps.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No gaps found for the selected filter
        </div>
      )}
    </div>
  );
}

function RemediationTab({ plans, onUpdate }) {
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredPlans = filterStatus === 'all'
    ? plans
    : plans.filter(p => p.status === filterStatus);

  async function updatePlanProgress(planId, progress) {
    try {
      await ControlAssessmentService.updateRemediationProgress(planId, {
        progress_percentage: progress
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating plan progress:', error);
      alert('Failed to update progress');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Remediation Plans ({filteredPlans.length})</h3>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredPlans.map(plan => {
          const statusColors = {
            planned: 'bg-gray-100 text-gray-800',
            'in-progress': 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            deferred: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-red-100 text-red-800'
          };

          const priorityColors = {
            critical: 'text-red-600',
            high: 'text-orange-600',
            medium: 'text-yellow-600',
            low: 'text-green-600'
          };

          return (
            <div key={plan.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[plan.status]}`}>
                      {plan.status.replace('-', ' ')}
                    </span>
                    <span className={`text-xs font-medium capitalize ${priorityColors[plan.priority]}`}>
                      {plan.priority} Priority
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900">{plan.action_description}</h4>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-gray-600">Responsible:</span>
                  <p className="font-medium">{plan.responsible_party}</p>
                </div>
                <div>
                  <span className="text-gray-600">Target Maturity:</span>
                  <p className="font-medium">Level {plan.target_maturity_level}</p>
                </div>
                <div>
                  <span className="text-gray-600">Effort:</span>
                  <p className="font-medium">{plan.estimated_effort_days} days</p>
                </div>
                <div>
                  <span className="text-gray-600">Target Date:</span>
                  <p className="font-medium">
                    {plan.target_date ? new Date(plan.target_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{plan.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${plan.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updatePlanProgress(plan.id, Math.min(plan.progress_percentage + 25, 100))}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    +25% Progress
                  </button>
                  {plan.progress_percentage < 100 && (
                    <button
                      onClick={() => updatePlanProgress(plan.id, 100)}
                      className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No remediation plans found for the selected filter
        </div>
      )}
    </div>
  );
}

function TrendingTab({ snapshots }) {
  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No historical snapshots available. Snapshots are created when assessments are completed.
      </div>
    );
  }

  const sortedSnapshots = [...snapshots].reverse();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Maturity Trend Over Time</h3>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-end justify-between h-64">
          {sortedSnapshots.map((snapshot, index) => {
            const maturity = snapshot.overall_maturity || 0;
            const height = (maturity / 5) * 100;

            return (
              <div key={snapshot.id} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                  <div
                    className="w-3/4 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`Maturity: ${maturity.toFixed(2)}`}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">
                  {new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm font-medium text-gray-900">{maturity.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">Latest Snapshot Details</h4>
          <div className="border rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {new Date(snapshots[0].snapshot_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{snapshots[0].snapshot_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overall Maturity:</span>
              <span className="font-medium">{snapshots[0].overall_maturity?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {snapshots.length >= 2 && (
          <div>
            <h4 className="font-medium mb-3">Change Since Previous</h4>
            <div className="border rounded-lg p-4 space-y-2 text-sm">
              {(() => {
                const latest = snapshots[0].overall_maturity || 0;
                const previous = snapshots[1].overall_maturity || 0;
                const change = latest - previous;
                const isPositive = change > 0;

                return (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Maturity Change:</span>
                    <span className={`font-medium ${isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {isPositive && '+'}{change.toFixed(2)}
                      {isPositive ? ' ↑' : change < 0 ? ' ↓' : ' →'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
