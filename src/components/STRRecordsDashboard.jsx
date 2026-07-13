// STR Records — internal record-keeping list view.
// Displays all suspicious_activity_reports rows for the current org.
// Two-step workflow: 'saved' (internal record exists) → 'filed_with_fiu' (officer confirmed goAML submission).

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { fmtDateShort } from '../utils/dateFormat';

const STATUS_LABELS = {
  saved: 'Saved — Not Yet Filed with FIU',
  submitted: 'Saved — Not Yet Filed with FIU',
  filed_with_fiu: 'Filed with FIU',
  draft: 'Draft',
  pending_review: 'Pending Review',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  acknowledged: 'Acknowledged',
};

const STATUS_COLORS = {
  filed_with_fiu: { bg: '#d1fae5', color: '#065f46', border: '#86efac' },
  saved:          { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  submitted:      { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  draft:          { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  pending_review: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  pending_approval: { bg: '#ede9fe', color: '#4c1d95', border: '#c4b5fd' },
  approved:       { bg: '#d1fae5', color: '#065f46', border: '#86efac' },
  acknowledged:   { bg: '#d1fae5', color: '#065f46', border: '#86efac' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}



export default function STRRecordsDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const isComplianceRole = profile?.role === 'compliance_officer' || profile?.role === 'admin' || profile?.role === 'system_admin' || profile?.role === 'mlro';

  useEffect(() => {
    if (user) loadRecords();
  }, [user]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('suspicious_activity_reports')
        .select(`
          id, str_number, str_status, fiu_reference_number,
          fiu_acknowledgment_date, created_at, report_date,
          subject_first_name, subject_middle_name, subject_last_name,
          entity_legal_form, entity_directors_summary,
          reporting_institution_name, narrative,
          alert_id, client_id,
          transaction_alerts!suspicious_activity_reports_alert_id_fkey(alert_number)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setRecords(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(r => {
    if (statusFilter === 'saved' && !['saved', 'submitted'].includes(r.str_status)) return false;
    if (statusFilter === 'filed_with_fiu' && r.str_status !== 'filed_with_fiu') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const subjectName = [r.subject_first_name, r.subject_middle_name, r.subject_last_name].filter(Boolean).join(' ').toLowerCase();
      const alertNum = (r.transaction_alerts?.alert_number || '').toLowerCase();
      const strNum = (r.str_number || '').toLowerCase();
      const fiuRef = (r.fiu_reference_number || '').toLowerCase();
      if (!subjectName.includes(q) && !alertNum.includes(q) && !strNum.includes(q) && !fiuRef.includes(q)) return false;
    }
    return true;
  });

  const savedCount = records.filter(r => ['saved', 'submitted'].includes(r.str_status)).length;
  const filedCount = records.filter(r => r.str_status === 'filed_with_fiu').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <button
                onClick={() => navigate('/str-alerts')}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', padding: 0 }}
              >
                ← Back to Alert Dashboard
              </button>
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0a1929' }}>STR Records</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              Internal regulatory records — GN No. 397 (AML Regulations 2022) Reg 14
            </p>
          </div>
          <div style={{ padding: '10px 16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '12px', color: '#92400e', maxWidth: '340px', lineHeight: '1.5' }}>
            <strong>Two-step process:</strong> Save internally here first, then file with FIU via goAML separately, then return to mark as filed.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Records', value: records.length, bg: '#fff', color: '#0a1929' },
            { label: 'Saved — Not Filed with FIU', value: savedCount, bg: '#fffbeb', color: '#92400e' },
            { label: 'Filed with FIU', value: filedCount, bg: '#f0fdf4', color: '#065f46' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by subject name, alert ref, STR number, FIU ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1', minWidth: '240px', padding: '9px 12px',
              border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px',
              color: '#111827', background: 'white',
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', color: '#374151', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            <option value="saved">Not Yet Filed with FIU</option>
            <option value="filed_with_fiu">Filed with FIU</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Loading records...</div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              {records.length === 0 ? 'No STR records yet. Use the Alert Dashboard to file a Suspicious Transaction Report.' : 'No records match your filters.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  {['Alert Ref', 'STR Number', 'Subject', 'Date Saved', 'Status', 'FIU Reference', 'Filed Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const subjectName = [r.subject_first_name, r.subject_middle_name, r.subject_last_name].filter(Boolean).join(' ') || '—';
                  const alertNum = r.transaction_alerts?.alert_number || '—';
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => navigate(`/str-records/${r.id}`)}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>{alertNum}</td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{r.str_number}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#111827' }}>{subjectName}</td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDateShort(r.created_at)}</td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={r.str_status} /></td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#374151', fontFamily: 'monospace' }}>{r.fiu_reference_number || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDateShort(r.fiu_acknowledgment_date)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>View →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
