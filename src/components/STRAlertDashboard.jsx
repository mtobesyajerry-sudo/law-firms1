import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { confirmTransactionAlert, clearTransactionAlert } from '../services/screeningService';
import STRFilingModal from './STRFilingModal';
import { fmtDateTime } from '../utils/dateFormat';

export default function STRAlertDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    assigned: 'all'
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertDetail, setShowAlertDetail] = useState(false);
  const [actionNotes, setActionNotes] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [actionError, setActionError] = useState({});
  const [strFormAlert, setStrFormAlert] = useState(null);

  useEffect(() => {
    if (user) {
      loadAlerts();
      loadStatistics();
    }
  }, [user, filters]);

  const loadStatistics = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      // Load alerts from transaction_alerts table
      const { data: alertsData, error } = await supabase
        .from('transaction_alerts')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (error) {
        console.error('Error loading alerts for statistics:', error);
        return;
      }

      const alerts = alertsData || [];

      const stats = {
        total: alerts.length,
        new: alerts.filter(a => a.investigation_status === 'new').length,
        underReview: alerts.filter(a => a.investigation_status === 'assigned').length,
        escalated: alerts.filter(a => a.investigation_status === 'escalated').length,
        resolved: alerts.filter(a => a.investigation_status?.startsWith('resolved_')).length,
        high: alerts.filter(a => a.alert_severity === 'high').length,
        critical: alerts.filter(a => a.alert_severity === 'critical').length
      };

      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }

      if (!profile) {
        console.log('No profile found for user:', user.id);
        return;
      }

      console.log('User profile:', profile);

      // Build query for transaction_alerts with filters
      let query = supabase
        .from('transaction_alerts')
        .select(`
          *,
          kyc_clients!transaction_alerts_client_id_fkey!left(client_type),
          transaction_monitoring_rules!transaction_alerts_triggered_by_rule_id_fkey!left(rule_name, rule_code),
          suspicious_activity_reports!suspicious_activity_reports_alert_id_fkey(str_status, fiu_reference_number, fiu_acknowledgment_date, id)
        `)
        .eq('organization_id', profile.organization_id);

      // Apply filters
      if (filters.status !== 'all') {
        const statusMap = {
          'New': 'new',
          'In Progress': 'assigned',
          'Escalated': 'escalated',
          'Resolved': 'resolved_no_action',
          'Closed': 'resolved_str_filed'
        };
        query = query.eq('investigation_status', statusMap[filters.status] || filters.status.toLowerCase());
      }

      if (filters.severity !== 'all') {
        query = query.eq('alert_severity', filters.severity.toLowerCase());
      }

      if (filters.assigned === 'mine') {
        query = query.eq('assigned_to', user.id);
      } else if (filters.assigned === 'unassigned') {
        query = query.is('assigned_to', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      // Batch-fetch decrypted client names from kyc_clients_decrypted view.
      // Wrapped in its own try/catch so a failed name lookup never blocks alert rendering.
      let clientMap = {};
      try {
        const clientIds = [...new Set((data || []).map(a => a.client_id).filter(Boolean))];
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('kyc_clients_decrypted')
            .select('id, client_name, client_type')
            .in('id', clientIds);
          clientMap = Object.fromEntries((clients || []).map(c => [c.id, c]));
        }
      } catch (nameError) {
        console.error('Client name lookup failed — alerts will still render:', nameError);
      }

      const alertsWithNames = (data || []).map(alert => ({
        ...alert,
        _clientDecrypted: clientMap[alert.client_id] || null,
      }));

      console.log('Loaded alerts:', alertsWithNames);
      setAlerts(alertsWithNames);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Low': '#10b981',
      'Medium': '#f59e0b',
      'High': '#ef4444',
      'Critical': '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  const getStatusColor = (status) => {
    if (!status) return '#6b7280';
    const statusLower = status.toLowerCase();
    const colors = {
      'new': '#3b82f6',
      'in progress': '#f59e0b',
      'in_progress': '#f59e0b',
      'assigned': '#f59e0b',
      'escalated': '#ef4444',
      'resolved': '#10b981',
      'closed': '#10b981',
      'false positive': '#6b7280',
      'false_positive': '#6b7280'
    };
    return colors[statusLower] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return fmtDateTime(dateString);
  };

  const handleAssignAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('transaction_alerts')
        .update({
          assigned_to: user.id,
          investigation_status: 'assigned',
          assigned_date: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      alert('Alert assigned to you successfully');
      loadAlerts();
      loadStatistics();
    } catch (error) {
      console.error('Error assigning alert:', error);
      alert('Failed to assign alert: ' + error.message);
    }
  };

  const isComplianceRole = profile?.role === 'compliance_officer' || profile?.role === 'admin' || profile?.role === 'system_admin';

  const handleConfirmSuspicious = async (alertId) => {
    const notes = actionNotes[alertId] || '';
    setActionError({ ...actionError, [alertId]: null });
    try {
      setActionInProgress(alertId);
      await confirmTransactionAlert(alertId, notes);
      setActionNotes({ ...actionNotes, [alertId]: '' });
      setExpandedAlertId(null);
      loadAlerts();
      loadStatistics();
    } catch (err) {
      setActionError({ ...actionError, [alertId]: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleClearFalsePositive = async (alertId) => {
    const notes = actionNotes[alertId] || '';
    setActionError({ ...actionError, [alertId]: null });
    try {
      setActionInProgress(alertId);
      await clearTransactionAlert(alertId, notes);
      setActionNotes({ ...actionNotes, [alertId]: '' });
      setExpandedAlertId(null);
      loadAlerts();
      loadStatistics();
    } catch (err) {
      setActionError({ ...actionError, [alertId]: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowAlertDetail(true);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        Loading STR alerts...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionCard}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Suspicious Transaction Reporting (STR) Dashboard</h2>
            <p style={styles.subtitle}>Monitor and manage alerts for regulatory compliance</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #d4af37', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              style={{
                padding: '10px 24px',
                background: 'transparent',
                color: '#0a1929',
                border: 'none',
                borderBottom: '3px solid #d4af37',
                cursor: 'default',
                fontWeight: '700',
                fontSize: '13px',
                marginBottom: '-2px',
              }}
            >
              STR Alerts
            </button>
            {(profile?.role === 'compliance_officer' || profile?.role === 'admin' || profile?.role === 'system_admin' || profile?.role === 'mlro') && (
              <button
                onClick={() => navigate('/str-records')}
                style={{
                  padding: '10px 24px',
                  background: 'transparent',
                  color: '#4a5568',
                  border: 'none',
                  borderBottom: '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  marginBottom: '-2px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0a1929';
                  e.currentTarget.style.borderBottomColor = 'rgba(212, 175, 55, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#4a5568';
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                STR Records
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (profile?.role === 'admin' || profile?.role === 'system_admin') navigate('/admin/dashboard');
              else if (profile?.role === 'management' || profile?.role === 'senior_partner') navigate('/dashboard/management');
              else navigate('/dashboard/compliance');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '8px',
              fontWeight: '500',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0a1929'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {statistics && (
          <div style={styles.statsGrid}>
            <StatCard
              title="Total Alerts"
              value={statistics.total}
              color="#0a1929"
              onClick={() => setFilters({ status: 'all', severity: 'all', assigned: 'all' })}
            />
            <StatCard
              title="New Alerts"
              value={statistics.new}
              color="#3b82f6"
              onClick={() => setFilters(f => ({ ...f, status: 'New', severity: 'all' }))}
            />
            <StatCard
              title="Under Review"
              value={statistics.underReview}
              color="#f59e0b"
              onClick={() => setFilters(f => ({ ...f, status: 'In Progress', severity: 'all' }))}
            />
            <StatCard
              title="Escalated"
              value={statistics.escalated}
              color="#ef4444"
              onClick={() => setFilters(f => ({ ...f, status: 'Escalated', severity: 'all' }))}
            />
            <StatCard
              title="High Priority"
              value={statistics.high}
              color="#ef4444"
              onClick={() => setFilters(f => ({ ...f, severity: 'High', status: 'all' }))}
            />
            <StatCard
              title="Critical"
              value={statistics.critical}
              color="#dc2626"
              onClick={() => setFilters(f => ({ ...f, severity: 'Critical', status: 'all' }))}
            />
          </div>
        )}

        <div style={styles.filtersCard}>
          <h3 style={styles.filtersTitle}>Filters</h3>
          <div style={styles.filtersGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Status:
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={styles.select}
              >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Severity:
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                style={styles.select}
              >
              <option value="all">All Severities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Assignment:
              </label>
              <select
                value={filters.assigned}
                onChange={(e) => setFilters({ ...filters, assigned: e.target.value })}
                style={styles.select}
              >
              <option value="all">All Alerts</option>
              <option value="mine">My Alerts</option>
              <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <h3 style={styles.alertsTitle}>Alerts ({alerts.length})</h3>

          {alerts.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No alerts found matching your filters.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Alert #</th>
                    <th style={styles.th}>Client</th>
                    <th style={styles.th}>Trigger Rule</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Risk Score</th>
                    <th style={styles.th}>Detected</th>
                    <th style={styles.th}>Assigned To</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <React.Fragment key={alert.id}>
                    <tr style={styles.tr}>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleViewDetails(alert)}
                          style={styles.alertNumberButton}
                        >
                          {alert.alert_number}
                        </button>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.clientName}>
                          {alert._clientDecrypted?.client_name || '—'}
                        </div>
                        <div style={styles.clientId}>
                          {alert._clientDecrypted?.client_type || alert.kyc_clients?.client_type || ''}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.clientName}>
                          {alert.transaction_monitoring_rules?.rule_name || (alert.alert_type ? String(alert.alert_type).replace(/_/g, ' ').toUpperCase() : 'N/A')}
                        </div>
                        <div style={styles.clientId}>
                          {alert.transaction_monitoring_rules?.rule_code || ''}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: getSeverityColor(alert.alert_severity || 'medium') + '20',
                          color: getSeverityColor(alert.alert_severity || 'medium')
                        }}>
                          {alert.alert_severity || 'medium'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: getStatusColor(alert.investigation_status || 'new') + '20',
                          color: getStatusColor(alert.investigation_status || 'new')
                        }}>
                          {alert.investigation_status || 'new'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {alert.alert_score ? alert.alert_score : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {formatDate(alert.alert_date)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {alert.assigned_to ? <span style={styles.mutedText}>Assigned</span> : <span style={styles.mutedText}>Unassigned</span>}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {!alert.assigned_to && (
                            <button
                              onClick={() => handleAssignAlert(alert.id)}
                              style={styles.assignButton}
                            >
                              Assign to Me
                            </button>
                          )}
                          {isComplianceRole && alert.investigation_status !== 'resolved' && !alert.is_false_positive && (() => {
            const sarData = Array.isArray(alert.suspicious_activity_reports)
              ? alert.suspicious_activity_reports[0]
              : alert.suspicious_activity_reports;
            const sarStatus = sarData?.str_status;
            const filedWithFIU = alert.str_filed_at || sarStatus === 'filed_with_fiu';
            const recordSaved = alert.str_record_saved_at || (sarStatus && sarStatus !== 'draft');
            if (filedWithFIU) {
              return (
                <button
                  onClick={() => sarData?.id ? navigate(`/str-records/${sarData.id}`) : navigate('/str-records')}
                  style={{ ...styles.escalateButton, backgroundColor: '#065f46', color: '#fff', border: '1px solid #047857' }}
                >
                  Filed — View Record
                </button>
              );
            }
            if (recordSaved) {
              return (
                <button
                  onClick={() => sarData?.id ? navigate(`/str-records/${sarData.id}`) : navigate('/str-records')}
                  style={{ ...styles.escalateButton, backgroundColor: '#1e40af' }}
                >
                  View STR Record
                </button>
              );
            }
            return (
              <button
                onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                style={{ ...styles.escalateButton, backgroundColor: expandedAlertId === alert.id ? '#1e3a5f' : undefined }}
              >
                Action
              </button>
            );
          })()}
                        </div>
                      </td>
                    </tr>
                    {expandedAlertId === alert.id && isComplianceRole && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0 0 8px 0', backgroundColor: '#f8fafc' }}>
                          <AlertActionPanel
                            alert={alert}
                            notes={actionNotes[alert.id] || ''}
                            onNotesChange={(v) => setActionNotes({ ...actionNotes, [alert.id]: v })}
                            onConfirm={() => handleConfirmSuspicious(alert.id)}
                            onClear={() => handleClearFalsePositive(alert.id)}
                            onOpenSTRForm={() => { setExpandedAlertId(null); setStrFormAlert(alert); }}
                            onViewSTRRecord={() => {
                              const sarData = Array.isArray(alert.suspicious_activity_reports)
                                ? alert.suspicious_activity_reports[0]
                                : alert.suspicious_activity_reports;
                              setExpandedAlertId(null);
                              navigate(sarData?.id ? `/str-records/${sarData.id}` : '/str-records');
                            }}
                            inProgress={actionInProgress === alert.id}
                            error={actionError[alert.id]}
                          />
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAlertDetail && selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => {
            setShowAlertDetail(false);
            setSelectedAlert(null);
          }}
          onUpdate={() => {
            loadAlerts();
            loadStatistics();
          }}
          user={user}
        />
      )}

      {strFormAlert && (
        <STRFilingModal
          alert={strFormAlert}
          onClose={() => setStrFormAlert(null)}
          onSuccess={() => {
            setStrFormAlert(null);
            loadAlerts();
            loadStatistics();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.statCard,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }
      }}
    >
      <div style={styles.statTitle}>{title}</div>
      <div style={{...styles.statValue, color}}>{value}</div>
    </div>
  );
}

function STRDeadlineCountdown({ deadline }) {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate - now;
  const overdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      backgroundColor: overdue ? '#fee2e2' : hours < 4 ? '#fef3c7' : '#dcfce7',
      color: overdue ? '#991b1b' : hours < 4 ? '#92400e' : '#166534',
      border: `1px solid ${overdue ? '#fca5a5' : hours < 4 ? '#fde68a' : '#86efac'}`,
    }}>
      {overdue ? '⚠ STR OVERDUE' : `⏱ STR due in ${hours}h ${minutes}m`}
      <span style={{ fontWeight: '400', fontSize: '11px' }}>
        ({fmtDateTime(deadlineDate.toISOString())})
      </span>
    </div>
  );
}

function AlertActionPanel({ alert, notes, onNotesChange, onConfirm, onClear, onOpenSTRForm, onViewSTRRecord, inProgress, error }) {
  const isResolved = alert.investigation_status === 'resolved' || alert.is_false_positive;
  const isSuspiciousConfirmed = alert.str_filed === true;
  const sarData = Array.isArray(alert.suspicious_activity_reports)
    ? alert.suspicious_activity_reports[0]
    : alert.suspicious_activity_reports;
  const sarStatus = sarData?.str_status;
  const hasStrRecordSaved = !!(alert.str_reference_number && alert.str_record_saved_at)
    || (sarStatus && sarStatus !== 'draft');
  const hasStrFiledWithFIU = !!alert.str_filed_at || sarStatus === 'filed_with_fiu';

  return (
    <div style={{
      margin: '0 8px 4px 8px',
      padding: '16px',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderTop: 'none',
      borderRadius: '0 0 8px 8px',
    }}>
      {alert.str_deadline && !hasStrFiledWithFIU && (
        <div style={{ marginBottom: '12px' }}>
          <STRDeadlineCountdown deadline={alert.str_deadline} />
        </div>
      )}
      {hasStrFiledWithFIU && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', color: '#166534' }}>
          STR filed with FIU — ref: <strong>{alert.str_reference_number || sarData?.fiu_reference_number}</strong> at {fmtDateTime(alert.str_filed_at || sarData?.fiu_acknowledgment_date)}
        </div>
      )}
      {hasStrRecordSaved && !hasStrFiledWithFIU && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '12px', color: '#1e40af' }}>
          STR record saved internally — ref: <strong>{alert.str_reference_number}</strong> at {fmtDateTime(alert.str_record_saved_at)}.
          Not yet filed with FIU. Use the STR Records tab to confirm FIU filing.
        </div>
      )}

      {!isResolved && !hasStrFiledWithFIU && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Written Reason (min 10 chars — required by regulations)
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Describe why this alert is being confirmed as suspicious or cleared as false positive..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>


          {error && (
            <div style={{ marginBottom: '10px', padding: '8px 12px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '12px', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isSuspiciousConfirmed && (
              <>
                <button
                  onClick={onConfirm}
                  disabled={inProgress || notes.trim().length < 10}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: notes.trim().length >= 10 ? '#dc2626' : '#f3f4f6',
                    color: notes.trim().length >= 10 ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: notes.trim().length >= 10 ? 'pointer' : 'not-allowed',
                  }}
                >
                  {inProgress ? 'Processing...' : 'Confirm Suspicious — Set STR Deadline'}
                </button>
                <button
                  onClick={onClear}
                  disabled={inProgress || notes.trim().length < 10}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: notes.trim().length >= 10 ? '#059669' : '#f3f4f6',
                    color: notes.trim().length >= 10 ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: notes.trim().length >= 10 ? 'pointer' : 'not-allowed',
                  }}
                >
                  {inProgress ? 'Processing...' : 'Clear — False Positive'}
                </button>
              </>
            )}
            {isSuspiciousConfirmed && !hasStrFiledWithFIU && !hasStrRecordSaved && (
              <button
                onClick={onOpenSTRForm}
                disabled={inProgress}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Complete STR Filing — GN 397 Form
              </button>
            )}
            {isSuspiciousConfirmed && hasStrRecordSaved && !hasStrFiledWithFIU && (
              <button
                onClick={onViewSTRRecord}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                View/Continue STR Record
              </button>
            )}
            {hasStrFiledWithFIU && (
              <button
                onClick={onViewSTRRecord}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#065f46',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Filed — View Record
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AlertDetailModal({ alert, onClose }) {
  const [activeTab] = useState('details');

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Alert Details: {alert.alert_number}</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.detailsSection}>
            <h3 style={styles.detailsHeading}>Alert Information</h3>
            <div style={styles.detailsGrid}>
              <InfoField label="Client" value={alert.kyc_clients?.client_name} />
              <InfoField label="Alert Number" value={alert.alert_number} />
              <InfoField label="Status" value={alert.investigation_status} />
              <InfoField label="Severity" value={alert.alert_severity} />
              <InfoField label="Alert Score" value={alert.alert_score} />
              <InfoField label="Transaction Amount" value={alert.transaction_amount ? `${alert.transaction_currency} ${alert.transaction_amount?.toLocaleString()}` : '-'} />
              <InfoField label="Transaction Type" value={alert.transaction_type} />
              <InfoField label="Detected" value={fmtDateTime(alert.alert_date)} />
            </div>

            {alert.transaction_monitoring_rules && (
              <>
                <h3 style={styles.detailsHeading}>Triggered Rule</h3>
                <div style={styles.detailsGrid}>
                  <InfoField label="Rule Name" value={alert.transaction_monitoring_rules.rule_name} />
                  <InfoField label="Rule Code" value={alert.transaction_monitoring_rules.rule_code} />
                </div>
              </>
            )}

            <h3 style={styles.detailsHeading}>Transaction Details</h3>
            <div style={styles.detailsGrid}>
              <InfoField label="Transaction Reference" value={alert.transaction_reference} />
              <InfoField label="Transaction Date" value={alert.transaction_date ? fmtDateTime(alert.transaction_date) : '-'} />
            </div>

            <h3 style={styles.detailsHeading}>Alert Description</h3>
            <p style={styles.descriptionBox}>
              {alert.alert_description || 'No description provided'}
            </p>

            {alert.suspicious_indicators && alert.suspicious_indicators.length > 0 && (
              <>
                <h3 style={styles.detailsHeading}>Suspicious Indicators</h3>
                <ul style={styles.indicatorList}>
                  {alert.suspicious_indicators.map((indicator, idx) => (
                    <li key={idx} style={styles.indicatorItem}>{indicator}</li>
                  ))}
                </ul>
              </>
            )}

            {alert.transaction_description && (
              <>
                <h3 style={styles.detailsHeading}>Transaction Description</h3>
                <p style={styles.descriptionBox}>
                  {alert.transaction_description}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div style={styles.infoField}>
      <div style={styles.infoLabel}>
        {label}
      </div>
      <div style={styles.infoValue}>
        {value || '-'}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    maxWidth: '100%',
    margin: '0'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096'
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
    padding: '32px',
    marginBottom: '32px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid #d4af37'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0 0 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '12px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  statTitle: {
    fontSize: '12px',
    color: '#4a5568',
    marginBottom: '8px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700'
  },
  filtersCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #d4af37',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filtersTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2d3748',
    background: 'white',
    transition: 'border-color 0.2s ease'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #d4af37',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  alertsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0',
    padding: '20px 24px 16px',
    borderBottom: '2px solid #d4af37'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '0.5px',
    borderBottom: '3px solid #d4af37',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)'
  },
  tr: {
    borderBottom: '1px solid #e8eaed',
    transition: 'background 0.2s ease'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#2d3748'
  },
  clientName: {
    fontWeight: '600',
    marginBottom: '2px',
    color: '#0a1929'
  },
  clientId: {
    fontSize: '12px',
    color: '#4a5568'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  dateText: {
    fontSize: '13px',
    color: '#2d3748'
  },
  mutedText: {
    fontSize: '13px',
    color: '#718096',
    fontStyle: 'italic'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  alertNumberButton: {
    background: 'none',
    border: 'none',
    color: '#d4af37',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  assignButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  escalateButton: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '2px solid #d4af37'
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '2px solid #d4af37',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#d4af37',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    transition: 'all 0.3s ease'
  },
  modalTabs: {
    display: 'flex',
    borderBottom: '2px solid #d4af37',
    padding: '0 24px',
    background: '#f8f9fa'
  },
  modalTab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: '#4a5568',
    fontWeight: '600',
    cursor: 'pointer',
    textTransform: 'capitalize',
    transition: 'all 0.2s',
    marginBottom: '-2px'
  },
  modalTabActive: {
    color: '#d4af37',
    borderBottomColor: '#d4af37',
    fontWeight: '700'
  },
  modalBody: {
    padding: '24px'
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  detailsHeading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    marginTop: '24px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #d4af37'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '16px'
  },
  descriptionBox: {
    background: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '8px',
    border: '1px solid #e8eaed',
    color: '#2d3748',
    lineHeight: '1.6'
  },
  indicatorList: {
    background: '#f8f9fa',
    padding: '16px 16px 16px 36px',
    borderRadius: '8px',
    marginTop: '8px',
    border: '1px solid #e8eaed'
  },
  indicatorItem: {
    marginBottom: '8px',
    color: '#2d3748',
    lineHeight: '1.5'
  },
  infoField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e8eaed'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '14px',
    color: '#0a1929',
    fontWeight: '600'
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    transition: 'all 0.3s ease'
  },
  submitButton: {
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
    transition: 'all 0.3s ease'
  }
};
