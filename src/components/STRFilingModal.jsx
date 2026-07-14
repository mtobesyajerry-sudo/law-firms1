// STR Filing Modal — GN No. 397 (AML Regulations 2022) Reg 14
// Captures all Tier 1 fields across Part A / B / C / D before writing to
// suspicious_activity_reports and completing the transaction_alerts filing.

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { fileTransactionSTR } from '../services/screeningService';

const INDICATOR_OPTIONS = [
  'STR-01: Large cash deposits or withdrawals',
  'STR-02: Structuring / smurfing below reporting threshold',
  'STR-03: Rapid movement of funds through accounts',
  'STR-04: Transactions inconsistent with customer profile',
  'STR-05: Multiple accounts linked to same person or entity',
  'STR-06: Use of shell companies or nominees',
  'STR-07: Politically Exposed Person activity',
  'STR-08: Sanctions / watchlist match',
  'STR-09: Terrorism financing indicators',
  'STR-10: Layering through multiple accounts',
  'STR-11: Real estate transactions',
  'STR-12: Trade-based money laundering',
];

const TX_MODE_OPTIONS = ['Cash', 'Wire Transfer', 'Mobile Money', 'Cheque', 'Card', 'Internal Transfer', 'Cryptocurrency', 'Other'];
const FUND_TYPE_OPTIONS = ['Savings', 'Salary', 'Business Revenue', 'Loan', 'Investment', 'Unknown', 'Other'];
const SUBJECT_TYPE_OPTIONS = ['Individual', 'Corporate Entity', 'Government Body', 'NGO / Charity', 'Unknown'];
const ID_TYPE_OPTIONS = ['National ID', 'Passport', 'Driving Licence', 'Employee ID', 'Other'];
const LEGAL_FORM_OPTIONS = ['Limited Liability Company', 'Public Company', 'Partnership', 'Sole Trader', 'Trust', 'NGO', 'Cooperative', 'Government Entity', 'Other'];
const PARTS = ['A', 'B', 'C', 'D'];
const PART_LABELS = { A: 'Reporting Entity', B: 'Transaction', C: 'Subject — Person', D: 'Subject — Entity' };

function Field({ label, reg, required, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'flex', gap: '6px', alignItems: 'baseline', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>
        {label}
        {required && <span style={{ color: '#dc2626' }}>*</span>}
        {reg && <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '400' }}>({reg})</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#111827',
  boxSizing: 'border-box',
  background: 'white',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

function SectionHeading({ title, reg }) {
  return (
    <div style={{ borderBottom: '2px solid #d4af37', marginBottom: '20px', paddingBottom: '8px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0a1929', margin: 0 }}>{title}</h3>
      {reg && <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0' }}>{reg}</p>}
    </div>
  );
}

export default function STRFilingModal({ alert, onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const [activePart, setActivePart] = useState('A');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [clientData, setClientData] = useState(null);

  // Part A — Reporting entity / officer
  const [partA, setPartA] = useState({
    reporting_institution_name: '',
    reporting_institution_code: '',
    reporting_person_address: '',
    reporting_person_business_type: '',
    reporting_person_branch: '',
    reporting_officer_name: '',
    reporting_officer_title: '',
    reporting_officer_id_number: '',
    reporting_officer_id_type: '',
    action_taken: '',
    report_indicator_codes: [],
    fiu_reference_number: '',
    filing_notes: '',
  });

  // Part B — Transaction details
  const [partB, setPartB] = useState({
    incident_date_from: alert?.transaction_date ? alert.transaction_date.slice(0, 10) : '',
    incident_date_to: alert?.transaction_date ? alert.transaction_date.slice(0, 10) : '',
    total_amount: alert?.transaction_amount != null ? String(alert.transaction_amount) : '',
    currency: alert?.transaction_currency || 'TZS',
    transaction_count: '1',
    transaction_value_date: alert?.transaction_date ? alert.transaction_date.slice(0, 10) : '',
    transaction_mode: { cash: 'Cash', cash_deposit: 'Cash', wire: 'Wire Transfer', wire_transfer: 'Wire Transfer', international_wire: 'Wire Transfer' }[alert?.transaction_type] || '',
    teller_initiator_name: '',
    transaction_authorizer_name: '',
    transaction_location: '',
    source_fund_type: '',
    destination_fund_type: '',
    source_subject_type: '',
    destination_subject_type: '',
    narrative: alert?.transaction_description || '',
    suspicion_indicators: Array.isArray(alert?.suspicious_indicators) ? [...alert.suspicious_indicators] : [],
  });

  // Part C — Individual subject (snapshot at filing)
  const [partC, setPartC] = useState({
    subject_title: '',
    subject_gender: '',
    subject_first_name: '',
    subject_middle_name: '',
    subject_last_name: '',
    subject_place_of_birth: '',
    subject_occupation: '',
    conductor_full_details: '',
  });

  // Part D — Entity subject (snapshot at filing)
  const [partD, setPartD] = useState({
    entity_legal_form: '',
    entity_directors_summary: '',
  });

  // Prefill from client record
  useEffect(() => {
    if (!alert?.client_id) return;
    supabase
      .from('kyc_clients_decrypted')
      .select('*')
      .eq('id', alert.client_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setClientData(data);

        const isEntity = data.client_type && data.client_type !== 'individual';

        if (isEntity) {
          // Corporate/entity clients go to Part D — do NOT split their name into person fields
          setPartD(prev => ({
            ...prev,
            entity_directors_summary: prev.entity_directors_summary || (typeof data.beneficial_owners === 'string' ? data.beneficial_owners : JSON.stringify(data.beneficial_owners || [])) || '',
          }));
        } else {
          // Individual clients go to Part C
          const parts = (data.client_name || '').trim().split(/\s+/);
          setPartC(prev => ({
            ...prev,
            subject_first_name: parts[0] || '',
            subject_middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
            subject_last_name: parts.length > 1 ? parts[parts.length - 1] : '',
            subject_occupation: data.business_activity || '',
            subject_place_of_birth: data.country_of_residence || '',
          }));
        }
      });
  }, [alert?.client_id]);

  // Prefill reporting institution from organizations table (best-effort)
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('organizations')
      .select('name, brela_registration, business_type, physical_address, branch_name')
      .eq('id', profile.organization_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setPartA(prev => ({
          ...prev,
          reporting_institution_name: prev.reporting_institution_name || data.name || '',
          reporting_institution_code: prev.reporting_institution_code || data.brela_registration || '',
          reporting_person_business_type: prev.reporting_person_business_type || data.business_type || '',
          reporting_person_address: prev.reporting_person_address || data.physical_address || '',
          reporting_person_branch: prev.reporting_person_branch || data.branch_name || '',
        }));
      })
      .catch(() => {});
  }, [profile?.organization_id]);

  // Prefill reporting officer name/title from user profile
  useEffect(() => {
    if (!profile) return;
    const fullName = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    setPartA(prev => ({
      ...prev,
      reporting_officer_name: prev.reporting_officer_name || fullName || '',
      reporting_officer_title: prev.reporting_officer_title || profile.position || '',
    }));
  }, [profile]);

  const toggleIndicator = (indicator) => {
    setPartB(prev => ({
      ...prev,
      suspicion_indicators: prev.suspicion_indicators.includes(indicator)
        ? prev.suspicion_indicators.filter(i => i !== indicator)
        : [...prev.suspicion_indicators, indicator],
    }));
  };

  const toggleReportCode = (code) => {
    setPartA(prev => ({
      ...prev,
      report_indicator_codes: prev.report_indicator_codes.includes(code)
        ? prev.report_indicator_codes.filter(c => c !== code)
        : [...prev.report_indicator_codes, code],
    }));
  };

  const validate = () => {
    if (!partA.reporting_institution_name.trim()) return { msg: 'Reporting institution name is required.', part: 'A' };
    if (!partA.reporting_officer_name.trim()) return { msg: 'Reporting officer name is required.', part: 'A' };
    if (!partA.fiu_reference_number.trim() || partA.fiu_reference_number.trim().length < 3) return { msg: 'FIU reference number is required (min 3 chars).', part: 'A' };
    if (!partA.filing_notes.trim() || partA.filing_notes.trim().length < 10) return { msg: 'Filing notes must be at least 10 characters.', part: 'A' };
    if (!partB.narrative.trim()) return { msg: 'Narrative is required.', part: 'B' };
    return null;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const err = validate();
    if (err) {
      setSubmitError(err.msg);
      setActivePart(err.part);
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date().toISOString();
      const year = new Date().getFullYear();
      // Stable str_number derived from alert so retries upsert rather than duplicate.
      const strNumber = `STR-${year}-${(alert.alert_number || alert.id.slice(0, 8)).replace(/[^A-Z0-9]/gi, '-').toUpperCase()}`;

      const { error: insertError } = await supabase
        .from('suspicious_activity_reports')
        .upsert({
          organization_id: profile.organization_id,
          str_number: strNumber,
          report_type: 'suspicious_transaction',
          client_id: alert.client_id || null,
          alert_id: alert.id,
          str_status: 'submitted',
          // Part A
          reporting_institution_name: partA.reporting_institution_name.trim(),
          reporting_institution_code: partA.reporting_institution_code.trim() || null,
          reporting_person_address: partA.reporting_person_address.trim() || null,
          reporting_person_business_type: partA.reporting_person_business_type.trim() || null,
          reporting_person_branch: partA.reporting_person_branch.trim() || null,
          reporting_officer_name: partA.reporting_officer_name.trim(),
          reporting_officer_title: partA.reporting_officer_title.trim() || null,
          reporting_officer_id_number: partA.reporting_officer_id_number.trim() || null,
          reporting_officer_id_type: partA.reporting_officer_id_type || null,
          action_taken: partA.action_taken.trim() || null,
          report_indicator_codes: partA.report_indicator_codes.length > 0 ? partA.report_indicator_codes : null,
          fiu_reference_number: partA.fiu_reference_number.trim(),
          internal_notes: partA.filing_notes.trim(),
          // Part B
          report_date: now,
          incident_date_from: partB.incident_date_from || null,
          incident_date_to: partB.incident_date_to || null,
          total_amount: partB.total_amount ? Number(partB.total_amount) : null,
          currency: partB.currency || 'TZS',
          transaction_count: Number(partB.transaction_count) || 1,
          transaction_value_date: partB.transaction_value_date || null,
          transaction_mode: partB.transaction_mode || null,
          teller_initiator_name: partB.teller_initiator_name.trim() || null,
          transaction_authorizer_name: partB.transaction_authorizer_name.trim() || null,
          transaction_location: partB.transaction_location.trim() || null,
          source_fund_type: partB.source_fund_type || null,
          destination_fund_type: partB.destination_fund_type || null,
          source_subject_type: partB.source_subject_type || null,
          destination_subject_type: partB.destination_subject_type || null,
          narrative: partB.narrative.trim(),
          suspicion_indicators: partB.suspicion_indicators.length > 0 ? partB.suspicion_indicators : [],
          // Part C
          subject_title: partC.subject_title || null,
          subject_gender: partC.subject_gender || null,
          subject_first_name: partC.subject_first_name.trim() || null,
          subject_middle_name: partC.subject_middle_name.trim() || null,
          subject_last_name: partC.subject_last_name.trim() || null,
          subject_place_of_birth: partC.subject_place_of_birth.trim() || null,
          subject_occupation: partC.subject_occupation.trim() || null,
          conductor_full_details: partC.conductor_full_details.trim() ? { details: partC.conductor_full_details.trim() } : null,
          // Part D
          entity_legal_form: partD.entity_legal_form || null,
          entity_directors_summary: partD.entity_directors_summary.trim() || null,
          // Workflow
          prepared_by_id: user.id,
          prepared_date: now,
          submission_date: now,
          submission_method: 'online_portal',
          is_confidential: true,
        }, { onConflict: 'alert_id' });

      if (insertError) throw new Error(`SAR record failed: ${insertError.message}`);

      // Mark alert as STR filed on transaction_alerts (edge function).
      // If this fails the SAR row already exists; retry is safe (upsert above).
      await fileTransactionSTR(alert.id, partA.fiu_reference_number.trim(), partA.filing_notes.trim());

      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isIndividual = !clientData || clientData.client_type === 'individual';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '820px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '2px solid #d4af37',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '2px solid #d4af37',
          background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
          borderRadius: '14px 14px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              Suspicious Transaction Report
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              GN No. 397 (AML Regulations 2022) — Reg 14 Schedule &nbsp;·&nbsp; Alert: {alert?.alert_number}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '26px', cursor: 'pointer', lineHeight: '1', padding: '0' }}
          >
            ×
          </button>
        </div>

        {/* Part tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', padding: '0 24px' }}>
          {PARTS.map(p => (
            <button
              key={p}
              onClick={() => setActivePart(p)}
              style={{
                padding: '12px 16px', border: 'none', background: 'none',
                borderBottom: activePart === p ? '3px solid #d4af37' : '3px solid transparent',
                color: activePart === p ? '#0a1929' : '#6b7280',
                fontWeight: activePart === p ? '700' : '500',
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              Part {p} — {PART_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ---- PART A ---- */}
          {activePart === 'A' && (
            <>
              <SectionHeading title="Part A — Reporting Entity & Officer" reg="Reg 14 Part A, GN No. 397" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Reporting Institution Name" reg="Reg 14 A(i)" required>
                  <input
                    style={inputStyle}
                    value={partA.reporting_institution_name}
                    onChange={e => setPartA(p => ({ ...p, reporting_institution_name: e.target.value }))}
                    placeholder="e.g. Tanzania Commercial Bank Ltd"
                  />
                </Field>
                <Field label="Institution Code / Registration No." reg="Reg 14 A(ii)">
                  <input
                    style={inputStyle}
                    value={partA.reporting_institution_code}
                    onChange={e => setPartA(p => ({ ...p, reporting_institution_code: e.target.value }))}
                    placeholder="e.g. TZ-BOT-2024-001"
                  />
                </Field>
                <Field label="Business / Institution Type" reg="Reg 14 A(iii)">
                  <input
                    style={inputStyle}
                    value={partA.reporting_person_business_type}
                    onChange={e => setPartA(p => ({ ...p, reporting_person_business_type: e.target.value }))}
                    placeholder="e.g. Commercial Bank, Microfinance, SACCO"
                  />
                </Field>
                <Field label="Branch Name" reg="Reg 14 A(iv)">
                  <input
                    style={inputStyle}
                    value={partA.reporting_person_branch}
                    onChange={e => setPartA(p => ({ ...p, reporting_person_branch: e.target.value }))}
                    placeholder="e.g. Kariakoo Branch"
                  />
                </Field>
              </div>

              <Field label="Reporting Person / Institution Address" reg="Reg 14 A(v)">
                <input
                  style={inputStyle}
                  value={partA.reporting_person_address}
                  onChange={e => setPartA(p => ({ ...p, reporting_person_address: e.target.value }))}
                  placeholder="Physical address of reporting institution"
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Reporting Officer — Full Name" reg="Reg 14 A(vi)" required>
                  <input
                    style={inputStyle}
                    value={partA.reporting_officer_name}
                    onChange={e => setPartA(p => ({ ...p, reporting_officer_name: e.target.value }))}
                    placeholder="Full name of officer completing this report"
                  />
                </Field>
                <Field label="Officer Title / Position" reg="Reg 14 A(vii)">
                  <input
                    style={inputStyle}
                    value={partA.reporting_officer_title}
                    onChange={e => setPartA(p => ({ ...p, reporting_officer_title: e.target.value }))}
                    placeholder="e.g. Chief Compliance Officer, MLRO"
                  />
                </Field>
                <Field label="Officer ID Type" reg="Reg 14 A(viii)">
                  <select
                    style={selectStyle}
                    value={partA.reporting_officer_id_type}
                    onChange={e => setPartA(p => ({ ...p, reporting_officer_id_type: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {ID_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Officer ID Number" reg="Reg 14 A(viii)">
                  <input
                    style={inputStyle}
                    value={partA.reporting_officer_id_number}
                    onChange={e => setPartA(p => ({ ...p, reporting_officer_id_number: e.target.value }))}
                    placeholder="ID number of reporting officer"
                  />
                </Field>
              </div>

              <Field label="Action Taken by Institution" reg="Reg 14 A(ix)">
                <input
                  style={inputStyle}
                  value={partA.action_taken}
                  onChange={e => setPartA(p => ({ ...p, action_taken: e.target.value }))}
                  placeholder="e.g. Account frozen, transaction reversed, customer notified"
                />
              </Field>

              <Field label="Suspicious Activity Indicator Codes" reg="Reg 14 A(x)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  {INDICATOR_OPTIONS.map(ind => (
                    <label key={ind} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '12px', color: '#374151', background: partA.report_indicator_codes.includes(ind) ? '#fefce8' : '#fff', transition: 'background 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={partA.report_indicator_codes.includes(ind)}
                        onChange={() => toggleReportCode(ind)}
                        style={{ marginTop: '2px', flexShrink: 0 }}
                      />
                      {ind}
                    </label>
                  ))}
                </div>
              </Field>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <SectionHeading title="FIU Filing Reference" reg="Required to complete transaction alert record" />
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '12px', color: '#92400e', marginBottom: '16px', lineHeight: '1.6' }}>
                  <strong>Important — two-step process:</strong> This form creates an internal regulatory record only.
                  You must separately submit this STR to the FIU via goAML or the official FIU channel.
                  Once the FIU acknowledges your submission and issues a reference number, return here and enter it below.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                  <Field label="FIU Reference Number (issued by FIU after external submission)" required>
                    <input
                      style={inputStyle}
                      value={partA.fiu_reference_number}
                      onChange={e => setPartA(p => ({ ...p, fiu_reference_number: e.target.value }))}
                      placeholder="e.g. FIU/STR/2026/001"
                    />
                  </Field>
                </div>
                <Field label="Filing Notes" required>
                  <textarea
                    style={{ ...inputStyle, resize: 'vertical' }}
                    rows={3}
                    value={partA.filing_notes}
                    onChange={e => setPartA(p => ({ ...p, filing_notes: e.target.value }))}
                    placeholder="Written justification for this STR filing (min 10 chars — required by AMLA s.18)"
                  />
                </Field>
              </div>
            </>
          )}

          {/* ---- PART B ---- */}
          {activePart === 'B' && (
            <>
              <SectionHeading title="Part B — Transaction Details" reg="Reg 14 Part B, GN No. 397" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
                <Field label="Incident Date From" reg="Reg 14 B(i)">
                  <input type="date" style={inputStyle} value={partB.incident_date_from} onChange={e => setPartB(p => ({ ...p, incident_date_from: e.target.value }))} />
                </Field>
                <Field label="Incident Date To" reg="Reg 14 B(ii)">
                  <input type="date" style={inputStyle} value={partB.incident_date_to} onChange={e => setPartB(p => ({ ...p, incident_date_to: e.target.value }))} />
                </Field>
                <Field label="Value Date" reg="Reg 14 B(iii)">
                  <input type="date" style={inputStyle} value={partB.transaction_value_date} onChange={e => setPartB(p => ({ ...p, transaction_value_date: e.target.value }))} />
                </Field>
                <Field label="Total Amount" reg="Reg 14 B(iv)">
                  <input type="number" style={inputStyle} value={partB.total_amount} onChange={e => setPartB(p => ({ ...p, total_amount: e.target.value }))} placeholder="0.00" step="0.01" />
                </Field>
                <Field label="Currency" reg="Reg 14 B(v)">
                  <input style={inputStyle} value={partB.currency} onChange={e => setPartB(p => ({ ...p, currency: e.target.value }))} />
                </Field>
                <Field label="Transaction Count" reg="Reg 14 B(vi)">
                  <input type="number" style={inputStyle} value={partB.transaction_count} onChange={e => setPartB(p => ({ ...p, transaction_count: e.target.value }))} min="1" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Mode of Transaction" reg="Reg 14 B(vii)">
                  <select style={selectStyle} value={partB.transaction_mode} onChange={e => setPartB(p => ({ ...p, transaction_mode: e.target.value }))}>
                    <option value="">— Select —</option>
                    {TX_MODE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Transaction Location" reg="Reg 14 B(viii)">
                  <input style={inputStyle} value={partB.transaction_location} onChange={e => setPartB(p => ({ ...p, transaction_location: e.target.value }))} placeholder="e.g. Kariakoo Branch counter, ATM ID 4552, Online" />
                </Field>
                <Field label="Teller / Initiator Name" reg="Reg 14 B(ix)">
                  <input style={inputStyle} value={partB.teller_initiator_name} onChange={e => setPartB(p => ({ ...p, teller_initiator_name: e.target.value }))} />
                </Field>
                <Field label="Authorizer / Approver Name" reg="Reg 14 B(x)">
                  <input style={inputStyle} value={partB.transaction_authorizer_name} onChange={e => setPartB(p => ({ ...p, transaction_authorizer_name: e.target.value }))} />
                </Field>
                <Field label="Source — Type of Funds" reg="Reg 14 B(xi)">
                  <select style={selectStyle} value={partB.source_fund_type} onChange={e => setPartB(p => ({ ...p, source_fund_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {FUND_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Destination — Type of Funds" reg="Reg 14 B(xii)">
                  <select style={selectStyle} value={partB.destination_fund_type} onChange={e => setPartB(p => ({ ...p, destination_fund_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {FUND_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Source Subject Type" reg="Reg 14 B(xiii)">
                  <select style={selectStyle} value={partB.source_subject_type} onChange={e => setPartB(p => ({ ...p, source_subject_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {SUBJECT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Destination Subject Type" reg="Reg 14 B(xiv)">
                  <select style={selectStyle} value={partB.destination_subject_type} onChange={e => setPartB(p => ({ ...p, destination_subject_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {SUBJECT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Suspicious Activity Indicators (from alert)" reg="Reg 14 B(xv)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  {INDICATOR_OPTIONS.map(ind => (
                    <label key={ind} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '12px', color: '#374151', background: partB.suspicion_indicators.includes(ind) ? '#fefce8' : '#fff', transition: 'background 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={partB.suspicion_indicators.includes(ind)}
                        onChange={() => toggleIndicator(ind)}
                        style={{ marginTop: '2px', flexShrink: 0 }}
                      />
                      {ind}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Narrative — Description of Suspicious Activity" reg="Reg 14 B(xvi)" required>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={6}
                  value={partB.narrative}
                  onChange={e => setPartB(p => ({ ...p, narrative: e.target.value }))}
                  placeholder="Provide a detailed narrative of the suspicious activity: what happened, when, how the suspicion arose, and any relevant background. This is the primary evidence document for the FIU."
                />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{partB.narrative.length} characters</div>
              </Field>
            </>
          )}

          {/* ---- PART C ---- */}
          {activePart === 'C' && (
            <>
              <SectionHeading title="Part C — Individual Subject Details (Snapshot at Filing)" reg="Reg 14 Part C, GN No. 397" />
              {clientData && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '12px', color: '#166534', marginBottom: '20px' }}>
                  Prefilled from client record: <strong>{clientData.client_name}</strong>
                  {clientData.national_id ? ` · ID: ${clientData.national_id}` : ''}
                  {clientData.nationality ? ` · Nationality: ${clientData.nationality}` : ''}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
                <Field label="Title" reg="Reg 14 C(i)">
                  <select style={selectStyle} value={partC.subject_title} onChange={e => setPartC(p => ({ ...p, subject_title: e.target.value }))}>
                    <option value="">— Select —</option>
                    {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="First Name" reg="Reg 14 C(ii)">
                  <input style={inputStyle} value={partC.subject_first_name} onChange={e => setPartC(p => ({ ...p, subject_first_name: e.target.value }))} />
                </Field>
                <Field label="Middle Name" reg="Reg 14 C(iii)">
                  <input style={inputStyle} value={partC.subject_middle_name} onChange={e => setPartC(p => ({ ...p, subject_middle_name: e.target.value }))} />
                </Field>
                <Field label="Last Name / Surname" reg="Reg 14 C(iv)">
                  <input style={inputStyle} value={partC.subject_last_name} onChange={e => setPartC(p => ({ ...p, subject_last_name: e.target.value }))} />
                </Field>
                <Field label="Gender" reg="Reg 14 C(v)">
                  <select style={selectStyle} value={partC.subject_gender} onChange={e => setPartC(p => ({ ...p, subject_gender: e.target.value }))}>
                    <option value="">— Select —</option>
                    {['Male', 'Female', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Place of Birth" reg="Reg 14 C(vi)">
                  <input style={inputStyle} value={partC.subject_place_of_birth} onChange={e => setPartC(p => ({ ...p, subject_place_of_birth: e.target.value }))} placeholder="City, Country" />
                </Field>
              </div>
              <Field label="Occupation" reg="Reg 14 C(vii)">
                <input style={inputStyle} value={partC.subject_occupation} onChange={e => setPartC(p => ({ ...p, subject_occupation: e.target.value }))} placeholder="e.g. Business Owner, Civil Servant, Farmer" />
              </Field>
              <Field label="Conductor Details (if different from account holder)" reg="Reg 14 C(viii)">
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  value={partC.conductor_full_details}
                  onChange={e => setPartC(p => ({ ...p, conductor_full_details: e.target.value }))}
                  placeholder="Full name, ID, relationship to account holder, and contact details of the person who physically conducted the transaction (if different from the account holder)"
                />
              </Field>
            </>
          )}

          {/* ---- PART D ---- */}
          {activePart === 'D' && (
            <>
              <SectionHeading title="Part D — Entity Subject Details (Snapshot at Filing)" reg="Reg 14 Part D, GN No. 397" />
              {clientData && clientData.client_type !== 'individual' && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '12px', color: '#166534', marginBottom: '20px' }}>
                  Entity client: <strong>{clientData.client_name}</strong>
                  {clientData.registration_number ? ` · Reg: ${clientData.registration_number}` : ''}
                </div>
              )}
              {clientData && clientData.client_type === 'individual' && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fefce8', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', marginBottom: '20px' }}>
                  Subject is an individual — Part D applies only if a corporate entity is also involved. Complete if applicable.
                </div>
              )}
              <Field label="Entity Legal Form" reg="Reg 14 D(i)">
                <select style={selectStyle} value={partD.entity_legal_form} onChange={e => setPartD(p => ({ ...p, entity_legal_form: e.target.value }))}>
                  <option value="">— Select —</option>
                  {LEGAL_FORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Directors / Beneficial Owners Summary" reg="Reg 14 D(ii)">
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={5}
                  value={partD.entity_directors_summary}
                  onChange={e => setPartD(p => ({ ...p, entity_directors_summary: e.target.value }))}
                  placeholder="List directors, shareholders with ≥25% beneficial ownership, and any ultimate beneficial owners. Include full names, IDs, and percentage ownership."
                />
              </Field>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f8fafc',
          borderRadius: '0 0 14px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {PARTS.filter(p => p !== activePart).map(p => (
              <button
                key={p}
                onClick={() => setActivePart(p)}
                style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
              >
                Go to Part {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {submitError && (
              <div style={{ fontSize: '12px', color: '#dc2626', maxWidth: '320px', padding: '6px 10px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                {submitError}
              </div>
            )}
            <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '9px 22px', background: submitting ? '#9ca3af' : '#1d4ed8',
                color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Finalize STR Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
