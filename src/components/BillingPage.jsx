import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const CLICKPESA_MAX_AMOUNT = 3000000;

const PAYMENT_METHOD_LABELS = {
  mpesa: 'M-Pesa',
  mixx_by_yas: 'Mixx by Yas',
  airtel_money: 'Airtel Money',
  halopesa: 'HaloPesa',
  bank_transfer_crdb: 'CRDB Bank Transfer',
  manual_admin: 'Manual (Admin)',
};

const PAYMENT_STATE_META = {
  trialing:        { label: 'Free Trial',      bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  trial_expired:   { label: 'Trial Expired',   bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  payment_pending: { label: 'Payment Pending', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  paid_active:     { label: 'Active',          bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  payment_failed:  { label: 'Payment Failed',  bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  cancelled:       { label: 'Cancelled',       bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  grace_period:    { label: 'Grace Period',    bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
};

const TIER_LABELS = {
  small_firm:  'Small Firm',
  medium_firm: 'Medium Firm',
  large_firm:  'Large Firm',
};

const MOBILE_METHODS = [
  { value: 'mpesa',        label: 'M-Pesa',       icon: 'M' },
  { value: 'mixx_by_yas',  label: 'Mixx by Yas',  icon: 'Y' },
  { value: 'airtel_money', label: 'Airtel Money',  icon: 'A' },
  { value: 'halopesa',     label: 'HaloPesa',      icon: 'H' },
];

function formatTZS(amount) {
  if (amount == null) return '—';
  return `TZS ${Number(amount).toLocaleString()}`;
}

function maskPhone(phone) {
  if (!phone) return '—';
  if (phone.length <= 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function normalizePhone(raw) {
  let n = raw.replace(/[\s\-().]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '255' + n.slice(1);
  if (!n.startsWith('255')) n = '255' + n;
  return n;
}

function getStatusMessage(status) {
  switch (status) {
    case 'INITIATING': return 'Sending payment request to your phone...';
    case 'PROCESSING': return 'Waiting for your PIN entry...';
    case 'PENDING':    return 'Payment is being confirmed by your network...';
    case 'SUCCESS':    return 'Payment confirmed! Your subscription is now active.';
    case 'FAILED':     return 'Payment failed. Please try again.';
    case 'CANCELLED':  return 'Payment was cancelled.';
    case 'EXPIRED':    return 'Payment session expired. Please try again.';
    default:           return 'Checking payment status...';
  }
}

// ─── Shared modal styles ──────────────────────────────────────────────────────
const ms = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '16px',
  },
  box: {
    background: 'white', borderRadius: '16px', padding: '32px',
    maxWidth: '560px', width: '100%', maxHeight: '92vh',
    overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  heading: { fontSize: '22px', fontWeight: '800', color: '#0a1929', margin: '0 0 4px' },
  sub: { fontSize: '13px', color: '#64748b', margin: '0 0 24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
  input: {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box',
    outline: 'none',
  },
  primaryBtn: {
    padding: '13px 24px', background: '#2563eb', color: 'white', border: 'none',
    borderRadius: '10px', fontWeight: '700', fontSize: '15px',
    cursor: 'pointer', width: '100%',
  },
  ghostBtn: {
    padding: '13px 24px', background: 'transparent', color: '#64748b',
    border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: '600',
    fontSize: '14px', cursor: 'pointer', width: '100%',
  },
};

// ─── PayNowModal ──────────────────────────────────────────────────────────────
function PayNowModal({ org, plans, userEmail, onClose, onSuccess }) {
  // Step 1 = plan + cycle, Step 2 = channel selection + details, Step 3 = mobile polling, Step 4 = bank transfer confirmation
  const [step, setStep] = useState(1);

  // Plan / cycle state
  const [selectedTier, setSelectedTier] = useState(
    plans.find(p => !p.contact_sales)?.tier || 'small_firm'
  );
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Channel: 'mobile' | 'bank' | ''
  const [channel, setChannel] = useState('');

  // Mobile money sub-state
  const [mobileMethod, setMobileMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [pollStatus, setPollStatus] = useState('');
  const [pollMessage, setPollMessage] = useState('');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [pollFailed, setPollFailed] = useState(false);

  // Bank transfer sub-state
  const [crdbDetails, setCrdbDetails] = useState(null);
  const [generatingRef, setGeneratingRef] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankPaymentRef, setBankPaymentRef] = useState('');
  const [bankAmountConfirmed, setBankAmountConfirmed] = useState(0);
  const [copied, setCopied] = useState(false);

  const payablePlans = plans.filter(p => !p.contact_sales);
  const selectedPlan = plans.find(p => p.tier === selectedTier);
  const priceKey = billingCycle === 'annual' ? 'price_annual_tzs' : 'price_monthly_tzs';
  const totalAmount = Number(selectedPlan?.[priceKey] ?? 0);
  const vatAmount = Math.round(totalAmount * 18 / 118);
  const subtotal = totalAmount - vatAmount;

  const canUseMobile = totalAmount <= CLICKPESA_MAX_AMOUNT;

  // Reset channel when amount changes and mobile is no longer available
  useEffect(() => {
    if (!canUseMobile && channel === 'mobile') setChannel('bank');
  }, [canUseMobile, channel]);

  // Load CRDB details from system_settings eagerly (needed in step 4 confirmation)
  useEffect(() => {
    if (crdbDetails) return;
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'crdb_bank_account')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setCrdbDetails(data.value);
      });
  }, [crdbDetails]);

  // Polling effect (mobile flow)
  useEffect(() => {
    if (step !== 3 || !paymentId) return;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const { data, error } = await supabase.functions.invoke('clickpesa-check-payment-status', {
          body: { payment_id: paymentId },
        });
        if (stopped || error) return;
        const s = data?.status;
        setPollStatus(s);
        setPollMessage(data?.message || getStatusMessage(s));
        if (s === 'SUCCESS') {
          stopped = true;
          setTimeout(() => onSuccess(), 2000);
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(s)) {
          stopped = true;
          setPollFailed(true);
        }
      } catch { /* ignore */ }
    };

    const interval = setInterval(poll, 5000);
    const timeout = setTimeout(() => {
      if (!stopped) { stopped = true; setPollTimedOut(true); }
    }, 120000);
    poll();
    return () => { stopped = true; clearInterval(interval); clearTimeout(timeout); };
  }, [step, paymentId, onSuccess]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMobilePay = async () => {
    setPayError('');
    const normalized = normalizePhone(phoneNumber);
    if (!/^255\d{9}$/.test(normalized)) {
      setPayError('Please enter a valid Tanzanian phone number (e.g. 0712 345 678)');
      return;
    }
    if (!mobileMethod) { setPayError('Please select a mobile wallet'); return; }
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickpesa-initiate-payment', {
        body: {
          tier: selectedTier,
          billing_cycle: billingCycle,
          payment_method: mobileMethod,
          phone_number: normalized,
          payer_name: payerName || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPaymentId(data.payment_id);
      setPollMessage('Sending payment request to your phone...');
      setStep(3);
    } catch (err) {
      setPayError(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleGenerateRef = async () => {
    setBankError('');
    setGeneratingRef(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-bank-transfer-claim', {
        body: {
          tier: selectedTier,
          billing_cycle: billingCycle,
          payer_name: payerName || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBankPaymentRef(data.payment_reference);
      setBankAmountConfirmed(data.amount_gross_tzs);
      setStep(4);
    } catch (err) {
      setBankError(err.message || 'Could not generate payment reference. Please try again.');
    } finally {
      setGeneratingRef(false);
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(bankPaymentRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Amount + breakdown summary strip ────────────────────────────────────────
  const AmountStrip = () => (
    <div style={{
      padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: '10px', marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
        <span>{selectedPlan?.name} — {billingCycle === 'annual' ? 'Annual' : 'Monthly'}</span>
        <span>{formatTZS(subtotal)} + VAT</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '20px', color: '#0a1929' }}>
        <span>Total due</span>
        <span style={{ color: '#2563eb' }}>{formatTZS(totalAmount)}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>
        incl. VAT 18% ({formatTZS(vatAmount)})
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>

        {/* ── Step 1: Plan + billing cycle ─────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 style={ms.heading}>Select a Plan</h2>
            <p style={ms.sub}>Choose the plan that fits your firm</p>

            {/* Billing toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { val: 'monthly', label: 'Monthly' },
                { val: 'annual',  label: 'Annual (save ~17%)' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setBillingCycle(val)}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: '2px solid',
                    borderColor: billingCycle === val ? '#2563eb' : '#e2e8f0',
                    background:  billingCycle === val ? '#2563eb' : 'white',
                    color:       billingCycle === val ? 'white'   : '#64748b',
                    fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {payablePlans.map(plan => {
              const price = plan[priceKey];
              const isSelected = plan.tier === selectedTier;
              return (
                <div
                  key={plan.tier}
                  onClick={() => setSelectedTier(plan.tier)}
                  style={{
                    padding: '16px', marginBottom: '10px', cursor: 'pointer',
                    border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    background: isSelected ? '#eff6ff' : 'white',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#0a1929' }}>{plan.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        {plan.max_users ?? '∞'} users · {plan.max_clients ?? '∞'} clients
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '18px', color: '#2563eb' }}>
                        {formatTZS(price)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        / {billingCycle === 'annual' ? 'year' : 'month'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              style={{ ...ms.primaryBtn, marginTop: '8px' }}
              onClick={() => { setChannel(''); setStep(2); }}
            >
              Continue to payment
            </button>
            <button onClick={onClose} style={{ ...ms.ghostBtn, marginTop: '10px' }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Step 2: Channel selection + payment details ───────────────────── */}
        {step === 2 && (
          <>
            <h2 style={ms.heading}>Choose how to pay</h2>
            <p style={ms.sub}>
              {selectedPlan?.name} — {billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing
            </p>

            <AmountStrip />

            {/* Over-limit notice */}
            {!canUseMobile && (
              <div style={{
                padding: '10px 14px', background: '#fef3c7', border: '1px solid #fcd34d',
                borderRadius: '8px', fontSize: '13px', color: '#92400e', marginBottom: '20px',
              }}>
                Amounts above TZS 3,000,000 must be paid by bank transfer.
              </div>
            )}

            {/* Channel cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: canUseMobile ? '1fr 1fr' : '1fr',
              gap: '12px', marginBottom: '24px',
            }}>
              {/* Mobile money card */}
              {canUseMobile && (
                <div
                  onClick={() => setChannel('mobile')}
                  style={{
                    padding: '18px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${channel === 'mobile' ? '#2563eb' : '#e2e8f0'}`,
                    background: channel === 'mobile' ? '#eff6ff' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>📱</div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0a1929', marginBottom: '4px' }}>
                    Mobile Money
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    M-Pesa, Mixx, Airtel, HaloPesa
                  </div>
                  <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600', marginTop: '6px' }}>
                    Instant
                  </div>
                </div>
              )}

              {/* Bank transfer card */}
              <div
                onClick={() => setChannel('bank')}
                style={{
                  padding: '18px', borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${channel === 'bank' ? '#2563eb' : '#e2e8f0'}`,
                  background: channel === 'bank' ? '#eff6ff' : 'white',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🏦</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#0a1929', marginBottom: '4px' }}>
                  CRDB Bank Transfer
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Direct bank transfer
                </div>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', marginTop: '6px' }}>
                  1 business day
                </div>
              </div>
            </div>

            {/* Note below cards */}
            {canUseMobile && (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginBottom: '20px' }}>
                Mobile money is instant. Bank transfer is confirmed manually within 1 business day.
              </div>
            )}

            {/* ── Mobile money expanded ─────────────────────────────────────── */}
            {channel === 'mobile' && (
              <div style={{
                border: '1.5px solid #bfdbfe', borderRadius: '12px',
                padding: '20px', background: '#f8faff', marginBottom: '20px',
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={ms.label}>Select wallet</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {MOBILE_METHODS.map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMobileMethod(m.value)}
                        style={{
                          padding: '10px 6px', textAlign: 'center',
                          border: `2px solid ${mobileMethod === m.value ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                          fontWeight: '600',
                          color:       mobileMethod === m.value ? '#1d4ed8' : '#475569',
                          background:  mobileMethod === m.value ? '#eff6ff'  : 'white',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '3px' }}>{m.icon}</div>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={ms.label}>Phone number</label>
                  <input
                    style={ms.input}
                    type="tel"
                    placeholder="e.g. 0712 345 678"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={ms.label}>Payer name (optional)</label>
                  <input
                    style={ms.input}
                    type="text"
                    placeholder="Name on mobile wallet"
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                  />
                </div>

                {payError && (
                  <div style={{
                    padding: '10px 14px', background: '#fee2e2', borderRadius: '8px',
                    color: '#991b1b', fontSize: '13px', marginBottom: '14px',
                  }}>
                    {payError}
                  </div>
                )}

                <button
                  style={{ ...ms.primaryBtn, opacity: paying ? 0.7 : 1 }}
                  onClick={handleMobilePay}
                  disabled={paying}
                >
                  {paying ? 'Initiating payment...' : `Pay ${formatTZS(totalAmount)} via Mobile`}
                </button>
              </div>
            )}

            {/* ── Bank transfer expanded ────────────────────────────────────── */}
            {channel === 'bank' && (
              <div style={{
                border: '1.5px solid #bfdbfe', borderRadius: '12px',
                padding: '20px', background: '#f8faff', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a1929', marginBottom: '6px' }}>
                  Pay by CRDB Bank Transfer
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: '1.5' }}>
                  Click below to register your transfer intent. We will generate a unique
                  payment reference and send your account details — include the reference
                  in your transfer narration so we can match it automatically.
                </p>

                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '18px' }}>
                  Amount to transfer:{' '}
                  <strong style={{ color: '#0a1929', fontSize: '15px' }}>{formatTZS(totalAmount)}</strong>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={ms.label}>Your name (optional)</label>
                  <input
                    style={ms.input}
                    type="text"
                    placeholder="Name of account holder making the transfer"
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                  />
                </div>

                {bankError && (
                  <div style={{
                    padding: '10px 14px', background: '#fee2e2', borderRadius: '8px',
                    color: '#991b1b', fontSize: '13px', marginBottom: '14px',
                  }}>
                    {bankError}
                  </div>
                )}

                <button
                  style={{ ...ms.primaryBtn, opacity: generatingRef ? 0.7 : 1 }}
                  onClick={handleGenerateRef}
                  disabled={generatingRef}
                >
                  {generatingRef
                    ? 'Generating reference...'
                    : 'Generate Payment Reference'}
                </button>
              </div>
            )}

            <button onClick={() => setStep(1)} style={ms.ghostBtn}>
              Back
            </button>
          </>
        )}

        {/* ── Step 3: Mobile polling ────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {pollStatus === 'SUCCESS' ? (
              <>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>✓</div>
                <h2 style={{ ...ms.heading, textAlign: 'center' }}>Payment Confirmed!</h2>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Your subscription is now active. Refreshing...</p>
              </>
            ) : pollFailed ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✕</div>
                <h2 style={{ ...ms.heading, textAlign: 'center', marginBottom: '12px' }}>Payment Failed</h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                  {pollMessage || 'The payment could not be completed.'}
                </p>
                <button
                  style={ms.primaryBtn}
                  onClick={() => { setPollFailed(false); setPayError(''); setStep(2); }}
                >
                  Try again
                </button>
                <button onClick={onClose} style={{ ...ms.ghostBtn, marginTop: '10px' }}>
                  Cancel
                </button>
              </>
            ) : pollTimedOut ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱</div>
                <h2 style={{ ...ms.heading, textAlign: 'center', marginBottom: '12px' }}>Taking Longer Than Expected</h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                  Your payment may still be processing. You can close this and check back in a few minutes.
                </p>
                <button onClick={onClose} style={ms.primaryBtn}>Close and check later</button>
              </>
            ) : (
              <>
                <div style={{
                  width: '56px', height: '56px', border: '4px solid #e2e8f0',
                  borderTopColor: '#2563eb', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 24px',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <h2 style={{ ...ms.heading, textAlign: 'center', marginBottom: '8px' }}>Check Your Phone</h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                  {pollMessage || 'A USSD prompt has been sent to your phone.'}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                  Enter your mobile wallet PIN to complete the payment.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Bank transfer — reference + account details ──────────── */}
        {step === 4 && (
          <div style={{ padding: '4px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#d1fae5', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h2 style={{ ...ms.heading, margin: 0, fontSize: '18px' }}>Reference Generated</h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Now make your transfer using the details below
                </p>
              </div>
            </div>

            {/* Payment reference — prominent */}
            <div style={{
              padding: '16px 20px', background: '#eff6ff',
              border: '2px solid #bfdbfe', borderRadius: '12px', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', letterSpacing: '1px', marginBottom: '6px' }}>
                YOUR PAYMENT REFERENCE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontFamily: 'monospace', fontWeight: '800', fontSize: '22px',
                  color: '#1e40af', letterSpacing: '2px', flex: 1,
                }}>
                  {bankPaymentRef}
                </span>
                <button
                  onClick={handleCopyRef}
                  title="Copy reference"
                  style={{
                    padding: '7px 14px', background: copied ? '#065f46' : '#1d4ed8',
                    color: 'white', border: 'none', borderRadius: '7px',
                    fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                Keep this reference for your records — quote it if you contact support.
              </div>
            </div>

            {/* CRDB account details */}
            <div style={{
              padding: '16px', background: '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px' }}>
                CRDB BANK ACCOUNT DETAILS
              </div>
              {crdbDetails ? (
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                  {[
                    ['Bank',           'CRDB Bank'],
                    ['Account Name',   crdbDetails.account_name],
                    ['Account Number', crdbDetails.account_number],
                    ['Branch',         crdbDetails.branch],
                    ['SWIFT / BIC',    crdbDetails.swift_code],
                    ['Amount',         formatTZS(bankAmountConfirmed)],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', flexShrink: 0 }}>{lbl}</span>
                      <span style={{
                        fontWeight: '700', color: '#0a1929',
                        fontFamily: lbl === 'Account Number' || lbl === 'SWIFT / BIC' ? 'monospace' : 'inherit',
                        textAlign: 'right',
                      }}>
                        {val || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading account details...</div>
              )}
            </div>

            <div style={{
              padding: '14px 16px', background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '8px', fontSize: '13px', color: '#166534', marginBottom: '20px', lineHeight: '1.6',
            }}>
              Transfer {formatTZS(bankAmountConfirmed)} to the account above using your preferred CRDB channel
              (branch, mobile app, or online banking). We will activate your subscription within 1–2 business
              days of receiving your payment. You'll receive a confirmation email at{' '}
              <strong>{userEmail}</strong> when activation is complete.
            </div>

            <button onClick={onClose} style={ms.primaryBtn}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WebhookLogRow ────────────────────────────────────────────────────────────
function WebhookLogRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const statusColors = {
    SUCCESS:    { bg: '#d1fae5', color: '#065f46' },
    FAILED:     { bg: '#fee2e2', color: '#991b1b' },
    PROCESSING: { bg: '#eff6ff', color: '#1d4ed8' },
    PENDING:    { bg: '#fef3c7', color: '#92400e' },
    CANCELLED:  { bg: '#fee2e2', color: '#991b1b' },
    EXPIRED:    { bg: '#fee2e2', color: '#991b1b' },
  };
  const sc = statusColors[entry.status] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#0a1929', fontFamily: 'monospace' }}>
        {entry.transaction_id?.slice(0, 16)}...
      </td>
      <td style={{ padding: '10px 12px', fontSize: '12px' }}>
        <span style={{ ...sc, padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px' }}>
          {entry.status}
        </span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
        {entry.signature_valid ? 'Valid' : 'Invalid'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
        {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? 'Hide' : 'View'}
        </button>
        {expanded && (
          <pre style={{
            marginTop: '8px', padding: '10px', background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: '6px',
            fontSize: '11px', color: '#374151', overflowX: 'auto',
            maxWidth: '400px', whiteSpace: 'pre-wrap',
          }}>
            {JSON.stringify(entry.raw_payload, null, 2)}
          </pre>
        )}
      </td>
    </tr>
  );
}

// ─── PaymentRow ───────────────────────────────────────────────────────────────
function PaymentRow({ payment, onManualActivate, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [activating, setActivating] = useState(false);

  const stuckProcessing =
    isAdmin &&
    ['PROCESSING', 'PENDING'].includes(payment.clickpesa_status) &&
    payment.initiated_at &&
    (Date.now() - new Date(payment.initiated_at).getTime()) > 24 * 60 * 60 * 1000;

  const statusColors = {
    completed:  { bg: '#d1fae5', color: '#065f46' },
    failed:     { bg: '#fee2e2', color: '#991b1b' },
    processing: { bg: '#eff6ff', color: '#1d4ed8' },
    pending:    { bg: '#fef3c7', color: '#92400e' },
  };
  const sc = statusColors[payment.status] || { bg: '#f1f5f9', color: '#475569' };

  const handleActivate = async () => {
    if (!confirm('Manually activate this subscription? Only do this if payment was confirmed by other means.')) return;
    setActivating(true);
    try { await onManualActivate(payment.id); }
    finally { setActivating(false); }
  };

  return (
    <>
      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ padding: '12px', fontSize: '13px', color: '#0a1929' }}>
          {new Date(payment.created_at).toLocaleDateString()}
        </td>
        <td style={{ padding: '12px', fontSize: '13px', color: '#0a1929', fontWeight: '600' }}>
          {formatTZS(payment.amount_gross_tzs ?? payment.amount_tzs)}
        </td>
        <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>
          {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
        </td>
        <td style={{ padding: '12px' }}>
          <span style={{ ...sc, padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: '700' }}>
            {payment.status}
          </span>
        </td>
        <td style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
          {payment.clickpesa_status || '—'}
        </td>
        <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
          {maskPhone(payment.payer_phone_number)}
        </td>
        <td style={{ padding: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
            {stuckProcessing && (
              <button
                onClick={handleActivate}
                disabled={activating}
                style={{
                  fontSize: '12px', padding: '4px 10px',
                  background: '#f59e0b', color: 'white',
                  border: 'none', borderRadius: '5px',
                  cursor: activating ? 'not-allowed' : 'pointer',
                  fontWeight: '700', opacity: activating ? 0.7 : 1,
                }}
              >
                {activating ? '...' : 'Activate'}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={7} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Transaction / Reference</div>
                <div style={{ fontFamily: 'monospace', color: '#0a1929' }}>
                  {payment.clickpesa_transaction_id || payment.clickpesa_order_reference || payment.payment_reference || '—'}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Channel</div>
                <div style={{ color: '#0a1929' }}>{payment.clickpesa_channel || PAYMENT_METHOD_LABELS[payment.payment_method] || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Webhook Received</div>
                <div style={{ color: '#0a1929' }}>{payment.webhook_received_at ? new Date(payment.webhook_received_at).toLocaleString() : '—'}</div>
              </div>
              {payment.failure_reason && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Failure Reason</div>
                  <div style={{ color: '#dc2626' }}>{payment.failure_reason}</div>
                </div>
              )}
              {payment.webhook_raw_payload && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Raw Webhook Payload</div>
                  <pre style={{
                    padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: '6px', fontSize: '11px', overflowX: 'auto',
                    whiteSpace: 'pre-wrap', color: '#374151',
                  }}>
                    {JSON.stringify(payment.webhook_raw_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── BillingPage ──────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPayModal, setShowPayModal] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isManagement = profile?.role === 'management';

  const loadData = useCallback(async () => {
    if (!profile?.organization_id) { setLoading(false); return; }
    try {
      const [orgRes, plansRes, paymentsRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', profile.organization_id).maybeSingle(),
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('display_order'),
        supabase
          .from('subscription_payments')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(24),
      ]);
      setOrg(orgRes.data);
      setPlans(plansRes.data || []);
      setPayments(paymentsRes.data || []);

      if (isAdmin) {
        const { data: logs } = await supabase
          .from('clickpesa_webhook_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setWebhookLogs(logs || []);
      }
    } catch (err) {
      console.error('BillingPage load error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleManualActivate = async (paymentId) => {
    const { error } = await supabase.rpc('activate_subscription_after_payment', { p_payment_id: paymentId });
    if (error) { alert('Activation failed: ' + error.message); return; }
    alert('Subscription activated successfully.');
    loadData();
  };

  const handlePaymentSuccess = () => {
    refreshProfile();
    setShowPayModal(false);
    setTimeout(() => { window.location.reload(); }, 1500);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '15px', color: '#64748b' }}>Loading billing...</div>
      </div>
    );
  }

  const paymentState = org?.payment_state || 'trialing';
  const stateMeta = PAYMENT_STATE_META[paymentState] || PAYMENT_STATE_META.trialing;
  const tierLabel = TIER_LABELS[org?.subscription_tier] || org?.subscription_tier || 'Free Trial';
  const plan = plans.find(p => p.tier === org?.subscription_tier);
  const daysRemaining = org?.subscription_expiry_date
    ? Math.ceil((new Date(org.subscription_expiry_date) - new Date()) / 86400000)
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: `Payment History (${payments.length})` },
    ...(isAdmin ? [{ id: 'webhooks', label: `Webhook Log (${webhookLogs.length})` }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '14px', cursor: 'pointer', marginBottom: '28px',
            display: 'flex', alignItems: 'center', gap: '6px', padding: 0,
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0a1929', margin: '0 0 6px' }}>Billing & Subscription</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{org?.name}</p>
          </div>
          {isManagement && (
            <button
              onClick={() => setShowPayModal(true)}
              style={{
                padding: '12px 24px', background: '#2563eb', color: 'white',
                border: 'none', borderRadius: '10px', fontWeight: '700',
                fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Pay Now
            </button>
          )}
        </div>

        {/* Status card */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '28px',
          border: `2px solid ${stateMeta.border}`,
          marginBottom: '24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px',
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>CURRENT PLAN</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0a1929', marginBottom: '8px' }}>{tierLabel}</div>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
              background: stateMeta.bg, color: stateMeta.color,
              fontSize: '13px', fontWeight: '700',
            }}>
              {stateMeta.label}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0a1929' }}>
                {daysRemaining != null ? Math.max(0, daysRemaining) : '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Days left</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0a1929' }}>{plan?.max_users ?? '∞'}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Max users</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0a1929' }}>{plan?.max_clients ?? '∞'}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Max clients</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {org?.subscription_expiry_date && (
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                Expires {new Date(org.subscription_expiry_date).toLocaleDateString()}
              </div>
            )}
            <div style={{ fontSize: '13px', color: '#64748b' }}>Monthly: {plan ? formatTZS(plan.price_monthly_tzs) : '—'}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Annual: {plan ? formatTZS(plan.price_annual_tzs) : '—'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}`,
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                fontWeight: activeTab === tab.id ? '700' : '600',
                fontSize: '14px', cursor: 'pointer', marginBottom: '-2px',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', margin: '0 0 16px' }}>Plan Details</h3>
              {[
                ['Plan name', plan?.name || tierLabel],
                ['Tier', org?.subscription_tier || 'N/A'],
                ['Status', stateMeta.label],
                ['Expiry', org?.subscription_expiry_date ? new Date(org.subscription_expiry_date).toLocaleDateString() : 'N/A'],
                ['Max users', plan?.max_users ?? 'Unlimited'],
                ['Max clients', plan?.max_clients ?? 'Unlimited'],
                ['IRAs / year', plan?.max_iras_per_year ?? 'Unlimited'],
                ['Screenings / month', plan?.max_screenings_per_month ?? 'Unlimited'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ color: '#0a1929', fontWeight: '600' }}>{String(val)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', margin: '0 0 16px' }}>Recent Payments</h3>
              {payments.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No payment history yet.</p>
              ) : (
                payments.slice(0, 5).map(p => (
                  <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1929' }}>
                          {formatTZS(p.amount_gross_tzs ?? p.amount_tzs)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                          {' · '}
                          {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                        background: p.status === 'completed' ? '#d1fae5' : p.status === 'failed' ? '#fee2e2' : '#fef3c7',
                        color: p.status === 'completed' ? '#065f46' : p.status === 'failed' ? '#991b1b' : '#92400e',
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {payments.length > 5 && (
                <button
                  onClick={() => setActiveTab('payments')}
                  style={{ marginTop: '12px', fontSize: '13px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  View all {payments.length} payments
                </button>
              )}
            </div>

            {isManagement && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', margin: '0 0 16px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setShowPayModal(true)}
                    style={{
                      padding: '12px', background: '#2563eb', color: 'white',
                      border: 'none', borderRadius: '8px', fontWeight: '700',
                      fontSize: '14px', cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    Renew / Upgrade Subscription
                  </button>
                  <button
                    onClick={() => navigate('/pricing')}
                    style={{
                      padding: '12px', background: 'transparent', color: '#2563eb',
                      border: '1.5px solid #2563eb', borderRadius: '8px', fontWeight: '600',
                      fontSize: '14px', cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    Compare Plans
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment history */}
        {activeTab === 'payments' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {payments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No payment history yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Date', 'Amount', 'Method', 'Status', 'Provider Status', 'Phone', 'Details'].map(h => (
                        <th key={h} style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <PaymentRow key={p.id} payment={p} isAdmin={isAdmin} onManualActivate={handleManualActivate} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Webhook log (admin only) */}
        {activeTab === 'webhooks' && isAdmin && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {webhookLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No webhook events recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Transaction ID', 'Status', 'Signature', 'Received', 'Payload'].map(h => (
                        <th key={h} style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {webhookLogs.map(entry => <WebhookLogRow key={entry.id} entry={entry} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showPayModal && org && (
        <PayNowModal
          org={org}
          plans={plans}
          userEmail={profile?.email || ''}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
