// STR Record Detail — read-only view of a saved suspicious_activity_reports row.
// Includes "Confirm Filed with FIU" action and a print/export view for manual goAML re-entry.

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const COMPLIANCE_ROLES = ['compliance_officer', 'admin', 'system_admin', 'mlro'];

function SectionCard({ title, reg, children }) {
  return (
    <div style={{ marginBottom: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg, #0a1929 0%, #1a2f45 100%)', borderBottom: '2px solid #d4af37' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#fff' }}>{title}</h3>
        {reg && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{reg}</p>}
      </div>
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: value ? '#111827' : '#9ca3af', lineHeight: '1.5', wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    filed_with_fiu: { bg: '#d1fae5', color: '#065f46', border: '#86efac', label: 'Filed with FIU' },
    saved:          { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Saved — Not Yet Filed with FIU' },
    submitted:      { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Saved — Not Yet Filed with FIU' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', label: status };
  return (
    <span style={{ padding: '4px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: '700', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ConfirmFiledModal — the "Confirm Filed with FIU" action panel
function ConfirmFiledPanel({ record, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [fiuRef, setFiuRef] = useState(record.fiu_reference_number || '');
  const [filedDate, setFiledDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setError(null);
    if (!fiuRef.trim() || fiuRef.trim().length < 3) {
      setError('FIU reference number is required (minimum 3 characters).');
      return;
    }
    if (!filedDate) {
      setError('Filed date is required.');
      return;
    }

    setSaving(true);
    try {
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!COMPLIANCE_ROLES.includes(prof?.role)) {
        throw new Error('Only Compliance Officers may confirm FIU filing.');
      }

      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('suspicious_activity_reports')
        .update({
          str_status: 'filed_with_fiu',
          fiu_reference_number: fiuRef.trim(),
          fiu_acknowledgment_date: new Date(filedDate).toISOString(),
          updated_at: now,
        })
        .eq('id', record.id)
        .eq('organization_id', prof.organization_id);

      if (updateErr) throw new Error(updateErr.message);

      // Also stamp transaction_alerts.str_filed_at — this is the actual FIU filing
      // timestamp, distinct from str_record_saved_at (internal save). The Alert
      // Dashboard reads str_filed_at to show "filed with FIU" and stop the deadline.
      if (record.alert_id) {
        const { error: alertErr } = await supabase
          .from('transaction_alerts')
          .update({
            str_filed_at: new Date(filedDate).toISOString(),
            str_filed_by: user.id,
            str_reference_number: fiuRef.trim(),
            updated_at: now,
          })
          .eq('id', record.alert_id)
          .eq('organization_id', prof.organization_id);

        if (alertErr) throw new Error(alertErr.message);
      }

      // Audit — consistent with screening_audit_log pattern
      await supabase.from('screening_audit_log').insert({
        organization_id: prof.organization_id,
        action: 'str_confirmed_filed_with_fiu',
        actor_id: user.id,
        actor_email: user.email,
        details: {
          sar_id: record.id,
          str_number: record.str_number,
          alert_id: record.alert_id,
          fiu_reference_number: fiuRef.trim(),
          filed_date: filedDate,
          confirmed_at: now,
        },
      });

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#065f46' }}>Confirm Filed with FIU</h3>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#166534', lineHeight: '1.6' }}>
        Use this only after you have completed the actual STR submission on the FIU goAML portal
        (<strong>goaml.fiu.go.tz</strong>). This action marks the internal record as filed and records the FIU reference number issued by the FIU.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#065f46', marginBottom: '5px' }}>
            FIU Reference Number (issued by FIU) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            value={fiuRef}
            onChange={e => setFiuRef(e.target.value)}
            placeholder="e.g. FIU/STR/2026/001"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: 'white' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#065f46', marginBottom: '5px' }}>
            Date Filed with FIU <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            value={filedDate}
            onChange={e => setFiledDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: 'white' }}
          />
        </div>
      </div>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{ padding: '9px 20px', background: saving ? '#9ca3af' : '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Confirming...' : 'Confirm — Mark as Filed with FIU'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', color: '#065f46', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// PrintView — shown via window.print(), styled for paper
function PrintView({ record, alertNumber }) {
  return (
    <div id="str-print-view" style={{ fontFamily: 'Georgia, serif', color: '#000', lineHeight: '1.6', display: 'none' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #str-print-view, #str-print-view * { visibility: visible; display: revert; }
          #str-print-view { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <div style={{ borderBottom: '3px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>SUSPICIOUS TRANSACTION REPORT</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px' }}>GN No. 397 (Anti-Money Laundering Regulations 2022) — Regulation 14 Schedule</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>Internal Reference: {record.str_number} | Alert: {alertNumber || record.alert_id} | Generated: {new Date().toLocaleString('en-GB')}</p>
      </div>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>PART A — Reporting Entity & Officer (Reg 14 Part A)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {[
              ['A(i) Institution Name', record.reporting_institution_name],
              ['A(ii) Institution Code', record.reporting_institution_code],
              ['A(iii) Business Type', record.reporting_person_business_type],
              ['A(iv) Branch', record.reporting_person_branch],
              ['A(v) Address', record.reporting_person_address],
              ['A(vi) Reporting Officer', record.reporting_officer_name],
              ['A(vii) Officer Title', record.reporting_officer_title],
              ['A(viii) Officer ID Type', record.reporting_officer_id_type],
              ['A(viii) Officer ID Number', record.reporting_officer_id_number],
              ['A(ix) Action Taken', record.action_taken],
              ['A(x) Indicator Codes', (record.report_indicator_codes || []).join('; ')],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9' }}>{k}</td>
                <td style={{ padding: '4px 8px' }}>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>PART B — Transaction Details (Reg 14 Part B)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {[
              ['B(i) Incident Date From', fmt(record.incident_date_from)],
              ['B(ii) Incident Date To', fmt(record.incident_date_to)],
              ['B(iii) Value Date', fmt(record.transaction_value_date)],
              ['B(iv) Total Amount', record.total_amount != null ? `${record.total_amount} ${record.currency || 'TZS'}` : '—'],
              ['B(v) Currency', record.currency],
              ['B(vi) Transaction Count', record.transaction_count],
              ['B(vii) Mode of Transaction', record.transaction_mode],
              ['B(viii) Transaction Location', record.transaction_location],
              ['B(ix) Teller / Initiator', record.teller_initiator_name],
              ['B(x) Authorizer', record.transaction_authorizer_name],
              ['B(xi) Source Fund Type', record.source_fund_type],
              ['B(xii) Destination Fund Type', record.destination_fund_type],
              ['B(xiii) Source Subject Type', record.source_subject_type],
              ['B(xiv) Destination Subject Type', record.destination_subject_type],
              ['B(xv) Suspicion Indicators', (record.suspicion_indicators || []).join('; ')],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9' }}>{k}</td>
                <td style={{ padding: '4px 8px' }}>{v || '—'}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9', verticalAlign: 'top' }}>B(xvi) Narrative</td>
              <td style={{ padding: '4px 8px', whiteSpace: 'pre-wrap' }}>{record.narrative || '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>PART C — Individual Subject (Reg 14 Part C)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {[
              ['C(i) Title', record.subject_title],
              ['C(ii) First Name', record.subject_first_name],
              ['C(iii) Middle Name', record.subject_middle_name],
              ['C(iv) Last Name', record.subject_last_name],
              ['C(v) Gender', record.subject_gender],
              ['C(vi) Place of Birth', record.subject_place_of_birth],
              ['C(vii) Occupation', record.subject_occupation],
              ['C(viii) Conductor Details', record.conductor_full_details ? JSON.stringify(record.conductor_full_details) : '—'],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9' }}>{k}</td>
                <td style={{ padding: '4px 8px' }}>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>PART D — Entity Subject (Reg 14 Part D)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {[
              ['D(i) Entity Legal Form', record.entity_legal_form],
              ['D(ii) Directors / Beneficial Owners', record.entity_directors_summary],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9', verticalAlign: 'top' }}>{k}</td>
                <td style={{ padding: '4px 8px', whiteSpace: 'pre-wrap' }}>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: '14px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>FIU FILING DETAILS</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {[
              ['Internal STR Number', record.str_number],
              ['Reporting Officer', record.reporting_officer_name],
              ['Internal Status', record.str_status],
              ['FIU Reference Number', record.fiu_reference_number || '(to be completed after goAML submission)'],
              ['Date Filed with FIU', fmt(record.fiu_acknowledgment_date) || '(to be completed after goAML submission)'],
              ['Internal Notes', record.internal_notes],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <td style={{ padding: '4px 8px', fontWeight: '600', width: '38%', background: '#f9f9f9' }}>{k}</td>
                <td style={{ padding: '4px 8px' }}>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: '#555', marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
          CONFIDENTIAL — This document is for internal compliance use and manual data entry into the FIU goAML system (goaml.fiu.go.tz). Do not distribute.
        </p>
      </section>
    </div>
  );
}

export default function STRRecordDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [alertNumber, setAlertNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);

  const isComplianceRole = COMPLIANCE_ROLES.includes(profile?.role);

  useEffect(() => {
    if (user && id) loadRecord();
  }, [user, id]);

  const loadRecord = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('suspicious_activity_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (err) throw err;
      if (!data) throw new Error('Record not found.');
      setRecord(data);

      if (data.alert_id) {
        const { data: alert } = await supabase
          .from('transaction_alerts')
          .select('alert_number')
          .eq('id', data.alert_id)
          .maybeSingle();
        setAlertNumber(alert?.alert_number || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('str-print-view');
    if (!el) return;
    el.style.display = 'block';
    const hide = () => { el.style.display = 'none'; window.removeEventListener('afterprint', hide); };
    window.addEventListener('afterprint', hide);
    window.print();
  };

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Loading record...</div>;
  }

  if (error || !record) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error || 'Record not found.'}</div>
        <button onClick={() => navigate('/str-records')} style={{ padding: '8px 16px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Back to Records
        </button>
      </div>
    );
  }

  const subjectName = [record.subject_first_name, record.subject_middle_name, record.subject_last_name].filter(Boolean).join(' ') || '—';
  const isSaved = ['saved', 'submitted', 'draft'].includes(record.str_status);
  const isFiled = record.str_status === 'filed_with_fiu';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '32px 24px' }}>
      {/* Hidden print view — only visible during window.print() */}
      <PrintView record={record} alertNumber={alertNumber} />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <button
              onClick={() => navigate('/str-records')}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'block' }}
            >
              ← Back to STR Records
            </button>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0a1929' }}>STR Record — {record.str_number}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <StatusBadge status={record.str_status} />
              {alertNumber && <span style={{ fontSize: '13px', color: '#6b7280' }}>Alert: <strong>{alertNumber}</strong></span>}
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Saved: <strong>{fmt(record.created_at)}</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              style={{ padding: '9px 18px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
            >
              Print / Export for goAML
            </button>
            {isComplianceRole && isSaved && !showConfirmPanel && (
              <button
                onClick={() => setShowConfirmPanel(true)}
                style={{ padding: '9px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Confirm Filed with FIU
              </button>
            )}
          </div>
        </div>

        {/* FIU filing confirmed banner */}
        {isFiled && (
          <div style={{ padding: '14px 20px', borderRadius: '10px', background: '#d1fae5', border: '1px solid #86efac', marginBottom: '24px', fontSize: '13px', color: '#065f46', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span><strong>Filed with FIU</strong></span>
            {record.fiu_reference_number && <span>FIU Reference: <strong>{record.fiu_reference_number}</strong></span>}
            {record.fiu_acknowledgment_date && <span>Date: <strong>{fmt(record.fiu_acknowledgment_date)}</strong></span>}
          </div>
        )}

        {/* Pending filing warning */}
        {isSaved && !showConfirmPanel && (
          <div style={{ padding: '14px 20px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', marginBottom: '24px', fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
            <strong>Not yet filed with FIU.</strong> After you have submitted this STR via goAML
            (<strong>goaml.fiu.go.tz</strong>) and received a reference number from the FIU,
            use "Confirm Filed with FIU" above to update this record.
          </div>
        )}

        {/* Confirm Filed panel */}
        {showConfirmPanel && (
          <ConfirmFiledPanel
            record={record}
            onSuccess={() => { setShowConfirmPanel(false); loadRecord(); }}
            onCancel={() => setShowConfirmPanel(false)}
          />
        )}

        {/* PART A */}
        <SectionCard title="Part A — Reporting Entity & Officer" reg="Reg 14 Part A, GN No. 397">
          <Field label="A(i) Institution Name" value={record.reporting_institution_name} />
          <Field label="A(ii) Institution Code" value={record.reporting_institution_code} />
          <Field label="A(iii) Business Type" value={record.reporting_person_business_type} />
          <Field label="A(iv) Branch" value={record.reporting_person_branch} />
          <Field label="A(v) Address" value={record.reporting_person_address} full />
          <Field label="A(vi) Reporting Officer" value={record.reporting_officer_name} />
          <Field label="A(vii) Officer Title" value={record.reporting_officer_title} />
          <Field label="A(viii) Officer ID Type" value={record.reporting_officer_id_type} />
          <Field label="A(viii) Officer ID Number" value={record.reporting_officer_id_number} />
          <Field label="A(ix) Action Taken" value={record.action_taken} full />
          <Field label="A(x) Indicator Codes" value={(record.report_indicator_codes || []).join(', ')} full />
        </SectionCard>

        {/* PART B */}
        <SectionCard title="Part B — Transaction Details" reg="Reg 14 Part B, GN No. 397">
          <Field label="B(i) Incident Date From" value={fmt(record.incident_date_from)} />
          <Field label="B(ii) Incident Date To" value={fmt(record.incident_date_to)} />
          <Field label="B(iii) Value Date" value={fmt(record.transaction_value_date)} />
          <Field label="B(iv) Total Amount" value={record.total_amount != null ? `${Number(record.total_amount).toLocaleString()} ${record.currency || 'TZS'}` : null} />
          <Field label="B(v) Currency" value={record.currency} />
          <Field label="B(vi) Transaction Count" value={record.transaction_count != null ? String(record.transaction_count) : null} />
          <Field label="B(vii) Mode of Transaction" value={record.transaction_mode} />
          <Field label="B(viii) Transaction Location" value={record.transaction_location} />
          <Field label="B(ix) Teller / Initiator" value={record.teller_initiator_name} />
          <Field label="B(x) Authorizer" value={record.transaction_authorizer_name} />
          <Field label="B(xi) Source Fund Type" value={record.source_fund_type} />
          <Field label="B(xii) Destination Fund Type" value={record.destination_fund_type} />
          <Field label="B(xiii) Source Subject Type" value={record.source_subject_type} />
          <Field label="B(xiv) Destination Subject Type" value={record.destination_subject_type} />
          <Field label="B(xv) Suspicion Indicators" value={(record.suspicion_indicators || []).join('; ')} full />
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>B(xvi) Narrative</div>
            <div style={{ fontSize: '13px', color: '#111827', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: '#f9fafb', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              {record.narrative || '—'}
            </div>
          </div>
        </SectionCard>

        {/* PART C */}
        <SectionCard title="Part C — Individual Subject (Snapshot at Filing)" reg="Reg 14 Part C, GN No. 397">
          <Field label="C(i) Title" value={record.subject_title} />
          <Field label="C(ii) First Name" value={record.subject_first_name} />
          <Field label="C(iii) Middle Name" value={record.subject_middle_name} />
          <Field label="C(iv) Last Name / Surname" value={record.subject_last_name} />
          <Field label="C(v) Gender" value={record.subject_gender} />
          <Field label="C(vi) Place of Birth" value={record.subject_place_of_birth} />
          <Field label="C(vii) Occupation" value={record.subject_occupation} full />
          {record.conductor_full_details && (
            <Field label="C(viii) Conductor Details" value={typeof record.conductor_full_details === 'object' ? (record.conductor_full_details.details || JSON.stringify(record.conductor_full_details)) : String(record.conductor_full_details)} full />
          )}
        </SectionCard>

        {/* PART D */}
        <SectionCard title="Part D — Entity Subject (Snapshot at Filing)" reg="Reg 14 Part D, GN No. 397">
          <Field label="D(i) Entity Legal Form" value={record.entity_legal_form} />
          <Field label="D(ii) Directors / Beneficial Owners" value={record.entity_directors_summary} full />
        </SectionCard>

        {/* Internal metadata */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>Internal Filing Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <Field label="Internal STR Number" value={record.str_number} />
            <Field label="Saved Date" value={fmtDt(record.created_at)} />
            <Field label="FIU Reference Number" value={record.fiu_reference_number} />
            <Field label="Date Filed with FIU" value={fmt(record.fiu_acknowledgment_date)} />
            <Field label="Filing Notes" value={record.internal_notes} full />
          </div>
        </div>

      </div>
    </div>
  );
}
