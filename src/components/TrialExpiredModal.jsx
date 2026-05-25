import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const TIER_LABELS = {
  small_firm: 'Small Firm',
  medium_firm: 'Medium Firm',
  large_firm: 'Large Firm',
};

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'mixx_by_yas', label: 'Mixx by Yas' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'halopesa', label: 'HaloPesa' },
  { value: 'bank_transfer_crdb', label: 'CRDB Bank Transfer' },
];

function formatTZS(amount) {
  if (!amount) return 'Contact sales';
  return `TZS ${Number(amount).toLocaleString('en-TZ')}`;
}

export default function TrialExpiredModal() {
  const { organization, signOut, refreshProfile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('id, tier, name, display_name, price_monthly_tzs, price_annual_tzs, max_users, max_matters, contact_sales')
      .in('tier', ['small_firm', 'medium_firm', 'large_firm'])
      .order('price_monthly_tzs', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) {
          setPlans(data);
          // Pre-select the current org tier if available
          const current = data.find(p => p.tier === organization?.subscription_tier);
          setSelectedPlan(current ?? data[0] ?? null);
        }
      });
  }, [organization?.subscription_tier]);

  const selectedPrice = selectedPlan
    ? (billingPeriod === 'annual' ? selectedPlan.price_annual_tzs : selectedPlan.price_monthly_tzs)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) { setError('Please select a plan.'); return; }
    if (!paymentMethod) { setError('Please select a payment method.'); return; }
    if (selectedPlan.contact_sales) { setError('Please contact sales for the Large Firm plan.'); return; }
    setError('');
    setSubmitting(true);

    try {
      // Record the payment
      const vatRate = 0.18;
      const grossAmount = selectedPrice ?? 0;
      const vatAmount = Math.round(grossAmount * vatRate / (1 + vatRate));
      const netAmount = grossAmount - vatAmount;

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      if (billingPeriod === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { error: payErr } = await supabase.from('subscription_payments').insert({
        organization_id: organization.id,
        plan_id: selectedPlan.id,
        billing_period: billingPeriod,
        amount_tzs: grossAmount,
        vat_amount_tzs: vatAmount,
        net_amount_tzs: netAmount,
        payment_method: paymentMethod,
        transaction_reference: transactionRef || null,
        payment_status: 'pending',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      });
      if (payErr) throw payErr;

      // Upgrade org tier and set expiry date
      const { error: orgErr } = await supabase.from('organizations')
        .update({
          subscription_tier: selectedPlan.tier,
          subscription_expiry_date: periodEnd.toISOString(),
          subscription_status: 'active',
          is_trialing: false,
        })
        .eq('id', organization.id);
      if (orgErr) throw orgErr;

      setSuccess(true);
      refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={styles.backdrop}>
        <div style={{ ...styles.modal, textAlign: 'center', padding: '56px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: '#065f46' }}>Payment Recorded</h2>
          <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#4a5568', lineHeight: 1.6 }}>
            Your subscription request has been received. Access will be fully restored once payment is confirmed by our team.
          </p>
          <button onClick={refreshProfile} style={styles.primaryBtn}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0a1929' }}>
            Your Free Trial Has Ended
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
            Choose a subscription plan to continue using the platform.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Plan picker */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.sectionLabel}>Select a Plan</label>
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
                      ...styles.planCard,
                      borderColor: isSelected ? '#d4af37' : '#e2e8f0',
                      background: isSelected ? '#fffbeb' : 'white',
                      boxShadow: isSelected ? '0 0 0 2px #d4af37' : 'none',
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#0a1929', marginBottom: '4px' }}>
                      {plan.display_name || TIER_LABELS[plan.tier] || plan.name}
                    </div>
                    <div style={{ fontSize: '12px', color: plan.contact_sales ? '#64748b' : '#1e40af', fontWeight: '600' }}>
                      {plan.contact_sales ? 'Contact sales' : `${formatTZS(price)} / ${billingPeriod === 'annual' ? 'yr' : 'mo'}`}
                    </div>
                    {plan.max_users && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Up to {plan.max_users} users
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Billing period */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.sectionLabel}>Billing Period</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['monthly', 'annual'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBillingPeriod(p)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                    border: billingPeriod === p ? '2px solid #d4af37' : '2px solid #e2e8f0',
                    background: billingPeriod === p ? '#fffbeb' : 'white',
                    color: billingPeriod === p ? '#92400e' : '#4a5568',
                    cursor: 'pointer',
                  }}
                >
                  {p === 'annual' ? 'Annual (save ~15%)' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>

          {/* Price summary */}
          {selectedPlan && !selectedPlan.contact_sales && selectedPrice && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#0369a1', fontWeight: '700' }}>
                <span>{selectedPlan.display_name || TIER_LABELS[selectedPlan.tier] || selectedPlan.name} — {billingPeriod}</span>
                <span>{formatTZS(selectedPrice)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Inclusive of 18% VAT
              </div>
            </div>
          )}

          {/* Payment method */}
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.sectionLabel}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              required
              style={styles.select}
            >
              <option value="">Select payment method…</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Transaction reference */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.sectionLabel}>Transaction Reference <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span></label>
            <input
              type="text"
              value={transactionRef}
              onChange={e => setTransactionRef(e.target.value)}
              placeholder="e.g. MPESA confirmation code"
              style={styles.input}
            />
          </div>

          {error && <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px', fontWeight: '500' }}>{error}</p>}

          {selectedPlan?.contact_sales ? (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', textAlign: 'center' }}>
                The Large Firm plan requires a custom quote.
              </p>
              <Link
                to="/pricing"
                style={{
                  display: 'block', width: '100%', padding: '13px', textAlign: 'center',
                  background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                  color: '#0a1929', border: 'none', borderRadius: '8px',
                  fontWeight: '700', fontSize: '15px', textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                Contact sales on pricing page
              </Link>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting || !selectedPlan}
              style={{ ...styles.primaryBtn, opacity: (submitting || !selectedPlan) ? 0.6 : 1 }}
            >
              {submitting ? 'Recording payment…' : 'Submit payment & continue'}
            </button>
          )}

          <button
            type="button"
            onClick={signOut}
            style={styles.ghostBtn}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(10,25,41,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
    overflowY: 'auto',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  header: {
    padding: '28px 32px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: 'linear-gradient(135deg, #0a1929 0%, #0d2137 100%)',
    color: 'white',
  },
  body: {
    padding: '24px 32px 32px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  planCard: {
    padding: '12px',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1a202c',
    background: 'white',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1a202c',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    display: 'block',
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #d4af37, #b8941f)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  ghostBtn: {
    display: 'block',
    width: '100%',
    padding: '11px',
    background: 'transparent',
    color: '#64748b',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
