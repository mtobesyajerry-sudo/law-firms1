import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fmtDateTime } from '../utils/dateFormat';

export default function EnhancedSecurityDashboard() {
  const [stats, setStats] = useState({
    eventsLast24h: 0,
    criticalThreats: 0,
    activeIncidents: 0,
    blockedIPs: 0,
    mfaOverdue: 0,
    intrusionAttempts: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [threats, setThreats] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [intrusionEvents, setIntrusionEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        eventsData,
        threatsData,
        incidentsData,
        alertsData,
        intrusionData,
        mfaData,
        ipData
      ] = await Promise.all([
        supabase
          .from('security_events')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('threat_detections')
          .select('*')
          .in('status', ['detected', 'investigating'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('security_incident_responses')
          .select('*')
          .in('status', ['open', 'investigating'])
          .order('created_at', { ascending: false }),
        supabase
          .from('security_alerts')
          .select('*')
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('intrusion_detection_events')
          .select('*, intrusion_detection_rules(rule_name, severity)')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('mfa_enforcement_tracking')
          .select('*')
          .eq('mfa_enabled', false)
          .lt('grace_period_ends', new Date().toISOString()),
        supabase
          .from('ip_reputation')
          .select('*')
          .eq('permanently_blocked', true)
      ]);

      const criticalThreats = threatsData.data?.filter(t => t.severity === 'critical').length || 0;

      setStats({
        eventsLast24h: eventsData.data?.length || 0,
        criticalThreats,
        activeIncidents: incidentsData.data?.length || 0,
        blockedIPs: ipData.data?.length || 0,
        mfaOverdue: mfaData.data?.length || 0,
        intrusionAttempts: intrusionData.data?.length || 0
      });

      setRecentEvents(eventsData.data || []);
      setThreats(threatsData.data || []);
      setIncidents(incidentsData.data || []);
      setAlerts(alertsData.data || []);
      setIntrusionEvents(intrusionData.data || []);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runThreatDetection = async () => {
    try {
      const { error } = await supabase.rpc('detect_security_threats');
      if (error) throw error;
      alert('Threat detection scan completed successfully');
      loadSecurityData();
    } catch (error) {
      console.error('Error running threat detection:', error);
      alert('Failed to run threat detection');
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('security_alerts')
        .update({
          read: true,
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id
        })
        .eq('id', alertId);

      if (error) throw error;
      loadSecurityData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Failed to acknowledge alert');
    }
  };

  const updateThreatStatus = async (threatId, newStatus) => {
    try {
      const { error } = await supabase
        .from('threat_detections')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', threatId);

      if (error) throw error;
      loadSecurityData();
    } catch (error) {
      console.error('Error updating threat:', error);
      alert('Failed to update threat status');
    }
  };

  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const update = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        update.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('security_incident_responses')
        .update(update)
        .eq('id', incidentId);

      if (error) throw error;
      loadSecurityData();
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Failed to update incident status');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      detected: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-red-100 text-red-800',
      false_positive: 'bg-gray-100 text-gray-800',
      mitigated: 'bg-green-100 text-green-800',
      open: 'bg-yellow-100 text-yellow-800',
      contained: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Security Dashboard</h1>
            <p className="mt-2 text-gray-600">Real-time threat detection and security monitoring</p>
          </div>
          <button
            onClick={runThreatDetection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Threat Scan Now
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Events (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.eventsLast24h}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-red-100 rounded-lg">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Critical Threats</p>
                <p className="text-2xl font-bold text-gray-900">{stats.criticalThreats}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeIncidents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Blocked IPs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.blockedIPs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">MFA Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mfaOverdue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Intrusions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.intrusionAttempts}</p>
              </div>
            </div>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">You have {alerts.length} unread security alerts</h3>
                <div className="mt-2 text-sm text-red-700 space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <span>{alert.title}: {alert.message}</span>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-4 text-sm font-medium text-red-800 hover:text-red-900"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {['overview', 'threats', 'intrusions', 'incidents'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Security Events</h3>
              {recentEvents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No security events in the last 24 hours</h3>
                  <p className="mt-1 text-sm text-gray-500">All systems operating normally.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentEvents.map(event => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(event.severity)}`}>
                              {event.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{event.event_type}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(event.status)}`}>
                              {event.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{event.description}</p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{fmtDateTime(event.created_at)}</span>
                            {event.ip_address && <span>IP: {event.ip_address}</span>}
                            {event.risk_score && <span>Risk Score: {event.risk_score}/100</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'threats' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Threat Detections</h3>
              {threats.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active threats</h3>
                  <p className="mt-1 text-sm text-gray-500">No security threats detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {threats.map(threat => (
                    <div key={threat.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(threat.severity)}`}>
                              {threat.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{threat.threat_type}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(threat.status)}`}>
                              {threat.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              Confidence: {(threat.confidence_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {JSON.stringify(threat.detection_details)}
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Detected: {fmtDateTime(threat.created_at)}
                          </div>
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <select
                            value={threat.status}
                            onChange={(e) => updateThreatStatus(threat.id, e.target.value)}
                            className="text-sm border-gray-300 rounded-md"
                          >
                            <option value="detected">Detected</option>
                            <option value="investigating">Investigating</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="false_positive">False Positive</option>
                            <option value="mitigated">Mitigated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'intrusions' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Intrusion Detection Events (24h)</h3>
              {intrusionEvents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No intrusions detected</h3>
                  <p className="mt-1 text-sm text-gray-500">No intrusion attempts in the last 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {intrusionEvents.map(event => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(event.severity)}`}>
                              {event.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {event.intrusion_detection_rules?.rule_name || 'Unknown Rule'}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(event.status)}`}>
                              {event.status.toUpperCase()}
                            </span>
                            {event.auto_blocked && (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                AUTO-BLOCKED
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {JSON.stringify(event.detection_details)}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{fmtDateTime(event.created_at)}</span>
                            <span>IP: {event.ip_address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Security Incidents</h3>
              {incidents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active incidents</h3>
                  <p className="mt-1 text-sm text-gray-500">No security incidents require attention.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.map(incident => (
                    <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(incident.severity)}`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{incident.incident_title}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(incident.status)}`}>
                              {incident.status.toUpperCase()}
                            </span>
                            {incident.escalated && (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                ESCALATED
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{incident.incident_description}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Detected: {fmtDateTime(incident.detected_at)}
                          </div>
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <select
                            value={incident.status}
                            onChange={(e) => updateIncidentStatus(incident.id, e.target.value)}
                            className="text-sm border-gray-300 rounded-md"
                          >
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="contained">Contained</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm font-medium text-green-800">Rate Limiting Active</span>
              </div>
              <span className="text-sm text-green-600">100 req/min</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm font-medium text-green-800">Intrusion Detection Active</span>
              </div>
              <span className="text-sm text-green-600">5 Rules</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm font-medium text-green-800">Automated Threat Detection</span>
              </div>
              <span className="text-sm text-green-600">Every 5 min</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm font-medium text-yellow-800">MFA Enforcement</span>
              </div>
              <span className="text-sm text-yellow-600">Recommended</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
