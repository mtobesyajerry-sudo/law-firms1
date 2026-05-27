import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function formatTZS(v) {
  if (v == null) return '—';
  return `TZS ${Number(v).toLocaleString()}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Dar_es_Salaam',
  });
}

const STATUS_BADGE = {
  unmatched: { bg: '#fef9c3', color: '#92400e', border: '#fde68a', label: 'Unmatched' },
  matched:   { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Matched'   },
  orphan:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Orphan'    },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] ?? { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label.toUpperCase()}
    </span>
  );
}

// ─── Record Deposit Modal ─────────────────────────────────────────────────────
function RecordDepositModal({ onClose, onSaved }) {
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime]       = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    setError('');
    const amt = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!date) { setError('Date is required'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('crdb_deposits').insert({
      amount_tzs:   amt,
      deposit_date: date,
      deposit_time: time || null,
      notes:        notes || null,
      created_by:   user?.id ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '800', color: '#0a1929' }}>Record CRDB Deposit</h2>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>Amount (TZS) *</label>
            <input style={inp} type="text" placeholder="e.g. 250000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Deposit Date *</label>
            <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Deposit Time (optional)</label>
            <input style={inp} type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Notes (optional)</label>
            <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} placeholder="Branch, sender name, etc." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Record Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revert Reason Modal ──────────────────────────────────────────────────────
function RevertReasonModal({ payment, onClose, onReverted }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleRevert = async () => {
    if (!reason.trim()) { setError('Please enter a reason for reverting.'); return; }
    setError(''); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateErr } = await supabase
      .from('subscription_payments')
      .update({ status: 'pending', customer_confirmed_at: null })
      .eq('id', payment.id);

    if (updateErr) { setError(updateErr.message); setSaving(false); return; }

    await supabase.from('audit_logs').insert({
      user_id:     user?.id ?? null,
      action_type: 'update',
      entity_type: 'subscription_payment',
      entity_id:   payment.id,
      changes: {
        reverted_from:     'pending_confirmation',
        reverted_to:       'pending',
        reason:            reason.trim(),
        payment_reference: payment.payment_reference,
      },
    });

    setSaving(false);
    onReverted();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '16px' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#0a1929' }}>Revert to Pending</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
          This will set <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e40af' }}>{payment.payment_reference}</span> back to <strong>pending</strong> and clear the customer confirmation. Please explain why.
        </p>

        {error && (
          <div style={{ padding: '9px 13px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '7px', fontSize: '13px', color: '#991b1b', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={lbl}>Reason *</label>
          <textarea
            style={{ ...inp, height: '80px', resize: 'vertical' }}
            placeholder="e.g. Customer transferred to wrong account, amount mismatch…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button onClick={onClose} disabled={saving} style={ghostBtn}>Cancel</button>
          <button
            onClick={handleRevert}
            disabled={saving}
            style={{ ...primaryBtn, flex: 1, background: '#b91c1c', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Reverting…' : 'Revert to pending'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Match Panel ──────────────────────────────────────────────────────────────
function MatchPanel({ deposit, onClose, onMatched }) {
  const [suggestions, setSuggestions]   = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [matching, setMatching]         = useState(null); // payment_id being matched
  const [markingOrphan, setMarkingOrphan] = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Load suggested matches on mount — both pending and pending_confirmation;
  // sort pending_confirmation first as they're higher-confidence
  useEffect(() => {
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    supabase
      .from('subscription_payments')
      .select('id, payment_reference, payer_name, organization_id, amount_gross_tzs, billing_cycle, created_at, status, customer_confirmed_at, organizations(name)')
      .eq('payment_method', 'bank_transfer_crdb')
      .in('status', ['pending', 'pending_confirmation'])
      .eq('amount_gross_tzs', deposit.amount_tzs)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = data ?? [];
        // pending_confirmation first, then pending; within each group newest first
        rows.sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'pending_confirmation' ? -1 : 1;
        });
        setSuggestions(rows);
      });
  }, [deposit.amount_tzs]);

  // Search by org name or BNK ref
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.trim();
    setSearching(true);
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    supabase
      .from('subscription_payments')
      .select('id, payment_reference, payer_name, organization_id, amount_gross_tzs, billing_cycle, created_at, status, customer_confirmed_at, organizations(name)')
      .eq('payment_method', 'bank_transfer_crdb')
      .in('status', ['pending', 'pending_confirmation'])
      .gte('created_at', since)
      .or(`payment_reference.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = data ?? [];
        rows.sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'pending_confirmation' ? -1 : 1;
        });
        setSearchResults(rows);
        setSearching(false);
      });
  }, [searchQuery]);

  const handleMatch = async (paymentId) => {
    setError(''); setSuccess(''); setMatching(paymentId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-crdb-deposit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deposit_id: deposit.id, payment_id: paymentId }),
      }
    );
    const body = await res.json().catch(() => ({}));
    setMatching(null);
    if (!res.ok) {
      setError(body.error ?? 'Match failed');
      return;
    }
    setSuccess(`Matched to ${body.payment_reference} — subscription activated. Confirmation email sent to ${body.org_name}.`);
    onMatched();
  };

  const handleMarkOrphan = async () => {
    setError(''); setMarkingOrphan(true);
    const { error: err } = await supabase
      .from('crdb_deposits')
      .update({ status: 'orphan' })
      .eq('id', deposit.id);
    setMarkingOrphan(false);
    if (err) { setError(err.message); return; }
    onMatched();
    onClose();
  };

  const displayList = searchQuery.trim() ? searchResults : suggestions;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '520px',
      background: 'white', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)',
      zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#0a1929', borderBottom: '3px solid #d4af37', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#d4af37' }}>Match Deposit</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {formatTZS(deposit.amount_tzs)} · {formatDate(deposit.deposit_date)}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px' }}>×</button>
      </div>

      <div style={{ padding: '20px 24px', flex: 1 }}>
        {/* Deposit details */}
        <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '10px' }}>DEPOSIT DETAILS</div>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            {[
              ['Amount',  formatTZS(deposit.amount_tzs)],
              ['Date',    formatDate(deposit.deposit_date)],
              ['Time',    deposit.deposit_time ?? '—'],
              ['Notes',   deposit.notes ?? '—'],
              ['Status',  deposit.status],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: '600', color: '#0a1929', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {/* Search override */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ ...lbl, marginBottom: '6px', display: 'block' }}>Search claims by reference or organisation</label>
          <input
            style={inp}
            placeholder="BNK... or org name"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searching && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Searching...</div>}
        </div>

        {/* Claim list */}
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '10px' }}>
          {searchQuery.trim()
            ? `SEARCH RESULTS (${displayList.length})`
            : `SUGGESTED MATCHES — SAME AMOUNT, LAST 60 DAYS (${displayList.length})`}
        </div>

        {displayList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
            {searchQuery.trim() ? 'No claims found for that query.' : 'No pending claims match this deposit amount.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {displayList.map(p => {
              const isConfirmed = p.status === 'pending_confirmation';
              return (
                <div key={p.id} style={{
                  padding: '14px 16px',
                  border: `1px solid ${isConfirmed ? '#fde68a' : '#e2e8f0'}`,
                  borderLeft: isConfirmed ? '4px solid #d97706' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: isConfirmed ? '#fffbeb' : '#fafafa',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '13px', color: '#1e40af' }}>{p.payment_reference}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isConfirmed && (
                        <span style={{
                          fontSize: '10px', fontWeight: '700', letterSpacing: '0.4px',
                          background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a',
                          borderRadius: '999px', padding: '2px 8px',
                        }}>CUSTOMER CONFIRMED</span>
                      )}
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(p.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>{p.organizations?.name ?? '—'}</strong>
                    {p.payer_name && <span style={{ color: '#64748b' }}> · {p.payer_name}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: isConfirmed ? '6px' : '10px' }}>
                    {formatTZS(p.amount_gross_tzs)} · {(p.billing_cycle ?? '').replace('_', ' ')}
                  </div>
                  {isConfirmed && p.customer_confirmed_at && (
                    <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '10px' }}>
                      Confirmed {formatDateTime(p.customer_confirmed_at)}
                    </div>
                  )}
                  <button
                    onClick={() => handleMatch(p.id)}
                    disabled={matching === p.id || !!success}
                    style={{
                      padding: '7px 16px',
                      background: matching === p.id ? '#93c5fd' : (isConfirmed ? '#d97706' : '#2563eb'),
                      color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700',
                      fontSize: '12px', cursor: matching === p.id ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {matching === p.id ? 'Matching...' : 'Match this'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Orphan */}
        {!success && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              No matching claim found? Mark this deposit as an orphan to note that no claim corresponds to it.
            </div>
            <button
              onClick={handleMarkOrphan}
              disabled={markingOrphan}
              style={{ ...ghostBtn, color: '#991b1b', borderColor: '#fca5a5', opacity: markingOrphan ? 0.7 : 1 }}
            >
              {markingOrphan ? 'Marking...' : 'Mark as orphan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const lbl = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' };
const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const primaryBtn = { padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' };
const ghostBtn   = { padding: '10px 20px', background: 'transparent', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' };

// ─── Th helper ────────────────────────────────────────────────────────────────
function Th({ children, sortKey, sortBy, setSortBy }) {
  const active = sortBy?.key === sortKey;
  return (
    <th
      onClick={() => sortKey && setSortBy(prev =>
        prev?.key === sortKey ? { key: sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: sortKey, dir: 'desc' }
      )}
      style={{
        padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700',
        color: active ? '#2563eb' : '#64748b', background: '#f8fafc',
        borderBottom: '2px solid #e2e8f0', letterSpacing: '0.5px', whiteSpace: 'nowrap',
        cursor: sortKey ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      {children}{active ? (sortBy.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const { profile } = useAuth();

  const [claims, setClaims]             = useState([]);
  const [deposits, setDeposits]         = useState([]);
  const [loadingClaims, setLoadingClaims]   = useState(true);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [claimFilter, setClaimFilter]   = useState('all');
  const [depositFilter, setDepositFilter]   = useState('all');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [revertTarget, setRevertTarget] = useState(null); // claim to revert
  const [claimSort, setClaimSort]       = useState({ key: 'created_at', dir: 'desc' });
  const [depositSort, setDepositSort]   = useState({ key: 'deposit_date', dir: 'desc' });

  const fetchClaims = useCallback(async () => {
    setLoadingClaims(true);
    const { data } = await supabase
      .from('subscription_payments')
      .select('id, payment_reference, payer_name, organization_id, amount_gross_tzs, billing_cycle, created_at, status, customer_confirmed_at, organizations(name)')
      .eq('payment_method', 'bank_transfer_crdb')
      .in('status', ['pending', 'pending_confirmation'])
      .order('created_at', { ascending: false });
    setClaims(data ?? []);
    setLoadingClaims(false);
  }, []);

  const fetchDeposits = useCallback(async () => {
    setLoadingDeposits(true);
    const q = supabase
      .from('crdb_deposits')
      .select('*, matched_payment:matched_payment_id(payment_reference)')
      .order('deposit_date', { ascending: false });
    const { data } = await q;
    setDeposits(data ?? []);
    setLoadingDeposits(false);
  }, []);

  useEffect(() => { fetchClaims(); fetchDeposits(); }, [fetchClaims, fetchDeposits]);

  // Sorting helper
  function sortRows(rows, sort) {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const filteredClaims = claimFilter === 'all' ? claims
    : claimFilter === 'customer_confirmed' ? claims.filter(c => c.status === 'pending_confirmation')
    : claims.filter(c => c.status === 'pending');
  const sortedClaims = sortRows(filteredClaims, claimSort);
  const filteredDeposits = depositFilter === 'all' ? deposits : deposits.filter(d => d.status === depositFilter);
  const sortedDeposits = sortRows(filteredDeposits, depositSort);

  if (profile?.role !== 'admin') {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#991b1b', fontSize: '15px' }}>
        Access denied — admin only.
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '800', color: '#0a1929' }}>
            Bank Transfer Reconciliation
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Match incoming CRDB deposits to pending bank transfer claims
          </p>
        </div>

        {/* ── Section 1: Pending Claims ──────────────────────────────────────── */}
        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Bank Transfer Claims</h2>
              <p style={sectionSub}>
                {loadingClaims ? 'Loading…' : (() => {
                  const confirmed = claims.filter(c => c.status === 'pending_confirmation').length;
                  const total = claims.length;
                  return `${total} open claim${total !== 1 ? 's' : ''}${confirmed > 0 ? ` · ${confirmed} customer-confirmed` : ''}`;
                })()}
              </p>
            </div>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'all',                label: 'All' },
                { key: 'pending',            label: 'Pending' },
                { key: 'customer_confirmed', label: 'Customer Confirmed' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setClaimFilter(f.key)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', border: '1.5px solid',
                    background: claimFilter === f.key ? (f.key === 'customer_confirmed' ? '#d97706' : '#0a1929') : 'white',
                    color:      claimFilter === f.key ? 'white' : '#475569',
                    borderColor: claimFilter === f.key ? (f.key === 'customer_confirmed' ? '#d97706' : '#0a1929') : '#e2e8f0',
                    transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                  {f.key === 'customer_confirmed' && claims.filter(c => c.status === 'pending_confirmation').length > 0 && (
                    <span style={{
                      marginLeft: '5px', background: claimFilter === f.key ? 'rgba(255,255,255,0.3)' : '#d97706',
                      color: claimFilter === f.key ? 'white' : 'white', borderRadius: '999px',
                      padding: '0px 6px', fontSize: '10px', fontWeight: '800',
                    }}>
                      {claims.filter(c => c.status === 'pending_confirmation').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  <Th sortKey="payment_reference" sortBy={claimSort} setSortBy={setClaimSort}>CLAIM REF</Th>
                  <Th sortKey="payer_name"        sortBy={claimSort} setSortBy={setClaimSort}>PAYER</Th>
                  <Th sortKey={null}              sortBy={claimSort} setSortBy={setClaimSort}>ORGANISATION</Th>
                  <Th sortKey="amount_gross_tzs"  sortBy={claimSort} setSortBy={setClaimSort}>AMOUNT</Th>
                  <Th sortKey="billing_cycle"     sortBy={claimSort} setSortBy={setClaimSort}>CYCLE</Th>
                  <Th sortKey="created_at"        sortBy={claimSort} setSortBy={setClaimSort}>SUBMITTED</Th>
                  <Th sortKey={null}              sortBy={claimSort} setSortBy={setClaimSort}>STATUS</Th>
                  <Th sortKey={null}              sortBy={claimSort} setSortBy={setClaimSort}>ACTIONS</Th>
                </tr>
              </thead>
              <tbody>
                {loadingClaims ? (
                  <tr><td colSpan={8} style={tdCenter}>Loading…</td></tr>
                ) : sortedClaims.length === 0 ? (
                  <tr><td colSpan={8} style={tdCenter}>No {claimFilter === 'customer_confirmed' ? 'customer-confirmed' : claimFilter === 'pending' ? 'pending' : 'open'} bank transfer claims.</td></tr>
                ) : sortedClaims.map((c, i) => {
                  const isConfirmed = c.status === 'pending_confirmation';
                  return (
                    <tr key={c.id} style={{
                      background: isConfirmed ? '#fffbeb' : (i % 2 === 0 ? 'white' : '#fafafa'),
                      borderLeft: isConfirmed ? '4px solid #d97706' : undefined,
                    }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: '700', color: '#1e40af' }}>{c.payment_reference}</td>
                      <td style={td}>{c.payer_name ?? '—'}</td>
                      <td style={{ ...td, fontWeight: '600' }}>{c.organizations?.name ?? '—'}</td>
                      <td style={{ ...td, fontWeight: '700' }}>{formatTZS(c.amount_gross_tzs)}</td>
                      <td style={td}>{c.billing_cycle ?? '—'}</td>
                      <td style={{ ...td, color: '#64748b', fontSize: '12px' }}>{formatDateTime(c.created_at)}</td>
                      <td style={td}>
                        {isConfirmed ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                            fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px',
                            background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a',
                          }}>CONFIRMED</span>
                        ) : (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                            fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px',
                            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                          }}>PENDING</span>
                        )}
                      </td>
                      <td style={td}>
                        {isConfirmed && (
                          <button
                            onClick={() => setRevertTarget(c)}
                            style={{
                              padding: '5px 12px', background: '#fff1f2', color: '#b91c1c',
                              border: '1px solid #fecaca', borderRadius: '6px',
                              fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Revert to pending
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 2: Incoming Deposits ──────────────────────────────────── */}
        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Incoming CRDB Deposits</h2>
              <p style={sectionSub}>{loadingDeposits ? 'Loading...' : `${deposits.length} deposit${deposits.length !== 1 ? 's' : ''} recorded`}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Status filter */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'unmatched', 'matched', 'orphan'].map(f => (
                  <button
                    key={f}
                    onClick={() => setDepositFilter(f)}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', border: '1.5px solid',
                      background: depositFilter === f ? '#0a1929' : 'white',
                      color:      depositFilter === f ? 'white'   : '#475569',
                      borderColor: depositFilter === f ? '#0a1929' : '#e2e8f0',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRecordModal(true)} style={primaryBtn}>
                + Record new deposit
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  <Th sortKey="amount_tzs"    sortBy={depositSort} setSortBy={setDepositSort}>AMOUNT</Th>
                  <Th sortKey="deposit_date"  sortBy={depositSort} setSortBy={setDepositSort}>DATE</Th>
                  <Th sortKey="deposit_time"  sortBy={depositSort} setSortBy={setDepositSort}>TIME</Th>
                  <Th sortKey="status"        sortBy={depositSort} setSortBy={setDepositSort}>STATUS</Th>
                  <Th sortKey={null}          sortBy={depositSort} setSortBy={setDepositSort}>MATCHED CLAIM</Th>
                  <Th sortKey="notes"         sortBy={depositSort} setSortBy={setDepositSort}>NOTES</Th>
                  <Th sortKey={null}          sortBy={depositSort} setSortBy={setDepositSort}>ACTIONS</Th>
                </tr>
              </thead>
              <tbody>
                {loadingDeposits ? (
                  <tr><td colSpan={7} style={tdCenter}>Loading...</td></tr>
                ) : sortedDeposits.length === 0 ? (
                  <tr><td colSpan={7} style={tdCenter}>No deposits{depositFilter !== 'all' ? ` with status "${depositFilter}"` : ''} recorded yet.</td></tr>
                ) : sortedDeposits.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...td, fontWeight: '700' }}>{formatTZS(d.amount_tzs)}</td>
                    <td style={td}>{formatDate(d.deposit_date)}</td>
                    <td style={{ ...td, color: '#64748b' }}>{d.deposit_time ?? '—'}</td>
                    <td style={td}><StatusBadge status={d.status} /></td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '12px', color: '#1e40af' }}>
                      {d.matched_payment?.payment_reference ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.notes ?? '—'}
                    </td>
                    <td style={td}>
                      {d.status === 'unmatched' && (
                        <button
                          onClick={() => setSelectedDeposit(d)}
                          style={{
                            padding: '5px 12px', background: '#eff6ff', color: '#2563eb',
                            border: '1px solid #bfdbfe', borderRadius: '6px',
                            fontWeight: '700', fontSize: '11px', cursor: 'pointer',
                          }}
                        >
                          Match
                        </button>
                      )}
                      {d.status === 'matched' && (
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Activated</span>
                      )}
                      {d.status === 'orphan' && (
                        <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>No claim</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Modals / panels */}
      {showRecordModal && (
        <RecordDepositModal
          onClose={() => setShowRecordModal(false)}
          onSaved={fetchDeposits}
        />
      )}

      {revertTarget && (
        <RevertReasonModal
          payment={revertTarget}
          onClose={() => setRevertTarget(null)}
          onReverted={() => { setRevertTarget(null); fetchClaims(); }}
        />
      )}

      {selectedDeposit && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedDeposit(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          />
          <MatchPanel
            deposit={selectedDeposit}
            onClose={() => setSelectedDeposit(null)}
            onMatched={() => { fetchClaims(); fetchDeposits(); setSelectedDeposit(null); }}
          />
        </>
      )}
    </div>
  );
}

// ─── Table styles ─────────────────────────────────────────────────────────────
const sectionCard   = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px', overflow: 'hidden' };
const sectionHeader = { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' };
const sectionTitle  = { margin: 0, fontSize: '16px', fontWeight: '800', color: '#0a1929' };
const sectionSub    = { margin: '2px 0 0', fontSize: '12px', color: '#64748b' };
const table         = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const td            = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#1a1a1a', verticalAlign: 'middle' };
const tdCenter      = { padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid #f1f5f9' };
