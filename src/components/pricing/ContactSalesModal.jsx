import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function ContactSalesModal({ onClose }) {
  const [form, setForm] = useState({
    firm_name: '',
    contact_name: '',
    email: '',
    phone: '',
    advocate_count: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error: dbErr } = await supabase.from('sales_enquiries').insert({
        ...form,
        source: 'pricing_page',
        status: 'new',
      });
      if (dbErr) throw dbErr;
      setSuccess(true);
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {success ? (
          <div style={{ padding: '48px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#059669' }}>✓</div>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '800', color: '#065f46' }}>Message sent!</h2>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '15px', lineHeight: 1.6 }}>
              Thank you. Our team will contact you within one business day.
            </p>
          </div>
        ) : (
          <>
            <div style={s.header}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>Contact our sales team</h2>
              <button onClick={onClose} style={s.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={s.body}>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Firm name *</label>
                  <input name="firm_name" value={form.firm_name} onChange={handleChange} required style={s.input} placeholder="e.g. ABC & Partners Advocates" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Your name *</label>
                  <input name="contact_name" value={form.contact_name} onChange={handleChange} required style={s.input} placeholder="Full name" />
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required style={s.input} placeholder="you@firm.co.tz" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Phone <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                  <input name="phone" value={form.phone} onChange={handleChange} style={s.input} placeholder="+255 7XX XXX XXX" />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={s.label}>Number of advocates *</label>
                <select name="advocate_count" value={form.advocate_count} onChange={handleChange} required style={s.input}>
                  <option value="">Select…</option>
                  <option value="1-10">1–10</option>
                  <option value="11-30">11–30</option>
                  <option value="31-50">31–50</option>
                  <option value="50+">50+</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={s.label}>How can we help? *</label>
                <textarea name="message" value={form.message} onChange={handleChange} required rows={4} style={{ ...s.input, resize: 'vertical' }} placeholder="Tell us about your firm's compliance needs…" />
              </div>
              {error && <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
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
    width: '100%', maxWidth: '600px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 28px',
    background: 'linear-gradient(135deg, #0a1929, #0d2137)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.6)', fontSize: '18px',
    cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
  },
  body: { padding: '24px 28px 28px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: {},
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', color: '#1a202c', boxSizing: 'border-box',
    background: 'white',
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
