import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const C = {
  gold: '#d4af37', goldSoft: '#f4e8b8', goldDim: '#b8941f',
  navy: '#0a1929', navyLight: '#0f2744',
  white: '#ffffff', bg: '#fafaf7',
  red: '#c0392b', redBg: '#fef2f2',
  green: '#16a34a', greenBg: '#f0fdf4',
  amber: '#b45309', amberBg: '#fffbeb',
  border: '#e2e2dc', text: '#1a1a1a', muted: '#6b6b6b',
};

const s = {
  wrap: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' },
  header: { padding: '20px 24px', background: C.navy, borderBottom: `2px solid ${C.gold}` },
  headerTitle: { fontSize: 17, fontWeight: 700, color: C.gold, letterSpacing: 0.5, margin: 0 },
  headerSub: { fontSize: 12, color: C.goldSoft, marginTop: 6, lineHeight: 1.5 },
  notice: {
    margin: '16px 24px 0',
    padding: '12px 16px',
    background: C.amberBg,
    border: `1px solid ${C.gold}`,
    borderRadius: 6,
    fontSize: 12,
    color: C.amber,
    lineHeight: 1.6,
  },
  toolbar: {
    padding: '16px 24px',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: C.bg,
  },
  count: { fontSize: 13, color: C.muted },
  btn: {
    padding: '8px 18px',
    background: C.navy,
    color: C.gold,
    border: `1px solid ${C.gold}`,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '11px 16px',
    background: C.bg,
    fontSize: 11,
    fontWeight: 700,
    color: C.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: `2px solid ${C.gold}`,
    textAlign: 'left',
  },
  td: { padding: '13px 16px', fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.text, verticalAlign: 'top' },
  empty: { padding: '48px 24px', textAlign: 'center', color: C.muted, fontSize: 14 },
  // modal
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(10,25,41,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: C.white,
    borderRadius: 8,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 24px',
    background: C.navy,
    borderBottom: `2px solid ${C.gold}`,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: C.gold, margin: 0 },
  modalBody: { padding: 24 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 13,
    color: C.text,
    background: C.white,
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 13,
    color: C.text,
    background: C.white,
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: 90,
    outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 13,
    color: C.text,
    background: C.white,
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: C.muted, marginTop: 4 },
  err: { fontSize: 12, color: C.red, marginTop: 4 },
  modalFooter: {
    padding: '16px 24px',
    borderTop: `1px solid ${C.border}`,
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    background: C.bg,
  },
  cancelBtn: {
    padding: '8px 18px',
    background: C.white,
    color: C.navy,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 18px',
    background: C.navy,
    color: C.gold,
    border: `1px solid ${C.gold}`,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
  successBanner: {
    margin: '0 24px 16px',
    padding: '12px 16px',
    background: C.greenBg,
    border: `1px solid ${C.green}`,
    borderRadius: 6,
    fontSize: 13,
    color: C.green,
    fontWeight: 600,
  },
  errBanner: {
    margin: '0 24px 16px',
    padding: '12px 16px',
    background: C.redBg,
    border: `1px solid ${C.red}`,
    borderRadius: 6,
    fontSize: 13,
    color: C.red,
  },
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(str, n = 60) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function DataDeletionRequestsPanel({ orgId }) {
  const [logs, setLogs] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [banner, setBanner] = useState(null); // { type: 'success'|'error', msg }

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  useEffect(() => { loadLogs(); }, [orgId]);

  async function loadLogs() {
    setLoading(true);
    const query = supabase
      .from('data_deletion_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data } = await query;
    setLogs(data || []);

    // Resolve deleted_by UUIDs to emails via user_profiles
    if (data?.length) {
      const ids = [...new Set(data.map(r => r.deleted_by).filter(Boolean))];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', ids);
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p.email; });
        setUserMap(map);
      }
    }
    setLoading(false);
  }

  async function loadClients() {
    const query = supabase
      .from('kyc_clients')
      .select('id, client_name, email, current_risk_rating')
      .is('deleted_at', null)
      .order('client_name');
    if (orgId) query.eq('organization_id', orgId);
    const { data } = await query;
    setClients(data || []);
  }

  function openModal() {
    setSelectedClientId('');
    setClientSearch('');
    setReason('');
    setFormErr('');
    loadClients();
    setShowModal(true);
  }

  async function handleSubmit() {
    setFormErr('');
    if (!selectedClientId) { setFormErr('Select a client.'); return; }
    if (reason.trim().length < 20) { setFormErr('Reason must be at least 20 characters.'); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('erase_personal_data', {
        target_client_id: selectedClientId,
        reason: reason.trim(),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Erasure failed');

      setShowModal(false);
      setBanner({ type: 'success', msg: `Erasure complete. ${data.client_rows} client record(s) anonymised. ${data.screening_rows_anonymised} screening row(s) anonymised. Audit trail preserved.` });
      loadLogs();
    } catch (e) {
      setFormErr(e.message || 'Erasure failed. Check the client ID and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter(c =>
    !clientSearch ||
    c.client_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <p style={s.headerTitle}>Data Subject Erasure Requests</p>
        <p style={s.headerSub}>
          Process right-to-erasure requests under Tanzania PDPA 2022. This tool is for compliance staff only — not a self-service portal for clients.
        </p>
      </div>

      <div style={s.notice}>
        <strong>Controller / Processor note:</strong> Data subject rights requests (erasure, portability) must be submitted by your client to your firm in writing or via email. Your firm — as the data controller — then processes the request here. This tool executes the erasure; your firm is responsible for verifying the request is legitimate before proceeding. Respond within 30 days per PDPA 2022.
      </div>

      {banner && (
        <div style={banner.type === 'success' ? s.successBanner : s.errBanner}>
          {banner.msg}
          <button
            onClick={() => setBanner(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={s.toolbar}>
        <span style={s.count}>
          {loading ? 'Loading…' : `${logs.length} erasure record${logs.length !== 1 ? 's' : ''}`}
        </span>
        <button style={s.btn} onClick={openModal}>
          + Process Erasure Request
        </button>
      </div>

      {loading ? (
        <div style={s.empty}>Loading records…</div>
      ) : logs.length === 0 ? (
        <div style={s.empty}>
          No erasure requests processed yet.
          <br />
          <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
            Records appear here once an erasure is executed via the button above.
          </span>
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Table</th>
              <th style={s.th}>Record ID</th>
              <th style={s.th}>Reason</th>
              <th style={s.th}>Processed By</th>
              <th style={s.th}>Method</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(row => (
              <tr key={row.id}>
                <td style={s.td}>{fmt(row.created_at)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{row.table_name}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: C.muted }}>
                  {row.record_id}
                </td>
                <td style={s.td}>{truncate(row.deletion_reason, 80)}</td>
                <td style={{ ...s.td, fontSize: 12 }}>
                  {userMap[row.deleted_by] || (row.deleted_by ? row.deleted_by.slice(0, 8) + '…' : 'system')}
                </td>
                <td style={{ ...s.td, fontSize: 12, color: C.muted }}>{row.deletion_method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Process Erasure Request</p>
            </div>
            <div style={s.modalBody}>
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  padding: '10px 14px',
                  background: C.amberBg,
                  border: `1px solid ${C.gold}`,
                  borderRadius: 4,
                  fontSize: 12,
                  color: C.amber,
                  lineHeight: 1.6,
                }}>
                  Verify the written request from the data subject before proceeding. Erasure is irreversible. Audit trail is permanently preserved.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Search Client</label>
                <input
                  style={s.input}
                  placeholder="Type name or email…"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClientId(''); }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Select Client *</label>
                <select
                  style={s.select}
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                >
                  <option value="">— Select a client —</option>
                  {filteredClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} {c.email ? `(${c.email})` : ''} — {c.current_risk_rating || 'Unrated'}
                    </option>
                  ))}
                </select>
                {filteredClients.length === 0 && clientSearch && (
                  <p style={s.hint}>No clients match "{clientSearch}"</p>
                )}
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={s.label}>Deletion Reason * (min 20 chars)</label>
                <textarea
                  style={s.textarea}
                  placeholder="e.g. Written erasure request received 2026-05-20 from client John Smith per PDPA 2022 s.16. Verified by Compliance Officer."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
                <p style={{ ...s.hint, color: reason.length < 20 ? C.red : C.green }}>
                  {reason.length} / 20 characters minimum
                </p>
              </div>

              {formErr && <p style={s.err}>{formErr}</p>}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button
                style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Processing…' : 'Execute Erasure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
