import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TIER_LABELS = {
  small_firm: 'Small Firm',
  medium_firm: 'Medium Firm',
  large_firm: 'Large Firm',
};

const PAYMENT_METHODS = [
  { value: 'mpesa',              label: 'M-Pesa',             ussd: true },
  { value: 'mixx_by_yas',        label: 'Mixx by Yas',        ussd: true },
  { value: 'airtel_money',       label: 'Airtel Money',       ussd: true },
  { value: 'halopesa',           label: 'HaloPesa',           ussd: true },
  { value: 'bank_transfer_crdb', label: 'CRDB Bank Transfer', ussd: false },
];

function formatTZS(amount) {
  if (!amount) return 'Contact sales';
  return `TZS ${Number(amount).toLocaleString('en-TZ')}`;
}

function normalizePhone(raw) {
  let n = raw.replace(/[\s\-().]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '255' + n.slice(1);
  if (!n.startsWith('255')) n = '255' + n;
  return n;
}

function isValidTanzanianPhone(n) {
  return /^255\d{9}$/.test(n);
}

export default function TrialExpiredModal() {
  const { organization, signOut, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('annual');

  // Step 2 state
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 3 state
  const [paymentId, setPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pollingTimeout, setPollingTimeout] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('id, tier, name, display_name, price_monthly_tzs, price_annual_tzs, max_users, contact_sales')
      .in('tier', ['small_firm', 'medium_firm', 'large_firm'])
      .order('price_monthly_tzs', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) {
          setPlans(data);
          const current = data.find(p => p.tier === organization?.subscription_tier);
          setSelectedPlan(current ?? data.find(p => !p.contact_sales) ?? null);
        }
      });
  }, [organization?.subscription_tier]);

  // Polling during step 3
  useEffect(() => {
    if (step !== 3 || !paymentId) return;

    const poll = async () => {
      try {
        const { data, error: pollErr } = await supabase.functions.invoke(
          'clickpesa-check-payment-status',
          { body: { payment_id: paymentId } }
        );
        if (pollErr) return;
        setPaymentStatus(data);

        if (data?.status === 'SUCCESS') {
          clearInterval(intervalRef.current);
          clearTimeout(timeoutRef.current);
          setTimeout(() => {
            refreshProfile();
            window.location.reload();
          }, 2000);
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(data?.status)) {
          clearInterval(intervalRef.current);
          clearTimeout(timeoutRef.current);
        }
      } catch {
        // ignore transient polling errors
      }
    };

    intervalRef.current = setInterval(poll, 5000);
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setPollingTimeout(true);
    }, 120000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [step, paymentId]);

  const selectedPrice = selectedPlan
    ? (billingPeriod === 'annual' ? selectedPlan.price_annual_tzs : selectedPlan.price_monthly_tzs)
    : null;

  const handlePay = async () => {
    setError('');
    const normalized = normalizePhone(phoneNumber);
    if (!isValidTanzanianPhone(normalized)) {
      setError('Please enter a valid Tanzanian phone number (e.g. 0712 345 678)');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: initErr } = await supabase.functions.invoke(
        'clickpesa-initiate-payment',
        {
          body: {
            tier: selectedPlan.tier,
            billing_cycle: billingPeriod,
            payment_method: paymentMethod,
            phone_number: normalized,
            payer_name: payerName.trim() || null,
          },
        }
      );
      if (initErr || data?.error) {
        setError(initErr?.message || data?.error || 'Payment initiation failed. Please try again.');
        return;
      }
      setPaymentId(data.payment_id);
      setPaymentStatus({ status: data.status, message: data.message });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Unexpected error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
  const isUssd = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.ussd !== false;

  // ── Step 3: Payment in progress ──────────────────────────────────────────
  if (step === 3) {
    const isSuccess = paymentStatus?.status === 'SUCCESS';
    const isFailed = ['FAILED', 'CANCELLED', 'EXPIRED'].includes(paymentStatus?.status);

    return (
      <div style={s.backdrop}>
        <div style={s.modal}>
          <div style={s.header}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>
              {isSuccess ? 'Payment Confirmed' : isFailed ? 'Payment Unsuccessful' : 'Payment in Progress'}
            </h2>
          </div>
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            {isSuccess ? (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', color: '#059669' }}>✓</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: '#065f46' }}>Payment confirmed!</h3>
                <p style={{ margin: '0 0 6px', fontSize: '15px', color: '#4a5568' }}>Your Iuris Compliance subscription is now active.</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Reloading in 2 seconds...</p>
              </>
            ) : isFailed ? (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', color: '#dc2626' }}>✕</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: '#991b1b' }}>
                  Payment {paymentStatus.status.charAt(0) + paymentStatus.status.slice(1).toLowerCase()}
                </h3>
                <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#4a5568' }}>
                  {paymentStatus.message || 'The payment was not completed. Please try again.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setStep(2); setPaymentStatus(null); setPaymentId(null); setPollingTimeout(false); }}
                  style={s.primaryBtn}
                >
                  Try again
                </button>
              </>
            ) : pollingTimeout ? (
              <>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏱</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '700', color: '#374151' }}>Taking longer than expected</h3>
                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                  You can close this window and check your subscription status from the billing page. Your access will restore automatically once payment is confirmed.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <Link to="/billing" style={{ ...s.primaryBtn, textDecoration: 'none', display: 'block', textAlign: 'center' }}>Go to billing page</Link>
                  <button type="button" onClick={() => { setStep(2); setPaymentStatus(null); setPaymentId(null); setPollingTimeout(false); }} style={s.ghostBtn}>Try again</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTop: '4px solid #d4af37', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
                <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: '700', color: '#0a1929' }}>Check your phone</h3>
                <p style={{ margin: '0 0 8px', fontSize: '15px', color: '#374151', lineHeight: 1.6 }}>
                  We sent a payment request to <strong>+{normalizePhone(phoneNumber)}</strong>.
                </p>
                <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#374151' }}>
                  Enter your <strong>{methodLabel}</strong> PIN to complete payment.
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  {paymentStatus?.message || 'Waiting for confirmation...'}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }}>This window updates automatically.</p>
              </>
            )}
          </div>
          {!isSuccess && !isFailed && !pollingTimeout && (
            <div style={{ padding: '0 32px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" onClick={signOut} style={{ ...s.ghostBtn, marginTop: '16px' }}>Sign out</button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Step 2: Payment details ───────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={s.backdrop}>
        <div style={s.modal}>
          <div style={s.header}>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', color: 'white' }}>Payment Details</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              {selectedPlan ? (TIER_LABELS[selectedPlan.tier] || selectedPlan.name) : ''} · {billingPeriod} · {formatTZS(selectedPrice)}
            </p>
          </div>
          <div style={s.body}>
            <div style={{ marginBottom: '18px' }}>
              <label style={s.label}>Payment method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      border: paymentMethod === m.value ? '2px solid #d4af37' : '2px solid #e2e8f0',
                      background: paymentMethod === m.value ? '#fffbeb' : 'white',
                      color: paymentMethod === m.value ? '#92400e' : '#374151',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {isUssd && (
              <div style={{ marginBottom: '18px' }}>
                <label style={s.label}>
                  Phone number <span style={{ color: '#b91c1c' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712 345 678 or +255 712 345 678"
                  style={s.input}
                  autoComplete="tel"
                />
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  The USSD prompt will be sent to this number.
                </p>
              </div>
            )}

            {!isUssd && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px', fontSize: '14px', color: '#0369a1', lineHeight: 1.6 }}>
                Bank transfers are confirmed manually. After initiating, transfer <strong>{formatTZS(selectedPrice)}</strong> to the Iuris Compliance CRDB account and reference your order. Your subscription will activate within 1 business day.
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={s.label}>Your name <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span></label>
              <input
                type="text"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                placeholder="For your receipt"
                style={s.input}
              />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Subtotal</span>
                <span style={{ fontWeight: '600', color: '#0a1929' }}>{formatTZS(Math.round((selectedPrice || 0) / 1.18))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>VAT (18%)</span>
                <span style={{ fontWeight: '600', color: '#0a1929' }}>{formatTZS((selectedPrice || 0) - Math.round((selectedPrice || 0) / 1.18))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#0a1929', fontWeight: '700' }}>Total charged</span>
                <span style={{ fontWeight: '800', color: '#0a1929', fontSize: '15px' }}>{formatTZS(selectedPrice)}</span>
              </div>
            </div>

            {error && <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px', fontWeight: '500' }}>{error}</p>}

            <button
              type="button"
              onClick={handlePay}
              disabled={submitting || (isUssd && !phoneNumber.trim())}
              style={{ ...s.primaryBtn, opacity: (submitting || (isUssd && !phoneNumber.trim())) ? 0.6 : 1 }}
            >
              {submitting ? 'Sending payment request…' : `Pay ${formatTZS(selectedPrice)}`}
            </button>
            <button type="button" onClick={() => { setStep(1); setError(''); }} style={s.ghostBtn}>Back</button>
            <button type="button" onClick={signOut} style={{ ...s.ghostBtn, marginTop: '8px', color: '#94a3b8', borderColor: '#f1f5f9' }}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Plan selection ────────────────────────────────────────────────
  return (
    <div style={s.backdrop}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: 'white' }}>
            Your Free Trial Has Ended
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            Choose a plan to continue. Your data is safe.
          </p>
        </div>
        <div style={s.body}>
          {/* Billing period toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>Billing period</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { value: 'annual', label: 'Annual — save ~17%' },
                { value: 'monthly', label: 'Monthly' },
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setBillingPeriod(p.value)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                    border: billingPeriod === p.value ? '2px solid #d4af37' : '2px solid #e2e8f0',
                    background: billingPeriod === p.value ? '#fffbeb' : 'white',
                    color: billingPeriod === p.value ? '#92400e' : '#4a5568',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>Select plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {plans.map(plan => {
                const price = billingPeriod === 'annual' ? plan.price_annual_tzs : plan.price_monthly_tzs;
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      padding: '14px 12px', borderRadius: '10px', border: '2px solid',
                      borderColor: isSelected ? '#d4af37' : '#e2e8f0',
                      background: isSelected ? '#fffbeb' : 'white',
                      boxShadow: isSelected ? '0 0 0 2px rgba(212,175,55,0.25)' : 'none',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#0a1929', marginBottom: '4px' }}>
                      {plan.display_name || TIER_LABELS[plan.tier] || plan.name}
                    </div>
                    {plan.contact_sales ? (
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Contact sales</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700' }}>
                        {formatTZS(price)}<span style={{ color: '#94a3b8', fontWeight: '400' }}>/{billingPeriod === 'annual' ? 'yr' : 'mo'}</span>
                      </div>
                    )}
                    {plan.max_users && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Up to {plan.max_users} users</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPlan && !selectedPlan.contact_sales && selectedPrice && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: '600' }}>
                {TIER_LABELS[selectedPlan.tier] || selectedPlan.name} · {billingPeriod}
              </span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0a1929' }}>{formatTZS(selectedPrice)}</span>
            </div>
          )}

          {selectedPlan?.contact_sales ? (
            <Link
              to="/pricing"
              style={{ display: 'block', width: '100%', padding: '13px', textAlign: 'center', background: 'linear-gradient(135deg, #d4af37, #b8941f)', color: '#0a1929', borderRadius: '8px', fontWeight: '700', fontSize: '15px', textDecoration: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
            >
              Contact sales on pricing page
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => { if (!selectedPlan) return; setError(''); setStep(2); }}
              disabled={!selectedPlan}
              style={{ ...s.primaryBtn, opacity: !selectedPlan ? 0.5 : 1 }}
            >
              Continue to payment →
            </button>
          )}
          <button type="button" onClick={signOut} style={s.ghostBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(10,25,41,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', overflowY: 'auto',
  },
  modal: {
    background: 'white', borderRadius: '16px',
    width: '100%', maxWidth: '520px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 28px',
    background: 'linear-gradient(135deg, #0a1929 0%, #0d2137 100%)',
  },
  body: { padding: '24px 28px 28px' },
  label: {
    display: 'block', fontSize: '12px', fontWeight: '700',
    color: '#374151', marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', color: '#1a202c',
    boxSizing: 'border-box', background: 'white', outline: 'none',
  },
  primaryBtn: {
    display: 'block', width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #d4af37, #b8941f)',
    color: '#0a1929', border: 'none', borderRadius: '8px',
    fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginBottom: '10px',
  },
  ghostBtn: {
    display: 'block', width: '100%', padding: '11px',
    background: 'transparent', color: '#64748b',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginBottom: '8px',
  },
};
