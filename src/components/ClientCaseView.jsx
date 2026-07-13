import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

const ClientCaseView = ({ clientId, clientName, onBack }) => {
  const [screeningMatches, setScreeningMatches] = useState([]);
  const [transactionAlerts, setTransactionAlerts] = useState([]);
  const [loadingScreening, setLoadingScreening] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    fetchScreeningMatches();
    fetchTransactionAlerts();
  }, [clientId]);

  const fetchScreeningMatches = async () => {
    try {
      setLoadingScreening(true);
      const { data: results, error: resultsError } = await supabase
        .from('screening_results')
        .select('id')
        .eq('client_id', clientId);

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        setScreeningMatches([]);
        return;
      }

      const resultIds = results.map((r) => r.id);
      const { data: matches, error: matchError } = await supabase
        .from('screening_matches')
        .select('id, screening_result_id, status, match_score, match_type, list_entry_name, list_entry_program, list_source, is_pep, pep_category, requires_str, requires_tfs_freeze, created_at')
        .in('screening_result_id', resultIds)
        .order('created_at', { ascending: false });

      if (matchError) throw matchError;
      setScreeningMatches(matches || []);
    } catch (err) {
      setError(`Failed to load screening matches: ${err.message}`);
    } finally {
      setLoadingScreening(false);
    }
  };

  const fetchTransactionAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const { data, error: alertError } = await supabase
        .from('transaction_alerts')
        .select('id, alert_number, alert_type, alert_severity, investigation_status, alert_score, alert_date, transaction_amount, transaction_currency, created_at')
        .eq('client_id', clientId)
        .order('alert_date', { ascending: false });

      if (alertError) throw alertError;
      setTransactionAlerts(data || []);
    } catch (err) {
      setError(`Failed to load transaction alerts: ${err.message}`);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const matchStatusBadge = (status) => {
    const map = {
      pending_review: { bg: '#f59e0b', color: '#fff' },
      pending_second_review: { bg: '#f97316', color: '#fff' },
      completed: { bg: '#10b981', color: '#fff' },
      false_positive: { bg: '#6b7280', color: '#fff' },
      escalated: { bg: '#ef4444', color: '#fff' },
    };
    const c = map[status] || { bg: '#374151', color: '#fff' };
    return { backgroundColor: c.bg, color: c.color, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' };
  };

  const alertSeverityBadge = (severity) => {
    const map = {
      critical: { bg: '#dc2626', color: '#fff' },
      high: { bg: '#ea580c', color: '#fff' },
      medium: { bg: '#d97706', color: '#fff' },
      low: { bg: '#059669', color: '#fff' },
    };
    const c = map[(severity || '').toLowerCase()] || { bg: '#374151', color: '#fff' };
    return { backgroundColor: c.bg, color: c.color, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' };
  };

  const alertStatusBadge = (status) => {
    const map = {
      open: { bg: '#2563eb', color: '#fff' },
      under_investigation: { bg: '#7c3aed', color: '#fff' },
      escalated: { bg: '#dc2626', color: '#fff' },
      closed: { bg: '#6b7280', color: '#fff' },
      str_filed: { bg: '#0f766e', color: '#fff' },
    };
    const c = map[(status || '').toLowerCase()] || { bg: '#374151', color: '#fff' };
    return { backgroundColor: c.bg, color: c.color, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' };
  };

  const flagPill = (label, color) => (
    <span style={{ backgroundColor: color, color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '700', marginRight: '4px', display: 'inline-block' }}>
      {label}
    </span>
  );

  const containerStyle = { minHeight: '100vh', background: 'linear-gradient(to bottom, #f8f9fa, #e8eaed)', padding: '24px' };
  const headerCardStyle = { background: 'linear-gradient(135deg, #0a1929, #1a2f45)', borderRadius: '12px', padding: '24px 28px', marginBottom: '24px', border: '2px solid #d4af37' };
  const sectionCardStyle = { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '24px' };
  const sectionTitleStyle = { fontSize: '18px', fontWeight: '700', color: '#0a1929', margin: '0 0 16px 0', paddingBottom: '10px', borderBottom: '2px solid #d4af37' };
  const rowStyle = { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'grid', gap: '12px' };
  const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' };
  const valueStyle = { fontSize: '13px', color: '#1e293b', fontWeight: '500' };
  const emptyStateStyle = { padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' };
  const backButtonStyle = { padding: '10px 20px', background: 'transparent', border: '2px solid #d4af37', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginBottom: '20px' };

  const isLoading = loadingScreening || loadingAlerts;

  return (
    <div style={containerStyle}>
      <button style={backButtonStyle} onClick={onBack}>
        Back
      </button>

      <div style={headerCardStyle}>
        <div style={{ fontSize: '13px', color: '#d4af37', fontWeight: '600', letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
          Client Case File
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
          {clientName || 'Unknown Client'}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
          ID: {clientId}
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#d4af37' }}>{loadingScreening ? '...' : screeningMatches.length}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>SCREENING MATCHES</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#d4af37' }}>{loadingAlerts ? '...' : transactionAlerts.length}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>TRANSACTION ALERTS</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #dc2626', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Sanctions & Screening Matches ({screeningMatches.length})</h2>
            {screeningMatches.length === 0 ? (
              <div style={emptyStateStyle}>No screening matches found for this client.</div>
            ) : (
              <div>
                {screeningMatches.map((m) => (
                  <div key={m.id} style={{ ...rowStyle, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                    <div>
                      <div style={labelStyle}>List Entry</div>
                      <div style={valueStyle}>{m.list_entry_name || '—'}</div>
                      {m.list_entry_program && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{m.list_entry_program}</div>}
                      {m.list_source && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.list_source}</div>}
                      <div style={{ marginTop: '6px' }}>
                        {m.is_pep && flagPill('PEP', '#7c3aed')}
                        {m.pep_category && flagPill(m.pep_category, '#6d28d9')}
                        {m.requires_str && flagPill('STR Required', '#dc2626')}
                        {m.requires_tfs_freeze && flagPill('TFS Freeze', '#b45309')}
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>Score</div>
                      <div style={{ ...valueStyle, fontSize: '16px', fontWeight: '800', color: m.match_score >= 0.8 ? '#dc2626' : m.match_score >= 0.6 ? '#d97706' : '#16a34a' }}>
                        {m.match_score != null ? `${(m.match_score * 100).toFixed(0)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>Type</div>
                      <div style={valueStyle}>{m.match_type || '—'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Status</div>
                      <span style={matchStatusBadge(m.status)}>{(m.status || '').replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <div style={labelStyle}>Date</div>
                      <div style={valueStyle}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Transaction Alerts ({transactionAlerts.length})</h2>
            {transactionAlerts.length === 0 ? (
              <div style={emptyStateStyle}>No transaction alerts found for this client.</div>
            ) : (
              <div>
                {transactionAlerts.map((a) => (
                  <div key={a.id} style={{ ...rowStyle, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <div>
                      <div style={labelStyle}>Alert</div>
                      <div style={{ ...valueStyle, fontFamily: 'monospace' }}>{a.alert_number || a.id.slice(0, 8)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', textTransform: 'capitalize' }}>
                        {(a.alert_type || '').replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>Severity</div>
                      <span style={alertSeverityBadge(a.alert_severity)}>{a.alert_severity || '—'}</span>
                    </div>
                    <div>
                      <div style={labelStyle}>Status</div>
                      <span style={alertStatusBadge(a.investigation_status)}>{(a.investigation_status || '').replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <div style={labelStyle}>Score</div>
                      <div style={{ ...valueStyle, fontSize: '16px', fontWeight: '800', color: '#0a1929' }}>
                        {a.alert_score != null ? a.alert_score : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>Amount</div>
                      <div style={valueStyle}>
                        {a.transaction_amount != null
                          ? `${a.transaction_currency || ''} ${Number(a.transaction_amount).toLocaleString()}`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={labelStyle}>Date</div>
                      <div style={valueStyle}>{a.alert_date ? new Date(a.alert_date).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClientCaseView;
