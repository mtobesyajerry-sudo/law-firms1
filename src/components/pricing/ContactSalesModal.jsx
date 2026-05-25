import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

const PRACTICE_AREAS = [
  'Conveyancing & Real Estate', 'Corporate & Commercial', 'Banking & Finance',
  'Litigation & Dispute Resolution', 'Criminal Law', 'Family & Matrimonial',
  'Employment & Labour', 'Intellectual Property', 'Tax & Revenue',
  'Immigration', 'Public Law & Administrative', 'Environmental & Natural Resources',
  'Insurance', 'Arbitration & Mediation', 'Mining & Energy',
];

const AML_APPROACH_OPTIONS = [
  { value: 'spreadsheets', label: 'Spreadsheets / manual records' },
  { value: 'paper_files', label: 'Paper files only' },
  { value: 'generic_software', label: 'Generic practice management software' },
  { value: 'dedicated_aml_tool', label: 'Dedicated AML/compliance tool' },
  { value: 'outsourced', label: 'Outsourced compliance function' },
  { value: 'nothing', label: 'No formal process yet' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '3_months', label: 'Within 3 months' },
  { value: '6_months', label: 'Within 6 months' },
  { value: 'exploring', label: 'Just exploring for now' },
];

const INITIAL_FORM = {
  firm_name: '', contact_name: '', email: '', phone: '', advocate_count: '', office_location: '',
  expected_system_users: '', primary_practice_areas: [], current_aml_approach: '',
  current_aml_tool_name: '', last_compliance_review: '', has_dedicated_mlro: null,
  mlro_name: '', reason_for_change: '', desired_timeline: '', additional_notes: '',
};

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={s.label}>
        {label} {required && <span style={{ color: '#b91c1c' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b91c1c' }}>{error}</p>}
    </div>
  );
}

export default function ContactSalesModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showAllAreas, setShowAllAreas] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);

  const toggleArea = (area) => {
    set('primary_practice_areas', form.primary_practice_areas.includes(area)
      ? form.primary_practice_areas.filter(a => a !== area)
      : [...form.primary_practice_areas, area]
    );
  };

  const validate1 = () => {
    const e = {};
    if (!form.firm_name.trim()) e.firm_name = 'Firm name is required';
    if (!form.contact_name.trim()) e.contact_name = 'Your name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.advocate_count) e.advocate_count = 'Please select a range';
    return e;
  };

  const validate2 = () => {
    const e = {};
    if (!form.current_aml_approach) e.current_aml_approach = 'Please select your current approach';
    if (!form.desired_timeline) e.desired_timeline = 'Please select a timeline';
    if (form.current_aml_approach === 'dedicated_aml_tool' && !form.current_aml_tool_name.trim()) {
      e.current_aml_tool_name = 'Please name the tool you currently use';
    }
    return e;
  };

  const goToStep2 = () => {
    const e = validate1();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate2();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const { error: dbErr } = await supabase.from('sales_enquiries').insert({
        firm_name: form.firm_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        advocate_count: form.advocate_count || null,
        office_location: form.office_location.trim() || null,
        expected_system_users: form.expected_system_users ? parseInt(form.expected_system_users, 10) : null,
        primary_practice_areas: form.primary_practice_areas.length > 0 ? form.primary_practice_areas : null,
        current_aml_approach: form.current_aml_approach || null,
        current_aml_tool_name: form.current_aml_tool_name.trim() || null,
        last_compliance_review: form.last_compliance_review || null,
        has_dedicated_mlro: form.has_dedicated_mlro,
        mlro_name: form.mlro_name.trim() || null,
        reason_for_change: form.reason_for_change.trim() || null,
        desired_timeline: form.desired_timeline || null,
        additional_notes: form.additional_notes.trim() || null,
        source: 'pricing_page',
        status: 'new',
      });
      if (dbErr) throw dbErr;
      setSuccess(true);
      setTimeout(() => onClose(), 8000);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const needsTool = form.current_aml_approach === 'dedicated_aml_tool';
  const visibleAreas = showAllAreas ? PRACTICE_AREAS : PRACTICE_AREAS.slice(0, 9);

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {success ? (
          <div style={{ padding: '56px 40px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', color: '#059669' }}>✓</div>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '800', color: '#065f46' }}>Enquiry received!</h2>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '15px', lineHeight: 1.7 }}>
              Thank you. A member of our team will reach out within one business day.<br />
              This window closes automatically.
            </p>
          </div>
        ) : (
          <>
            <div style={s.header}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '19px', fontWeight: '800', color: 'white' }}>
                  {step === 1 ? 'Contact our sales team' : 'Tell us about your compliance setup'}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  Step {step} of 2 — {step === 1 ? 'Your details' : 'Discovery questions'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2].map(n => (
                    <div key={n} style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: n <= step ? '#d4af37' : 'rgba(255,255,255,0.25)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <button onClick={onClose} style={s.closeBtn}>✕</button>
              </div>
            </div>

            {step === 1 ? (
              <div style={s.body}>
                <div style={s.row}>
                  <Field label="Firm name" required error={errors.firm_name}>
                    <input name="firm_name" value={form.firm_name} onChange={handleChange} style={{ ...s.input, borderColor: errors.firm_name ? '#fca5a5' : '#e2e8f0' }} placeholder="e.g. ABC & Partners Advocates" />
                  </Field>
                  <Field label="Your name" required error={errors.contact_name}>
                    <input name="contact_name" value={form.contact_name} onChange={handleChange} style={{ ...s.input, borderColor: errors.contact_name ? '#fca5a5' : '#e2e8f0' }} placeholder="Full name" />
                  </Field>
                </div>
                <div style={s.row}>
                  <Field label="Email" required error={errors.email}>
                    <input name="email" type="email" value={form.email} onChange={handleChange} style={{ ...s.input, borderColor: errors.email ? '#fca5a5' : '#e2e8f0' }} placeholder="you@firm.co.tz" />
                  </Field>
                  <Field label="Phone" error={errors.phone}>
                    <input name="phone" value={form.phone} onChange={handleChange} style={s.input} placeholder="+255 7XX XXX XXX" />
                  </Field>
                </div>
                <div style={s.row}>
                  <Field label="Number of advocates" required error={errors.advocate_count}>
                    <select name="advocate_count" value={form.advocate_count} onChange={handleChange} style={{ ...s.input, borderColor: errors.advocate_count ? '#fca5a5' : '#e2e8f0' }}>
                      <option value="">Select…</option>
                      <option value="1">1 (sole practitioner)</option>
                      <option value="2-5">2–5</option>
                      <option value="6-15">6–15</option>
                      <option value="16-30">16–30</option>
                      <option value="31+">31+</option>
                    </select>
                  </Field>
                  <Field label="Office location">
                    <input name="office_location" value={form.office_location} onChange={handleChange} style={s.input} placeholder="e.g. Dar es Salaam" />
                  </Field>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
                  <button type="button" onClick={goToStep2} style={{ ...s.submitBtn, marginLeft: '12px' }}>
                    Continue →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={s.body}>
                <div style={s.row}>
                  <Field label="Expected system users">
                    <input name="expected_system_users" type="number" min="1" value={form.expected_system_users} onChange={handleChange} style={s.input} placeholder="e.g. 5" />
                  </Field>
                  <Field label="Last compliance review">
                    <select name="last_compliance_review" value={form.last_compliance_review} onChange={handleChange} style={s.input}>
                      <option value="">Select…</option>
                      <option value="within_6_months">Within the last 6 months</option>
                      <option value="within_1_year">Within the last year</option>
                      <option value="over_1_year">Over 1 year ago</option>
                      <option value="never">Never conducted one</option>
                    </select>
                  </Field>
                </div>

                <Field label="Practice areas (select all that apply)">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {visibleAreas.map(area => {
                      const selected = form.primary_practice_areas.includes(area);
                      return (
                        <button
                          key={area} type="button" onClick={() => toggleArea(area)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: selected ? '#0a1929' : '#f1f5f9',
                            color: selected ? 'white' : '#475569',
                            border: selected ? '1.5px solid #0a1929' : '1.5px solid #e2e8f0',
                          }}
                        >
                          {area}
                        </button>
                      );
                    })}
                    {PRACTICE_AREAS.length > 9 && (
                      <button type="button" onClick={() => setShowAllAreas(p => !p)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: 'transparent', color: '#d4af37', border: '1.5px dashed #d4af37' }}>
                        {showAllAreas ? 'Show less' : `+${PRACTICE_AREAS.length - 9} more`}
                      </button>
                    )}
                  </div>
                </Field>

                <Field label="Current AML compliance approach" required error={errors.current_aml_approach}>
                  <select name="current_aml_approach" value={form.current_aml_approach} onChange={handleChange} style={{ ...s.input, borderColor: errors.current_aml_approach ? '#fca5a5' : '#e2e8f0' }}>
                    <option value="">Select…</option>
                    {AML_APPROACH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>

                {needsTool && (
                  <Field label="Which AML tool do you currently use?" required error={errors.current_aml_tool_name}>
                    <input name="current_aml_tool_name" value={form.current_aml_tool_name} onChange={handleChange} style={{ ...s.input, borderColor: errors.current_aml_tool_name ? '#fca5a5' : '#e2e8f0' }} placeholder="Tool name" />
                  </Field>
                )}

                <Field label="Do you have a dedicated MLRO?">
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                      <button
                        key={label} type="button"
                        onClick={() => set('has_dedicated_mlro', val)}
                        style={{
                          padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: form.has_dedicated_mlro === val ? '#0a1929' : '#f8fafc',
                          color: form.has_dedicated_mlro === val ? 'white' : '#64748b',
                          border: form.has_dedicated_mlro === val ? '1.5px solid #0a1929' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                {form.has_dedicated_mlro === true && (
                  <Field label="MLRO name">
                    <input name="mlro_name" value={form.mlro_name} onChange={handleChange} style={s.input} placeholder="Full name" />
                  </Field>
                )}

                <Field label="Desired go-live timeline" required error={errors.desired_timeline}>
                  <select name="desired_timeline" value={form.desired_timeline} onChange={handleChange} style={{ ...s.input, borderColor: errors.desired_timeline ? '#fca5a5' : '#e2e8f0' }}>
                    <option value="">Select…</option>
                    {TIMELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>

                <Field label="Why are you considering a change?">
                  <div style={{ position: 'relative' }}>
                    <textarea name="reason_for_change" value={form.reason_for_change} onChange={handleChange} rows={3} maxLength={500} style={{ ...s.input, resize: 'vertical' }} placeholder="e.g. Regulator audit findings, manual processes too slow…" />
                    <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '11px', color: '#94a3b8' }}>{form.reason_for_change.length}/500</span>
                  </div>
                </Field>

                <Field label="Anything else we should know?">
                  <textarea name="additional_notes" value={form.additional_notes} onChange={handleChange} rows={2} style={{ ...s.input, resize: 'vertical' }} placeholder="Additional context, questions, specific requirements…" />
                </Field>

                {submitError && <p style={{ color: '#b91c1c', fontSize: '14px', margin: '0 0 16px' }}>{submitError}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <button type="button" onClick={() => { setStep(1); setErrors({}); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', fontWeight: '600', padding: 0 }}>
                    ← Back to Step 1
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button type="submit" disabled={submitting} style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? 'Submitting…' : 'Submit enquiry'}
                    </button>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Your details are kept confidential.</p>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(10,25,41,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', overflowY: 'auto',
  },
  modal: {
    background: 'white', borderRadius: '16px',
    width: '100%', maxWidth: '620px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    maxHeight: '92vh', overflowY: 'auto',
  },
  header: {
    padding: '22px 28px',
    background: 'linear-gradient(135deg, #0a1929, #0d2137)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'sticky', top: 0, zIndex: 1,
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.6)', fontSize: '18px',
    cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
  },
  body: { padding: '24px 28px 28px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', color: '#1a202c', boxSizing: 'border-box',
    background: 'white', outline: 'none',
  },
  cancelBtn: {
    padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
    background: 'transparent', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
    background: 'linear-gradient(135deg, #d4af37, #b8941f)', color: '#0a1929',
    border: 'none', cursor: 'pointer',
  },
};
